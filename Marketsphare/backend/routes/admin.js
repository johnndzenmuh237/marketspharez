'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

const admin = [protect, requireRole('admin')];

router.get('/stats',              ...admin, ctrl.getPlatformStats);
router.get('/analytics',          ...admin, ctrl.getAnalytics);

router.get('/users',              ...admin, ctrl.getAllUsers);
router.put('/users/:id/suspend',  ...admin, ctrl.suspendUser);
router.put('/users/:id/reinstate',...admin, ctrl.reinstateUser);
router.delete('/users/:id',       ...admin, ctrl.deleteUser);

router.get('/jobs',               ...admin, ctrl.getAllJobs);
router.put('/jobs/:id/status',    ...admin, ctrl.updateJobStatus);

router.get('/payments',           ...admin, ctrl.getAllPayments);

router.get('/reports',            ...admin, ctrl.getAllReports);
router.put('/reports/:id',        ...admin, ctrl.resolveReport);

module.exports = router;
