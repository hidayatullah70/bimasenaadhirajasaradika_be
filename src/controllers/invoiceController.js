const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/invoices
 * SOT Reference: 04-API-SPEC.md Section 6 & 06. BUSINESS-RULES.md Section 11
 */
async function getInvoices(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'invoice_no', 'invoice_date', 'due_date', 'total', 'status', 'created_at'], 'id', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const client_id = req.query.client_id || null;
    const status = req.query.status || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(i.invoice_no LIKE ? OR c.name LIKE ?)');
      params.push(search, search);
    }
    if (client_id) {
      whereClauses.push('i.client_id = ?');
      params.push(client_id);
    }
    if (status) {
      whereClauses.push('i.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT i.*, c.name AS client_name, c.client_code, u.name AS creator_name
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       JOIN users u ON i.created_by = u.id
       WHERE ${whereSql}
       ORDER BY i.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar tagihan berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/invoices/:id
 */
async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT i.*, c.name AS client_name, c.client_code, c.address AS client_address,
              c.phone AS client_phone, c.email AS client_email, u.name AS creator_name
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       JOIN users u ON i.created_by = u.id
       WHERE i.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Tagihan tidak ditemukan.', null, 404);
    }

    return successResponse(res, rows[0], 'Detail tagihan berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/invoices
 * SOT Reference: BR-INV-001, BR-INV-002, BR-INV-003
 */
async function createInvoice(req, res, next) {
  try {
    const { client_id, invoice_no, invoice_date, due_date, subtotal, tax, total, status, notes } = req.body;

    if (!client_id || !invoice_no || !invoice_date || !due_date || subtotal === undefined) {
      return errorResponse(res, 'client_id, invoice_no, invoice_date, due_date, dan subtotal wajib diisi.', null, 400);
    }

    // BR-INV-001: Check client existence
    const [client] = await pool.execute('SELECT id, name FROM clients WHERE id = ? LIMIT 1', [client_id]);
    if (client.length === 0) {
      return errorResponse(res, 'Klien tidak ditemukan.', null, 404);
    }

    // BR-INV-002: Unique invoice_no
    const [existing] = await pool.execute('SELECT id FROM invoices WHERE invoice_no = ? LIMIT 1', [invoice_no.trim()]);
    if (existing.length > 0) {
      return errorResponse(res, 'Nomor tagihan (invoice_no) sudah digunakan.', null, 409);
    }

    const validStatuses = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    const invStatus = status || 'draft';
    if (!validStatuses.includes(invStatus)) {
      return errorResponse(res, `Status tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
    }

    const calcSubtotal = parseFloat(subtotal);
    const calcTax = tax !== undefined ? parseFloat(tax) : 0;
    const calcTotal = total !== undefined ? parseFloat(total) : (calcSubtotal + calcTax);

    const [result] = await pool.execute(
      `INSERT INTO invoices (client_id, invoice_no, invoice_date, due_date, subtotal, tax, total, status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [client_id, invoice_no.trim(), invoice_date, due_date, calcSubtotal, calcTax, calcTotal, invStatus, notes || null, req.user.id]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'invoices',
      resourceId: newId,
      afterData: { client_id, invoice_no, total: calcTotal, status: invStatus }
    });

    return successResponse(res, { id: newId, invoice_no, total: calcTotal, status: invStatus }, 'Tagihan berhasil dibuat.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/invoices/:id
 * SOT Reference: BR-INV-003, BR-INV-004, BR-INV-005
 */
async function updateInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const { status, due_date, subtotal, tax, total, notes } = req.body;

    const [existing] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Tagihan tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    if (status) {
      const validStatuses = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Status tidak valid. Pilihan: ${validStatuses.join(', ')}`, null, 400);
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (due_date) {
      updates.push('due_date = ?');
      params.push(due_date);
    }
    if (subtotal !== undefined) {
      updates.push('subtotal = ?');
      params.push(parseFloat(subtotal));
    }
    if (tax !== undefined) {
      updates.push('tax = ?');
      params.push(parseFloat(tax));
    }
    if (total !== undefined) {
      updates.push('total = ?');
      params.push(parseFloat(total));
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data pembaruan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE_STATUS',
      resource: 'invoices',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Tagihan berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/invoices/:id
 * SOT Reference: BR-INV-004 (Cancelled invoice not physically deleted)
 */
async function deleteInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Tagihan tidak ditemukan.', null, 404);
    }

    // BR-INV-004: Soft cancel over physical delete
    await pool.execute("UPDATE invoices SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [id]);

    await logActivity({
      userId: req.user.id,
      action: 'CANCEL',
      resource: 'invoices',
      resourceId: id,
      afterData: { status: 'cancelled' }
    });

    return successResponse(res, { id, status: 'cancelled' }, 'Tagihan dibatalkan (soft cancelled) sesuai BR-INV-004.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
};
