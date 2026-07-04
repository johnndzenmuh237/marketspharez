'use strict';
const Payment      = require('../models/Payment');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail, templates } = require('../config/mailer');
const { asyncHandler } = require('../middleware/error');

const PLATFORM_FEE_PCT = 0.05; // 5%

// GET /api/payments/me
exports.getMyPayments = asyncHandler(async (req, res) => {
  const { type, status, page = 1, limit = 20 } = req.query;
  const filter = { $or: [{ payer: req.user._id }, { payee: req.user._id }] };
  if (type)   filter.type   = type;
  if (status) filter.status = status;
  const skip   = (parseInt(page) - 1) * parseInt(limit);
  const total  = await Payment.countDocuments(filter);
  const pmts   = await Payment.find(filter).populate('payer payee', 'fullName company').populate('job', 'title').skip(skip).limit(parseInt(limit)).sort('-createdAt');
  res.json({ success: true, total, data: pmts });
});

// POST /api/payments/deposit  — employer deposits to escrow
exports.depositToEscrow = asyncHandler(async (req, res) => {
  const { applicationId, amount, jobId } = req.body;
  const platformFee  = +(amount * PLATFORM_FEE_PCT).toFixed(2);
  const workerAmount = +(amount - platformFee).toFixed(2);

  const payment = await Payment.create({
    payer: req.user._id,
    application: applicationId,
    job: jobId,
    amount,
    platformFee,
    workerAmount,
    type: 'escrow_deposit',
    status: 'in_escrow',
    description: `Escrow deposit for application ${applicationId}`,
  });

  res.status(201).json({ success: true, data: payment, message: 'Funds held in escrow.' });
});

// POST /api/payments/:id/release  — employer releases funds to worker
exports.releaseFunds = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('payee', 'fullName email');
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
  if (payment.payer.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Not authorised to release this payment.' });
  if (payment.status !== 'in_escrow')
    return res.status(400).json({ success: false, message: 'Payment is not in escrow.' });

  payment.status    = 'completed';
  payment.releasedAt = new Date();
  await payment.save();

  // Credit worker balance
  await User.findByIdAndUpdate(payment.payee._id, { $inc: { totalEarnings: payment.workerAmount, pendingBalance: payment.workerAmount } });

  await Notification.create({ user: payment.payee._id, type: 'payment', title: 'Payment Released 💰', message: `$${payment.workerAmount} has been released to your account.`, link: '/dashboard/earnings.html' });

  try { await sendEmail({ to: payment.payee.email, subject: 'Payment Released — Marketsphare', html: templates.paymentReleased(payment.payee.fullName, payment.workerAmount, 'Your project') }); }
  catch (e) { console.error('Email error:', e.message); }

  res.json({ success: true, data: payment, message: 'Funds released to worker.' });
});

// POST /api/payments/withdraw  — worker withdraws balance
exports.withdraw = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.user._id);
  if (amount > user.pendingBalance)
    return res.status(400).json({ success: false, message: 'Insufficient balance.' });
  if (amount < 25)
    return res.status(400).json({ success: false, message: 'Minimum withdrawal is $25.' });

  user.pendingBalance -= amount;
  await user.save({ validateBeforeSave: false });

  await Payment.create({ payer: req.user._id, amount, type: 'withdrawal', status: 'completed', description: 'Withdrawal to bank account' });

  res.json({ success: true, message: `$${amount} withdrawal initiated.` });
});

// GET /api/payments/earnings-summary  — worker stats
exports.earningsSummary = asyncHandler(async (req, res) => {
  const user     = await User.findById(req.user._id);
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const monthEarnings = await Payment.aggregate([
    { $match: { payee: req.user._id, status: 'completed', type: 'escrow_release', createdAt: { $gte: thisMonth } } },
    { $group: { _id: null, total: { $sum: '$workerAmount' } } },
  ]);
  res.json({ success: true, data: { totalEarnings: user.totalEarnings, pendingBalance: user.pendingBalance, thisMonth: (monthEarnings[0] || {}).total || 0 } });
});
