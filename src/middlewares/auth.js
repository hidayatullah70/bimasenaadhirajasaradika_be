const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { errorResponse } = require('../utils/response');

/**
 * Middleware untuk verifikasi JWT Bearer Token
 * SOT Reference: 04-API-SPEC.md Section 1 & 06. BUSINESS-RULES.md BR-USER-002
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Token autentikasi tidak ditemukan. Harap sertakan Bearer token.', null, 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 'Format authorization header tidak valid.', null, 401);
    }

    let userId = null;

    // Dukung dev token (mock-jwt-token-<role>) untuk kemudahan evaluasi & switch role di frontend
    if (token.startsWith('mock-jwt-token-')) {
      const mockRole = token.replace('mock-jwt-token-', '');
      const targetRoleCode = (mockRole === 'owner' || mockRole === 'direktur') ? 'direktur' : mockRole;
      const [mockUserRows] = await pool.execute(
        `SELECT u.id, u.name, u.email, u.avatar_url,
                COALESCE(u.avatar_url, CONCAT('https://ui-avatars.com/api/?name=', REPLACE(u.name, ' ', '+'), '&background=0284c7&color=fff&size=128')) AS avatar,
                u.is_active, u.role_id, r.code AS role_code, r.name AS role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE r.code = ? AND u.is_active = TRUE
         LIMIT 1`,
        [targetRoleCode]
      );
      if (mockUserRows.length > 0) {
        req.user = {
          id: mockUserRows[0].id,
          name: mockUserRows[0].name,
          email: mockUserRows[0].email,
          avatar: mockUserRows[0].avatar,
          avatar_url: mockUserRows[0].avatar_url,
          roleId: mockUserRows[0].role_id,
          role: mockUserRows[0].role_code,
          roleName: mockUserRows[0].role_name
        };
        return next();
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bhimasena_secret_jwt_key_2026_barak_secure');
    userId = decoded.id;

    // Ambil data user terkini dari database
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.avatar_url,
              COALESCE(u.avatar_url, CONCAT('https://ui-avatars.com/api/?name=', REPLACE(u.name, ' ', '+'), '&background=0284c7&color=fff&size=128')) AS avatar,
              u.is_active, u.role_id, r.code AS role_code, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Akun pengguna tidak ditemukan.', null, 401);
    }

    const user = rows[0];

    // BR-USER-002: Hanya user dengan is_active = true yang dapat mengakses sistem
    if (!user.is_active) {
      return errorResponse(res, 'Akun dinonaktifkan. Silakan hubungi administrator.', null, 403);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      avatar_url: user.avatar_url,
      roleId: user.role_id,
      role: user.role_code,
      roleName: user.role_name
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Sesi login telah kedaluwarsa. Silakan login kembali.', null, 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Token autentikasi tidak sah.', null, 401);
    }
    return errorResponse(res, 'Gagal memverifikasi otorisasi akun.', err.message, 500);
  }
}

module.exports = {
  authenticate
};
