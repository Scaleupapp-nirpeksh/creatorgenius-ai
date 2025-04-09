// backend/routes/trends.js
const express = require('express');
const { queryTrends, saveSearchAsInsight } = require('../controllers/trendsController');
const { protect } = require('../middleware/authMiddleware'); // Only needs login protection here

const router = express.Router();

// Apply protect middleware - all trend queries require login
router.use(protect);

// Route for querying trends/news
router.post('/query', queryTrends); // POST /api/trends/query

// Route for saving search results as insights
router.post('/save-insight', saveSearchAsInsight); // POST /api/trends/save-insight

module.exports = router;