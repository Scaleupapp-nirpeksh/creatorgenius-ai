// backend/routes/insights.js
const express = require('express');
const { 
  createInsight,
  getInsights,
  getInsightById,
  updateInsight,
  deleteInsight,
  saveSeoReportAsInsight
} = require('../controllers/insightController');
const { protect } = require('../middleware/authMiddleware');
const { dailyLimit, storageLimit, resetCounters } = require('../middleware/usageLimitMiddleware');
const Insight = require('../models/Insight');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Apply resetCounters to ensure usage stats are current
router.use(resetCounters);

// Routes
router.route('/')
  // Apply daily limit to insights saved per day and storage limit for max insights
  .post(
    dailyLimit('insightsSaved'), 
    storageLimit(Insight, 'insights', 'insightsTotal'),
    createInsight
  )
  .get(getInsights);

router.route('/:id')
  .get(getInsightById)
  .put(updateInsight)
  .delete(deleteInsight);

// Apply daily insight limit to SEO report saving
router.post('/from-seo', 
  dailyLimit('insightsSaved'), 
  storageLimit(Insight, 'insights', 'insightsTotal'),
  saveSeoReportAsInsight
);

module.exports = router;