const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.post('/contact', publicController.submitContactInquiry);
router.get('/services', publicController.getPublicServices);

module.exports = router;
