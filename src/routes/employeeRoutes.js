const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: Permission Matrix (Direktur, HRD, Operasional R/W; Finance & Marketing R)
router.use(authenticate);

router.get('/', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), employeeController.getEmployees);
router.get('/:id', authorize('direktur', 'hrd', 'finance', 'marketing', 'operasional'), employeeController.getEmployeeById);
router.post('/', authorize('direktur', 'hrd', 'operasional'), employeeController.createEmployee);
router.patch('/:id', authorize('direktur', 'hrd', 'operasional'), employeeController.updateEmployee);
router.delete('/:id', authorize('direktur', 'hrd'), employeeController.deleteEmployee);

module.exports = router;
