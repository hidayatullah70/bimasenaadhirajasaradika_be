const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/v1/notifications
 * SOT Reference: 04-API-SPEC.md Section 5 & TABLE notifications
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const is_read = req.query.is_read;

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    let params = [userId];

    if (is_read !== undefined) {
      sql += ' AND is_read = ?';
      params.push(is_read === 'true' || is_read === '1' ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.execute(sql, params);

    // Ambil jumlah unread
    const [unread] = await pool.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return successResponse(
      res,
      rows,
      'Daftar notifikasi berhasil diambil.',
      { unreadCount: unread[0].count }
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 */
async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Notifikasi tidak ditemukan.', null, 404);
    }

    return successResponse(res, { id, is_read: true }, 'Notifikasi telah ditandai dibaca.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/notifications
 */
async function createNotification(req, res, next) {
  try {
    const { user_id, title, message, type } = req.body;

    if (!user_id || !title || !message || !type) {
      return errorResponse(res, 'user_id, title, message, dan type wajib diisi.', null, 400);
    }

    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      [user_id, title.trim(), message.trim(), type.trim()]
    );

    return successResponse(res, { id: result.insertId, title }, 'Notifikasi berhasil dikirim.', null, 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markNotificationRead,
  createNotification
};
