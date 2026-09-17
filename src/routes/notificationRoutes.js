const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markNotificationRead);
router.post('/:id/read', notificationController.markNotificationRead); // Compatibility
router.post('/', notificationController.createNotification);

module.exports = router;
