import express from 'express';
import Competition from '../models/Competition.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/competition
 * Get competition information (public)
 */
router.get('/', async (req, res) => {
  try {
    // Use raw MongoDB collection to bypass schema validation for migration
    const db = Competition.db;
    const rawCompetition = await db.collection('competitions').findOne({});
    
    if (!rawCompetition) {
      // Create default competition info
      const competition = new Competition({
        title: 'Datathon Competition',
        description: 'Welcome to the competition! Upload your predictions to compete.',
        evaluationCriteria: 'Submissions are evaluated based on the selected metric.',
        rules: ['Competition rules will be posted here.'],
        prizes: [],
        timeline: {
          startDate: '',
          endDate: '',
          finalSubmissionDate: ''
        },
        dataDescription: {
          overview: 'Dataset information will be provided here.',
          files: [],
          columns: []
        }
      });
      await competition.save();
      return res.json({ competition });
    }
    
    // Migrate old schema to new schema if needed
    let needsUpdate = false;
    const updateData = {};
    
    if (typeof rawCompetition.rules === 'string') {
      updateData.rules = rawCompetition.rules ? [rawCompetition.rules] : [];
      needsUpdate = true;
    }
    
    if (typeof rawCompetition.prizes === 'string') {
      updateData.prizes = [];
      needsUpdate = true;
    }
    
    if (typeof rawCompetition.timeline === 'string') {
      updateData.timeline = {
        startDate: '',
        endDate: '',
        finalSubmissionDate: ''
      };
      needsUpdate = true;
    }
    
    if (typeof rawCompetition.dataDescription === 'string') {
      updateData.dataDescription = {
        overview: rawCompetition.dataDescription || 'Dataset information will be provided here.',
        files: [],
        columns: []
      };
      needsUpdate = true;
    }
    
    if (!rawCompetition.evaluationCriteria && rawCompetition.evaluation) {
      updateData.evaluationCriteria = rawCompetition.evaluation;
      needsUpdate = true;
    }
    
    // Update raw document if needed
    if (needsUpdate) {
      await db.collection('competitions').updateOne(
        { _id: rawCompetition._id },
        { 
          $set: updateData,
          $unset: { evaluation: 1 }
        }
      );
    }
    
    // Now fetch with Mongoose (data is now in correct format)
    const competition = await Competition.findOne();
    res.json({ competition });
    
  } catch (error) {
    console.error('Get competition error:', error);
    res.status(500).json({ error: 'Failed to fetch competition information' });
  }
});

/**
 * PUT /api/competition
 * Update competition information (admin only)
 */
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, evaluationCriteria, rules, prizes, timeline, dataDescription } = req.body;

    // Use raw MongoDB collection to bypass schema validation
    const db = Competition.db;
    const rawCompetition = await db.collection('competitions').findOne({});
    
    const updateData = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (evaluationCriteria !== undefined) updateData.evaluationCriteria = evaluationCriteria;
    if (rules !== undefined) updateData.rules = rules;
    if (prizes !== undefined) updateData.prizes = prizes;
    if (timeline !== undefined) updateData.timeline = timeline;
    if (dataDescription !== undefined) updateData.dataDescription = dataDescription;
    
    if (rawCompetition) {
      // Update existing document
      await db.collection('competitions').updateOne(
        { _id: rawCompetition._id },
        { $set: updateData }
      );
    } else {
      // Create new document
      await db.collection('competitions').insertOne(updateData);
    }

    // Fetch updated competition with Mongoose
    const competition = await Competition.findOne();

    res.json({
      message: 'Competition information updated successfully',
      competition
    });
  } catch (error) {
    console.error('Update competition error:', error);
    res.status(500).json({ error: 'Failed to update competition information', details: error.message });
  }
});

export default router;
