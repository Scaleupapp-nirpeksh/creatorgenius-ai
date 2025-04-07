// backend/routes/calendar.js
const express = require('express');
const { 
  scheduleIdea, 
  getScheduledIdeas, 
  getScheduledIdea,
  updateScheduledIdea,
  deleteScheduledIdea
} = require('../controllers/calendarController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.route('/')
  .post(scheduleIdea)     // Schedule a new idea
  .get(getScheduledIdeas); // Get all scheduled ideas

router.route('/:id')
  .get(getScheduledIdea)       // Get a specific scheduled idea
  .put(updateScheduledIdea)    // Update a scheduled idea
  .delete(deleteScheduledIdea); // Delete a scheduled idea

module.exports = router;