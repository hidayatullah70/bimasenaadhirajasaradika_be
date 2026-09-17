const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/users
 * SOT Reference: 04-API-SPEC.md Section 3 & 06. BUSINESS-RULES.md Permission Matrix (Direktur)
 */
async function getUsers(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'name', 'email', 'created_at', 'is_active'], 'id', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const role = req.query.role || null;
    const status = req.query.status !== undefined ? req.query.status : null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(search, search);
    }
    if (role) {
      whereClauses.push('r.code = ?');
      params.push(role);
    }
    if (status !== null) {
      whereClauses.push('u.is_active = ?');
      params.push(status === 'true' || status === '1' ? 1 : 0);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    // Data query (tidak mengekspos password_hash)
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url,
              COALESCE(u.avatar_url, CONCAT('https://ui-avatars.com/api/?name=', REPLACE(u.name, ' ', '+'), '&background=0284c7&color=fff&size=128')) AS avatar,
              u.is_active, u.last_login_at, u.created_at, u.updated_at,
              u.role_id, r.code AS role_code, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE ${whereSql}
       ORDER BY u.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar pengguna berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/:id
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.avatar_url,
              COALESCE(u.avatar_url, CONCAT('https://ui-avatars.com/api/?name=', REPLACE(u.name, ' ', '+'), '&background=0284c7&color=fff&size=128')) AS avatar,
              u.is_active, u.last_login_at, u.created_at, u.updated_at,
              u.role_id, r.code AS role_code, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan.', null, 404);
    }

    return successResponse(res, rows[0], 'Detail pengguna berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/users
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role_id, is_active, avatar_url, avatar } = req.body;

    if (!name || !email || !password || !role_id) {
      return errorResponse(res, 'Nama, email, password, dan role_id wajib diisi.', null, 400);
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return errorResponse(res, 'Email sudah digunakan.', null, 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const activeStatus = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const targetAvatar = (avatar_url || avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=0284c7&color=fff&size=128`).trim();

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, avatar_url, password_hash, role_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name.trim(), email.trim().toLowerCase(), targetAvatar, passwordHash, role_id, activeStatus]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'users',
      resourceId: newId,
      afterData: { name, email, role_id, avatar_url: targetAvatar, is_active: activeStatus }
    });

    return successResponse(res, { id: newId, name, email, role_id, avatar_url: targetAvatar, avatar: targetAvatar }, 'Pengguna berhasil dibuat.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/users/:id
 * SOT Reference: BR-USER-005 (Audit role/status changes)
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, password, role, role_id, is_active, avatar_url, avatar } = req.body;

    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan.', null, 404);
    }

    const beforeUser = existing[0];
    let updates = [];
    let params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail !== beforeUser.email) {
        const [emailCheck] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [trimmedEmail, id]);
        if (emailCheck.length > 0) {
          return errorResponse(res, 'Email sudah digunakan oleh akun lain.', null, 409);
        }
        updates.push('email = ?');
        params.push(trimmedEmail);
      }
    }

    if (avatar_url || avatar) {
      const newAvatar = (avatar_url || avatar).trim();
      updates.push('avatar_url = ?');
      params.push(newAvatar);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    let targetRoleId = role_id;
    if (!targetRoleId && role) {
      const [roleRow] = await pool.execute('SELECT id FROM roles WHERE code = ? LIMIT 1', [role]);
      if (roleRow.length > 0) targetRoleId = roleRow[0].id;
    }

    if (targetRoleId) {
      updates.push('role_id = ?');
      params.push(targetRoleId);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data perubahan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedUser] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.avatar_url,
              COALESCE(u.avatar_url, CONCAT('https://ui-avatars.com/api/?name=', REPLACE(u.name, ' ', '+'), '&background=0284c7&color=fff&size=128')) AS avatar,
              u.is_active, u.role_id, r.code AS role_code, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [id]
    );

    // BR-USER-005: Audit role change, status change
    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'users',
      resourceId: id,
      beforeData: { name: beforeUser.name, email: beforeUser.email, role_id: beforeUser.role_id, is_active: beforeUser.is_active },
      afterData: updatedUser[0]
    });

    return successResponse(res, updatedUser[0], 'Data pengguna berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/users/:id
 * SOT Reference: BR-USER-004 (Deactivation over hard delete)
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    // BR-USER-004: Soft deactivation
    const [result] = await pool.execute('UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan.', null, 404);
    }

    await logActivity({
      userId: req.user.id,
      action: 'DEACTIVATE',
      resource: 'users',
      resourceId: id,
      afterData: { is_active: false }
    });

    return successResponse(res, { id, is_active: false }, 'Pengguna berhasil dinonaktifkan (soft deactivation).');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/roles
 * SOT Reference: 04-API-SPEC.md Section 3
 */
async function getRoles(req, res, next) {
  try {
    const [rows] = await pool.execute('SELECT id, code, name, created_at FROM roles ORDER BY id ASC');
    return successResponse(res, rows, 'Daftar role berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles
};
