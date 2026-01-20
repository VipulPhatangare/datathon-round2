import express from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import fs from 'fs';
import Submission from '../models/Submission.js';
import AnswerCSV from '../models/AnswerCSV.js';
import Config from '../models/Config.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { compareCSVData, compareCSVDataWithType } from '../utils/metrics.js';
import { getPrivateData, getPublicData, setAnswerCSVData, isDataLoaded, reloadAnswerCSVData } from '../utils/dataStore.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Ensure answer CSV data is loaded into memory
 * If not already loaded, attempts to reload from file
 */
const ensureAnswerCSVLoaded = async () => {
  if (isDataLoaded()) {
    return true; // Already loaded
  }

  // Try to reload from file if not in memory
  return await reloadAnswerCSVData();
};

/**
 * GET /api/submissions/column-config
 * Get the required column names from answer CSV
 */
router.get('/column-config', async (req, res) => {
  try {
    const answerCSV = await AnswerCSV.findOne();
    if (!answerCSV) {
      return res.json({ 
        idColumn: 'row_id', 
        labelColumn: 'label' 
      });
    }

    res.json({
      idColumn: answerCSV.idColumn || 'row_id',
      labelColumn: answerCSV.labelColumn || 'label'
    });
  } catch (error) {
    console.error('Get column config error:', error);
    res.json({ 
      idColumn: 'row_id', 
      labelColumn: 'label' 
    });
  }
});

/**
 * GET /api/submissions/status
 * Get competition status and user submission info
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get competition timing
    const startConfig = await Config.findOne({ key: 'competitionStartTime' });
    const endConfig = await Config.findOne({ key: 'competitionEndTime' });
    
    const now = new Date();
    const startTime = (startConfig && startConfig.value) ? new Date(startConfig.value) : null;
    const endTime = (endConfig && endConfig.value) ? new Date(endConfig.value) : null;

    let status = 'active';
    let message = 'Competition is active';

    if (startTime && !isNaN(startTime.getTime()) && now < startTime) {
      status = 'not_started';
      message = 'Competition has not started yet';
    } else if (endTime && !isNaN(endTime.getTime()) && now > endTime) {
      status = 'ended';
      message = 'Competition has ended';
    }

    // Get user submission count
    const submissionCount = await Submission.countDocuments({ userId });
    
    // Get upload limit
    let uploadLimit = req.user.uploadLimit;
    if (uploadLimit === null || uploadLimit === undefined) {
      const config = await Config.findOne({ key: 'defaultUploadLimit' });
      uploadLimit = config ? config.value : 15;
    }

    const remainingSubmissions = uploadLimit - submissionCount;

    res.json({
      status,
      message,
      competitionStartTime: startTime,
      competitionEndTime: endTime,
      submissionCount,
      uploadLimit,
      remainingSubmissions,
      canSubmit: status === 'active' && remainingSubmissions > 0
    });

  } catch (error) {
    console.error('Get submission status error:', error);
    res.status(500).json({ error: 'Failed to fetch submission status' });
  }
});

/**
 * POST /api/submissions/upload
 * Upload and evaluate a CSV submission
 */
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;

    // Check if user is banned or disqualified
    if (req.user.isBanned) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ 
        error: `Your account has been banned. Reason: ${req.user.banReason || 'Policy violation'}` 
      });
    }

    if (req.user.isDisqualified) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ 
        error: 'Your team has been disqualified from this competition.' 
      });
    }

    // 1. Check competition timing
    const startConfig = await Config.findOne({ key: 'competitionStartTime' });
    const endConfig = await Config.findOne({ key: 'competitionEndTime' });
    
    const now = new Date();
    const startTime = (startConfig && startConfig.value) ? new Date(startConfig.value) : null;
    const endTime = (endConfig && endConfig.value) ? new Date(endConfig.value) : null;

    if (startTime && !isNaN(startTime.getTime()) && now < startTime) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ 
        error: `Competition has not started yet. It will begin on ${startTime.toLocaleString()}.` 
      });
    }

    if (endTime && !isNaN(endTime.getTime()) && now > endTime) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ 
        error: `Competition has ended on ${endTime.toLocaleString()}. No more submissions are accepted.` 
      });
    }

    // 2. Check if answer CSV exists
    const answerCSV = await AnswerCSV.findOne();
    if (!answerCSV) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'No canonical answer CSV has been uploaded yet. Please contact admin.' 
      });
    }

    // 3. Check submission limit (total)
    const userSubmissionCount = await Submission.countDocuments({ userId });
    
    // Get user's upload limit (user-specific or global default)
    let uploadLimit = req.user.uploadLimit;
    if (uploadLimit === null || uploadLimit === undefined) {
      const config = await Config.findOne({ key: 'defaultUploadLimit' });
      uploadLimit = config ? config.value : 15; // Default to 15
    }

    if (userSubmissionCount >= uploadLimit) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ 
        error: `Upload limit reached. You have used ${userSubmissionCount} of ${uploadLimit} allowed submissions.` 
      });
    }

    // 3a. Check daily submission limit
    let dailyLimit = req.user.dailyUploadLimit;
    if (dailyLimit === null || dailyLimit === undefined) {
      const config = await Config.findOne({ key: 'dailyUploadLimit' });
      dailyLimit = config ? config.value : null;
    }

    if (dailyLimit) {
      const user = await User.findById(userId);
      const today = new Date().toDateString();
      const lastSubDate = user.lastSubmissionDate ? new Date(user.lastSubmissionDate).toDateString() : null;

      // Reset counter if it's a new day
      if (lastSubDate !== today) {
        user.todaySubmissionCount = 0;
        user.lastSubmissionDate = new Date();
      }

      if (user.todaySubmissionCount >= dailyLimit) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ 
          error: `Daily submission limit reached. You can submit ${dailyLimit} times per day. Try again tomorrow.` 
        });
      }

      // Increment daily counter
      user.todaySubmissionCount += 1;
      await user.save();
    }

    // 3. Parse uploaded CSV
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parseResult.errors.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'CSV parsing error',
        details: parseResult.errors 
      });
    }

    // 4. Validate required columns (use dynamic column names)
    const columns = parseResult.meta.fields;
    const idColumn = answerCSV.idColumn || 'row_id';
    const labelColumn = answerCSV.labelColumn || 'label';
    
    if (!columns.includes(idColumn) || !columns.includes(labelColumn)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: `CSV must contain "${idColumn}" and "${labelColumn}" columns`,
        foundColumns: columns
      });
    }

    // 5. Extract data (using dynamic column names)
    const userCSVData = parseResult.data.map(row => ({
      [idColumn]: String(row[idColumn]).trim(),
      [labelColumn]: String(row[labelColumn]).trim()
    }));

    if (userCSVData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // 5a. Anti-Cheat: Check for constant predictions
    const uniqueValues = new Set(userCSVData.map(row => row[labelColumn]));
    if (uniqueValues.size === 1) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Submission rejected: All predictions are identical. Please submit varied predictions.',
        hint: 'Constant predictions are not allowed as they may indicate cheating or placeholder submissions.'
      });
    }

    // 5b. Validate data format based on problem type
    const problemTypeConfig = await Config.findOne({ key: 'problemType' });
    const problemType = problemTypeConfig?.value || 'classification';
    
    // Get leaderboard metric for scoring
    const leaderboardMetricConfig = await Config.findOne({ key: 'leaderboardMetric' });
    const leaderboardMetric = leaderboardMetricConfig?.value || (problemType === 'classification' ? 'accuracy' : 'rmse');

    if (problemType === 'regression') {
      // Check if all values are numeric
      const nonNumeric = userCSVData.filter(row => {
        const val = row[labelColumn];
        return val === '' || val === null || isNaN(parseFloat(val));
      });
      
      if (nonNumeric.length > 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: 'Regression predictions must be numeric values',
          details: `Found ${nonNumeric.length} non-numeric predictions`,
          sample: nonNumeric.slice(0, 5).map(r => r[idColumn])
        });
      }
    }

    // 6. Compare with canonical answer and compute metrics based on problem type
    // Use privateData for scoring (actual answers), publicData is only for reference
    
    // Ensure answer data is loaded (reload from file if needed after server restart)
    const dataLoaded = await ensureAnswerCSVLoaded();
    if (!dataLoaded) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Answer data is not available. Please contact admin to re-upload the answer CSV.' 
      });
    }
    
    const scoreAgainstData = getPrivateData();
    
    if (!scoreAgainstData || scoreAgainstData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Answer data is not available. Please contact admin.' 
      });
    }

    const comparisonResult = compareCSVDataWithType(
      userCSVData, 
      scoreAgainstData, 
      idColumn, 
      labelColumn,
      problemType
    );

    // Also compute public scores for leaderboard display
    const publicScoreData = getPublicData();
    
    let publicComparisonResult = null;
    if (publicScoreData && publicScoreData.length > 0) {
      publicComparisonResult = compareCSVDataWithType(
        userCSVData, 
        publicScoreData, 
        idColumn, 
        labelColumn,
        problemType
      );
    }

    // 7a. Anti-Cheat: Perfect score detection
    let warningMessage = null;
    if (problemType === 'classification') {
      if (comparisonResult.metrics.accuracy === 1.0) {
        warningMessage = 'Perfect accuracy detected. This submission will be flagged for review.';
        console.warn(`⚠️ PERFECT SCORE ALERT: User ${userId} (${req.user.teamName}) achieved 100% accuracy`);
      }
    } else {
      const allErrorMetricsZero = (
        comparisonResult.metrics.mae === 0 &&
        comparisonResult.metrics.mse === 0 &&
        comparisonResult.metrics.rmse === 0
      );
      if (allErrorMetricsZero) {
        warningMessage = 'Perfect predictions detected (0.0 error). This submission will be flagged for review.';
        console.warn(`⚠️ PERFECT SCORE ALERT: User ${userId} (${req.user.teamName}) achieved 0.0 error on all metrics`);
      }
    }

    // 8. Determine attempt number
    const attemptNumber = userSubmissionCount + 1;

    // 8. Create preview (first 20 rows with mismatches prioritized)
    const mismatches = comparisonResult.comparisons.filter(c => !c.match);
    const matches = comparisonResult.comparisons.filter(c => c.match);
    const preview = [
      ...mismatches.slice(0, 15),
      ...matches.slice(0, 5)
    ].slice(0, 20);

    // 9. Save submission
    const submissionData = {
      userId,
      filename: req.file.originalname,
      rowsTotal: comparisonResult.rowsCompared,
      fileDataPreview: preview,
      attemptNumber,
      rowsInCanonical: comparisonResult.rowsInCanonical,
      rowsInSubmission: comparisonResult.rowsInSubmission,
      rowsCompared: comparisonResult.rowsCompared,
      extraRows: comparisonResult.extraRows,
      missingRows: comparisonResult.missingRows,
      problemType: problemType
    };

    // Add metrics based on problem type
    if (problemType === 'classification') {
      submissionData.matches = comparisonResult.metrics.matches;
      submissionData.accuracy = comparisonResult.metrics.accuracy;
      submissionData.precision = comparisonResult.metrics.precision;
      submissionData.recall = comparisonResult.metrics.recall;
      submissionData.f1 = comparisonResult.metrics.f1;
      submissionData.macro_f1 = comparisonResult.metrics.macro_f1;
      
      // Set private score (from full private data)
      submissionData.privateScore = comparisonResult.metrics[leaderboardMetric] || comparisonResult.metrics.accuracy;
      
      // Add public metrics if available
      if (publicComparisonResult) {
        submissionData.public_accuracy = publicComparisonResult.metrics.accuracy;
        submissionData.public_precision = publicComparisonResult.metrics.precision;
        submissionData.public_recall = publicComparisonResult.metrics.recall;
        submissionData.public_f1 = publicComparisonResult.metrics.f1;
        submissionData.public_macro_f1 = publicComparisonResult.metrics.macro_f1;
        
        // Set public score
        submissionData.publicScore = publicComparisonResult.metrics[leaderboardMetric] || publicComparisonResult.metrics.accuracy;
      } else {
        // If no public data, use private score as public score
        submissionData.publicScore = submissionData.privateScore;
      }
    } else {
      submissionData.mae = comparisonResult.metrics.mae;
      submissionData.mse = comparisonResult.metrics.mse;
      submissionData.rmse = comparisonResult.metrics.rmse;
      submissionData.r2 = comparisonResult.metrics.r2;
      submissionData.mape = comparisonResult.metrics.mape;
      
      // Set private score (from full private data)
      submissionData.privateScore = comparisonResult.metrics[leaderboardMetric] || comparisonResult.metrics.rmse;
      
      // Add public metrics if available
      if (publicComparisonResult) {
        submissionData.public_mae = publicComparisonResult.metrics.mae;
        submissionData.public_mse = publicComparisonResult.metrics.mse;
        submissionData.public_rmse = publicComparisonResult.metrics.rmse;
        submissionData.public_r2 = publicComparisonResult.metrics.r2;
        submissionData.public_mape = publicComparisonResult.metrics.mape;
        
        // Set public score
        submissionData.publicScore = publicComparisonResult.metrics[leaderboardMetric] || publicComparisonResult.metrics.rmse;
      } else {
        // If no public data, use private score as public score
        submissionData.publicScore = submissionData.privateScore;
      }
    }

    const submission = new Submission(submissionData);

    await submission.save();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // 10. Return results
    const responseMetrics = problemType === 'classification' ? {
      accuracy: submission.accuracy,
      precision: submission.precision,
      recall: submission.recall,
      f1: submission.f1,
      macro_f1: submission.macro_f1,
      public_accuracy: submission.public_accuracy,
      public_precision: submission.public_precision,
      public_recall: submission.public_recall,
      public_f1: submission.public_f1,
      public_macro_f1: submission.public_macro_f1
    } : {
      mae: submission.mae,
      mse: submission.mse,
      rmse: submission.rmse,
      r2: submission.r2,
      mape: submission.mape,
      public_mae: submission.public_mae,
      public_mse: submission.public_mse,
      public_rmse: submission.public_rmse,
      public_r2: submission.public_r2,
      public_mape: submission.public_mape
    };

    res.json({
      message: 'Submission processed successfully',
      submission: {
        id: submission._id,
        filename: submission.filename,
        attemptNumber: submission.attemptNumber,
        uploadedAt: submission.uploadedAt,
        problemType: submission.problemType,
        metrics: responseMetrics,
        summary: {
          rowsInCanonical: comparisonResult.rowsInCanonical,
          rowsInSubmission: comparisonResult.rowsInSubmission,
          rowsCompared: comparisonResult.rowsCompared,
          matches: comparisonResult.metrics.matches,
          mismatches: comparisonResult.rowsCompared - comparisonResult.metrics.matches,
          missingRows: comparisonResult.missingRows,
          extraRows: comparisonResult.extraRows
        },
        preview: preview
      }
    });

  } catch (error) {
    console.error('Upload submission error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

/**
 * GET /api/submissions
 * Get user's own submissions
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const submissions = await Submission.find({ userId })
      .sort({ attemptNumber: -1 })
      .select('-fileDataPreview') // Exclude preview data for list view
      .lean();

    res.json({ submissions });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/submissions/:id
 * Get detailed submission info
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const submission = await Submission.findOne({ 
      _id: id,
      userId // Ensure user can only view their own submissions
    }).lean();

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ submission });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

/**
 * GET /api/submissions/best
 * Get user's best submission
 */
router.get('/user/best', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const bestSubmission = await Submission.findOne({ userId })
      .sort({ accuracy: -1, f1: -1 })
      .lean();

    if (!bestSubmission) {
      return res.json({ submission: null });
    }

    res.json({ submission: bestSubmission });

  } catch (error) {
    console.error('Get best submission error:', error);
    res.status(500).json({ error: 'Failed to fetch best submission' });
  }
});

/**
 * PUT /api/submissions/:id/select-final
 * Mark submission as selected for final leaderboard (only one can be selected)
 */
router.put('/:id/select-final', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { isSelected } = req.body;

    // Find the submission
    const submission = await Submission.findOne({ _id: id, userId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (isSelected) {
      // Unselect all other submissions for this user
      await Submission.updateMany(
        { userId, _id: { $ne: id } },
        { $set: { isSelectedForFinal: false } }
      );
      
      // Select this submission
      submission.isSelectedForFinal = true;
      await submission.save();

      res.json({
        message: 'Submission selected for final leaderboard. Previous selection has been cleared.',
        submission: {
          id: submission._id,
          attemptNumber: submission.attemptNumber,
          isSelectedForFinal: submission.isSelectedForFinal
        }
      });
    } else {
      // Deselect this submission
      submission.isSelectedForFinal = false;
      await submission.save();

      res.json({
        message: 'Submission deselected',
        submission: {
          id: submission._id,
          attemptNumber: submission.attemptNumber,
          isSelectedForFinal: submission.isSelectedForFinal
        }
      });
    }

  } catch (error) {
    console.error('Select final submission error:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

/**
 * PUT /api/submissions/:id/comments
 * Update submission comments
 */
router.put('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { comments } = req.body;

    const submission = await Submission.findOne({ _id: id, userId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    submission.comments = comments || '';
    await submission.save();

    res.json({
      message: 'Comments updated successfully',
      submission: {
        id: submission._id,
        comments: submission.comments
      }
    });

  } catch (error) {
    console.error('Update comments error:', error);
    res.status(500).json({ error: 'Failed to update comments' });
  }
});

/**
 * DELETE /api/submissions/:id
 * Delete a submission (does not reduce submission count)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find submission
    const submission = await Submission.findById(id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Verify ownership
    if (submission.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You do not have permission to delete this submission' });
    }

    // Delete the file from uploads folder if it exists
    if (submission.filepath && fs.existsSync(submission.filepath)) {
      try {
        fs.unlinkSync(submission.filepath);
      } catch (err) {
        console.error('Failed to delete submission file:', err);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete submission from database
    // Note: We do NOT decrement the user's submission count
    // This ensures the deleted submission still counts against their limit
    await Submission.findByIdAndDelete(id);

    res.json({ 
      message: 'Submission deleted successfully',
      note: 'This submission still counts towards your submission limit'
    });

  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

/**
 * GET /api/submissions/download/csv
 * Download all user submissions as CSV file with metrics
 */
router.get('/download/csv', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const submissions = await Submission.find({ userId })
      .sort({ attemptNumber: 1 })
      .select('-fileDataPreview') // Exclude preview data for cleaner CSV
      .lean();

    if (submissions.length === 0) {
      return res.status(404).json({ error: 'No submissions found' });
    }

    const problemType = submissions[0].problemType || 'classification';
    
    // Define CSV headers based on problem type
    let headers = [
      'Attempt',
      'Upload Date',
      'Filename',
      'Total Rows',
      'Rows Compared',
      'Rows in Submission',
      'Rows in Canonical',
      'Extra Rows',
      'Missing Rows'
    ];

    if (problemType === 'classification') {
      headers.push(
        'Accuracy (Private)',
        'Precision (Private)',
        'Recall (Private)',
        'F1 Score (Private)',
        'Macro F1 (Private)',
        'Log Loss (Private)',
        'AUC-ROC (Private)',
        'MCC (Private)',
        'Accuracy (Public)',
        'Precision (Public)',
        'Recall (Public)',
        'F1 Score (Public)',
        'Macro F1 (Public)',
        'Log Loss (Public)',
        'AUC-ROC (Public)',
        'MCC (Public)'
      );
    } else {
      headers.push(
        'MAE (Private)',
        'MSE (Private)',
        'RMSE (Private)',
        'R² (Private)',
        'MAPE (Private)',
        'RMSLE (Private)',
        'MAE (Public)',
        'MSE (Public)',
        'RMSE (Public)',
        'R² (Public)',
        'MAPE (Public)',
        'RMSLE (Public)'
      );
    }

    headers.push('Final Submission Selected', 'Status');

    // Build CSV rows
    const rows = submissions.map(sub => {
      const date = new Date(sub.uploadedAt).toLocaleString();
      const baseRow = [
        sub.attemptNumber,
        date,
        sub.filename,
        sub.rowsTotal,
        sub.rowsCompared,
        sub.rowsInSubmission,
        sub.rowsInCanonical,
        sub.extraRows,
        sub.missingRows
      ];

      if (problemType === 'classification') {
        baseRow.push(
          formatNumber(sub.accuracy),
          formatNumber(sub.precision),
          formatNumber(sub.recall),
          formatNumber(sub.f1),
          formatNumber(sub.macro_f1),
          formatNumber(sub.logLoss),
          formatNumber(sub.aucRoc),
          formatNumber(sub.mcc),
          formatNumber(sub.public_accuracy),
          formatNumber(sub.public_precision),
          formatNumber(sub.public_recall),
          formatNumber(sub.public_f1),
          formatNumber(sub.public_macro_f1),
          formatNumber(sub.public_logLoss),
          formatNumber(sub.public_aucRoc),
          formatNumber(sub.public_mcc)
        );
      } else {
        baseRow.push(
          formatNumber(sub.mae),
          formatNumber(sub.mse),
          formatNumber(sub.rmse),
          formatNumber(sub.r2),
          formatNumber(sub.mape),
          formatNumber(sub.rmsle),
          formatNumber(sub.public_mae),
          formatNumber(sub.public_mse),
          formatNumber(sub.public_rmse),
          formatNumber(sub.public_r2),
          formatNumber(sub.public_mape),
          formatNumber(sub.public_rmsle)
        );
      }

      baseRow.push(
        sub.isSelectedForFinal ? 'Yes' : 'No',
        sub.status || 'done'
      );

      return baseRow;
    });

    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => {
        if (cell === null || cell === undefined) return '';
        const cellStr = String(cell);
        return cellStr.includes(',') || cellStr.includes('"') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
      }).join(','))
    ].join('\n');

    // Set response headers for file download
    const filename = `submissions_${req.user.teamName || 'team'}_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Download submissions CSV error:', error);
    res.status(500).json({ error: 'Failed to download submissions' });
  }
});

/**
 * Helper function to format numbers for CSV
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return parseFloat(num).toFixed(6);
};

export default router;
