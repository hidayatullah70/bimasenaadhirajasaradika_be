const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (Direktur, Marketing, Operasional R/W; HRD & Finance R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), clientController.getClients);
router.get('/:id', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), clientController.getClientById);
router.post('/', authorize('direktur', 'marketing', 'operasional'), clientController.createClient);
router.patch('/:id', authorize('direktur', 'marketing', 'operasional'), clientController.updateClient);
router.delete('/:id', authorize('direktur', 'marketing'), clientController.deleteClient);

module.exports = router;
