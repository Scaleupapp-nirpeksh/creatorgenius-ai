// backend/controllers/calendarController.js
const ScheduledIdea = require('../models/ScheduledIdea');
const SavedIdea = require('../models/SavedIdea');
const mongoose = require('mongoose');

// @desc    Schedule an idea for the content calendar
// @route   POST /api/calendar
// @access  Private
exports.scheduleIdea = async (req, res) => {
  try {
    const {
      ideaId,
      scheduledDate,
      publishingPlatform,
      priority,
      dueDate,
      postingNotes,
      additionalDetails
    } = req.body;

    // Input validation
    if (!ideaId || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Idea ID and scheduled date are required'
      });
    }

    // Verify idea exists and belongs to the user
    const savedIdea = await SavedIdea.findOne({
      _id: ideaId,
      userId: req.user._id
    });

    if (!savedIdea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found or you do not have permission to schedule this idea'
      });
    }

    // Create scheduled idea
    const scheduledIdea = await ScheduledIdea.create({
      userId: req.user._id,
      ideaId,
      scheduledDate,
      publishingPlatform: publishingPlatform || 'Not specified',
      priority: priority || 'medium',
      dueDate,
      postingNotes,
      additionalDetails
    });

    return res.status(201).json({
      success: true,
      message: 'Idea scheduled successfully',
      data: scheduledIdea
    });

  } catch (error) {
    console.error('Error in scheduleIdea:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error when scheduling idea'
    });
  }
};

// @desc    Get all scheduled ideas for the user's calendar
// @route   GET /api/calendar
// @access  Private
exports.getScheduledIdeas = async (req, res) => {
  try {
    // Query parameters for filtering
    const { startDate, endDate, status, platform, priority } = req.query;
    
    // Build query
    const query = { userId: req.user._id };
    
    // Date range filter
    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.scheduledDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.scheduledDate = { $lte: new Date(endDate) };
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Platform filter
    if (platform) {
      query.publishingPlatform = platform;
    }
    
    // Priority filter
    if (priority) {
      query.priority = priority;
    }
    
    // Execute query with populated idea details
    const scheduledIdeas = await ScheduledIdea.find(query)
      .populate('ideaId')
      .sort({ scheduledDate: 1 })
      .lean();
    
    // Update status for any delayed items
    const now = new Date();
    const updatedItems = [];
    
    for (let item of scheduledIdeas) {
      // Check if item is delayed (past scheduled date but not posted)
      if (item.status === 'scheduled' && 
          new Date(item.scheduledDate) < now) {
        // Update status to delayed
        await ScheduledIdea.findByIdAndUpdate(
          item._id,
          { status: 'delayed', lastModified: now }
        );
        
        item.status = 'delayed';
        updatedItems.push(item._id);
      }
    }
    
    // Log if any items were auto-updated to delayed
    if (updatedItems.length > 0) {
      console.log(`${updatedItems.length} items automatically marked as delayed`);
    }
    
    return res.status(200).json({
      success: true,
      count: scheduledIdeas.length,
      data: scheduledIdeas
    });
    
  } catch (error) {
    console.error('Error in getScheduledIdeas:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving scheduled ideas'
    });
  }
};

// @desc    Get a specific scheduled idea
// @route   GET /api/calendar/:id
// @access  Private
exports.getScheduledIdea = async (req, res) => {
  try {
    const scheduledIdea = await ScheduledIdea.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('ideaId');
    
    if (!scheduledIdea) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled idea not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: scheduledIdea
    });
    
  } catch (error) {
    console.error('Error in getScheduledIdea:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving scheduled idea'
    });
  }
};

// @desc    Update a scheduled idea
// @route   PUT /api/calendar/:id
// @access  Private
exports.updateScheduledIdea = async (req, res) => {
  try {
    const {
      scheduledDate,
      publishingPlatform,
      status,
      priority,
      dueDate,
      postingNotes,
      additionalDetails
    } = req.body;
    
    // Find the scheduled idea
    let scheduledIdea = await ScheduledIdea.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!scheduledIdea) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled idea not found'
      });
    }
    
    // Update the scheduled idea
    scheduledIdea = await ScheduledIdea.findByIdAndUpdate(
      req.params.id,
      {
        scheduledDate: scheduledDate || scheduledIdea.scheduledDate,
        publishingPlatform: publishingPlatform || scheduledIdea.publishingPlatform,
        status: status || scheduledIdea.status,
        priority: priority || scheduledIdea.priority,
        dueDate: dueDate !== undefined ? dueDate : scheduledIdea.dueDate,
        postingNotes: postingNotes !== undefined ? postingNotes : scheduledIdea.postingNotes,
        additionalDetails: additionalDetails !== undefined ? additionalDetails : scheduledIdea.additionalDetails,
        lastModified: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('ideaId');
    
    return res.status(200).json({
      success: true,
      message: 'Scheduled idea updated successfully',
      data: scheduledIdea
    });
    
  } catch (error) {
    console.error('Error in updateScheduledIdea:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error when updating scheduled idea'
    });
  }
};

// @desc    Delete a scheduled idea
// @route   DELETE /api/calendar/:id
// @access  Private
exports.deleteScheduledIdea = async (req, res) => {
  try {
    const scheduledIdea = await ScheduledIdea.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!scheduledIdea) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled idea not found'
      });
    }
    
    await scheduledIdea.deleteOne();
    
    return res.status(200).json({
      success: true,
      message: 'Scheduled idea removed from calendar',
      data: {}
    });
    
  } catch (error) {
    console.error('Error in deleteScheduledIdea:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when deleting scheduled idea'
    });
  }
};