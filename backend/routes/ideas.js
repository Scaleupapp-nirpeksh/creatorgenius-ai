// backend/routes/ideas.js
const express = require('express');
const { saveIdea, getSavedIdeas, deleteIdea } = require('../controllers/ideaController');
console.log("Imported getSavedIdeas:", typeof getSavedIdeas); 
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

// Route definitions
router.route('/')
    .post(saveIdea)    // POST /api/ideas
    .get(getSavedIdeas);   // GET /api/ideas

router.route('/:id')
    .delete(deleteIdea); // DELETE /api/ideas/:id

module.exports = router;