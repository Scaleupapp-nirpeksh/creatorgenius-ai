// backend/routes/content.js
const express = require('express');
const { generateContentIdeas, generateTrendIdeas } = require('../controllers/contentController');
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware
const { monthlyLimit, dailyLimit, resetCounters } = require('../middleware/usageLimitMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// Apply resetCounters to ensure usage stats are current
router.use(resetCounters);

// Apply monthly limit middleware to content ideation
router.post('/ideation', monthlyLimit('contentIdeations'), generateContentIdeas);

// Apply daily limit middleware to trend ideation
router.post('/trend-ideation', dailyLimit('trendIdeations'), generateTrendIdeas);
module.exports = router;