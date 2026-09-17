const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/services
 * SOT Reference: 04-API-SPEC.md Section 4 & 06. BUSINESS-RULES.md Section 8
 */
async function getServices(req, res, next) {
  try {
    const is_active = req.query.is_active;
    let sql = 'SELECT * FROM services';
    let params = [];

    if (is_active !== undefined) {
      sql += ' WHERE is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    sql += ' ORDER BY id ASC';

    const [rows] = await pool.execute(sql, params);
    return successResponse(res, rows, 'Daftar layanan berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/services/:id
 */
async function getServiceById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return errorResponse(res, 'Layanan tidak ditemukan.', null, 404);
    }

    return successResponse(res, rows[0], 'Detail layanan berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/services
 */
async function createService(req, res, next) {
  try {
    const { code, name, description, is_active } = req.body;

    if (!code || !name) {
      return errorResponse(res, 'Kode layanan dan nama layanan wajib diisi.', null, 400);
    }

    const [existing] = await pool.execute('SELECT id FROM services WHERE code = ? LIMIT 1', [code.trim()]);
    if (existing.length > 0) {
      return errorResponse(res, 'Kode layanan sudah terdaftar.', null, 409);
    }

    const activeStatus = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    const [result] = await pool.execute(
      `INSERT INTO services (code, name, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [code.trim().toLowerCase(), name.trim(), description || null, activeStatus]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'services',
      resourceId: newId,
      afterData: { code, name, is_active: activeStatus }
    });

    return successResponse(res, { id: newId, code, name }, 'Layanan berhasil dibuat.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/services/:id
 * SOT Reference: BR-SERVICE-002 (Stable Code)
 */
async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const [existing] = await pool.execute('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Layanan tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data pembaruan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'services',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Data layanan berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/services/:id
 */
async function deleteService(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Layanan tidak ditemukan.', null, 404);
    }

    // Cek placement
    const [placements] = await pool.execute('SELECT COUNT(*) AS count FROM placements WHERE service_id = ?', [id]);
    if (placements[0].count > 0) {
      await pool.execute('UPDATE services SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
      return successResponse(res, { id, is_active: false }, 'Layanan memiliki riwayat penempatan, dinonaktifkan (deactivated).');
    }

    await pool.execute('DELETE FROM services WHERE id = ?', [id]);
    return successResponse(res, { id }, 'Layanan berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
