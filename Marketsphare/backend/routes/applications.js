'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/applicationsController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/',                   protect, requireRole('worker'), ctrl.apply);
router.get('/me',                  protect, requireRole('worker'), ctrl.getMyApplications);
router.get('/employer',            protect, requireRole('employer', 'admin'), ctrl.getEmployerApplications);
router.get('/:id',                 protect, ctrl.getApplicationById);
router.put('/:id/status',          protect, requireRole('employer', 'admin'), ctrl.updateStatus);
router.put('/:id/withdraw',        protect, requireRole('worker'), ctrl.withdraw);

module.exports = router;
