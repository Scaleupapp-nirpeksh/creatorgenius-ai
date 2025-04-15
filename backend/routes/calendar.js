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
const { storageLimit, resetCounters } = require('../middleware/usageLimitMiddleware');
const ScheduledIdea = require('../models/ScheduledIdea');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Apply resetCounters to ensure usage stats are current
router.use(resetCounters);

// Routes
router.route('/')
  // Apply storageLimit middleware to POST requests to enforce max scheduled items
  .post(storageLimit(ScheduledIdea, 'scheduled items', 'calendarItems'), scheduleIdea)
  .get(getScheduledIdeas);

router.route('/:id')
  .get(getScheduledIdea)
  .put(updateScheduledIdea)
  .delete(deleteScheduledIdea);

module.exports = router;