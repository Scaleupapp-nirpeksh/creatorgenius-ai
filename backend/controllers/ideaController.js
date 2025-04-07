// backend/controllers/ideaController.js
const SavedIdea = require('../models/SavedIdea');
console.log("Imported SavedIdea in Controller:", typeof SavedIdea, SavedIdea);
const mongoose = require('mongoose'); // Needed for ObjectId validation

// @desc    Save a generated idea
// @route   POST /api/ideas
// @access  Private
exports.saveIdea = async (req, res, next) => {
  try {
    // Get idea data from request body
    const { title, angle, tags, hook, structure_points, platform_suitability, intendedEmotion } = req.body;

    // Simple validation (more can be added)
    if (!title || !angle || !tags) {
       return res.status(400).json({ success: false, message: 'Missing required idea fields (title, angle, tags).' });
    }

    // Create new saved idea document linked to the logged-in user
    const newIdea = await SavedIdea.create({
      userId: req.user._id, // From 'protect' middleware
      title,
      angle,
      tags,
      hook,
      structure_points,
      platform_suitability,
      intendedEmotion
      // Add originalInput here if storing it: originalInput: req.body.originalInputData || null
    });

    res.status(201).json({ success: true, data: newIdea });

  } catch (error) {
    console.error("Error saving idea:", error);
     // Handle potential validation errors from Mongoose
     if (error.name === 'ValidationError') {
         const messages = Object.values(error.errors).map(val => val.message);
         return res.status(400).json({ success: false, message: messages.join('. ') });
     }
    // Handle potential duplicate key errors if unique index is used
     if (error.code === 11000) {
         return res.status(400).json({ success: false, message: 'Idea with this title might already be saved.' });
     }
    res.status(500).json({ success: false, message: 'Server error while saving idea.' });
  }
};


// @desc    Get all saved ideas for the logged-in user
// @route   GET /api/ideas
// @access  Private
exports.getSavedIdeas = async (req, res, next) => {
    try {
        const ideas = await SavedIdea.find({ userId: req.user._id }).sort({ savedAt: -1 }); // Sort by newest first

        res.status(200).json({
            success: true,
            count: ideas.length,
            data: ideas
        });
    } catch (error) {
        console.error("Error fetching saved ideas:", error);
        res.status(500).json({ success: false, message: 'Server error while fetching ideas.' });
    }
};

// @desc    Delete a specific saved idea
// @route   DELETE /api/ideas/:id
// @access  Private
exports.deleteIdea = async (req, res, next) => {
    try {
        const ideaId = req.params.id;

        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(ideaId)) {
             return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
        }

        const idea = await SavedIdea.findById(ideaId);

        if (!idea) {
            return res.status(404).json({ success: false, message: `No saved idea found with ID ${ideaId}` });
        }

        // IMPORTANT: Verify the idea belongs to the logged-in user
        if (idea.userId.toString() !== req.user._id.toString()) {
             return res.status(401).json({ success: false, message: 'User not authorized to delete this idea.' });
        }

        // Perform the deletion
        await idea.deleteOne(); // Use deleteOne() on the document instance

        res.status(200).json({ success: true, message: 'Idea deleted successfully.', data: {} }); // Return empty data on delete

    } catch (error) {
        console.error("Error deleting idea:", error);
        res.status(500).json({ success: false, message: 'Server error while deleting idea.' });
    }
};