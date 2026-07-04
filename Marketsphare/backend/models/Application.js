'use strict';
const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  job:      { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  worker:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  coverLetter: { type: String, default: '' },
  resumeUrl:   { type: String, default: '' },
  portfolio:   { type: String, default: '' },
  proposedRate:{ type: Number },

  status: {
    type: String,
    enum: ['submitted', 'in_review', 'interview', 'offer', 'hired', 'declined', 'withdrawn'],
    default: 'submitted',
  },
  statusHistory: [{
    status:  String,
    note:    String,
    changedAt: { type: Date, default: Date.now },
  }],

  interviewDate:  { type: Date },
  interviewNotes: { type: String },
  employerNote:   { type: String },
  workerNote:     { type: String },

  isWorkerRead:   { type: Boolean, default: true },
  isEmployerRead: { type: Boolean, default: false },
}, { timestamps: true });

ApplicationSchema.index({ job: 1, worker: 1 }, { unique: true });
ApplicationSchema.index({ worker: 1, status: 1 });
ApplicationSchema.index({ employer: 1, status: 1 });

module.exports = mongoose.model('Application', ApplicationSchema);
