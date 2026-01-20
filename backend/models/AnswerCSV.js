import mongoose from 'mongoose';

const answerCSVSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // Column configuration
  idColumn: {
    type: String,
    required: true,
    default: 'row_id'
  },
  labelColumn: {
    type: String,
    required: true,
    default: 'label'
  },
  // Public/Private split percentage
  publicPercentage: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  // Store row counts instead of full data
  totalRows: {
    type: Number,
    default: 0
  },
  publicRows: {
    type: Number,
    default: 0
  },
  privateRows: {
    type: Number,
    default: 0
  },
  // Store only sample data (first 10 rows) for verification
  publicDataSample: [{
    type: mongoose.Schema.Types.Mixed
  }],
  privateDataSample: [{
    type: mongoose.Schema.Types.Mixed
  }],
  columns: [String], // Store all column names from CSV
  
  // Store filepath for recovery after server restart
  filepath: {
    type: String,
    default: null
  }
}, { strict: false });

export default mongoose.model('AnswerCSV', answerCSVSchema);
