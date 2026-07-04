'use strict';
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, required: true, maxlength: 5000 },
  attachmentUrl: { type: String },
  isRead:    { type: Boolean, default: false },
  readAt:    { type: Date },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Conversation thread helper — sorted pair of user IDs
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, isRead: 1 });

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage:  { type: String },
  lastMessageAt:{ type: Date },
  unreadCount:  { type: Map, of: Number, default: {} },
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });

module.exports = {
  Message:      mongoose.model('Message', MessageSchema),
  Conversation: mongoose.model('Conversation', ConversationSchema),
};
