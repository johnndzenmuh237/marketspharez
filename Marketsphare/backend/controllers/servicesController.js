'use strict';
const Service = require('../models/Service');
const { asyncHandler } = require('../middleware/error');

// GET /api/services
exports.getServices = asyncHandler(async (req, res) => {
  const { category, q, sort = '-orderCount', page = 1, limit = 20 } = req.query;
  const filter = { status: 'active' };
  if (category) filter.category = category;
  if (q)        filter.$text    = { $search: q };
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Service.countDocuments(filter);
  const data  = await Service.find(filter).populate('provider', 'fullName avatar jobTitle location').skip(skip).limit(parseInt(limit)).sort(sort);
  res.json({ success: true, total, data });
});

// GET /api/services/:id
exports.getServiceById = asyncHandler(async (req, res) => {
  const svc = await Service.findById(req.params.id).populate('provider', 'fullName avatar jobTitle location totalEarnings createdAt').populate('reviews.user', 'fullName avatar');
  if (!svc) return res.status(404).json({ success: false, message: 'Service not found.' });
  svc.viewCount += 1;
  await svc.save();
  res.json({ success: true, data: svc });
});

// POST /api/services
exports.createService = asyncHandler(async (req, res) => {
  if (req.user.role !== 'worker') return res.status(403).json({ success: false, message: 'Only workers can list services.' });
  const svc = await Service.create({ ...req.body, provider: req.user._id });
  res.status(201).json({ success: true, data: svc });
});

// PUT /api/services/:id
exports.updateService = asyncHandler(async (req, res) => {
  const svc = await Service.findById(req.params.id);
  if (!svc) return res.status(404).json({ success: false, message: 'Service not found.' });
  if (svc.provider.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorised.' });
  const updated = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, data: updated });
});

// DELETE /api/services/:id
exports.deleteService = asyncHandler(async (req, res) => {
  const svc = await Service.findById(req.params.id);
  if (!svc) return res.status(404).json({ success: false, message: 'Service not found.' });
  if (svc.provider.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorised.' });
  await svc.deleteOne();
  res.json({ success: true, message: 'Service deleted.' });
});

// POST /api/services/:id/review
exports.addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const svc = await Service.findById(req.params.id);
  if (!svc) return res.status(404).json({ success: false, message: 'Service not found.' });
  svc.reviews.push({ user: req.user._id, rating, comment });
  svc.reviewCount = svc.reviews.length;
  svc.rating = +(svc.reviews.reduce((s, r) => s + r.rating, 0) / svc.reviewCount).toFixed(2);
  await svc.save();
  res.status(201).json({ success: true, data: svc });
});

// GET /api/services/mine
exports.getMyServices = asyncHandler(async (req, res) => {
  const svcs = await Service.find({ provider: req.user._id }).sort('-createdAt');
  res.json({ success: true, count: svcs.length, data: svcs });
});
