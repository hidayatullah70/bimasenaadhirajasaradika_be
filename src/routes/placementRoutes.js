const express = require('express');
const router = express.Router();
const placementController = require('../controllers/placementController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (Direktur, HRD, Operasional R/W; Finance & Marketing R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), placementController.getPlacements);
router.get('/:id', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), placementController.getPlacementById);
router.post('/', authorize('direktur', 'hrd', 'operasional'), placementController.createPlacement);
router.patch('/:id', authorize('direktur', 'hrd', 'operasional'), placementController.updatePlacement);
router.delete('/:id', authorize('direktur', 'operasional'), placementController.deletePlacement);

module.exports = router;
