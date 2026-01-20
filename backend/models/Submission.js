import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  rowsTotal: {
    type: Number,
    required: true
  },
  matches: {
    type: Number,
    required: false
  },
  // Classification metrics
  accuracy: {
    type: Number,
    required: false
  },
  precision: {
    type: Number,
    required: false
  },
  recall: {
    type: Number,
    required: false
  },
  f1: {
    type: Number,
    required: false
  },
  macro_f1: {
    type: Number,
    required: false
  },
  logLoss: {
    type: Number,
    required: false
  },
  aucRoc: {
    type: Number,
    required: false
  },
  mcc: {
    type: Number,
    required: false
  },
  // Regression metrics
  mae: {
    type: Number,
    required: false
  },
  mse: {
    type: Number,
    required: false
  },
  rmse: {
    type: Number,
    required: false
  },
  r2: {
    type: Number,
    required: false
  },
  mape: {
    type: Number,
    required: false
  },
  rmsle: {
    type: Number,
    required: false
  },
  // Public metrics (leaderboard display) - Classification
  public_accuracy: {
    type: Number,
    required: false
  },
  public_precision: {
    type: Number,
    required: false
  },
  public_recall: {
    type: Number,
    required: false
  },
  public_f1: {
    type: Number,
    required: false
  },
  public_macro_f1: {
    type: Number,
    required: false
  },
  public_logLoss: {
    type: Number,
    required: false
  },
  public_aucRoc: {
    type: Number,
    required: false
  },
  public_mcc: {
    type: Number,
    required: false
  },
  // Public metrics (leaderboard display) - Regression
  public_mae: {
    type: Number,
    required: false
  },
  public_mse: {
    type: Number,
    required: false
  },
  public_rmse: {
    type: Number,
    required: false
  },
  public_r2: {
    type: Number,
    required: false
  },
  public_mape: {
    type: Number,
    required: false
  },
  public_rmsle: {
    type: Number,
    required: false
  },
  // Problem type
  problemType: {
    type: String,
    enum: ['classification', 'regression'],
    default: 'classification'
  },
  // Store preview of rows with predictions
  fileDataPreview: [{
    row_id: String,
    predicted: String,
    actual: String,
    match: Boolean
  }],
  status: {
    type: String,
    default: 'done'
  },
  attemptNumber: {
    type: Number,
    required: true
  },
  // Additional info about comparison
  rowsInCanonical: Number,
  rowsInSubmission: Number,
  rowsCompared: Number,
  extraRows: Number,
  missingRows: Number,
  // Final submission selection
  isSelectedForFinal: {
    type: Boolean,
    default: false
  },
  comments: {
    type: String,
    default: ''
  },
  // Leaderboard visibility
  leaderboardType: {
    type: String,
    enum: ['public', 'private', 'both'],
    default: 'both'
  },
  // Public score (based on subset of test data)
  publicScore: {
    type: Number,
    required: false
  },
  // Private score (based on full test data)
  privateScore: {
    type: Number,
    required: false
  }
});

// Index for faster queries
submissionSchema.index({ userId: 1, attemptNumber: -1 });
submissionSchema.index({ isSelectedForFinal: 1 });
submissionSchema.index({ accuracy: -1, f1: -1 });

export default mongoose.model('Submission', submissionSchema);
