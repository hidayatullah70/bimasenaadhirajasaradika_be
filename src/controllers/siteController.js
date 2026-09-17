const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/sites
 * SOT Reference: 04-API-SPEC.md Section 4 & 06. BUSINESS-RULES.md Section 7
 */
async function getSites(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'site_code', 'name', 'status', 'created_at'], 'id', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const client_id = req.query.client_id || null;
    const status = req.query.status || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(s.name LIKE ? OR s.site_code LIKE ? OR s.address LIKE ? OR c.name LIKE ?)');
      params.push(search, search, search, search);
    }
    if (client_id) {
      whereClauses.push('s.client_id = ?');
      params.push(client_id);
    }
    if (status) {
      whereClauses.push('s.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM sites s
       JOIN clients c ON s.client_id = c.id
       WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT s.*, c.name AS client_name, c.client_code,
              (SELECT COUNT(*) FROM placements p WHERE p.site_id = s.id AND p.status = 'active') AS active_placements_count
       FROM sites s
       JOIN clients c ON s.client_id = c.id
       WHERE ${whereSql}
       ORDER BY s.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar lokasi (sites) berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sites/:id
 */
async function getSiteById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT s.*, c.name AS client_name, c.client_code
       FROM sites s
       JOIN clients c ON s.client_id = c.id
       WHERE s.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Lokasi (site) tidak ditemukan.', null, 404);
    }

    return successResponse(res, rows[0], 'Detail lokasi berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/sites
 * SOT Reference: BR-SITE-001 (Site Ownership)
 */
async function createSite(req, res, next) {
  try {
    const { client_id, site_code, name, address, status } = req.body;

    if (!client_id || !site_code || !name || !address) {
      return errorResponse(res, 'client_id, site_code, name, dan address wajib diisi.', null, 400);
    }

    // Cek client aktif
    const [client] = await pool.execute('SELECT id, name, status FROM clients WHERE id = ? LIMIT 1', [client_id]);
    if (client.length === 0) {
      return errorResponse(res, 'Klien tidak ditemukan.', null, 404);
    }

    // Cek duplikasi site_code
    const [existing] = await pool.execute('SELECT id FROM sites WHERE site_code = ? LIMIT 1', [site_code.trim()]);
    if (existing.length > 0) {
      return errorResponse(res, 'Kode lokasi (site_code) sudah digunakan.', null, 409);
    }

    const siteStatus = status || 'active';

    const [result] = await pool.execute(
      `INSERT INTO sites (client_id, site_code, name, address, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [client_id, site_code.trim(), name.trim(), address.trim(), siteStatus]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'sites',
      resourceId: newId,
      afterData: { client_id, site_code, name, status: siteStatus }
    });

    return successResponse(res, { id: newId, client_id, site_code, name, status: siteStatus }, 'Lokasi (site) berhasil dibuat.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/sites/:id
 */
async function updateSite(req, res, next) {
  try {
    const { id } = req.params;
    const { client_id, site_code, name, address, status } = req.body;

    const [existing] = await pool.execute('SELECT * FROM sites WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Lokasi (site) tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    if (site_code && site_code.trim() !== before.site_code) {
      const [dup] = await pool.execute('SELECT id FROM sites WHERE site_code = ? AND id != ? LIMIT 1', [site_code.trim(), id]);
      if (dup.length > 0) {
        return errorResponse(res, 'Kode lokasi sudah digunakan.', null, 409);
      }
      updates.push('site_code = ?');
      params.push(site_code.trim());
    }

    if (client_id) {
      const [client] = await pool.execute('SELECT id FROM clients WHERE id = ? LIMIT 1', [client_id]);
      if (client.length === 0) return errorResponse(res, 'Klien tidak ditemukan.', null, 404);
      updates.push('client_id = ?');
      params.push(client_id);
    }

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (address) {
      updates.push('address = ?');
      params.push(address.trim());
    }
    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return errorResponse(res, 'Status harus active atau inactive.', null, 400);
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data perubahan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE sites SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM sites WHERE id = ? LIMIT 1', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'sites',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Data lokasi berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/sites/:id
 */
async function deleteSite(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM sites WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Lokasi tidak ditemukan.', null, 404);
    }

    const [placementsCount] = await pool.execute('SELECT COUNT(*) AS count FROM placements WHERE site_id = ?', [id]);
    if (placementsCount[0].count > 0) {
      await pool.execute("UPDATE sites SET status = 'inactive', updated_at = NOW() WHERE id = ?", [id]);
      await logActivity({
        userId: req.user.id,
        action: 'DEACTIVATE',
        resource: 'sites',
        resourceId: id,
        afterData: { status: 'inactive', reason: 'Site has historical placements' }
      });
      return successResponse(res, { id, status: 'inactive' }, 'Lokasi memiliki riwayat penempatan, status diubah menjadi inactive.');
    }

    await pool.execute('DELETE FROM sites WHERE id = ?', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'sites',
      resourceId: id,
      beforeData: existing[0]
    });

    return successResponse(res, { id }, 'Lokasi berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite
};
