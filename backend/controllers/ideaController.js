// backend/controllers/ideaController.js

const SavedIdea = require('../models/SavedIdea');
const mongoose = require('mongoose');
const { OpenAI } = require("openai"); 
const User = require('../models/User');
const Refinement = require('../models/Refinement');
const { withRetry } = require('../utils/aiUtils');

// --- Initialize OpenAI Client ---
let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("****************************************************************");
  console.warn("WARN: OPENAI_API_KEY not found in environment variables!");
  console.warn("WARN: AI features like 'refineIdea' will not function correctly.");
  console.warn("****************************************************************");
  openai = null;
}
// --- End OpenAI Client Initialization ---

// @desc    Save a generated idea
// @route   POST /api/ideas
// @access  Private
exports.saveIdea = async (req, res, next) => {
  try {
    const { 
      title,
      angle,
      tags,
      hook,
      structure_points,
      platform_suitability,
      intendedEmotion 
    } = req.body;

    // Simple validation
    if (!title || !angle || !tags) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields (title, angle, tags).' });
    }

    // Create new saved idea
    const newIdea = await SavedIdea.create({
      userId: req.user._id,
      title,
      angle,
      tags,
      hook,
      structure_points,
      platform_suitability,
      intendedEmotion
    });

    res.status(201).json({ success: true, data: newIdea });
  } catch (error) {
    console.error("Error saving idea:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Idea with this title might already exist.' });
    }
    res.status(500).json({ success: false, message: 'Server error while saving idea.' });
  }
};

// @desc    Get all saved ideas for the logged-in user
// @route   GET /api/ideas
// @access  Private
exports.getSavedIdeas = async (req, res, next) => {
  try {
    const ideas = await SavedIdea.find({ userId: req.user._id }).sort({ savedAt: -1 });
    res.status(200).json({ success: true, count: ideas.length, data: ideas });
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

    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
    }

    const idea = await SavedIdea.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ success: false, message: `No saved idea found with ID ${ideaId}` });
    }
    if (idea.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'User not authorized to delete this idea.' });
    }

    // Optionally delete associated refinements
    try {
      const deletionResult = await Refinement.deleteMany({
        originalIdeaId: ideaId,
        userId: req.user._id
      });
      console.log(
        `Deleted ${deletionResult.deletedCount} associated refinements for idea ${ideaId}`
      );
    } catch (err) {
      console.error(`Error deleting associated refinements for idea ${ideaId}:`, err);
    }

    await idea.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Idea and associated refinements deleted successfully.',
      data: {}
    });
  } catch (error) {
    console.error("Error deleting idea:", error);
    res.status(500).json({ success: false, message: 'Server error while deleting idea.' });
  }
};

// @desc    Refine a saved idea using AI and save the refinement
// @route   POST /api/ideas/:id/refine
// @access  Private
exports.refineIdea = async (req, res, next) => {
  if (!openai) {
    console.error("Attempted to call refineIdea, but OpenAI API key is missing.");
    return res.status(500).json({
      success: false,
      message: 'AI service is not configured on the server.'
    });
  }

  const ideaId = req.params.id;
  const userId = req.user._id;
  const userName = req.user.name;

  const { refinementType, additionalInstructions } = req.body;

  if (!mongoose.Types.ObjectId.isValid(ideaId)) {
    return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
  }
  if (!refinementType) {
    return res.status(400).json({ success: false, message: 'Refinement type is required.' });
  }

  try {
    // Verify user owns the idea
    const originalIdea = await SavedIdea.findOne({ _id: ideaId, userId: userId });
    if (!originalIdea) {
      return res
        .status(404)
        .json({ success: false, message: 'Idea not found or unauthorized.' });
    }

    // Construct prompt
    const currentDate = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const currentLocation = "Bengaluru, Karnataka, India";

    let systemPrompt = `You are 'CreatorGenius', an AI assistant helping Indian content creators refine their ideas. Be concise, actionable, and follow the requested format. Date: ${currentDate}, Location: ${currentLocation}.`;

    let userPrompt = `Based on the following content idea from creator ${userName}:\n`;
    userPrompt += `- Title: ${originalIdea.title}\n`;
    userPrompt += `- Angle: ${originalIdea.angle}\n`;
    if (originalIdea.tags?.length) {
      userPrompt += `- Tags: ${originalIdea.tags.join(', ')}\n`;
    }
    if (originalIdea.platform_suitability) {
      userPrompt += `- Platform Suitability: ${originalIdea.platform_suitability}\n`;
    }
    if (originalIdea.intendedEmotion) {
      userPrompt += `- Intended Emotion: ${originalIdea.intendedEmotion}\n`;
    }
    if (originalIdea.hook) {
      userPrompt += `- Original Hook Idea: ${originalIdea.hook}\n`;
    }

    let specificInstruction = "";
    let responseFormatInstruction = "";
    switch (refinementType.toLowerCase()) {
      case 'titles':
        specificInstruction = `Generate 5 alternative catchy, engaging titles. ${additionalInstructions || ''}`;
        responseFormatInstruction = `Provide output as JSON with key "titles" holding an array of 5 strings: {"titles":["Title 1",...]} `;
        break;
      case 'script_outline':
        specificInstruction = `Create a concise script outline with 3-5 key sections. ${additionalInstructions || ''}`;
        responseFormatInstruction = `Provide output as JSON with key "outline" holding an array of objects: {"outline":[{"section":"Hook","description":"..."},...]}`;
        break;
      case 'elaborate_angle':
        specificInstruction = `Expand on the angle with 3 bullet points. ${additionalInstructions || ''}`;
        responseFormatInstruction = `Provide output as JSON with key "elaboration" holding an array of 3 strings: {"elaboration":["Point 1","Point 2","Point 3"]}`;
        break;
      case 'hook_ideas':
        specificInstruction = `Generate 3 alternative short, compelling hook ideas. ${additionalInstructions || ''}`;
        responseFormatInstruction = `Provide output as JSON with key "hooks" holding an array of 3 strings: {"hooks":["Hook 1","Hook 2","Hook 3"]}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid refinement type. Supported: titles, script_outline, elaborate_angle, hook_ideas'
        });
    }

    userPrompt += `\n**Refinement Request:** ${specificInstruction}\n`;
    userPrompt += `\n**Output Format:** ${responseFormatInstruction}`;

    // OpenAI API call

    console.log(`Refining idea ${ideaId} for user ${userId}. Type: ${refinementType}`);
    const response = await withRetry(() => openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }));

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No content received from OpenAI for refinement.");
    }
    console.log("Raw refinement content:", rawContent);

    let refinementData;
    try {
      refinementData = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", parseError);
      return res.status(500).json({
        success: false,
        message: "AI responded but not valid JSON.",
        raw_content: rawContent
      });
    }

    // Save the refinement
    let savedRefinement = null;
    try {
      savedRefinement = await Refinement.create({
        userId,
        originalIdeaId: originalIdea._id,
        refinementType,
        result: refinementData,
        additionalInstructions: additionalInstructions || null
      });
    } catch (saveError) {
      console.error("Failed to save refinement to DB:", saveError);
      // Not critical to block response if DB insertion fails
    }

    res.status(200).json({
      success: true,
      message: `Refinement '${refinementType}' generated successfully.`,
      refinementType,
      originalIdeaId: ideaId,
      savedRefinementId: savedRefinement?._id || null,
      data: refinementData
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error Details:', {
        status: error.status,
        error: error.error
      });
    } else {
      console.error('Generic Error in refineIdea:', error.message);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to refine idea due to a server or AI error.'
    });
  }
};

// @desc    Get all refinements for a specific saved idea
// @route   GET /api/ideas/:id/refinements
// @access  Private
exports.getRefinementsForIdea = async (req, res, next) => {
  const ideaId = req.params.id;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(ideaId)) {
    return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
  }

  try {
    // Verify user owns the original idea (optional)
    const originalIdea = await SavedIdea.findOne({ _id: ideaId, userId }).select('_id');
    if (!originalIdea) {
      return res
        .status(404)
        .json({ success: false, message: 'Original idea not found or not authorized.' });
    }

    const refinements = await Refinement.find({ originalIdeaId: ideaId, userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: refinements.length,
      originalIdeaId: ideaId,
      data: refinements
    });
  } catch (error) {
    console.error(`Error fetching refinements for idea ${ideaId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching refinements.'
    });
  }
};

// @desc    Get single idea by ID
// @route   GET /api/ideas/:id
// @access  Private
exports.getIdeaById = async (req, res, next) => {
  try {
    const ideaId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
    }

    const idea = await SavedIdea.findOne({ _id: ideaId, userId: req.user._id });
    if (!idea) {
      return res.status(404).json({
        success: false,
        message: `No saved idea found with ID ${ideaId}`
      });
    }

    res.status(200).json({ success: true, data: idea });
  } catch (error) {
    console.error("Error fetching idea:", error);
    res.status(500).json({ success: false, message: 'Server error while fetching idea.' });
  }
};

// @desc    Update a saved idea
// @route   PUT /api/ideas/:id
// @access  Private
exports.updateIdea = async (req, res, next) => {
  try {
    const ideaId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      return res.status(400).json({ success: false, message: 'Invalid idea ID.' });
    }

    const idea = await SavedIdea.findOne({ _id: ideaId, userId: req.user._id });
    if (!idea) {
      return res.status(404).json({
        success: false,
        message: `No saved idea found with ID ${ideaId}`
      });
    }

    // Update allowable fields
    const allowedFields = [
      'title', 
      'angle', 
      'tags', 
      'hook', 
      'structure_points', 
      'platform_suitability', 
      'intendedEmotion'
    ];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedIdea = await SavedIdea.findByIdAndUpdate(
      ideaId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedIdea });
  } catch (error) {
    console.error("Error updating idea:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Server error while updating idea.' });
  }
};
