// backend/controllers/feedbackController.js
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper function to check if a user is an admin
const isAdmin = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
  } catch (error) {
    return false;
  }
};

// @desc    Create a new feedback/query/issue
// @route   POST /api/feedback
// @access  Private
exports.createFeedback = async (req, res) => {
  try {
    const { type, title, description, rating, ratingReason, tags } = req.body;

    // Basic validation
    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, title, and description for the feedback'
      });
    }

    // Validate type
    const validTypes = ['query', 'feedback', 'issue'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid feedback type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate rating if provided
    if (rating !== undefined) {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5'
        });
      }
    }

    // Create feedback
    const feedback = await Feedback.create({
      userId: req.user._id,
      type,
      title,
      description,
      rating: rating || undefined,
      ratingReason: ratingReason || undefined,
      tags: tags || []
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error in createFeedback:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error when creating feedback'
    });
  }
};

// @desc    Get all feedback for the logged-in user
// @route   GET /api/feedback
// @access  Private
exports.getUserFeedback = async (req, res) => {
  try {
    // Query parameters for filtering
    const { type, status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = { userId: req.user._id };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Feedback.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      count: feedback.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      },
      data: feedback
    });
  } catch (error) {
    console.error('Error in getUserFeedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving feedback'
    });
  }
};

// @desc    Get a specific feedback
// @route   GET /api/feedback/:id
// @access  Private
exports.getFeedbackById = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID format'
      });
    }

    // Find feedback and check ownership (unless admin)
    let feedback;
    const userIsAdmin = await isAdmin(req.user._id);

    if (userIsAdmin) {
      // Admins can access any feedback
      feedback = await Feedback.findById(req.params.id);
    } else {
      // Regular users can only access their own feedback
      feedback = await Feedback.findOne({
        _id: req.params.id,
        userId: req.user._id
      });
    }
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error in getFeedbackById:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving feedback'
    });
  }
};

// @desc    Add a reply to feedback
// @route   POST /api/feedback/:id/reply
// @access  Private
exports.addReply = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID format'
      });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const userIsAdmin = await isAdmin(req.user._id);
    
    // Find feedback and check permissions
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    // Only allow the feedback owner or admins to reply
    if (feedback.userId.toString() !== req.user._id.toString() && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reply to this feedback'
      });
    }

    // Create new reply
    const newReply = {
      userId: req.user._id,
      isAdmin: userIsAdmin,
      content
    };

    // Add reply to feedback and update the timestamp
    feedback.replies.push(newReply);
    feedback.updatedAt = Date.now();
    await feedback.save();

    return res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error in addReply:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when adding reply'
    });
  }
};

// @desc    Update feedback status (admin only)
// @route   PATCH /api/feedback/:id/status
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID format'
      });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Valid status values
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Verify user is admin
    const userIsAdmin = await isAdmin(req.user._id);
    if (!userIsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update feedback status'
      });
    }

    // Find feedback
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Update status and timestamp
    feedback.status = status;
    feedback.updatedAt = Date.now();
    
    // If resolving, set resolvedAt timestamp
    if (status === 'resolved' && !feedback.resolvedAt) {
      feedback.resolvedAt = Date.now();
    }

    await feedback.save();

    return res.status(200).json({
      success: true,
      message: 'Feedback status updated successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error in updateStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when updating feedback status'
    });
  }
};

// @desc    Update feedback rating
// @route   PATCH /api/feedback/:id/rating
// @access  Private
exports.updateRating = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID format'
      });
    }

    const { rating, ratingReason } = req.body;

    if (rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    // Find feedback and verify ownership
    const feedback = await Feedback.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found or you do not have permission to update it'
      });
    }

    // Update rating and reason
    feedback.rating = rating;
    if (ratingReason !== undefined) {
      feedback.ratingReason = ratingReason;
    }
    feedback.updatedAt = Date.now();
    
    await feedback.save();

    return res.status(200).json({
      success: true,
      message: 'Feedback rating updated successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error in updateRating:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when updating feedback rating'
    });
  }
};

// @desc    Get all feedback (admin only)
// @route   GET /api/feedback/admin
// @access  Private/Admin
exports.getAllFeedback = async (req, res) => {
  try {
    // Verify user is admin
    const userIsAdmin = await isAdmin(req.user._id);
    if (!userIsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access all feedback'
      });
    }

    // Query parameters for filtering
    const { 
      type, status, userId, 
      page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'desc' 
    } = req.query;
    
    // Build query
    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
    }
    
    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination and populate user details
    const feedback = await Feedback.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email');
    
    // Get total count for pagination
    const total = await Feedback.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      count: feedback.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      },
      data: feedback
    });
  } catch (error) {
    console.error('Error in getAllFeedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving all feedback'
    });
  }
};