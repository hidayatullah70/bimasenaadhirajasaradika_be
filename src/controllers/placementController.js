const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/placements
 * SOT Reference: 04-API-SPEC.md Section 4 & 06. BUSINESS-RULES.md Section 9
 */
async function getPlacements(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'start_date', 'end_date', 'status', 'created_at'], 'id', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const client_id = req.query.client_id || null;
    const site_id = req.query.site_id || null;
    const employee_id = req.query.employee_id || null;
    const service_id = req.query.service_id || null;
    const status = req.query.status || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(e.name LIKE ? OR c.name LIKE ? OR s.name LIKE ? OR srv.name LIKE ?)');
      params.push(search, search, search, search);
    }
    if (client_id) {
      whereClauses.push('p.client_id = ?');
      params.push(client_id);
    }
    if (site_id) {
      whereClauses.push('p.site_id = ?');
      params.push(site_id);
    }
    if (employee_id) {
      whereClauses.push('p.employee_id = ?');
      params.push(employee_id);
    }
    if (service_id) {
      whereClauses.push('p.service_id = ?');
      params.push(service_id);
    }
    if (status) {
      whereClauses.push('p.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM placements p
       JOIN employees e ON p.employee_id = e.id
       JOIN clients c ON p.client_id = c.id
       JOIN sites s ON p.site_id = s.id
       JOIN services srv ON p.service_id = srv.id
       WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT p.*,
              e.name AS employee_name, e.employee_no,
              c.name AS client_name, c.client_code,
              s.name AS site_name, s.site_code,
              srv.name AS service_name, srv.code AS service_code,
              u.name AS creator_name
       FROM placements p
       JOIN employees e ON p.employee_id = e.id
       JOIN clients c ON p.client_id = c.id
       JOIN sites s ON p.site_id = s.id
       JOIN services srv ON p.service_id = srv.id
       JOIN users u ON p.created_by = u.id
       WHERE ${whereSql}
       ORDER BY p.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar penempatan kerja berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/placements/:id
 */
async function getPlacementById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT p.*,
              e.name AS employee_name, e.employee_no, e.phone AS employee_phone,
              c.name AS client_name, c.client_code,
              s.name AS site_name, s.site_code, s.address AS site_address,
              srv.name AS service_name, srv.code AS service_code,
              u.name AS creator_name
       FROM placements p
       JOIN employees e ON p.employee_id = e.id
       JOIN clients c ON p.client_id = c.id
       JOIN sites s ON p.site_id = s.id
       JOIN services srv ON p.service_id = srv.id
       JOIN users u ON p.created_by = u.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Penempatan kerja tidak ditemukan.', null, 404);
    }

    return successResponse(res, rows[0], 'Detail penempatan kerja berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/placements
 * SOT Reference: BR-PLACE-001 s/d BR-PLACE-005
 */
async function createPlacement(req, res, next) {
  try {
    const { employee_id, client_id, site_id, service_id, start_date, end_date, status, notes } = req.body;

    // BR-PLACE-001: Required relationship
    if (!employee_id || !client_id || !site_id || !service_id || !start_date) {
      return errorResponse(res, 'employee_id, client_id, site_id, service_id, dan start_date wajib diisi.', null, 400);
    }

    const placeStatus = status || 'planned';
    const validStatuses = ['planned', 'active', 'ended', 'cancelled'];
    if (!validStatuses.includes(placeStatus)) {
      return errorResponse(res, `Status penempatan tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
    }

    // BR-PLACE-004: end_date wajib diisi jika ended atau cancelled
    if ((placeStatus === 'ended' || placeStatus === 'cancelled') && !end_date) {
      return errorResponse(res, 'end_date wajib diisi apabila status ended atau cancelled.', null, 400);
    }

    // BR-PLACE-003: Active Placement check
    const [empRows] = await pool.execute('SELECT id, name, status FROM employees WHERE id = ? LIMIT 1', [employee_id]);
    if (empRows.length === 0) return errorResponse(res, 'Karyawan tidak ditemukan.', null, 404);

    const [clientRows] = await pool.execute('SELECT id, name, status FROM clients WHERE id = ? LIMIT 1', [client_id]);
    if (clientRows.length === 0) return errorResponse(res, 'Klien tidak ditemukan.', null, 404);

    const [siteRows] = await pool.execute('SELECT id, name, status, client_id FROM sites WHERE id = ? LIMIT 1', [site_id]);
    if (siteRows.length === 0) return errorResponse(res, 'Lokasi (site) tidak ditemukan.', null, 404);
    if (siteRows[0].client_id !== parseInt(client_id, 10)) {
      return errorResponse(res, 'Lokasi (site) yang dipilih bukan milik klien tersebut.', null, 400);
    }

    const [srvRows] = await pool.execute('SELECT id, name, is_active FROM services WHERE id = ? LIMIT 1', [service_id]);
    if (srvRows.length === 0) return errorResponse(res, 'Layanan tidak ditemukan.', null, 404);

    if (placeStatus === 'active') {
      if (empRows[0].status !== 'active') {
        return errorResponse(res, `Karyawan berstatus '${empRows[0].status}'. Hanya karyawan aktif yang dapat menerima penempatan aktif.`, null, 400);
      }
      if (clientRows[0].status !== 'active') {
        return errorResponse(res, `Klien berstatus '${clientRows[0].status}'. Hanya klien aktif yang dapat menerima penempatan aktif.`, null, 400);
      }
      if (siteRows[0].status !== 'active') {
        return errorResponse(res, `Lokasi (site) berstatus '${siteRows[0].status}'. Hanya lokasi aktif yang dapat menerima penempatan aktif.`, null, 400);
      }
      if (!srvRows[0].is_active) {
        return errorResponse(res, 'Layanan tidak aktif. Tidak dapat digunakan untuk penempatan aktif.', null, 400);
      }

      // BR-PLACE-005: Overlap check for active placement
      const [overlapRows] = await pool.execute(
        `SELECT id FROM placements
         WHERE employee_id = ? AND status = 'active'
           AND (end_date IS NULL OR end_date >= ?)
           AND start_date <= ? LIMIT 1`,
        [employee_id, start_date, end_date || '9999-12-31']
      );

      if (overlapRows.length > 0) {
        return errorResponse(res, 'Karyawan sudah memiliki penempatan aktif yang overlap pada periode ini (BR-PLACE-005).', null, 409);
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO placements (employee_id, client_id, site_id, service_id, start_date, end_date, status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [employee_id, client_id, site_id, service_id, start_date, end_date || null, placeStatus, notes || null, req.user.id]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'placements',
      resourceId: newId,
      afterData: { employee_id, client_id, site_id, service_id, start_date, status: placeStatus }
    });

    return successResponse(res, { id: newId, status: placeStatus }, 'Penempatan kerja berhasil dibuat.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/placements/:id
 */
async function updatePlacement(req, res, next) {
  try {
    const { id } = req.params;
    const { employee_id, client_id, site_id, service_id, start_date, end_date, status, notes } = req.body;

    const [existing] = await pool.execute('SELECT * FROM placements WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Penempatan kerja tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    const targetStatus = status || before.status;
    const targetStartDate = start_date || before.start_date;
    const targetEndDate = end_date !== undefined ? end_date : before.end_date;
    const targetEmpId = employee_id || before.employee_id;

    if ((targetStatus === 'ended' || targetStatus === 'cancelled') && !targetEndDate) {
      return errorResponse(res, 'end_date wajib diisi apabila status ended atau cancelled (BR-PLACE-004).', null, 400);
    }

    // BR-PLACE-005: Overlap check if updated to active
    if (targetStatus === 'active') {
      const [overlapRows] = await pool.execute(
        `SELECT id FROM placements
         WHERE employee_id = ? AND status = 'active' AND id != ?
           AND (end_date IS NULL OR end_date >= ?)
           AND start_date <= ? LIMIT 1`,
        [targetEmpId, id, targetStartDate, targetEndDate || '9999-12-31']
      );
      if (overlapRows.length > 0) {
        return errorResponse(res, 'Karyawan memiliki penempatan aktif lain yang overlap pada periode ini.', null, 409);
      }
    }

    if (employee_id) { updates.push('employee_id = ?'); params.push(employee_id); }
    if (client_id) { updates.push('client_id = ?'); params.push(client_id); }
    if (site_id) { updates.push('site_id = ?'); params.push(site_id); }
    if (service_id) { updates.push('service_id = ?'); params.push(service_id); }
    if (start_date) { updates.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data pembaruan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE placements SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM placements WHERE id = ? LIMIT 1', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'placements',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Data penempatan berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/placements/:id
 */
async function deletePlacement(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM placements WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Penempatan kerja tidak ditemukan.', null, 404);
    }

    // Cek relasi attendance
    const [attendanceRows] = await pool.execute('SELECT COUNT(*) AS count FROM attendance WHERE placement_id = ?', [id]);
    if (attendanceRows[0].count > 0) {
      // Soft status cancelled
      await pool.execute("UPDATE placements SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [id]);
      await logActivity({
        userId: req.user.id,
        action: 'CANCEL',
        resource: 'placements',
        resourceId: id,
        afterData: { status: 'cancelled', reason: 'Has related attendance records' }
      });
      return successResponse(res, { id, status: 'cancelled' }, 'Penempatan memiliki riwayat presensi, status diubah menjadi cancelled.');
    }

    await pool.execute('DELETE FROM placements WHERE id = ?', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'placements',
      resourceId: id,
      beforeData: existing[0]
    });

    return successResponse(res, { id }, 'Penempatan kerja berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPlacements,
  getPlacementById,
  createPlacement,
  updatePlacement,
  deletePlacement
};
