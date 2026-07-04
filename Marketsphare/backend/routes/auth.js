'use strict';
const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/error');

const pwRules = body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.');

router.post('/register',
  body('fullName').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  pwRules,
  body('role').optional().isIn(['worker', 'employer']),
  validate, ctrl.register);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate, ctrl.login);

router.get('/me',              protect, ctrl.getMe);
router.put('/change-password', protect,
  body('currentPassword').notEmpty(),
  pwRules,
  validate, ctrl.changePassword);

router.post('/verify-email',        body('token').notEmpty(), validate, ctrl.verifyEmail);
router.post('/resend-verification', body('email').isEmail().normalizeEmail(), validate, ctrl.resendVerification);
router.post('/forgot-password',     body('email').isEmail().normalizeEmail(), validate, ctrl.forgotPassword);
router.post('/reset-password',
  body('token').notEmpty(),
  pwRules,
  validate, ctrl.resetPassword);

module.exports = router;
