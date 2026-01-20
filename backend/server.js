import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import submissionRoutes from './routes/submissions.js';
import leaderboardRoutes from './routes/leaderboard.js';
import competitionRoutes from './routes/competition.js';
import discussionRoutes from './routes/discussion.js';
import chatRoutes from './routes/chat.js';
import User from './models/User.js';
import ChatMessage from './models/ChatMessage.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/discussion', discussionRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Analyzer API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // JWT uses 'id' field, not 'userId'
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      return next(new Error('Invalid token'));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.teamName}`);

  // Join the chat room
  socket.join('community-chat');

  // Send user info to client
  socket.emit('user-info', {
    userId: socket.user._id,
    teamName: socket.user.teamName,
    isAdmin: socket.user.role === 'admin'
  });

  // Handle new messages
  socket.on('send-message', async (data) => {
    try {
      const { message } = data;

      if (!message || !message.trim()) {
        return socket.emit('error', { message: 'Message cannot be empty' });
      }

      // Save message to database
      const newMessage = new ChatMessage({
        userId: socket.user._id,
        teamName: socket.user.teamName,
        message: message.trim(),
        isAdmin: socket.user.role === 'admin'
      });

      await newMessage.save();

      // Broadcast to all users in the room
      io.to('community-chat').emit('new-message', {
        _id: newMessage._id,
        userId: newMessage.userId,
        teamName: newMessage.teamName,
        message: newMessage.message,
        isAdmin: newMessage.isAdmin,
        timestamp: newMessage.timestamp
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', () => {
    socket.to('community-chat').emit('user-typing', {
      teamName: socket.user.teamName
    });
  });

  socket.on('stop-typing', () => {
    socket.to('community-chat').emit('user-stop-typing', {
      teamName: socket.user.teamName
    });
  });

  // Handle message deletion
  socket.on('delete-message', async (data) => {
    try {
      const { messageId } = data;
      
      const message = await ChatMessage.findById(messageId);
      
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      // Get user ID from socket user (could be id or _id)
      const userId = socket.user.id || socket.user._id;

      // Check if user is admin or owns the message
      if (socket.user.role !== 'admin' && String(message.userId) !== String(userId)) {
        return socket.emit('error', { message: 'You can only delete your own messages' });
      }

      await ChatMessage.findByIdAndDelete(messageId);

      // Broadcast deletion to all users
      io.to('community-chat').emit('message-deleted', { messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.teamName}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for connections`);
});

export default app;