'use strict';
const User         = require('../models/User');
const Job          = require('../models/Job');
const Application  = require('../models/Application');
const Payment      = require('../models/Payment');
const Report       = require('../models/Report');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

// GET /api/admin/stats
exports.getPlatformStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalJobs, totalApplications, openReports] = await Promise.all([
    User.countDocuments(),
    Job.countDocuments(),
    Application.countDocuments(),
    Report.countDocuments({ status: 'open' }),
  ]);

  const revenueAgg = await Payment.aggregate([
    { $match: { type: 'escrow_deposit', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$platformFee' } } },
  ]);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthVolumeAgg = await Payment.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalJobs,
      totalApplications,
      openReports,
      totalRevenue:  (revenueAgg[0] || {}).total || 0,
      monthlyVolume: (monthVolumeAgg[0] || {}).total || 0,
    },
  });
});

// GET /api/admin/users
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, status, q, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (role)   filter.role = role;
  if (status === 'suspended') filter.isSuspended = true;
  if (status === 'unverified') filter.isEmailVerified = false;
  if (q) filter.$or = [{ fullName: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter).sort('-createdAt').skip(skip).limit(parseInt(limit));
  res.json({ success: true, total, data: users });
});

// PUT /api/admin/users/:id/suspend
exports.suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: true, suspendReason: req.body.reason || '' }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  await Notification.create({ user: user._id, type: 'system', title: 'Account Suspended', message: 'Your account has been suspended. Please contact support for details.' });
  res.json({ success: true, message: 'User suspended.', data: user });
});

// PUT /api/admin/users/:id/reinstate
exports.reinstateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: false, suspendReason: '' }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'User reinstated.', data: user });
});

// DELETE /api/admin/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'User permanently deleted.' });
});

// GET /api/admin/jobs
exports.getAllJobs = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Job.countDocuments(filter);
  const jobs  = await Job.find(filter).populate('employer', 'fullName email company').sort('-createdAt').skip(skip).limit(parseInt(limit));
  res.json({ success: true, total, data: jobs });
});

// PUT /api/admin/jobs/:id/status
exports.updateJobStatus = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  res.json({ success: true, data: job });
});

// GET /api/admin/payments
exports.getAllPayments = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type)   filter.type   = type;
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Payment.countDocuments(filter);
  const pmts  = await Payment.find(filter).populate('payer payee', 'fullName email').sort('-createdAt').skip(skip).limit(parseInt(limit));
  res.json({ success: true, total, data: pmts });
});

// GET /api/admin/reports
exports.getAllReports = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const reports = await Report.find(filter).populate('reporter', 'fullName email').sort('-createdAt');
  res.json({ success: true, count: reports.length, data: reports });
});

// PUT /api/admin/reports/:id
exports.resolveReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(req.params.id, { status: req.body.status, resolution: req.body.resolution, resolvedBy: req.user._id, resolvedAt: new Date() }, { new: true });
  if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
  res.json({ success: true, data: report });
});

// GET /api/admin/analytics
exports.getAnalytics = asyncHandler(async (req, res) => {
  const days   = parseInt(req.query.days) || 7;
  const since  = new Date(Date.now() - days * 86400000);

  const [newUsers, newJobs, newApplications] = await Promise.all([
    User.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Job.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Application.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);

  const categoryBreakdown = await Job.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
  const roleBreakdown     = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

  res.json({ success: true, data: { newUsers, newJobs, newApplications, categoryBreakdown, roleBreakdown } });
});
