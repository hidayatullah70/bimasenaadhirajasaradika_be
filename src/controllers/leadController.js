const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/leads
 * SOT Reference: 04-API-SPEC.md Section 7 & 06. BUSINESS-RULES.md Section 12
 */
async function getLeads(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'company_name', 'status', 'created_at'], 'id', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const status = req.query.status || null;
    const assigned_to = req.query.assigned_to || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(l.company_name LIKE ? OR l.contact_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)');
      params.push(search, search, search, search);
    }
    if (status) {
      whereClauses.push('l.status = ?');
      params.push(status);
    }
    if (assigned_to) {
      whereClauses.push('l.assigned_to = ?');
      params.push(assigned_to);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM leads l WHERE ${whereSql}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT l.*, u.name AS assigned_user_name, u.email AS assigned_user_email
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE ${whereSql}
       ORDER BY l.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar prospek (leads) berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/leads/:id
 */
async function getLeadById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT l.*, u.name AS assigned_user_name, u.email AS assigned_user_email
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Prospek (lead) tidak ditemukan.', null, 404);
    }

    return successResponse(res, rows[0], 'Detail prospek (lead) berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/leads
 * SOT Reference: BR-LEAD-001, BR-LEAD-002
 */
async function createLead(req, res, next) {
  try {
    const { company_name, contact_name, phone, email, source, status, notes, assigned_to } = req.body;

    // BR-LEAD-002: Required info
    if (!company_name || !contact_name || !source) {
      return errorResponse(res, 'Nama perusahaan (company_name), nama kontak (contact_name), dan sumber (source) wajib diisi.', null, 400);
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
    const leadStatus = status || 'new';
    if (!validStatuses.includes(leadStatus)) {
      return errorResponse(res, `Status pipeline tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
    }

    const [result] = await pool.execute(
      `INSERT INTO leads (company_name, contact_name, phone, email, source, status, notes, assigned_to, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [company_name.trim(), contact_name.trim(), phone || null, email || null, source.trim(), leadStatus, notes || null, assigned_to || req.user.id]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'leads',
      resourceId: newId,
      afterData: { company_name, contact_name, status: leadStatus, source }
    });

    return successResponse(res, { id: newId, company_name, status: leadStatus }, 'Prospek (lead) berhasil ditambahkan.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/leads/:id
 * SOT Reference: BR-LEAD-003 (Pipeline change traceability)
 */
async function updateLead(req, res, next) {
  try {
    const { id } = req.params;
    // Dukung properti 'stage' atau 'status' untuk interoperabilitas frontend
    const { stage, status, company_name, contact_name, phone, email, source, notes, assigned_to } = req.body;

    const [existing] = await pool.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Prospek tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    const targetStatus = stage || status;
    if (targetStatus) {
      const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
      if (!validStatuses.includes(targetStatus)) {
        return errorResponse(res, `Status pipeline tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
      }
      updates.push('status = ?');
      params.push(targetStatus);
    }

    if (company_name) { updates.push('company_name = ?'); params.push(company_name.trim()); }
    if (contact_name) { updates.push('contact_name = ?'); params.push(contact_name.trim()); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (source) { updates.push('source = ?'); params.push(source.trim()); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data perubahan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [id]);

    // BR-LEAD-003: Audit log perubahan status pipeline
    await logActivity({
      userId: req.user.id,
      action: 'UPDATE_PIPELINE',
      resource: 'leads',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Data prospek berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/leads/:id
 */
async function deleteLead(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Prospek tidak ditemukan.', null, 404);
    }

    await pool.execute('DELETE FROM leads WHERE id = ?', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'leads',
      resourceId: id,
      beforeData: existing[0]
    });

    return successResponse(res, { id }, 'Prospek berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead
};
