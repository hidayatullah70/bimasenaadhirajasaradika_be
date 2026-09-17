const { errorResponse } = require('../utils/response');

/**
 * Middleware untuk validasi peran (Role-Based Access Control)
 * SOT Reference: 06. BUSINESS-RULES.md Section 3 (Permission Matrix)
 *
 * @param  {...string} allowedRoles - Daftar role code yang diizinkan (e.g. 'direktur', 'hrd')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 'Akses ditolak. Pengguna belum terautentikasi.', null, 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Akses ditolak. Peran '${req.user.role}' tidak memiliki izin untuk resource ini.`,
        { requiredRoles: allowedRoles, currentRole: req.user.role },
        403
      );
    }

    next();
  };
}

module.exports = {
  authorize
};
