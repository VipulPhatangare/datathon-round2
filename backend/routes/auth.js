import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPasswordEmail, sendWelcomeEmail } from '../utils/email.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login user and generate JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by leader email
    const user = await User.findOne({ leaderEmail: email.toLowerCase() });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    console.log('User found:', user.teamName);

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Password comparison failed for user:', user.teamName);
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.leaderEmail,
        teamName: user.teamName,
        leaderName: user.leaderName,
        role: user.role,
        uploadLimit: user.uploadLimit
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.leaderEmail,
        teamName: user.teamName,
        leaderName: user.leaderName,
        memberName: user.memberName,
        role: user.role,
        uploadLimit: user.uploadLimit
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client should remove token)
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

/**
 * POST /api/auth/register
 * Register a new team
 */
router.post('/register', async (req, res) => {
  try {
    const { teamName, leaderName, leaderEmail, password, memberName } = req.body;

    // Validate required fields
    if (!teamName || !leaderName || !leaderEmail || !password) {
      return res.status(400).json({ 
        error: 'Team name, leader name, leader email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ leaderEmail: leaderEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'A team with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      email: leaderEmail.toLowerCase(),
      leaderEmail: leaderEmail.toLowerCase(),
      passwordHash,
      teamName,
      leaderName,
      memberName: memberName || null,
      role: 'user'
    });

    await newUser.save();

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(leaderEmail, teamName, leaderName).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate JWT token for auto-login
    const token = jwt.sign(
      {
        id: newUser._id.toString(),
        email: newUser.leaderEmail,
        teamName: newUser.teamName,
        leaderName: newUser.leaderName,
        role: newUser.role,
        uploadLimit: newUser.uploadLimit
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Team registered successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.leaderEmail,
        teamName: newUser.teamName,
        leaderName: newUser.leaderName,
        memberName: newUser.memberName,
        role: newUser.role,
        uploadLimit: newUser.uploadLimit
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register team' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password to user's email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ leaderEmail: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'No team found with this email' });
    }

    // Generate a more secure temporary password (8 characters with mixed case and numbers)
    const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 4).toUpperCase();
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(tempPassword, saltRounds);
    
    // Update user password
    user.passwordHash = newPasswordHash;
    await user.save();

    console.log('Generated temp password for', user.teamName, ':', tempPassword);

    // Send email with new password
    await sendPasswordEmail(email, user.teamName, tempPassword);

    res.json({ 
      message: 'A new temporary password has been sent to your email. Please change it after logging in.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

/**
 * GET /api/auth/me
 * Get current user from JWT token
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
/**
 * PUT /api/auth/profile
 * Update user profile (leader name and member name only)
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { leaderName, memberName } = req.body;

    if (!leaderName) {
      return res.status(400).json({ error: 'Leader name is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.leaderName = leaderName;
    user.memberName = memberName || '';
    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        leaderName: user.leaderName,
        memberName: user.memberName
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PUT /api/auth/change-password
 * Change user password with old password verification
 */
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    user.passwordHash = newPasswordHash;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/init-admin
 * Initialize default admin if no admin exists
 */
router.post('/init-admin', async (req, res) => {
  try {
    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        error: 'Admin already exists',
        message: 'An admin account is already configured'
      });
    }

    // Create default admin
    const adminEmail = 'vipulphatangare3@gmail.com';
    const adminPassword = '123456';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = new User({
      email: adminEmail,
      leaderEmail: adminEmail,
      passwordHash: hashedPassword,
      teamName: 'Admin',
      leaderName: 'Admin',
      role: 'admin'
    });

    await admin.save();

    res.json({ 
      message: 'Admin account created successfully',
      email: adminEmail,
      note: 'Please change the password after first login'
    });
  } catch (error) {
    console.error('Init admin error:', error);
    res.status(500).json({ error: 'Failed to initialize admin' });
  }
});

export default router;
