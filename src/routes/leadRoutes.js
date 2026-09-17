const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (Direktur, Marketing R/W; HRD, Finance, Operasional R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), leadController.getLeads);
router.get('/:id', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), leadController.getLeadById);
router.post('/', authorize('direktur', 'marketing'), leadController.createLead);
router.patch('/:id', authorize('direktur', 'marketing'), leadController.updateLead);
router.delete('/:id', authorize('direktur', 'marketing'), leadController.deleteLead);

module.exports = router;
