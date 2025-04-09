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

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.route('/')
  .post(createInsight)  // Create a new insight
  .get(getInsights);    // Get all insights for the user

router.route('/:id')
  .get(getInsightById)    // Get a specific insight
  .put(updateInsight)     // Update a specific insight
  .delete(deleteInsight); // Delete a specific insight

router.post('/from-seo', saveSeoReportAsInsight); // POST /api/insights/from-seo

module.exports = router;