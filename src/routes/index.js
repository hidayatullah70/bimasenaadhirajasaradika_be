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
