'use strict';
const Job         = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

// GET /api/jobs
exports.getJobs = asyncHandler(async (req, res) => {
  const { category, jobType, q, status = 'published', page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = { status };
  if (category) filter.category = category;
  if (jobType)  filter.jobType  = jobType;
  if (q)        filter.$text    = { $search: q };

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Job.countDocuments(filter);
  const jobs  = await Job.find(filter).populate('employer', 'fullName company avatar').skip(skip).limit(parseInt(limit)).sort(sort);

  res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / limit), data: jobs });
});

// GET /api/jobs/:id
exports.getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('employer', 'fullName company avatar location createdAt');
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  job.viewCount += 1;
  await job.save();
  res.json({ success: true, data: job });
});

// POST /api/jobs
exports.createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({ ...req.body, employer: req.user._id });
  res.status(201).json({ success: true, data: job });
});

// PUT /api/jobs/:id
exports.updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  if (job.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorised to edit this job.' });

  const updated = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, data: updated });
});

// DELETE /api/jobs/:id
exports.deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  if (job.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorised to delete this job.' });
  await job.deleteOne();
  res.json({ success: true, message: 'Job deleted.' });
});

// POST /api/jobs/:id/save
exports.toggleSaveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  const userId  = req.user._id;
  const idx     = job.savedBy.indexOf(userId);
  const saved   = idx === -1;
  if (saved) job.savedBy.push(userId);
  else       job.savedBy.splice(idx, 1);
  await job.save();
  res.json({ success: true, saved, message: saved ? 'Job saved.' : 'Job unsaved.' });
});

// GET /api/jobs/my — employer's own postings
exports.getMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ employer: req.user._id }).sort('-createdAt');
  res.json({ success: true, count: jobs.length, data: jobs });
});
