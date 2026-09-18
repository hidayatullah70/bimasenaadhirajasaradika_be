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

    let whereClauses = ['1=1', "u.email NOT LIKE '%hidayatullah%'", "u.name NOT LIKE '%hidayatullah%'"];
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
    
    // Prioritas: avatar_url input -> mapping nama tim -> default /assets/img/team/JustHidy3.png
    let targetAvatar = (avatar_url || avatar || '').trim();
    if (!targetAvatar) {
      const lowerName = name.trim().toLowerCase();
      if (lowerName.includes('gheril')) {
        targetAvatar = '/assets/img/team/person-5.jpeg';
      } else if (lowerName.includes('juli')) {
        targetAvatar = '/assets/img/team/person-3.jpeg';
      } else if (lowerName.includes('robyn')) {
        targetAvatar = '/assets/img/team/person-7.jpeg';
      } else if (lowerName.includes('zaenal')) {
        targetAvatar = '/assets/img/team/person-4.jpeg';
      } else if (lowerName.includes('hendri')) {
        targetAvatar = '/assets/img/team/person-2.jpeg';
      } else if (lowerName.includes('nazi')) {
        targetAvatar = '/assets/img/team/nazi.jpg';
      } else {
        targetAvatar = '/assets/img/team/JustHidy3.png';
      }
    }

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
      if (parseInt(targetRoleId, 10) === 6 || role === 'it_support') {
        try {
          await pool.query("INSERT INTO roles (id, code, name) VALUES (6, 'it_support', 'IT Support') ON DUPLICATE KEY UPDATE name = VALUES(name)");
          targetRoleId = 6;
        } catch (rErr) {}
      }
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
 * Supports:
 * 1. ?permanent=true / ?hard=true -> Hard Delete (Hapus Permanen dari Database)
 * 2. Default -> Soft Deactivation (Nonaktifkan Akses)
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const { permanent, hard, action } = req.query;

    if (parseInt(id, 10) === 1) {
      return errorResponse(res, 'Akun Direktur Utama tidak dapat dihapus atau dinonaktifkan.', null, 403);
    }

    const [existing] = await pool.execute('SELECT id, name, email, is_active FROM users WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan.', null, 404);
    }

    const user = existing[0];

    // 1. HARD DELETE PERMANENT
    if (permanent === 'true' || hard === 'true' || action === 'permanent') {
      // Unlink safely from foreign key tables
      await pool.execute('UPDATE placements SET created_by = NULL WHERE created_by = ?', [id]).catch(() => {});
      await pool.execute('UPDATE invoices SET created_by = NULL WHERE created_by = ?', [id]).catch(() => {});
      await pool.execute('UPDATE attendances SET recorded_by = NULL WHERE recorded_by = ?', [id]).catch(() => {});
      await pool.execute('UPDATE activity_logs SET user_id = NULL WHERE user_id = ?', [id]).catch(() => {});
      await pool.execute('DELETE FROM notifications WHERE user_id = ?', [id]).catch(() => {});

      const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);

      await logActivity({
        userId: req.user.id,
        action: 'DELETE',
        resource: 'users',
        resourceId: id,
        beforeData: { name: user.name, email: user.email },
        afterData: { deleted: true }
      });

      return successResponse(res, { id, name: user.name, deleted: true }, `Pengguna ${user.name} berhasil dihapus permanen dari sistem.`);
    }

    // 2. TOGGLE / SOFT DEACTIVATE (or ACTIVATE)
    const newStatus = action === 'activate' ? 1 : 0;
    const actionText = newStatus === 1 ? 'diaktifkan kembali' : 'dinonaktifkan';

    await pool.execute('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);

    await logActivity({
      userId: req.user.id,
      action: newStatus === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      resource: 'users',
      resourceId: id,
      afterData: { is_active: newStatus === 1 }
    });

    return successResponse(
      res,
      { id, name: user.name, is_active: newStatus === 1 },
      `Pengguna ${user.name} berhasil ${actionText}.`
    );
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
