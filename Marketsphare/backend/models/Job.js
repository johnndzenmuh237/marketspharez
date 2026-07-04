'use strict';
const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  employer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  category:  { type: String, required: true, enum: ['seo', 'ppc', 'social', 'email', 'content', 'branding', 'analytics', 'strategy', 'other'] },
  jobType:   { type: String, required: true, enum: ['full-time', 'part-time', 'contract', 'freelance'] },
  location:  { type: String, default: 'Remote — Anywhere' },

  salary: {
    type: { type: String, enum: ['hourly', 'monthly', 'fixed'] },
    min:  Number,
    max:  Number,
    currency: { type: String, default: 'USD' },
    display: String,
  },

  skills:       [{ type: String }],
  requirements: [{ type: String }],
  benefits:     [{ type: String }],

  status:    { type: String, enum: ['pending', 'published', 'closed', 'flagged'], default: 'published' },
  isFeatured:{ type: Boolean, default: false },
  expiresAt: { type: Date },

  applicationCount: { type: Number, default: 0 },
  viewCount:        { type: Number, default: 0 },

  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

JobSchema.index({ status: 1, category: 1 });
JobSchema.index({ employer: 1 });
JobSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Job', JobSchema);
