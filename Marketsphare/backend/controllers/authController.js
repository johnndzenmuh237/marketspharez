'use strict';
const crypto     = require('crypto');
const jwt        = require('jsonwebtoken');
const User       = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail, templates } = require('../config/mailer');
const { asyncHandler } = require('../middleware/error');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({ success: true, token, user: user.toPublicJSON() });
};

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

  const user = await User.create({ fullName, email, password, role: role || 'worker' });
  const rawToken = user.generateVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyLink = `${process.env.FRONTEND_URL}/auth/verify-email.html?token=${rawToken}`;
  try { await sendEmail({ to: email, subject: 'Verify your Marketsphare email', html: templates.verifyEmail(fullName, verifyLink) }); }
  catch (e) { console.error('Email send failed:', e.message); }

  await Notification.create({ user: user._id, type: 'system', title: 'Welcome to Marketsphare!', message: 'Complete your profile to get AI-matched to the best opportunities.' });

  sendToken(user, 201, res);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  if (user.isSuspended)
    return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  sendToken(user, 200, res);
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

// POST /api/auth/verify-email
exports.verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({ emailVerificationToken: hashed, emailVerificationExpires: { $gt: Date.now() } }).select('+emailVerificationToken +emailVerificationExpires');
  if (!user) return res.status(400).json({ success: false, message: 'Verification token is invalid or has expired.' });

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Email verified successfully.' });
});

// POST /api/auth/resend-verification
exports.resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ success: false, message: 'No account found with that email.' });
  if (user.isEmailVerified) return res.json({ success: true, message: 'Email is already verified.' });

  const rawToken = user.generateVerificationToken();
  await user.save({ validateBeforeSave: false });
  const verifyLink = `${process.env.FRONTEND_URL}/auth/verify-email.html?token=${rawToken}`;
  await sendEmail({ to: user.email, subject: 'Verify your Marketsphare email', html: templates.verifyEmail(user.fullName, verifyLink) });
  res.json({ success: true, message: 'Verification email resent.' });
});

// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ success: false, message: 'No account found with that email.' });

  const rawToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password.html?token=${rawToken}`;
  try {
    await sendEmail({ to: user.email, subject: 'Reset your Marketsphare password', html: templates.resetPassword(user.fullName, resetLink) });
    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (e) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ success: false, message: 'Failed to send email. Please try again.' });
  }
});

// POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: Date.now() } }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired.' });

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  sendToken(user, 200, res);
});

// PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword)))
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  user.password = req.body.newPassword;
  await user.save();
  sendToken(user, 200, res);
});
