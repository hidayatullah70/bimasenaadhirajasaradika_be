const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/v1/public/contact
 * SOT Reference: 04-API-SPEC.md Section 8 & 06. BUSINESS-RULES.md Section 13 (BR-CONTACT-001 s/d 003)
 */
async function submitContactInquiry(req, res, next) {
  try {
    const { name, email, phone, contact, company, message, service } = req.body;

    const contactPerson = name || '';
    const contactInfo = contact || email || phone || '';
    const inquiryMessage = message || '';

    // BR-CONTACT-001 & BR-CONTACT-002: Backend validation
    if (!contactPerson.trim() || !contactInfo.trim() || !inquiryMessage.trim()) {
      return errorResponse(res, 'Nama, informasi kontak (email/telepon), dan pesan wajib diisi.', null, 400);
    }

    const companyName = company ? company.trim() : `Inquiry dari ${contactPerson.trim()}`;
    const detectedEmail = email || (contactInfo.includes('@') ? contactInfo : null);
    const detectedPhone = phone || (!contactInfo.includes('@') ? contactInfo : null);
    const notes = `Layanan diminati: ${service || 'Umum'}\nPesan:\n${inquiryMessage.trim()}`;

    // Otomatis masukkan ke pipeline leads (Marketing)
    const [result] = await pool.execute(
      `INSERT INTO leads (company_name, contact_name, phone, email, source, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Website Landing Page', 'new', ?, NOW(), NOW())`,
      [companyName, contactPerson.trim(), detectedPhone, detectedEmail, notes]
    );

    const leadId = result.insertId;

    // Kirim notifikasi ke user Marketing & Direktur
    const [marketingUsers] = await pool.execute(
      `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.code IN ('marketing', 'direktur') AND u.is_active = TRUE`
    );

    for (const u of marketingUsers) {
      await pool.execute(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'lead', FALSE, NOW())`,
        [
          u.id,
          'Pesan Kontak Baru dari Website',
          `Inquiry baru diterima dari ${contactPerson.trim()} (${companyName}). Silakan tindak lanjuti.`
        ]
      );
    }

    // BR-CONTACT-003: Public user tidak boleh melihat data internal apa pun
    return successResponse(
      res,
      {
        inquiryId: leadId,
        receivedAt: new Date().toISOString()
      },
      'Terima kasih! Pesan Anda telah kami terima dan tim PT. Bhimasena Adhirajasa Radhika akan segera menghubungi Anda.',
      null,
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/public/services
 * SOT Reference: 04-API-SPEC.md Section 8
 */
async function getPublicServices(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, code, name, description FROM services WHERE is_active = TRUE ORDER BY id ASC'
    );

    return successResponse(res, rows, 'Daftar layanan publik berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitContactInquiry,
  getPublicServices
};
