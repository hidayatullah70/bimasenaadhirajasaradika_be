const { errorResponse } = require('../utils/response');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Unhandled Error]', err.stack || err.message);

  // JSON parse error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Sintaks JSON request body tidak valid.', null, 400);
  }

  // MySQL specific errors
  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'Data duplikat: record dengan identifier tersebut sudah terdaftar.', { dbError: err.sqlMessage }, 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return errorResponse(res, 'Integritas data gagal: Foreign key relasi tidak ditemukan di database.', { dbError: err.sqlMessage }, 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return errorResponse(res, 'Data tidak dapat dihapus karena masih digunakan sebagai referensi di tabel lain.', { dbError: err.sqlMessage }, 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';

  return errorResponse(
    res,
    message,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null,
    statusCode
  );
}

module.exports = {
  errorHandler
};
