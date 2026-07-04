'use strict';
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

// GET /api/notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Notification.countDocuments({ user: req.user._id });
  const data  = await Notification.find({ user: req.user._id }).sort('-createdAt').skip(skip).limit(parseInt(limit));
  const unread = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ success: true, total, unread, data });
});

// PUT /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true, readAt: new Date() });
  res.json({ success: true });
});

// PUT /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

// DELETE /api/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
});
