const { pool } = require('../config/db');

/**
 * SOT Reference: 06. BUSINESS-RULES.md Section 14 (Audit Rules)
 * Mencatat riwayat perubahan penting ke tabel `activities`
 *
 * @param {Object} params
 * @param {number|null} params.userId
 * @param {string} params.action - CREATE, UPDATE, DELETE, LOGIN, STATUS_CHANGE
 * @param {string} params.resource - user, employee, client, site, placement, invoice, lead, attendance
 * @param {number|null} params.resourceId
 * @param {Object|null} params.beforeData
 * @param {Object|null} params.afterData
 */
async function logActivity({ userId = null, action, resource, resourceId = null, beforeData = null, afterData = null }) {
  try {
    const beforeJson = beforeData ? JSON.stringify(beforeData) : null;
    const afterJson = afterData ? JSON.stringify(afterData) : null;

    await pool.execute(
      `INSERT INTO activities (user_id, action, resource, resource_id, before_data, after_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, resource, resourceId, beforeJson, afterJson]
    );
  } catch (err) {
    // Audit log failure should not crash the main operational request, but warn the developer
    console.error('[Audit Log Error]', err.message);
  }
}

module.exports = {
  logActivity
};
