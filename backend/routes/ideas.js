// backend/routes/ideas.js
const express = require('express');
// Add refineIdea to import
const { saveIdea, getSavedIdeas, deleteIdea, refineIdea, getRefinementsForIdea } = require('../controllers/ideaController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect); // Apply protect to all

router.route('/')
    .post(saveIdea)
    .get(getSavedIdeas);

// Route for specific idea operations (DELETE)
router.route('/:id')
    .delete(deleteIdea);


// This needs to be specific enough not to clash with /:id for GET/PUT if added later
router.route('/:id/refine')
    .post(refineIdea); // POST /api/ideas/:id/refine

// Add route for getting refinements
router.route('/:id/refinements')
    .get(getRefinementsForIdea); // GET /api/ideas/:id/refinements


module.exports = router;