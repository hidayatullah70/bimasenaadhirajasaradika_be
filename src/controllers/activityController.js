const { pool } = require('../config/db');
const { successResponse } = require('../utils/response');
const { parsePagination, parseSorting, buildMeta } = require('../utils/queryHelper');

/**
 * GET /api/v1/activities
 * SOT Reference: 04-API-SPEC.md Section 5 & 06. BUSINESS-RULES.md Section 14
 */
async function getActivities(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query, ['id', 'created_at'], 'created_at', 'DESC');
    const resource = req.query.resource || null;
    const action = req.query.action || null;
    const user_id = req.query.user_id || null;

    let whereClauses = ['1=1'];
    let params = [];

    if (resource) {
      whereClauses.push('a.resource = ?');
      params.push(resource);
    }
    if (action) {
      whereClauses.push('a.action = ?');
      params.push(action);
    }
    if (user_id) {
      whereClauses.push('a.user_id = ?');
      params.push(user_id);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM activities a WHERE ${whereSql}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email, r.name AS role_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE ${whereSql}
       ORDER BY a.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, rows, 'Audit log aktivitas berhasil diambil.', buildMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getActivities
};
