// backend/routes/content.js
const express = require('express');
const { generateContentIdeas } = require('../controllers/contentController');
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware

const router = express.Router();

// Apply protect middleware to this route
router.post('/ideation', protect, generateContentIdeas);

module.exports = router;