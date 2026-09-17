/**
 * SOT Reference: 04-API-SPEC.md Section 9 (Query Convention)
 * Helper untuk pagination, sorting, dan sanitasi query parameters
 */

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function parseSorting(query, allowedColumns = ['id', 'created_at'], defaultSort = 'id', defaultOrder = 'DESC') {
  const sort = allowedColumns.includes(query.sort) ? query.sort : defaultSort;
  const order = (query.order && query.order.toUpperCase() === 'ASC') ? 'ASC' : defaultOrder;

  return { sort, order };
}

function buildMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

module.exports = {
  parsePagination,
  parseSorting,
  buildMeta
};
