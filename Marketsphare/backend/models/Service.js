'use strict';
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  provider:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category:    { type: String, required: true, enum: ['seo', 'ppc', 'social', 'email', 'branding', 'analytics', 'content', 'strategy', 'other'] },

  packages: [{
    name:        { type: String, required: true },
    description: { type: String },
    price:       { type: Number, required: true },
    deliveryDays:{ type: Number, required: true },
    revisions:   { type: Number, default: 1 },
    features:    [String],
  }],

  gallery:    [{ url: String, caption: String }],
  tags:       [String],
  status:     { type: String, enum: ['active', 'paused', 'draft'], default: 'active' },

  rating:     { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:{ type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  viewCount:  { type: Number, default: 0 },

  reviews: [{
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    comment:String,
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

ServiceSchema.index({ provider: 1 });
ServiceSchema.index({ category: 1, status: 1 });
ServiceSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Service', ServiceSchema);
