import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  leaderName: {
    type: String,
    required: true,
    trim: true
  },
  leaderEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  memberName: {
    type: String,
    default: null,
    trim: true
  },
  memberEmail: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  uploadLimit: {
    type: Number,
    default: null // null means use global default
  },
  dailyUploadLimit: {
    type: Number,
    default: null // null means use global default
  },
  lastSubmissionDate: {
    type: Date,
    default: null
  },
  todaySubmissionCount: {
    type: Number,
    default: 0
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  isDisqualified: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for getting submission count
userSchema.virtual('submissions', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'userId'
});

export default mongoose.model('User', userSchema);
