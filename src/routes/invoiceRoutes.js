const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (Direktur, Finance R/W; HRD, Marketing, Operasional R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), invoiceController.getInvoices);
router.get('/:id', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), invoiceController.getInvoiceById);
router.post('/', authorize('direktur', 'finance'), invoiceController.createInvoice);
router.patch('/:id', authorize('direktur', 'finance'), invoiceController.updateInvoice);
router.delete('/:id', authorize('direktur', 'finance'), invoiceController.deleteInvoice);

module.exports = router;
