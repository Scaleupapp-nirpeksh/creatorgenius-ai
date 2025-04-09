// backend/controllers/insightController.js
const Insight = require('../models/Insight');
const mongoose = require('mongoose');
const User = require('../models/User'); // For usage tracking

// @desc    Create a new insight
// @route   POST /api/insights
// @access  Private
exports.createInsight = async (req, res) => {
  try {
    const { type, title, content, source, tags, notes } = req.body;

    // Basic validation
    if (!type || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, title, and content for the insight'
      });
    }

    // Check if type is valid
    const validTypes = ['trend', 'news', 'idea', 'search_result','seo_result'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid insight type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Create insight
    const insight = await Insight.create({
      userId: req.user._id,
      type,
      title,
      content,
      source: source || {}, // Default to empty object if not provided
      tags: tags || [],
      notes: notes || ''
    });

    // Optionally increment usage count (if you decide to track this)
    try {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'usage.insightsSavedThisMonth': 1 } 
      });
    } catch (updateError) {
      console.error(`Non-critical: Failed to update insights saved count for user ${req.user._id}:`, updateError);
    }

    return res.status(201).json({
      success: true,
      message: 'Insight created successfully',
      data: insight
    });

  } catch (error) {
    console.error('Error in createInsight:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error when creating insight'
    });
  }
};

// @desc    Get all insights for the logged-in user
// @route   GET /api/insights
// @access  Private
exports.getInsights = async (req, res) => {
  try {
    // Query parameters for filtering
    const { type, search, limit = 20, page = 1 } = req.query;
    
    // Build query
    const query = { userId: req.user._id };
    
    // Type filter
    if (type) {
      query.type = type;
    }
    
    // Search (title or tags)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } }, // Case-insensitive search in title
        { tags: { $in: [new RegExp(search, 'i')] } }  // Search in tags
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const insights = await Insight.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Insight.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      count: insights.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      },
      data: insights
    });
    
  } catch (error) {
    console.error('Error in getInsights:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving insights'
    });
  }
};

// @desc    Get a specific insight
// @route   GET /api/insights/:id
// @access  Private
exports.getInsightById = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid insight ID format'
      });
    }

    const insight = await Insight.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: insight
    });
    
  } catch (error) {
    console.error('Error in getInsightById:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving insight'
    });
  }
};

// @desc    Update a specific insight
// @route   PUT /api/insights/:id
// @access  Private
exports.updateInsight = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid insight ID format'
      });
    }

    const { title, tags, notes } = req.body;
    
    // Find insight and check ownership
    const insight = await Insight.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }
    
    // Update only allowed fields
    // Note: We don't allow changing type or content after creation
    // to maintain data integrity
    const updatedData = {};
    
    if (title !== undefined) updatedData.title = title;
    if (tags !== undefined) updatedData.tags = tags;
    if (notes !== undefined) updatedData.notes = notes;
    
    // Add updatedAt timestamp
    updatedData.updatedAt = Date.now();
    
    // Perform update
    const updatedInsight = await Insight.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Insight updated successfully',
      data: updatedInsight
    });
    
  } catch (error) {
    console.error('Error in updateInsight:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error when updating insight'
    });
  }
};

// @desc    Delete a specific insight
// @route   DELETE /api/insights/:id
// @access  Private
exports.deleteInsight = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid insight ID format'
      });
    }

    const insight = await Insight.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }
    
    await insight.deleteOne();
    
    return res.status(200).json({
      success: true,
      message: 'Insight deleted successfully',
      data: {}
    });
    
  } catch (error) {
    console.error('Error in deleteInsight:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when deleting insight'
    });
  }
};


// @desc    Save an SEO analysis result as an insight
// @route   POST /api/insights/from-seo
// @access  Private
exports.saveSeoReportAsInsight = async (req, res) => {
    try {
      // Input: Expecting seoData object. Title is now optional at top level.
      // Use 'providedTitle' to distinguish from the final title we use.
      const { title: providedTitle, seoData, sourceQuery, notes, tags: customTags } = req.body;

      // --- Validation for seoData ---
      // Validate seoData structure minimally first.
      // We also need suggestedSaveTitle inside seoData if providedTitle is missing.
      if (!seoData || typeof seoData !== 'object' ||
          !seoData.suggestedKeywords || !seoData.optimizedTitles ||
          !seoData.optimizedDescription || !seoData.suggestedHashtags) {
          // Removed check for seoData.suggestedSaveTitle here, will handle fallback below
          return res.status(400).json({ success: false, message: 'Valid seoData object with core SEO suggestions is required.' });
      }

      // --- Determine the Title ---
      let insightTitle = providedTitle?.trim(); // Use provided title if exists and not just whitespace

      // If no title provided in request body, try using the one from seoData
      if (!insightTitle && seoData.suggestedSaveTitle) {
          insightTitle = seoData.suggestedSaveTitle.trim();
      }

      // If still no title (neither provided nor generated), create a fallback
      if (!insightTitle) {
          const fallbackDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric'}); // e.g., 09 Apr 2025
          insightTitle = `SEO Report - ${fallbackDate}`;
          console.warn("No title provided or generated for SEO Insight, using fallback:", insightTitle);
      }
      // --- End Determine the Title ---


      // --- Prepare Insight Data ---
      // Auto-generate some tags from suggested keywords if no custom tags provided
      let insightTags = [];
      if (customTags && Array.isArray(customTags)) {
          insightTags = customTags.slice(0, 10); // Limit custom tags
      } else if (seoData.suggestedKeywords && seoData.suggestedKeywords.length > 0) {
          // Take top 5-8 suggested keywords as tags
          insightTags = seoData.suggestedKeywords.slice(0, 8).map(tag => tag.toLowerCase());
      }

      const insightToSave = {
        userId: req.user._id,
        type: 'seo_result', // Specific type
        title: insightTitle, // Use the determined title
        content: seoData, // Store the entire SEO analysis result object
        source: {
            name: "CreatorGenius SEO Tool",
            query: sourceQuery || null // Store the original topic/query if provided
        },
        tags: insightTags,
        notes: notes || ''
      };

      // --- Create Insight ---
      const savedInsight = await Insight.create(insightToSave);

      // --- Increment Usage Count (non-critical) ---
      try {
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { 'usage.insightsSavedThisMonth': 1 } // Increment monthly count
        });
      } catch (updateError) {
        console.error(`Non-critical: Failed to update insights saved count for user ${req.user._id}:`, updateError);
      }
      // --- End Usage Count ---

      return res.status(201).json({
        success: true,
        message: 'SEO report saved as insight successfully',
        data: savedInsight
      });

    } catch (error) {
      console.error('Error in saveSeoReportAsInsight:', error);
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: messages.join(', ') });
      }
      return res.status(500).json({ success: false, message: 'Server error when saving SEO report insight' });
    }
}; // --- End of saveSeoReportAsInsight ---