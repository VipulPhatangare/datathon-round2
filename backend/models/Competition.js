import mongoose from 'mongoose';

const competitionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Datathon Competition'
  },
  description: {
    type: String,
    required: true,
    default: 'Welcome to the competition! Upload your predictions to compete.'
  },
  evaluationCriteria: {
    type: String,
    default: ''
  },
  rules: {
    type: [String],
    default: []
  },
  prizes: {
    type: [{
      position: String,
      reward: String
    }],
    default: []
  },
  evaluation: {
    type: String,
    default: ''
  },
  timeline: {
    startDate: String,
    endDate: String,
    finalSubmissionDate: String
  },
  dataDescription: {
    overview: String,
    files: [{
      name: String,
      description: String
    }],
    columns: [{
      name: String,
      type: String,
      description: String
    }]
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

competitionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Competition', competitionSchema);
