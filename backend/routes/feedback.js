// backend/routes/feedback.js
const express = require('express');
const { 
  createFeedback,
  getUserFeedback,
  getFeedbackById,
  addReply,
  updateStatus,
  updateRating,
  getAllFeedback
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Routes for all authenticated users
router.route('/')
  .post(createFeedback)
  .get(getUserFeedback);

router.route('/:id')
  .get(getFeedbackById);

router.route('/:id/reply')
  .post(addReply);

router.route('/:id/rating')
  .patch(updateRating);

// Admin only routes
router.route('/:id/status')
  .patch(authorize('admin'), updateStatus);

router.route('/admin')
  .get(authorize('admin'), getAllFeedback);

module.exports = router;