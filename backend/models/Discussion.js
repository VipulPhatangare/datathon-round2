import mongoose from 'mongoose';

const discussionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
    default: null // null means it's a top-level comment
  },
  isAdminReply: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
discussionSchema.index({ createdAt: -1 });
discussionSchema.index({ parentId: 1 });

export default mongoose.model('Discussion', discussionSchema);
