'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/paymentsController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/me',               protect, ctrl.getMyPayments);
router.get('/earnings-summary', protect, requireRole('worker'), ctrl.earningsSummary);
router.post('/deposit',         protect, requireRole('employer'), ctrl.depositToEscrow);
router.post('/:id/release',     protect, requireRole('employer'), ctrl.releaseFunds);
router.post('/withdraw',        protect, requireRole('worker'), ctrl.withdraw);

module.exports = router;
