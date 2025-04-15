// backend/routes/trends.js
const express = require('express');
const { queryTrends, saveSearchAsInsight } = require('../controllers/trendsController');
const { protect } = require('../middleware/authMiddleware');
const { dailyLimit, storageLimit, resetCounters } = require('../middleware/usageLimitMiddleware');
const Insight = require('../models/Insight');

const router = express.Router();

// Apply protect middleware - all trend queries require login
router.use(protect);

// Apply resetCounters to ensure usage stats are current
router.use(resetCounters);

// Route for querying trends/news with daily limit (5 per day for free tier)
router.post('/query', dailyLimit('searchQueries'), queryTrends);

// Route for saving search results as insights
router.post('/save-insight', 
  dailyLimit('insightsSaved'),
  storageLimit(Insight, 'insights', 'insightsTotal'),
  saveSearchAsInsight
);

module.exports = router;