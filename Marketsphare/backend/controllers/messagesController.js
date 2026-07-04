'use strict';
const { Message, Conversation } = require('../models/Message');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

// GET /api/messages/conversations
exports.getConversations = asyncHandler(async (req, res) => {
  const convos = await Conversation.find({ participants: req.user._id })
    .populate('participants', 'fullName avatar jobTitle company')
    .sort('-lastMessageAt');
  res.json({ success: true, data: convos });
});

// GET /api/messages/:userId  — get messages with a specific user
exports.getMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const myId = req.user._id;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const messages = await Message.find({
    $or: [{ sender: myId, recipient: userId }, { sender: userId, recipient: myId }],
    isDeleted: false,
  }).sort('-createdAt').skip(skip).limit(parseInt(limit));

  // Mark received messages as read
  await Message.updateMany({ sender: userId, recipient: myId, isRead: false }, { isRead: true, readAt: new Date() });

  res.json({ success: true, data: messages.reverse() });
});

// POST /api/messages  — send a message
exports.sendMessage = asyncHandler(async (req, res) => {
  const { recipientId, content } = req.body;
  const msg = await Message.create({ sender: req.user._id, recipient: recipientId, content });

  // Update or create conversation record
  await Conversation.findOneAndUpdate(
    { participants: { $all: [req.user._id, recipientId] } },
    { lastMessage: content.substring(0, 100), lastMessageAt: new Date(), $addToSet: { participants: [req.user._id, recipientId] } },
    { upsert: true, new: true }
  );

  // Notify recipient
  await Notification.create({ user: recipientId, type: 'message', title: `New message from ${req.user.fullName}`, message: content.substring(0, 80), link: `/dashboard/messages.html` });

  res.status(201).json({ success: true, data: msg });
});

// DELETE /api/messages/:id  — soft delete
exports.deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
  if (msg.sender.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Not authorised.' });
  msg.isDeleted = true;
  await msg.save();
  res.json({ success: true, message: 'Message deleted.' });
});

// GET /api/messages/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({ recipient: req.user._id, isRead: false });
  res.json({ success: true, count });
});
