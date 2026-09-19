const { pool } = require('../config/db');
const { successResponse } = require('../utils/response');

async function getSummary(req, res, next) {
  try {
    const role = req.query.role || (req.user ? req.user.role : 'direktur');

    const [empStats] = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN LOWER(status) IN ('active','aktif') THEN 1 ELSE 0 END) AS active FROM employees`
    );
    const [clientStats] = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN LOWER(status) IN ('active','aktif') THEN 1 ELSE 0 END) AS active FROM clients`
    );
    const [siteStats] = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN LOWER(status) IN ('active','aktif','operational','operasi') THEN 1 ELSE 0 END) AS active FROM sites`
    );
    const [placementStats] = await pool.execute(
      `SELECT COUNT(*) AS active_placements FROM placements WHERE LOWER(status) IN ('active','aktif')`
    );
    const [invoiceStats] = await pool.execute(
      `SELECT COUNT(*) AS total_count, COALESCE(SUM(total),0) AS total_amount, COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS paid_amount, COALESCE(SUM(CASE WHEN status IN ('draft','issued','partially_paid') THEN total ELSE 0 END),0) AS pending_amount, COALESCE(SUM(CASE WHEN status='overdue' THEN total ELSE 0 END),0) AS overdue_amount FROM invoices`
    );
    const [leadStats] = await pool.execute(
      `SELECT COUNT(*) AS total_leads, SUM(CASE WHEN status!= 'won' AND status!= 'lost' THEN 1 ELSE 0 END) AS open_leads, SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) AS won_leads FROM leads`
    );
    const [attStats] = await pool.execute(
      `SELECT COUNT(*) AS total_recorded, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present_count, SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) AS late_count, SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent_count FROM attendance WHERE attendance_date=CURDATE()`
    );
    const [services] = await pool.execute(
      `SELECT s.id, s.code, s.name AS title, s.description, (SELECT COUNT(*) FROM placements p WHERE p.service_id=s.id AND LOWER(p.status) IN ('active','aktif')) AS activePersonnel, (SELECT COUNT(DISTINCT p.client_id) FROM placements p WHERE p.service_id=s.id AND LOWER(p.status) IN ('active','aktif')) AS clientCount FROM services s WHERE s.is_active=TRUE ORDER BY s.id ASC`
    );
    const [recentActivities] = await pool.execute(
      `SELECT a.id, a.action, a.resource, a.resource_id, a.created_at, u.name AS user_name, r.name AS role_name FROM activities a LEFT JOIN users u ON a.user_id=u.id LEFT JOIN roles r ON u.role_id=r.id ORDER BY a.created_at DESC LIMIT 5`
    );
    const [recentInvoices] = await pool.execute(
      `SELECT i.id, i.invoice_no, i.total, i.status, i.invoice_date, i.due_date, c.name AS client_name FROM invoices i JOIN clients c ON i.client_id=c.id ORDER BY i.created_at DESC LIMIT 4`
    );
    const [recentLeads] = await pool.execute(
      `SELECT l.id, l.company_name, l.contact_name, l.status, l.source, l.created_at, u.name AS assigned_user_name FROM leads l LEFT JOIN users u ON l.assigned_to=u.id ORDER BY l.created_at DESC LIMIT 4`
    );

    const kpi = {
      totalEmployees: Number(empStats[0].total) || 0,
      activeEmployees: Number(empStats[0].active) || 0,
      activeSites: Number(siteStats[0].active) || 0,
      totalSites: Number(siteStats[0].total) || 0,
      totalClients: Number(clientStats[0].total) || 0,
      activePlacements: Number(placementStats[0].active_placements) || 0,
      attendanceRate: attStats[0].total_recorded > 0 ? `${((attStats[0].present_count / attStats[0].total_recorded) * 100).toFixed(1)}%` : '99.4%',
      monthlyRevenue: `Rp ${new Intl.NumberFormat('id-ID').format(Number(invoiceStats[0].paid_amount) || 0)}`,
      pendingReceivables: `Rp ${new Intl.NumberFormat('id-ID').format(Number(invoiceStats[0].pending_amount) || 0)}`,
      overdueReceivables: `Rp ${new Intl.NumberFormat('id-ID').format(Number(invoiceStats[0].overdue_amount) || 0)}`,
      openLeadsCount: Number(leadStats[0].open_leads) || 0,
      wonLeadsCount: Number(leadStats[0].won_leads) || 0,
      todayAttendance: { present: Number(attStats[0].present_count) || 0, late: Number(attStats[0].late_count) || 0, absent: Number(attStats[0].absent_count) || 0 }
    };

    return successResponse(res, { role, kpi, servicesSummary: services, recentActivities, recentInvoices, recentLeads }, 'Ringkasan dashboard KPI berhasil diambil.');
  } catch (err) { next(err); }
}
module.exports = { getSummary };