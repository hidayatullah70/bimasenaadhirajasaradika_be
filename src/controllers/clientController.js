const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');
const { logActivity } = require('../utils/auditLogger');

/**
 * GET /api/v1/clients
 * SOT Reference: 04-API-SPEC.md Section 4 & 06. BUSINESS-RULES.md Section 6
 */
async function getClients(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'client_code', 'name', 'status', 'created_at'], 'id', 'DESC');
    const search = req.query.search ? `%${req.query.search}%` : null;
    const status = req.query.status || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(c.name LIKE ? OR c.client_code LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)');
      params.push(search, search, search, search);
    }
    if (status) {
      whereClauses.push('c.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM clients c WHERE ${whereSql}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM sites s WHERE s.client_id = c.id) AS sites_count,
              (SELECT COUNT(*) FROM placements p WHERE p.client_id = c.id AND p.status = 'active') AS active_placements_count
       FROM clients c
       WHERE ${whereSql}
       ORDER BY c.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Daftar klien berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/clients/:id
 */
async function getClientById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM clients WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return errorResponse(res, 'Klien tidak ditemukan.', null, 404);
    }

    // Ambil daftar sites milik klien
    const [sites] = await pool.execute('SELECT * FROM sites WHERE client_id = ? ORDER BY id ASC', [id]);

    // Ambil daftar penempatan aktif
    const [placements] = await pool.execute(
      `SELECT p.*, e.name AS employee_name, s.name AS site_name, srv.name AS service_name
       FROM placements p
       JOIN employees e ON p.employee_id = e.id
       JOIN sites s ON p.site_id = s.id
       JOIN services srv ON p.service_id = srv.id
       WHERE p.client_id = ?
       ORDER BY p.start_date DESC`,
      [id]
    );

    return successResponse(res, { ...rows[0], sites, placements }, 'Detail klien berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/clients
 * SOT Reference: BR-CLIENT-001, BR-CLIENT-002
 */
async function createClient(req, res, next) {
  try {
    const { client_code, name, phone, email, address, status } = req.body;

    if (!client_code || !name) {
      return errorResponse(res, 'Kode klien (client_code) dan nama klien wajib diisi.', null, 400);
    }

    const clientStatus = status || 'active';
    if (!['active', 'inactive'].includes(clientStatus)) {
      return errorResponse(res, 'Status klien hanya boleh "active" atau "inactive".', null, 400);
    }

    // BR-CLIENT-001: Unique client_code
    const [existing] = await pool.execute('SELECT id FROM clients WHERE client_code = ? LIMIT 1', [client_code.trim()]);
    if (existing.length > 0) {
      return errorResponse(res, 'Kode klien sudah digunakan.', null, 409);
    }

    const [result] = await pool.execute(
      `INSERT INTO clients (client_code, name, phone, email, address, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [client_code.trim(), name.trim(), phone || null, email || null, address || null, clientStatus]
    );

    const newId = result.insertId;

    await logActivity({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'clients',
      resourceId: newId,
      afterData: { client_code, name, status: clientStatus }
    });

    return successResponse(res, { id: newId, client_code, name, status: clientStatus }, 'Klien berhasil didaftarkan.', null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/clients/:id
 */
async function updateClient(req, res, next) {
  try {
    const { id } = req.params;
    const { client_code, name, phone, email, address, status } = req.body;

    const [existing] = await pool.execute('SELECT * FROM clients WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Klien tidak ditemukan.', null, 404);
    }

    const before = existing[0];
    let updates = [];
    let params = [];

    if (client_code && client_code.trim() !== before.client_code) {
      const [dup] = await pool.execute('SELECT id FROM clients WHERE client_code = ? AND id != ? LIMIT 1', [client_code.trim(), id]);
      if (dup.length > 0) {
        return errorResponse(res, 'Kode klien sudah digunakan.', null, 409);
      }
      updates.push('client_code = ?');
      params.push(client_code.trim());
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
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return errorResponse(res, 'Status klien harus "active" atau "inactive".', null, 400);
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'Tidak ada data pembaruan yang dikirimkan.', null, 400);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM clients WHERE id = ? LIMIT 1', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'clients',
      resourceId: id,
      beforeData: before,
      afterData: updated[0]
    });

    return successResponse(res, updated[0], 'Data klien berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/clients/:id
 * SOT Reference: BR-CLIENT-003 & Section 15 (Soft delete rule)
 */
async function deleteClient(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT * FROM clients WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Klien tidak ditemukan.', null, 404);
    }

    // Cek relasi placements, sites, invoices
    const [sitesCount] = await pool.execute('SELECT COUNT(*) AS count FROM sites WHERE client_id = ?', [id]);
    const [placementsCount] = await pool.execute('SELECT COUNT(*) AS count FROM placements WHERE client_id = ?', [id]);
    const [invoicesCount] = await pool.execute('SELECT COUNT(*) AS count FROM invoices WHERE client_id = ?', [id]);

    const hasHistory = (sitesCount[0].count > 0 || placementsCount[0].count > 0 || invoicesCount[0].count > 0);

    if (hasHistory) {
      await pool.execute("UPDATE clients SET status = 'inactive', updated_at = NOW() WHERE id = ?", [id]);

      await logActivity({
        userId: req.user.id,
        action: 'DEACTIVATE',
        resource: 'clients',
        resourceId: id,
        afterData: { status: 'inactive', reason: 'Has related sites, placements or invoices' }
      });

      return successResponse(res, { id, status: 'inactive' }, 'Klien memiliki riwayat operasional, status diubah menjadi inactive.');
    }

    await pool.execute('DELETE FROM clients WHERE id = ?', [id]);

    await logActivity({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'clients',
      resourceId: id,
      beforeData: existing[0]
    });

    return successResponse(res, { id }, 'Data klien berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};
