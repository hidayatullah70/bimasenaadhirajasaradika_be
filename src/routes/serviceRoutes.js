const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (Direktur, Marketing R/W; HRD, Finance, Operasional R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), serviceController.getServices);
router.get('/:id', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), serviceController.getServiceById);
router.post('/', authorize('direktur', 'marketing'), serviceController.createService);
router.patch('/:id', authorize('direktur', 'marketing'), serviceController.updateService);
router.delete('/:id', authorize('direktur'), serviceController.deleteService);

module.exports = router;
