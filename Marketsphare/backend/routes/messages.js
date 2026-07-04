'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/messagesController');
const { protect } = require('../middleware/auth');

router.get('/conversations',  protect, ctrl.getConversations);
router.get('/unread-count',   protect, ctrl.getUnreadCount);
router.get('/:userId',        protect, ctrl.getMessages);
router.post('/',              protect, ctrl.sendMessage);
router.delete('/:id',         protect, ctrl.deleteMessage);

module.exports = router;
