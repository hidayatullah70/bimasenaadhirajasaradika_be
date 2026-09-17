/**
 * SOT Reference: 04-API-SPEC.md Section 1
 * Standard response helpers
 */

function successResponse(res, data = {}, message = 'OK', meta = null, statusCode = 200) {
  const response = {
    success: true,
    message,
    data
  };

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

function errorResponse(res, message = 'Terjadi kesalahan sistem', errors = null, statusCode = 400) {
  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse
};
