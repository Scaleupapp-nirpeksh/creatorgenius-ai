// backend/routes/ideas.js

const express = require('express');
const {
  saveIdea,
  getSavedIdeas,
  deleteIdea,
  refineIdea,
  getRefinementsForIdea,
  getIdeaById,
  updateIdea
} = require('../controllers/ideaController');

const { protect } = require('../middleware/authMiddleware');
const { 
  storageLimit,
  monthlyLimit,
  resetCounters
} = require('../middleware/usageLimitMiddleware');

const SavedIdea = require('../models/SavedIdea');

const router = express.Router();

// 1) Protect all routes
router.use(protect);

// 2) Reset counters so daily/monthly usage is fresh
router.use(resetCounters);

// 3) Create + Retrieve saved ideas
router.route('/')
  .post(
    // Apply storage limit so free tier can't exceed X saved ideas
    storageLimit(SavedIdea, 'saved ideas', 'savedIdeas'),
    saveIdea
  )
  .get(getSavedIdeas);

// 4) Single idea CRUD
router.route('/:id')
  .get(getIdeaById)
  .put(updateIdea)
  .delete(deleteIdea);

// 5) Refinements - monthly usage limit
router.route('/:id/refine')
  .post(
    monthlyLimit('refinements'), 
    refineIdea
  );

// 6) Get all refinements for an idea
router.route('/:id/refinements')
  .get(getRefinementsForIdea);

module.exports = router;
