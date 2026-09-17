const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticate } = require('../middlewares/auth');

// SOT Reference: Permission Matrix (Activities/Audit: Read for all authenticated roles)
router.use(authenticate);

router.get('/', activityController.getActivities);

module.exports = router;
