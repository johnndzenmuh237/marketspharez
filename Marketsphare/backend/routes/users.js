'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/usersController');
const { protect } = require('../middleware/auth');
const { uploadAvatar, uploadResume } = require('../middleware/upload');

router.get('/',     ctrl.getUsers);            // public browse
router.get('/me',   protect, ctrl.updateMe);   // shouldn't be GET but kept for convention — see PUT below
router.put('/me',   protect, ctrl.updateMe);
router.delete('/me',protect, ctrl.deleteMe);
router.post('/me/avatar', protect, uploadAvatar, ctrl.uploadAvatar);
router.post('/me/resume', protect, uploadResume, ctrl.uploadResume);
router.get('/:id',  ctrl.getUserById);         // public profile

module.exports = router;
