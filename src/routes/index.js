const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const employeeRoutes = require('./employeeRoutes');
const clientRoutes = require('./clientRoutes');
const siteRoutes = require('./siteRoutes');
const serviceRoutes = require('./serviceRoutes');
const placementRoutes = require('./placementRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const leadRoutes = require('./leadRoutes');
const activityRoutes = require('./activityRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const publicRoutes = require('./publicRoutes');

// Base API v1 Index info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PT. Bhimasena Adhirajasa Radhika — Backend REST API v1',
    version: '1.0.0',
    status: 'active',
    documentation: 'sot/04-API-SPEC.md',
    endpoints: {
      health: '/api/v1/health',
      auth: {
        login: 'POST /api/v1/auth/login',
        me: 'GET /api/v1/auth/me',
        logout: 'POST /api/v1/auth/logout'
      },
      dashboard: 'GET /api/v1/dashboard/summary',
      public: {
        services: 'GET /api/v1/public/services',
        lead: 'POST /api/v1/public/lead'
      },
      resources: {
        employees: '/api/v1/employees',
        clients: '/api/v1/clients',
        sites: '/api/v1/sites',
        services: '/api/v1/services',
        placements: '/api/v1/placements',
        attendance: '/api/v1/attendance',
        invoices: '/api/v1/invoices',
        leads: '/api/v1/leads',
        activities: '/api/v1/activities',
        notifications: '/api/v1/notifications',
        users: '/api/v1/users'
      }
    }
  });
});

// Mount routes sesuai kontrak SOT 04-API-SPEC
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/clients', clientRoutes);
router.use('/sites', siteRoutes);
router.use('/services', serviceRoutes);
router.use('/placements', placementRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/leads', leadRoutes);
router.use('/activities', activityRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/public', publicRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'PT. Bhimasena Adhirajasa Radhika Backend API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
