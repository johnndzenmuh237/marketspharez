'use strict';
const User    = require('../models/User');
const { asyncHandler } = require('../middleware/error');
const path    = require('path');

// GET /api/users  — public search/browse
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, skill, q, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true, isSuspended: false };
  if (role)  filter.role  = role;
  if (skill) filter.skills = { $in: [new RegExp(skill, 'i')] };
  if (q)     filter.$or = [{ fullName: new RegExp(q, 'i') }, { jobTitle: new RegExp(q, 'i') }];

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter).select('fullName jobTitle avatar location skills hourlyRate role company createdAt').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });

  res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / limit), data: users });
});

// GET /api/users/:id
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -emailVerificationToken -passwordResetToken');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  user.profileViews += 1;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: user });
});

// PUT /api/users/me  — update own profile
exports.updateMe = asyncHandler(async (req, res) => {
  const allowed = ['fullName', 'bio', 'jobTitle', 'location', 'phone', 'website', 'hourlyRate', 'skills', 'company', 'portfolio'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: user.toPublicJSON() });
});

// POST /api/users/me/avatar
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true });
  res.json({ success: true, avatarUrl, data: user.toPublicJSON() });
});

// POST /api/users/me/resume
exports.uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const resumeUrl = `/uploads/resumes/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user._id, { resume: resumeUrl });
  res.json({ success: true, resumeUrl });
});

// DELETE /api/users/me
exports.deleteMe = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  res.json({ success: true, message: 'Account deactivated.' });
});
