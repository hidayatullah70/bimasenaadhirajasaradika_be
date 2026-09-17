const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/attendance
 * SOT Reference: 04-API-SPEC.md Section 5 & 06. BUSINESS-RULES.md Section 10
 */
async function getAttendance(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'attendance_date', 'check_in', 'status'], 'attendance_date', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const date = req.query.date || null;
    const from_date = req.query.from_date || null;
    const to_date = req.query.to_date || null;
    const employee_id = req.query.employee_id || null;
    const status = req.query.status || null;
    const site_id = req.query.site_id || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(e.name LIKE ? OR e.employee_no LIKE ? OR c.name LIKE ? OR s.name LIKE ?)');
      params.push(search, search, search, search);
    }
    if (date) {
      whereClauses.push('a.attendance_date = ?');
      params.push(date);
    }
    if (from_date) {
      whereClauses.push('a.attendance_date >= ?');
      params.push(from_date);
    }
    if (to_date) {
      whereClauses.push('a.attendance_date <= ?');
      params.push(to_date);
    }
    if (employee_id) {
      whereClauses.push('a.employee_id = ?');
      params.push(employee_id);
    }
    if (status) {
      whereClauses.push('a.status = ?');
      params.push(status);
    }
    if (site_id) {
      whereClauses.push('p.site_id = ?');
      params.push(site_id);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       JOIN placements p ON a.placement_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN sites s ON p.site_id = s.id
       WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT a.*,
              e.name AS employee_name, e.employee_no,
              c.name AS client_name,
              s.name AS site_name,
              srv.name AS service_name,
              u1.name AS recorder_name,
              u2.name AS updater_name
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       JOIN placements p ON a.placement_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN sites s ON p.site_id = s.id
       JOIN services srv ON p.service_id = srv.id
       LEFT JOIN users u1 ON a.recorded_by = u1.id
       LEFT JOIN users u2 ON a.updated_by = u2.id
       WHERE ${whereSql}
       ORDER BY a.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar presensi berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/attendance
 * SOT Reference: BR-ATT-001 s/d BR-ATT-004
 */
async function recordAttendance(req, res, next) {
  try {
    const { employee_id, placement_id, attendance_date, status, check_in, check_out, notes } = req.body;

    if (!employee_id || !placement_id || !attendance_date || !status) {
      return errorResponse(res, 'employee_id, placement_id, attendance_date, dan status wajib diisi.', null, 400);
    }

    const validStatuses = ['present', 'absent', 'late', 'leave', 'sick', 'off'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, `Status presensi tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
    }

    // BR-ATT-004: Valid Placement on date
    const [placement] = await pool.execute(
      `SELECT id, employee_id, status, start_date, end_date
       FROM placements
       WHERE id = ? AND employee_id = ? LIMIT 1`,
      [placement_id, employee_id]
    );

    if (placement.length === 0) {
      return errorResponse(res, 'Kombinasi karyawan dan penempatan kerja tidak valid (BR-ATT-004).', null, 400);
    }

    const plc = placement[0];
    if (attendance_date < plc.start_date || (plc.end_date && attendance_date > plc.end_date)) {
      return errorResponse(res, `Tanggal presensi (${attendance_date}) berada di luar masa penempatan (${plc.start_date} s/d ${plc.end_date || 'selesai'}).`, null, 400);
    }

    // BR-ATT-003: Unique attendance
    const [existing] = await pool.execute(
      `SELECT id FROM attendance
       WHERE employee_id = ? AND placement_id = ? AND attendance_date = ? LIMIT 1`,
      [employee_id, placement_id, attendance_date]
    );

    if (existing.length > 0) {
      return errorResponse(res, 'Presensi untuk karyawan pada penempatan dan tanggal ini sudah tercatat sebelumnya (BR-ATT-003). Gunakan fungsi koreksi jika ingin mengubah.', null, 409);
    }

    const [result] = await pool.execute(
      `INSERT INTO attendance (employee_id, placement_id, attendance_date, status, check_in, check_out, notes, recorded_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [employee_id, placement_id, attendance_date, status, check_in || null, check_out || null, notes || null, req.user.id]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'RECORD',
      resource: 'attendance',
      resourceId: newId,
      afterData: { employee_id, placement_id, attendance_date, status, check_in, check_out }
    });

    return successResponse(res, { id: newId, employee_id, placement_id, attendance_date, status }, 'Presensi berhasil dicatat.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/attendance/:id
 * SOT Reference: BR-ATT-005 (Attendance Correction with updated_by and audit)
 */
async function updateAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const { status, check_in, check_out, notes } = req.body;

    const [existing] = await pool.execute('SELECT * FROM attendance WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Data presensi tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    if (status) {
      const validStatuses = ['present', 'absent', 'late', 'leave', 'sick', 'off'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Status tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (check_in !== undefined) {
      updates.push('check_in = ?');
      params.push(check_in);
    }
    if (check_out !== undefined) {
      updates.push('check_out = ?');
      params.push(check_out);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data perubahan yang dikirimkan.', null, 400);
    }

    // BR-ATT-005: Mencatat updated_by & updated_at
    updates.push('updated_by = ?');
    params.push(req.user.id);
    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM attendance WHERE id = ? LIMIT 1', [id]);

    // BR-ATT-005: Perubahan penting dicatat pada activity/audit
    await logActivity({
      userId: req.user.id,
      action: 'CORRECTION',
      resource: 'attendance',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Koreksi data presensi berhasil disimpan.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAttendance,
  recordAttendance,
  updateAttendance
};
