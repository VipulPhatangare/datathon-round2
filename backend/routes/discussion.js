import express from 'express';
import Discussion from '../models/Discussion.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/discussion
 * Get all discussion messages with pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get top-level comments
    const discussions = await Discussion.find({ parentId: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Populate user info
    const userIds = discussions.map(d => d.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('teamName leaderName role')
      .lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Get replies for each discussion
    const discussionIds = discussions.map(d => d._id);
    const replies = await Discussion.find({ parentId: { $in: discussionIds } })
      .sort({ createdAt: 1 })
      .lean();

    const replyUserIds = replies.map(r => r.userId);
    const replyUsers = await User.find({ _id: { $in: replyUserIds } })
      .select('teamName leaderName role')
      .lean();

    const replyUserMap = new Map(replyUsers.map(u => [u._id.toString(), u]));

    const repliesMap = new Map();
    replies.forEach(reply => {
      const parentId = reply.parentId.toString();
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      const user = replyUserMap.get(reply.userId.toString());
      repliesMap.get(parentId).push({
        ...reply,
        user: {
          teamName: user?.teamName || 'Unknown',
          leaderName: user?.leaderName || 'Unknown',
          isAdmin: user?.role === 'admin'
        }
      });
    });

    const discussionsWithReplies = discussions.map(d => {
      const user = userMap.get(d.userId.toString());
      return {
        ...d,
        user: {
          teamName: user?.teamName || 'Unknown',
          leaderName: user?.leaderName || 'Unknown',
          isAdmin: user?.role === 'admin'
        },
        replies: repliesMap.get(d._id.toString()) || []
      };
    });

    const total = await Discussion.countDocuments({ parentId: null });

    res.json({
      discussions: discussionsWithReplies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
});

/**
 * POST /api/discussion
 * Post a new message or reply
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message, parentId } = req.body;
    const userId = req.user.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const discussion = new Discussion({
      userId,
      message: message.trim(),
      parentId: parentId || null,
      isAdminReply: req.user.role === 'admin'
    });

    await discussion.save();

    // Get user info
    const user = await User.findById(userId).select('teamName leaderName role');

    res.status(201).json({
      message: 'Message posted successfully',
      discussion: {
        ...discussion.toObject(),
        user: {
          teamName: user.teamName,
          leaderName: user.leaderName,
          isAdmin: user.role === 'admin'
        }
      }
    });
  } catch (error) {
    console.error('Post discussion error:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

/**
 * DELETE /api/discussion/:id
 * Delete a message (admin only or own message)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const discussion = await Discussion.findById(id);

    if (!discussion) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Allow deletion if admin or if it's user's own message
    if (req.user.role !== 'admin' && discussion.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Delete the message and all its replies
    await Discussion.deleteMany({ 
      $or: [
        { _id: id },
        { parentId: id }
      ]
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete discussion error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
