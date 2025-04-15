// backend/routes/seo.js
const express = require('express');
const { analyzeContentSeo } = require('../controllers/seoController');
const { protect } = require('../middleware/authMiddleware'); // Needs login
const { dailyLimit, resetCounters } = require('../middleware/usageLimitMiddleware');

const router = express.Router();

// Apply protect middleware to all SEO routes
router.use(protect);

// Apply resetCounters to ensure usage stats are current
router.use(resetCounters);

// Apply daily limit middleware to SEO analysis (3 per day for free tier)
router.post('/analyze', dailyLimit('seoAnalyses'), analyzeContentSeo);

module.exports = router;