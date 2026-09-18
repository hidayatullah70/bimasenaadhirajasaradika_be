const express = require('express');
const router = express.Router();
const itController = require('../controllers/itController');
const { authenticate } = require('../middlewares/auth');

// Assets CRUD Routes
router.get('/assets', authenticate, itController.getAssets);
router.post('/assets', authenticate, itController.createAsset);
router.put('/assets/:id', authenticate, itController.updateAsset);
router.delete('/assets/:id', authenticate, itController.deleteAsset);

// Tickets CRUD Routes
router.get('/tickets', authenticate, itController.getTickets);
router.post('/tickets', authenticate, itController.createTicket);
router.put('/tickets/:id', authenticate, itController.updateTicket);
router.delete('/tickets/:id', authenticate, itController.deleteTicket);

module.exports = router;