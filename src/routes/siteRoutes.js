const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (Direktur, HRD, Operasional R/W; Finance & Marketing R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), siteController.getSites);
router.get('/:id', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), siteController.getSiteById);
router.post('/', authorize('direktur', 'hrd', 'operasional', 'marketing'), siteController.createSite);
router.patch('/:id', authorize('direktur', 'hrd', 'operasional', 'marketing'), siteController.updateSite);
router.delete('/:id', authorize('direktur', 'operasional'), siteController.deleteSite);

module.exports = router;
