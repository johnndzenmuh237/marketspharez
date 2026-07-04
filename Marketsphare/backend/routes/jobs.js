'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/jobsController');
const { protect, requireRole, optionalAuth } = require('../middleware/auth');

router.get('/',         optionalAuth, ctrl.getJobs);
router.get('/my',       protect, requireRole('employer', 'admin'), ctrl.getMyJobs);
router.get('/:id',      optionalAuth, ctrl.getJobById);
router.post('/',        protect, requireRole('employer', 'admin'), ctrl.createJob);
router.put('/:id',      protect, ctrl.updateJob);
router.delete('/:id',   protect, ctrl.deleteJob);
router.post('/:id/save',protect, ctrl.toggleSaveJob);

module.exports = router;
