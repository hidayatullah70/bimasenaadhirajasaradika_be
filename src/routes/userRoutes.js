const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// SOT Reference: 06. BUSINESS-RULES.md Permission Matrix: Users & Roles are Direktur R/W
router.use(authenticate);

router.get('/', authorize('direktur'), userController.getUsers);
router.post('/', authorize('direktur'), userController.createUser);
router.get('/roles', authorize('direktur'), userController.getRoles);
router.get('/:id', authorize('direktur'), userController.getUserById);
router.patch('/:id', authorize('direktur'), userController.updateUser);
router.delete('/:id', authorize('direktur'), userController.deleteUser);

module.exports = router;
