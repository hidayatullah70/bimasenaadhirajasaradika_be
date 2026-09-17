const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (HRD, Operasional R/W; Direktur, Finance, Marketing R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), attendanceController.getAttendance);
router.post('/', authorize('direktur', 'hrd', 'operasional'), attendanceController.recordAttendance);
router.patch('/:id', authorize('direktur', 'hrd', 'operasional'), attendanceController.updateAttendance);

module.exports = router;
