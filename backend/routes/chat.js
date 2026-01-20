import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all chat messages (paginated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await ChatMessage
      .find()
      .sort({ timestamp: 1 }) // Oldest first
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments();

    res.json({
      messages,
      total,
      hasMore: skip + messages.length < total
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Post a new message (REST fallback)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const newMessage = new ChatMessage({
      userId: req.user._id,
      teamName: req.user.teamName,
      message: message.trim(),
      isAdmin: req.user.role === 'admin'
    });

    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// Delete a message (own message or admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Get user ID from either id or _id field in JWT token
    const userId = req.user.id || req.user._id;

    // Check if user is admin or owns the message
    if (req.user.role !== 'admin' && String(message.userId) !== String(userId)) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await ChatMessage.findByIdAndDelete(req.params.id);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
