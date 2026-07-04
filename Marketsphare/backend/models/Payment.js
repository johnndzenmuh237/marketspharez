'use strict';
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  payer:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payee:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  job:         { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },

  amount:       { type: Number, required: true },
  currency:     { type: String, default: 'USD' },
  platformFee:  { type: Number, default: 0 },
  workerAmount: { type: Number, default: 0 },

  type: {
    type: String,
    enum: ['escrow_deposit', 'escrow_release', 'withdrawal', 'subscription', 'refund'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_escrow', 'completed', 'failed', 'refunded', 'disputed'],
    default: 'pending',
  },

  stripePaymentIntentId: { type: String },
  stripeTransferId:      { type: String },

  description: { type: String },
  metadata:    { type: Map, of: String },

  releasedAt:  { type: Date },
  failedAt:    { type: Date },
  failReason:  { type: String },
}, { timestamps: true });

PaymentSchema.index({ payer: 1, status: 1 });
PaymentSchema.index({ payee: 1, status: 1 });
PaymentSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
