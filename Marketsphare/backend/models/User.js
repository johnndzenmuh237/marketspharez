'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  fullName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 8, select: false },
  role:         { type: String, enum: ['worker', 'employer', 'admin'], default: 'worker' },
  avatar:       { type: String, default: '' },
  bio:          { type: String, default: '', maxlength: 800 },
  jobTitle:     { type: String, default: '' },
  location:     { type: String, default: '' },
  website:      { type: String, default: '' },
  phone:        { type: String, default: '' },
  hourlyRate:   { type: Number, default: 0 },
  skills:       [{ type: String }],
  resume:       { type: String, default: '' },
  portfolio:    [{ url: String, title: String }],

  // Company info (for employers)
  company: {
    name:        { type: String, default: '' },
    description: { type: String, default: '' },
    website:     { type: String, default: '' },
    size:        { type: String, default: '' },
    logo:        { type: String, default: '' },
  },

  // Auth
  isEmailVerified:        { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetToken:     { type: String, select: false },
  passwordResetExpires:   { type: Date, select: false },

  // Status
  isActive:     { type: Boolean, default: true },
  isSuspended:  { type: Boolean, default: false },
  suspendReason:{ type: String, default: '' },

  // Subscription
  plan:         { type: String, enum: ['free', 'employer', 'agency'], default: 'free' },
  planExpires:  { type: Date },

  // Stats
  totalEarnings:  { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  profileViews:   { type: Number, default: 0 },

  lastLogin:    { type: Date },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

UserSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return token;
};

UserSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ skills: 1 });

module.exports = mongoose.model('User', UserSchema);
