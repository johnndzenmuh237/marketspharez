'use strict';
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType:  { type: String, enum: ['user', 'job', 'service', 'message'], required: true },
  targetId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  reason:      { type: String, required: true },
  description: { type: String },
  status:      { type: String, enum: ['open', 'under_review', 'resolved', 'dismissed'], default: 'open' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:  { type: Date },
  resolution:  { type: String },
}, { timestamps: true });

ReportSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model('Report', ReportSchema);
