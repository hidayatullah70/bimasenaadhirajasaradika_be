const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/employees
 * SOT Reference: 04-API-SPEC.md Section 4 & 06. BUSINESS-RULES.md Section 5
 */
async function getEmployees(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'employee_no', 'name', 'join_date', 'status', 'created_at'], 'id', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const status = req.query.status || null;
    const employment_type = req.query.employment_type || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(e.name LIKE ? OR e.employee_no LIKE ? OR e.phone LIKE ? OR e.email LIKE ?)');
      params.push(search, search, search, search);
    }
    if (status) {
      whereClauses.push('e.status = ?');
      params.push(status);
    }
    if (employment_type) {
      whereClauses.push('e.employment_type = ?');
      params.push(employment_type);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM employees e WHERE ${whereSql}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM placements p WHERE p.employee_id = e.id AND p.status = 'active') AS active_placements_count
       FROM employees e
       WHERE ${whereSql}
       ORDER BY e.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar karyawan berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/employees/:id
 */
async function getEmployeeById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return errorResponse(res, 'Data karyawan tidak ditemukan.', null, 404);
    }

    // Ambil histori placement karyawan
    const [placements] = await pool.execute(
      `SELECT p.*, c.name AS client_name, s.name AS site_name, srv.name AS service_name
       FROM placements p
       JOIN clients c ON p.client_id = c.id
       JOIN sites s ON p.site_id = s.id
       JOIN services srv ON p.service_id = srv.id
       WHERE p.employee_id = ?
       ORDER BY p.start_date DESC`,
      [id]
    );

    const employeeData = {
      ...rows[0],
      placements
    };

    return successResponse(res, employeeData, 'Detail data karyawan berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/employees
 * SOT Reference: BR-EMP-001, BR-EMP-002, BR-EMP-003
 */
async function createEmployee(req, res, next) {
  try {
    const { employee_no, name, phone, email, employment_type, status, join_date, end_date } = req.body;

    if (!employee_no || !name || !employment_type || !join_date) {
      return errorResponse(res, 'Nomor karyawan (employee_no), nama, employment_type, dan join_date wajib diisi.', null, 400);
    }

    // Validasi employment_type: tetap, kontrak, harian_lepas
    const validEmploymentTypes = ['tetap', 'kontrak', 'harian_lepas'];
    if (!validEmploymentTypes.includes(employment_type)) {
      return errorResponse(res, `employment_type tidak valid. Pilihan: ${validEmploymentTypes.join(', ')}`, null, 400);
    }

    // Validasi status: active, inactive, terminated
    const validStatuses = ['active', 'inactive', 'terminated'];
    const empStatus = status || 'active';
    if (!validStatuses.includes(empStatus)) {
      return errorResponse(res, `Status tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
    }

    // BR-EMP-001: Check employee_no uniqueness
    const [existing] = await pool.execute('SELECT id FROM employees WHERE employee_no = ? LIMIT 1', [employee_no.trim()]);
    if (existing.length > 0) {
      return errorResponse(res, 'Nomor karyawan (employee_no) sudah digunakan.', null, 409);
    }

    const [result] = await pool.execute(
      `INSERT INTO employees (employee_no, name, phone, email, employment_type, status, join_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [employee_no.trim(), name.trim(), phone || null, email || null, employment_type, empStatus, join_date, end_date || null]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'employees',
      resourceId: newId,
      afterData: { employee_no, name, employment_type, status: empStatus, join_date }
    });

    return successResponse(res, { id: newId, employee_no, name, status: empStatus }, 'Karyawan berhasil didaftarkan.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/employees/:id
 */
async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const { employee_no, name, phone, email, employment_type, status, join_date, end_date } = req.body;

    const [existing] = await pool.execute('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Karyawan tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    if (employee_no && employee_no.trim() !== before.employee_no) {
      const [dup] = await pool.execute('SELECT id FROM employees WHERE employee_no = ? AND id != ? LIMIT 1', [employee_no.trim(), id]);
      if (dup.length > 0) {
        return errorResponse(res, 'Nomor karyawan sudah digunakan oleh personel lain.', null, 409);
      }
      updates.push('employee_no = ?');
      params.push(employee_no.trim());
    }

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (employment_type) {
      updates.push('employment_type = ?');
      params.push(employment_type);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (join_date) {
      updates.push('join_date = ?');
      params.push(join_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data pembaruan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'employees',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Data karyawan berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/employees/:id
 * SOT Reference: BR-EMP-005 (Historical employee retain - soft deactivation)
 */
async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Karyawan tidak ditemukan.', null, 404);
    }

    // Cek histori operasional (placement & attendance)
    const [placementCount] = await pool.execute('SELECT COUNT(*) AS count FROM placements WHERE employee_id = ?', [id]);
    const [attendanceCount] = await pool.execute('SELECT COUNT(*) AS count FROM attendance WHERE employee_id = ?', [id]);

    const hasHistory = (placementCount[0].count > 0 || attendanceCount[0].count > 0);

    if (hasHistory) {
      // BR-EMP-005: Soft deactivation
      await pool.execute("UPDATE employees SET status = 'inactive', updated_at = NOW() WHERE id = ?", [id]);

      await logActivity({
        userId: req.user.id,
        action: 'DEACTIVATE',
        resource: 'employees',
        resourceId: id,
        afterData: { status: 'inactive', reason: 'Has historical placement/attendance records' }
      });

      return successResponse(
        res,
        { id, status: 'inactive' },
        'Karyawan memiliki riwayat operasional, status diubah menjadi inactive (soft deactivation) sesuai BR-EMP-005.'
      );
    }

    // Jika belum memiliki riwayat sama sekali, boleh hard delete
    await pool.execute('DELETE FROM employees WHERE id = ?', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'employees',
      resourceId: id,
      beforeData: existing[0]
    });

    return successResponse(res, { id }, 'Data karyawan berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
