// backend/routes/seo.js
const express = require('express');
const { analyzeContentSeo } = require('../controllers/seoController');
const { protect } = require('../middleware/authMiddleware'); // Needs login

const router = express.Router();

// Apply protect middleware to all SEO routes
router.use(protect);

// Route for analyzing content SEO
router.post('/analyze', analyzeContentSeo); // POST /api/seo/analyze

module.exports = router;