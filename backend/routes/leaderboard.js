import express from 'express';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import Config from '../models/Config.js';

const router = express.Router();

/**
 * GET /api/leaderboard
 * Get leaderboard with top submissions
 * Query params:
 *  - limit: number of top entries (default 50)
 *  - includeRank: if true, includes current user's rank
 *  - leaderboardType: 'public' or 'private' (default 'public')
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const includeRank = req.query.includeRank === 'true';
    const leaderboardType = req.query.leaderboardType || 'public';
    const currentUserId = req.user?.id;

    // Get problem type and leaderboard metric from config
    const problemTypeConfig = await Config.findOne({ key: 'problemType' });
    const leaderboardMetricConfig = await Config.findOne({ key: 'leaderboardMetric' });
    
    const problemType = problemTypeConfig?.value || 'classification';
    const leaderboardMetric = leaderboardMetricConfig?.value || 'accuracy';

    // Determine which score field to use
    const scoreField = leaderboardType === 'private' ? 'privateScore' : 'publicScore';

    // Build sort criteria based on problem type and chosen metric
    let sortCriteria = {};
    let metricField = leaderboardMetric;
    
    if (problemType === 'classification') {
      // For classification: higher is better for all metrics
      sortCriteria[metricField] = -1;
      // Add secondary sort by f1 if primary isn't f1
      if (metricField !== 'f1') {
        sortCriteria.f1 = -1;
      }
    } else {
      // For regression: depends on metric
      // mae, mse, rmse, mape: lower is better
      // r2: higher is better
      if (metricField === 'r2') {
        sortCriteria[metricField] = -1; // Higher is better
      } else {
        sortCriteria[metricField] = 1; // Lower is better for error metrics
      }
      // Add secondary sort
      if (metricField !== 'rmse') {
        sortCriteria.rmse = metricField === 'r2' ? -1 : 1;
      }
    }

    // For private leaderboard, only use submissions selected for final
    const matchCondition = leaderboardType === 'private' 
      ? { problemType: problemType, isSelectedForFinal: true }
      : { problemType: problemType };

    // Aggregate best submission for each user
    const leaderboardData = await Submission.aggregate([
      {
        $match: matchCondition
      },
      {
        $sort: sortCriteria
      },
      {
        $group: {
          _id: '$userId',
          bestMetricValue: { $first: `$${metricField}` },
          bestAccuracy: { $first: '$accuracy' },
          bestF1: { $first: '$f1' },
          bestMacroF1: { $first: '$macro_f1' },
          bestPrecision: { $first: '$precision' },
          bestRecall: { $first: '$recall' },
          bestMae: { $first: '$mae' },
          bestMse: { $first: '$mse' },
          bestRmse: { $first: '$rmse' },
          bestR2: { $first: '$r2' },
          bestMape: { $first: '$mape' },
          bestPublicScore: { $first: '$publicScore' },
          bestPrivateScore: { $first: '$privateScore' },
          bestSubmissionId: { $first: '$_id' },
          submissionDate: { $first: '$uploadedAt' },
          attemptNumber: { $first: '$attemptNumber' }
        }
      },
      {
        $sort: sortCriteria
      },
      {
        $limit: limit
      }
    ]);

    // Populate user info and filter out hidden users
    const userIds = leaderboardData.map(entry => entry._id);
    const users = await User.find({ 
      _id: { $in: userIds },
      hideFromLeaderboard: { $ne: true }
    })
      .select('email teamName leaderName')
      .lean();

    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Combine data and include all metrics, filter out hidden users
    const leaderboard = leaderboardData
      .filter(entry => userMap.has(entry._id.toString()))
      .map((entry, index) => {
      const user = userMap.get(entry._id.toString());
      const baseData = {
        rank: index + 1,
        userId: entry._id,
        teamName: user?.teamName || user?.leaderName || user?.email || 'Unknown',
        email: user?.email || 'Unknown',
        submissionDate: entry.submissionDate,
        attemptNumber: entry.attemptNumber,
        publicScore: entry.bestPublicScore,
        privateScore: leaderboardType === 'private' ? entry.bestPrivateScore : undefined
      };

      // Add metrics based on problem type
      if (problemType === 'classification') {
        return {
          ...baseData,
          accuracy: entry.bestAccuracy,
          f1: entry.bestF1,
          macro_f1: entry.bestMacroF1,
          precision: entry.bestPrecision,
          recall: entry.bestRecall
        };
      } else {
        return {
          ...baseData,
          mae: entry.bestMae,
          mse: entry.bestMse,
          rmse: entry.bestRmse,
          r2: entry.bestR2,
          mape: entry.bestMape
        };
      }
    });

    // If requested, find current user's rank
    let userRank = null;
    if (includeRank && currentUserId) {
      // Get all users sorted by the same criteria
      const allRankings = await Submission.aggregate([
        {
          $match: matchCondition
        },
        {
          $sort: sortCriteria
        },
        {
          $group: {
            _id: '$userId',
            bestMetricValue: { $first: `$${metricField}` }
          }
        },
        {
          $sort: sortCriteria
        }
      ]);

      const rankIndex = allRankings.findIndex(
        entry => entry._id.toString() === currentUserId
      );

      if (rankIndex !== -1) {
        userRank = {
          rank: rankIndex + 1,
          [metricField]: allRankings[rankIndex].bestMetricValue,
          totalUsers: allRankings.length
        };
      }
    }

    res.json({
      leaderboard,
      userRank,
      totalEntries: leaderboardData.length,
      problemType,
      leaderboardMetric,
      leaderboardType,
      sortOrder: problemType === 'regression' && metricField !== 'r2' ? 'asc' : 'desc'
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/config
 * Get public leaderboard configuration (no auth required)
 */
router.get('/config', async (req, res) => {
  try {
    const enableUserPrivateLeaderboardConfig = await Config.findOne({ key: 'enableUserPrivateLeaderboard' });
    
    res.json({
      enableUserPrivateLeaderboard: enableUserPrivateLeaderboardConfig?.value || false
    });

  } catch (error) {
    console.error('Leaderboard config error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard config' });
  }
});

export default router;
