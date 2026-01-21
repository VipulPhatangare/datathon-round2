import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import Papa from 'papaparse';
import fs from 'fs';
import User from '../models/User.js';
import Config from '../models/Config.js';
import AnswerCSV from '../models/AnswerCSV.js';
import Submission from '../models/Submission.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { setAnswerCSVData } from '../utils/dataStore.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 1 * 1024 * 1024 * 1024 } // 1GB limit
});

/**
 * GET /api/admin/datasets/download/training
 * Download training dataset (for all authenticated users)
 */
router.get('/datasets/download/training', requireAuth, async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'trainingDataset' });
    if (!config || !config.value) {
      return res.status(404).json({ error: 'Training dataset not found' });
    }

    const dataset = config.value;
    const filePath = dataset.filepath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Training dataset file not found on server' });
    }

    res.download(filePath, dataset.filename);
  } catch (error) {
    console.error('Download training dataset error:', error);
    res.status(500).json({ error: 'Failed to download training dataset' });
  }
});

/**
 * GET /api/admin/datasets/download/testing
 * Download testing dataset (for all authenticated users)
 */
router.get('/datasets/download/testing', requireAuth, async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'testingDataset' });
    if (!config || !config.value) {
      return res.status(404).json({ error: 'Testing dataset not found' });
    }

    const dataset = config.value;
    const filePath = dataset.filepath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Testing dataset file not found on server' });
    }

    res.download(filePath, dataset.filename);
  } catch (error) {
    console.error('Download testing dataset error:', error);
    res.status(500).json({ error: 'Failed to download testing dataset' });
  }
});

/**
 * GET /api/admin/datasets/download/sample
 * Download sample submission dataset (for all authenticated users)
 */
router.get('/datasets/download/sample', requireAuth, async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'sampleSubmissionDataset' });
    if (!config || !config.value) {
      return res.status(404).json({ error: 'Sample submission not found' });
    }

    const dataset = config.value;
    const filePath = dataset.filepath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Sample submission file not found on server' });
    }

    res.download(filePath, dataset.filename);
  } catch (error) {
    console.error('Download sample submission error:', error);
    res.status(500).json({ error: 'Failed to download sample submission' });
  }
});

// Apply admin middleware to all routes below this point
router.use(requireAdmin);

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/users', async (req, res) => {
  try {
    const { teamName, leaderName, leaderEmail, password, memberName, memberEmail } = req.body;

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
        error: 'Team with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user (only users, not admins)
    const newUser = new User({
      email: leaderEmail.toLowerCase(),
      leaderEmail: leaderEmail.toLowerCase(),
      passwordHash,
      teamName,
      leaderName,
      memberName: memberName || null,
      memberEmail: memberEmail ? memberEmail.toLowerCase() : null,
      role: 'user'
    });

    await newUser.save();

    res.status(201).json({
      message: 'Team created successfully',
      user: {
        id: newUser._id,
        email: newUser.leaderEmail,
        teamName: newUser.teamName,
        leaderName: newUser.leaderName,
        memberName: newUser.memberName,
        memberEmail: newUser.memberEmail,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with their submission stats
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').lean();

    // Get submission stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const submissionCount = await Submission.countDocuments({ userId: user._id });
      const bestSubmission = await Submission.findOne({ userId: user._id })
        .sort({ accuracy: -1, f1: -1 })
        .lean();

      return {
        ...user,
        submissionCount,
        bestAccuracy: bestSubmission ? bestSubmission.accuracy : null,
        bestF1: bestSubmission ? bestSubmission.f1 : null
      };
    }));

    res.json({ users: usersWithStats });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user details
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, leaderName, leaderEmail, password, memberName, memberEmail } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    if (leaderEmail) {
      user.leaderEmail = leaderEmail.toLowerCase();
      user.email = leaderEmail.toLowerCase();
    }
    if (teamName) user.teamName = teamName;
    if (leaderName) user.leaderName = leaderName;
    if (memberName !== undefined) user.memberName = memberName || null;
    if (memberEmail !== undefined) user.memberEmail = memberEmail ? memberEmail.toLowerCase() : null;

    // Update password if provided
    if (password) {
      const saltRounds = 10;
      user.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    await user.save();

    res.json({
      message: 'Team updated successfully',
      user: {
        id: user._id,
        email: user.leaderEmail,
        teamName: user.teamName,
        leaderName: user.leaderName,
        memberName: user.memberName,
        memberEmail: user.memberEmail,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all user's submissions to keep data consistent
    await Submission.deleteMany({ userId: id });

    res.json({ message: 'User and all their submissions deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * POST /api/admin/answer-csv
 * Upload canonical answer CSV with dynamic columns and public/private split
 */
router.post('/answer-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { idColumn, labelColumn, publicPercentage = 50 } = req.body;

    if (!idColumn || !labelColumn) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'ID column and label column names are required' 
      });
    }

    // Read and parse CSV file
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parseResult.errors.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'CSV parsing error',
        details: parseResult.errors 
      });
    }

    // Validate required columns exist
    const columns = parseResult.meta.fields;
    if (!columns.includes(idColumn)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: `CSV does not contain "${idColumn}" column` 
      });
    }
    if (!columns.includes(labelColumn)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: `CSV does not contain "${labelColumn}" column` 
      });
    }

    // Store complete row data
    const allData = parseResult.data.map(row => {
      const rowData = {};
      columns.forEach(col => {
        rowData[col] = String(row[col] || '').trim();
      });
      return rowData;
    });

    if (allData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Split data into public and private based on percentage
    const publicCount = Math.ceil(allData.length * (Math.max(0, Math.min(100, parseInt(publicPercentage))) / 100));
    const publicData = allData.slice(0, publicCount);
    const privateData = allData.slice(publicCount);

    // Delete existing answer CSV
    await AnswerCSV.deleteMany({});

    // Save new answer CSV with only metadata (not the full data arrays)
    const answerCSV = new AnswerCSV({
      filename: req.file.originalname,
      uploadedBy: req.user.id,
      idColumn: idColumn,
      labelColumn: labelColumn,
      publicPercentage: Math.max(0, Math.min(100, parseInt(publicPercentage))),
      columns,
      // Store row count instead of all data
      totalRows: allData.length,
      publicRows: publicData.length,
      privateRows: privateData.length,
      // Store only sample data (first 10 rows of each) to verify upload
      publicDataSample: publicData.slice(0, 10),
      privateDataSample: privateData.slice(0, 10),
      // Store filepath for recovery after server restart
      filepath: req.file.path
    });

    await answerCSV.save();

    // Store full data in memory for scoring
    setAnswerCSVData({
      publicData,
      privateData,
      allData,
      publicPercentage: Math.max(0, Math.min(100, parseInt(publicPercentage))),
      totalRows: allData.length,
      publicRows: publicData.length,
      privateRows: privateData.length,
      idColumn: idColumn,
      labelColumn: labelColumn,
      filepath: req.file.path
    });

    res.json({
      message: 'Answer CSV uploaded successfully',
      rowCount: allData.length,
      publicCount: publicData.length,
      privateCount: privateData.length,
      publicPercentage: Math.max(0, Math.min(100, parseInt(publicPercentage))),
      columns
    });

  } catch (error) {
    console.error('Upload answer CSV error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload answer CSV' });
  }
});

/**
 * GET /api/admin/answer-csv
 * Get current answer CSV info with public/private split
 */
router.get('/answer-csv', async (req, res) => {
  try {
    const answerCSV = await AnswerCSV.findOne()
      .populate('uploadedBy', 'email teamName')
      .lean();

    if (!answerCSV) {
      return res.json({ answerCSV: null });
    }

    res.json({
      answerCSV: {
        filename: answerCSV.filename,
        uploadedBy: answerCSV.uploadedBy,
        uploadedAt: answerCSV.uploadedAt,
        totalRows: answerCSV.allData ? answerCSV.allData.length : 0,
        publicRows: answerCSV.publicData ? answerCSV.publicData.length : 0,
        privateRows: answerCSV.privateData ? answerCSV.privateData.length : 0,
        publicPercentage: answerCSV.publicPercentage || 50,
        idColumn: answerCSV.idColumn,
        labelColumn: answerCSV.labelColumn,
        columns: answerCSV.columns
      }
    });

  } catch (error) {
    console.error('Get answer CSV error:', error);
    res.status(500).json({ error: 'Failed to fetch answer CSV info' });
  }
});

/**
 * DELETE /api/admin/answer-csv
 * Delete answer CSV
 */
router.delete('/answer-csv', async (req, res) => {
  try {
    const result = await AnswerCSV.deleteMany({});
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Answer CSV not found' });
    }

    res.json({ message: 'Answer CSV deleted successfully' });

  } catch (error) {
    console.error('Delete answer CSV error:', error);
    res.status(500).json({ error: 'Failed to delete answer CSV' });
  }
});

/**
 * POST /api/admin/datasets/training
 * Upload training dataset
 */
router.post('/datasets/training', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV to extract column names
    let columns = [];
    try {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      columns = parseResult.meta.fields || [];
    } catch (err) {
      console.error('Error parsing CSV columns:', err);
      columns = [];
    }

    // Store the file path and metadata in config
    const fileInfo = {
      filename: req.file.originalname,
      filepath: req.file.path,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
      columns: columns
    };

    let config = await Config.findOne({ key: 'trainingDataset' });
    
    // Delete old file if exists
    if (config && config.value.filepath) {
      try {
        if (fs.existsSync(config.value.filepath)) {
          fs.unlinkSync(config.value.filepath);
        }
      } catch (err) {
        console.error('Error deleting old file:', err);
      }
    }

    if (config) {
      config.value = fileInfo;
      await config.save();
    } else {
      config = new Config({ key: 'trainingDataset', value: fileInfo });
      await config.save();
    }

    res.json({
      message: 'Training dataset uploaded successfully',
      dataset: fileInfo
    });

  } catch (error) {
    console.error('Upload training dataset error:', error);
    res.status(500).json({ error: 'Failed to upload training dataset' });
  }
});

/**
 * POST /api/admin/datasets/testing
 * Upload testing dataset
 */
router.post('/datasets/testing', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV to extract column names
    let columns = [];
    try {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      columns = parseResult.meta.fields || [];
    } catch (err) {
      console.error('Error parsing CSV columns:', err);
      columns = [];
    }

    // Store the file path and metadata in config
    const fileInfo = {
      filename: req.file.originalname,
      filepath: req.file.path,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
      columns: columns
    };

    let config = await Config.findOne({ key: 'testingDataset' });
    
    // Delete old file if exists
    if (config && config.value.filepath) {
      try {
        if (fs.existsSync(config.value.filepath)) {
          fs.unlinkSync(config.value.filepath);
        }
      } catch (err) {
        console.error('Error deleting old file:', err);
      }
    }

    if (config) {
      config.value = fileInfo;
      await config.save();
    } else {
      config = new Config({ key: 'testingDataset', value: fileInfo });
      await config.save();
    }

    res.json({
      message: 'Testing dataset uploaded successfully',
      dataset: fileInfo
    });

  } catch (error) {
    console.error('Upload testing dataset error:', error);
    res.status(500).json({ error: 'Failed to upload testing dataset' });
  }
});

/**
 * POST /api/admin/datasets/sample-submission
 * Upload sample submission dataset
 */
router.post('/datasets/sample-submission', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV to extract column names
    let columns = [];
    try {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      columns = parseResult.meta.fields || [];
    } catch (err) {
      console.error('Error parsing CSV columns:', err);
      columns = [];
    }

    // Store the file path and metadata in config
    const fileInfo = {
      filename: req.file.originalname,
      filepath: req.file.path,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
      columns: columns
    };

    let config = await Config.findOne({ key: 'sampleSubmissionDataset' });
    
    // Delete old file if exists
    if (config && config.value.filepath) {
      try {
        if (fs.existsSync(config.value.filepath)) {
          fs.unlinkSync(config.value.filepath);
        }
      } catch (err) {
        console.error('Error deleting old file:', err);
      }
    }

    if (config) {
      config.value = fileInfo;
      await config.save();
    } else {
      config = new Config({ key: 'sampleSubmissionDataset', value: fileInfo });
      await config.save();
    }

    res.json({
      message: 'Sample submission dataset uploaded successfully',
      dataset: fileInfo
    });

  } catch (error) {
    console.error('Upload sample submission dataset error:', error);
    res.status(500).json({ error: 'Failed to upload sample submission dataset' });
  }
});

/**
 * GET /api/admin/datasets
 * Get all dataset information
 */
router.get('/datasets', async (req, res) => {
  try {
    const trainingConfig = await Config.findOne({ key: 'trainingDataset' });
    const testingConfig = await Config.findOne({ key: 'testingDataset' });
    const sampleSubmissionConfig = await Config.findOne({ key: 'sampleSubmissionDataset' });

    res.json({
      training: trainingConfig ? trainingConfig.value : null,
      testing: testingConfig ? testingConfig.value : null,
      sampleSubmission: sampleSubmissionConfig ? sampleSubmissionConfig.value : null
    });

  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({ error: 'Failed to fetch datasets' });
  }
});

/**
 * DELETE /api/admin/datasets/training
 * Delete training dataset
 */
router.delete('/datasets/training', async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'trainingDataset' });
    
    if (!config) {
      return res.status(404).json({ error: 'Training dataset not found' });
    }

    // Delete file if exists
    if (config.value.filepath) {
      try {
        if (fs.existsSync(config.value.filepath)) {
          fs.unlinkSync(config.value.filepath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    // Delete config entry
    await Config.deleteOne({ key: 'trainingDataset' });

    res.json({ message: 'Training dataset deleted successfully' });

  } catch (error) {
    console.error('Delete training dataset error:', error);
    res.status(500).json({ error: 'Failed to delete training dataset' });
  }
});

/**
 * DELETE /api/admin/datasets/testing
 * Delete testing dataset
 */
router.delete('/datasets/testing', async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'testingDataset' });
    
    if (!config) {
      return res.status(404).json({ error: 'Testing dataset not found' });
    }

    // Delete file if exists
    if (config.value.filepath) {
      try {
        if (fs.existsSync(config.value.filepath)) {
          fs.unlinkSync(config.value.filepath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    // Delete config entry
    await Config.deleteOne({ key: 'testingDataset' });

    res.json({ message: 'Testing dataset deleted successfully' });

  } catch (error) {
    console.error('Delete testing dataset error:', error);
    res.status(500).json({ error: 'Failed to delete testing dataset' });
  }
});

/**
 * DELETE /api/admin/datasets/sample-submission
 * Delete sample submission dataset
 */
router.delete('/datasets/sample-submission', async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'sampleSubmissionDataset' });
    
    if (!config) {
      return res.status(404).json({ error: 'Sample submission dataset not found' });
    }

    // Delete file if exists
    if (config.value.filepath) {
      try {
        if (fs.existsSync(config.value.filepath)) {
          fs.unlinkSync(config.value.filepath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    // Delete config entry
    await Config.deleteOne({ key: 'sampleSubmissionDataset' });

    res.json({ message: 'Sample submission dataset deleted successfully' });

  } catch (error) {
    console.error('Delete sample submission dataset error:', error);
    res.status(500).json({ error: 'Failed to delete sample submission dataset' });
  }
});

/**
 * PUT /api/admin/config
 * Update global configuration (e.g., default upload limit)
 */
router.put('/config', async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ 
        error: 'Key and value are required' 
      });
    }

    // Validate allowed config keys
    const allowedKeys = [
      'defaultUploadLimit', 
      'competitionStartTime', 
      'competitionEndTime',
      'problemType',
      'displayMetrics',
      'leaderboardMetric',
      'enableUserPrivateLeaderboard'
    ];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ 
        error: `Invalid config key. Allowed keys: ${allowedKeys.join(', ')}` 
      });
    }

    // Update or create config
    let config = await Config.findOne({ key });
    
    if (config) {
      config.value = value;
      config.updatedAt = Date.now();
      await config.save();
    } else {
      config = new Config({ key, value });
      await config.save();
    }

    res.json({
      message: 'Configuration updated successfully',
      config: {
        key: config.key,
        value: config.value
      }
    });

  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * GET /api/admin/config/:key
 * Get a specific configuration value
 */
router.get('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const config = await Config.findOne({ key });

    if (!config) {
      // Return default values for known keys
      if (key === 'defaultUploadLimit') {
        return res.json({ key, value: 15, isDefault: true });
      }
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({
      key: config.key,
      value: config.value,
      isDefault: false
    });

  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * GET /api/admin/config
 * Get all configuration values
 */
router.get('/config', async (req, res) => {
  try {
    const configs = await Config.find();
    const configObj = {};
    
    configs.forEach(config => {
      configObj[config.key] = config.value;
    });

    // Set defaults if not found
    if (!configObj.defaultUploadLimit) configObj.defaultUploadLimit = 15;
    if (!configObj.competitionStartTime) configObj.competitionStartTime = null;
    if (!configObj.competitionEndTime) configObj.competitionEndTime = null;
    if (!configObj.problemType) configObj.problemType = 'classification';
    if (!configObj.displayMetrics) configObj.displayMetrics = ['accuracy', 'f1', 'macro_f1', 'precision', 'recall'];
    if (!configObj.leaderboardMetric) configObj.leaderboardMetric = 'accuracy';
    if (!configObj.enableUserPrivateLeaderboard) configObj.enableUserPrivateLeaderboard = false;

    res.json(configObj);

  } catch (error) {
    console.error('Get all config error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * GET /api/admin/submissions
 * Get all submissions (admin view)
 */
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate('userId', 'email teamName')
      .sort({ uploadedAt: -1 })
      .limit(100)
      .lean();

    res.json({ submissions });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * DELETE /api/admin/delete-all-data
 * Delete all users (except admin), submissions, and answer CSV
 */
router.delete('/delete-all-data', async (req, res) => {
  try {
    // Delete all submissions
    const submissionsDeleted = await Submission.deleteMany({});
    
    // Delete all users except admins
    const usersDeleted = await User.deleteMany({ role: { $ne: 'admin' } });
    
    // Delete answer CSV
    const answerCSVDeleted = await AnswerCSV.deleteMany({});

    res.json({
      message: 'All data deleted successfully',
      deletedCounts: {
        submissions: submissionsDeleted.deletedCount,
        users: usersDeleted.deletedCount,
        answerCSV: answerCSVDeleted.deletedCount
      }
    });

  } catch (error) {
    console.error('Delete all data error:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

/**
 * PUT /api/admin/users/:id/ban
 * Ban or unban a user
 */
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned, banReason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBanned = isBanned;
    user.banReason = isBanned ? (banReason || 'Policy violation') : null;
    await user.save();

    res.json({
      message: isBanned ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        id: user._id,
        teamName: user.teamName,
        isBanned: user.isBanned,
        banReason: user.banReason
      }
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to update ban status' });
  }
});

/**
 * PUT /api/admin/users/:id/disqualify
 * Disqualify or requalify a team
 */
router.put('/users/:id/disqualify', async (req, res) => {
  try {
    const { id } = req.params;
    const { isDisqualified } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isDisqualified = isDisqualified;
    await user.save();

    res.json({
      message: isDisqualified ? 'Team disqualified successfully' : 'Team requalified successfully',
      user: {
        id: user._id,
        teamName: user.teamName,
        isDisqualified: user.isDisqualified
      }
    });
  } catch (error) {
    console.error('Disqualify user error:', error);
    res.status(500).json({ error: 'Failed to update disqualification status' });
  }
});

// Send credentials to all teams
router.post('/send-credentials', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { adminPassword } = req.body;
    
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password is required for confirmation' });
    }

    // Verify admin password
    const admin = await User.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const isPasswordValid = await bcrypt.compare(adminPassword, admin.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Get all non-admin users
    const users = await User.find({ role: 'user' }).select('email teamName leaderName leaderEmail');
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    // Generate new temporary passwords and send emails
    const { sendCredentialEmail } = await import('../utils/email.js');
    const results = [];
    
    for (const user of users) {
      try {
        // Use leader email as password
        const tempPassword = user.leaderEmail || user.email;
        
        // Hash and update password
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        user.passwordHash = hashedPassword;
        await user.save();
        
        // Send email with credentials
        await sendCredentialEmail(user.email, user.teamName, user.leaderName, tempPassword);
        
        console.log(`Credentials sent to ${user.teamName}: ${user.email} / ${tempPassword}`);
        
        results.push({
          teamName: user.teamName,
          email: user.email,
          status: 'success'
        });
      } catch (error) {
        console.error(`Failed to send credentials to ${user.email}:`, error);
        results.push({
          teamName: user.teamName,
          email: user.email,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    res.json({
      message: `Credentials sent to ${successCount} teams. ${failedCount} failed.`,
      results,
      successCount,
      failedCount
    });
  } catch (error) {
    console.error('Send credentials error:', error);
    res.status(500).json({ error: 'Failed to send credentials' });
  }
});

// Send credentials to a single team
router.post('/send-credentials/team/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('email teamName leaderName leaderEmail');
    
    if (!user) {
      return res.status(404).json({ error: 'User/Team not found' });
    }

    // Use leader email as password
    const tempPassword = user.leaderEmail || user.email;
    
    // Hash and update password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    user.passwordHash = hashedPassword;
    await user.save();
    
    // Send email with credentials
    const { sendCredentialEmail } = await import('../utils/email.js');
    const result = await sendCredentialEmail(user.email, user.teamName, user.leaderName, tempPassword);
    
    console.log(`Credentials sent to ${user.teamName}: ${user.email} / ${tempPassword}`);
    
    res.json({ 
      message: `Credentials sent successfully to ${user.teamName}`,
      teamName: user.teamName,
      email: user.email,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Send credentials to team error:', error);
    res.status(500).json({ error: 'Failed to send credentials' });
  }
});

// Send email to all team leaders
router.post('/send-email/all', requireAuth, requireAdmin, upload.array('attachments', 5), async (req, res) => {
  try {
    const { subject, message } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Get all users (team leaders)
    const users = await User.find({ role: 'user' }).select('email teamName');
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    const emails = users.map(user => user.email);
    
    // Prepare attachments
    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path
    })) : [];
    
    // Send email using BCC
    const { sendCustomEmail } = await import('../utils/email.js');
    const result = await sendCustomEmail(emails, subject, message, attachments);
    
    // Clean up uploaded files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.json({ 
      message: `Email sent successfully to ${emails.length} recipients`,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Send email to all error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send email to specific team
router.post('/send-email/team/:userId', requireAuth, requireAdmin, upload.array('attachments', 5), async (req, res) => {
  try {
    const { subject, message } = req.body;
    const { userId } = req.params;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const user = await User.findById(userId).select('email teamName');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare attachments
    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path
    })) : [];

    const { sendTeamEmail } = await import('../utils/email.js');
    const result = await sendTeamEmail(user.email, user.teamName, subject, message, attachments);
    
    // Clean up uploaded files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.json({ 
      message: `Email sent successfully to ${user.teamName}`,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Send email to team error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get all users with emails for email selection
router.get('/users/emails', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('_id teamName email')
      .sort({ teamName: 1 });
    
    res.json(users);
  } catch (error) {
    console.error('Get users emails error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
