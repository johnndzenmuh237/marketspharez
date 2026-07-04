'use strict';
const Application  = require('../models/Application');
const Job          = require('../models/Job');
const Notification = require('../models/Notification');
const { sendEmail, templates } = require('../config/mailer');
const { asyncHandler } = require('../middleware/error');

// POST /api/applications  — worker applies to a job
exports.apply = asyncHandler(async (req, res) => {
  const { jobId, coverLetter, proposedRate } = req.body;
  const job = await Job.findById(jobId).populate('employer', 'fullName email');
  if (!job)             return res.status(404).json({ success: false, message: 'Job not found.' });
  if (job.status !== 'published') return res.status(400).json({ success: false, message: 'This job is no longer accepting applications.' });

  const existing = await Application.findOne({ job: jobId, worker: req.user._id });
  if (existing) return res.status(409).json({ success: false, message: 'You have already applied to this job.' });

  const application = await Application.create({
    job: jobId, worker: req.user._id, employer: job.employer._id,
    coverLetter, proposedRate,
    resumeUrl: req.user.resume,
    statusHistory: [{ status: 'submitted', note: 'Application submitted.' }],
  });

  job.applicationCount += 1;
  await job.save();

  // Notify employer
  await Notification.create({ user: job.employer._id, type: 'application', title: 'New Application Received', message: `${req.user.fullName} applied for ${job.title}`, link: `/dashboard/applications.html` });

  // Email worker
  try { await sendEmail({ to: req.user.email, subject: `Application Received — ${job.title}`, html: templates.applicationReceived(req.user.fullName, job.title, job.employer.fullName) }); }
  catch (e) { console.error('Email error:', e.message); }

  res.status(201).json({ success: true, data: application });
});

// GET /api/applications/me  — worker's own applications
exports.getMyApplications = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { worker: req.user._id };
  if (status) filter.status = status;
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Application.countDocuments(filter);
  const apps  = await Application.find(filter).populate('job', 'title category salary jobType').populate('employer', 'fullName company').skip(skip).limit(parseInt(limit)).sort('-createdAt');
  res.json({ success: true, total, data: apps });
});

// GET /api/applications/employer  — employer's received applications
exports.getEmployerApplications = asyncHandler(async (req, res) => {
  const { jobId, status } = req.query;
  const filter = { employer: req.user._id };
  if (jobId)  filter.job    = jobId;
  if (status) filter.status = status;
  const apps = await Application.find(filter).populate('worker', 'fullName avatar jobTitle skills hourlyRate resume').populate('job', 'title').sort('-createdAt');
  res.json({ success: true, count: apps.length, data: apps });
});

// GET /api/applications/:id
exports.getApplicationById = asyncHandler(async (req, res) => {
  const app = await Application.findById(req.params.id).populate('job').populate('worker', '-password').populate('employer', 'fullName company');
  if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
  const uid = req.user._id.toString();
  if (app.worker._id.toString() !== uid && app.employer._id.toString() !== uid && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorised.' });
  res.json({ success: true, data: app });
});

// PUT /api/applications/:id/status  — employer updates status
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const app = await Application.findById(req.params.id).populate('worker', 'fullName email').populate('job', 'title');
  if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
  if (app.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorised.' });

  app.status = status;
  app.statusHistory.push({ status, note: note || '' });
  app.isWorkerRead = false;
  await app.save();

  await Notification.create({ user: app.worker._id, type: 'application', title: `Application Update — ${app.job.title}`, message: `Your application status changed to: ${status}`, link: `/dashboard/applications.html` });

  res.json({ success: true, data: app });
});

// DELETE /api/applications/:id  — worker withdraws
exports.withdraw = asyncHandler(async (req, res) => {
  const app = await Application.findById(req.params.id);
  if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
  if (app.worker.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Not authorised.' });
  app.status = 'withdrawn';
  await app.save();
  res.json({ success: true, message: 'Application withdrawn.' });
});
