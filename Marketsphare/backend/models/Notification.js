'use strict';
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, enum: ['application', 'message', 'payment', 'job_match', 'review', 'system'], required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  link:    { type: String },
  isRead:  { type: Boolean, default: false },
  readAt:  { type: Date },
  meta:    { type: Map, of: String },
}, { timestamps: true });

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
