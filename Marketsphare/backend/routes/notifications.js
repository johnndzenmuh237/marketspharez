'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/notificationsController');
const { protect } = require('../middleware/auth');

router.get('/',              protect, ctrl.getNotifications);
router.put('/read-all',      protect, ctrl.markAllRead);
router.put('/:id/read',      protect, ctrl.markRead);
router.delete('/:id',        protect, ctrl.deleteNotification);

module.exports = router;
