// backend/controllers/ideaController.js
const SavedIdea = require('../models/SavedIdea');
const mongoose = require('mongoose');
const { OpenAI } = require("openai"); // Ensure OpenAI is imported
const User = require('../models/User'); // Ensure User is imported
const Refinement = require('../models/Refinement'); // Import the new Refinement model

// --- Initialize OpenAI Client ---
// Place this near the top after requires
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
} else {
    // Log a warning if the API key is missing
    console.warn("****************************************************************");
    console.warn("WARN: OPENAI_API_KEY not found in environment variables!");
    console.warn("WARN: AI features like 'refineIdea' will not function correctly.");
    console.warn("****************************************************************");
    openai = null; // Set to null to handle checks later
}
// --- End OpenAI Client Initialization ---


// @desc    Save a generated idea
// @route   POST /api/ideas
// @access  Private
exports.saveIdea = async (req, res, next) => {
  try {
    // Get idea data from request body
    const { title, angle, tags, hook, structure_points, platform_suitability, intendedEmotion } = req.body;

    // Simple validation
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
    });

    res.status(201).json({ success: true, data: newIdea });

  } catch (error) {
    console.error("Error saving idea:", error);
     if (error.name === 'ValidationError') {
         const messages = Object.values(error.errors).map(val => val.message);
         return res.status(400).json({ success: false, message: messages.join('. ') });
     }
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

        // Also delete associated refinements before deleting the idea (optional but good practice)
        try {
            const deletionResult = await Refinement.deleteMany({ originalIdeaId: ideaId, userId: req.user._id });
            console.log(`Deleted ${deletionResult.deletedCount} associated refinements for idea ${ideaId}`);
        } catch (refinementDeleteError) {
            console.error(`Error deleting associated refinements for idea ${ideaId}:`, refinementDeleteError);
            // Decide if this should prevent the idea deletion - maybe not? Log it.
        }


        await idea.deleteOne();

        res.status(200).json({ success: true, message: 'Idea and associated refinements deleted successfully.', data: {} });

    } catch (error) {
        console.error("Error deleting idea:", error);
        res.status(500).json({ success: false, message: 'Server error while deleting idea.' });
    }
};


// @desc    Refine a saved idea using AI and save the refinement
// @route   POST /api/ideas/:id/refine
// @access  Private
exports.refineIdea = async (req, res, next) => {
    // Check if OpenAI client was initialized
    if (!openai) {
        console.error("Attempted to call refineIdea, but OpenAI API key is missing.");
        return res.status(500).json({ success: false, message: 'AI service is not configured on the server.' });
    }

    const ideaId = req.params.id;
    const userId = req.user._id;
    const userName = req.user.name; // Get user name for prompt personalization

    const { refinementType, additionalInstructions } = req.body;

    // Basic Validation
    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
        return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
    }
    if (!refinementType) {
        return res.status(400).json({ success: false, message: 'Refinement type is required.' });
    }

    try {
        // 1. Find the original saved idea and verify ownership
        const originalIdea = await SavedIdea.findOne({ _id: ideaId, userId: userId });
        if (!originalIdea) {
            return res.status(404).json({ success: false, message: 'Saved idea not found or user not authorized.' });
        }

        // 2. Construct Prompt based on refinement type
        const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // Current Date
        const currentLocation = "Bengaluru, Karnataka, India"; // Current Location Context

        let systemPrompt = `You are 'CreatorGenius', an AI assistant helping Indian content creators refine their ideas. Be concise, actionable, and follow the requested format precisely. Current date: ${currentDate}. Location context: ${currentLocation}.`;
        let userPrompt = `Based on the following content idea from creator ${userName}:\n`;
        userPrompt += `  - Title: ${originalIdea.title}\n`;
        userPrompt += `  - Angle: ${originalIdea.angle}\n`;
        if(originalIdea.tags && originalIdea.tags.length > 0) userPrompt += `  - Tags: ${originalIdea.tags.join(', ')}\n`;
        if(originalIdea.platform_suitability) userPrompt += `  - Platform Suitability: ${originalIdea.platform_suitability}\n`;
        if(originalIdea.intendedEmotion) userPrompt += `  - Intended Emotion: ${originalIdea.intendedEmotion}\n`;
        if(originalIdea.hook) userPrompt += `  - Original Hook Idea: ${originalIdea.hook}\n`;

        let responseFormatInstruction = "";
        let specificInstruction = "";

        switch (refinementType.toLowerCase()) {
            case 'titles':
                specificInstruction = `Generate 5 alternative catchy, engaging titles suitable for platforms like YouTube or Instagram Reels. Consider the original context. ${additionalInstructions || ''}`;
                responseFormatInstruction = `Provide the output strictly as a JSON object with a single key "titles" holding an array of 5 strings. Example: {"titles": ["Title 1", "Title 2", ...]}`;
                break;
            case 'script_outline':
                specificInstruction = `Create a concise script outline with 3-5 key sections (e.g., Hook, Problem, Solution, CTA). Briefly describe what should happen or be said in each section. ${additionalInstructions || ''}`;
                responseFormatInstruction = `Provide the output strictly as a JSON object with a single key "outline" holding an array of objects, each with "section" (string) and "description" (string) keys. Example: {"outline": [{"section": "Hook", "description": "..."}, ...]}`;
                break;
            case 'elaborate_angle':
                specificInstruction = `Expand on the original angle. Provide 3 distinct bullet points elaborating on the unique perspective or key message. Make them actionable or insightful. ${additionalInstructions || ''}`;
                responseFormatInstruction = `Provide the output strictly as a JSON object with a single key "elaboration" holding an array of 3 strings (bullet points). Example: {"elaboration": ["Point 1...", "Point 2...", ...]}`;
                break;
            case 'hook_ideas':
                 specificInstruction = `Generate 3 alternative short, compelling hook ideas (visual or verbal, first 3-5 seconds) suitable for the platform, aligned with the intended emotion. ${additionalInstructions || ''}`;
                 responseFormatInstruction = `Provide the output strictly as a JSON object with a single key "hooks" holding an array of 3 strings. Example: {"hooks": ["Hook 1...", "Hook 2...", ...]}`;
                 break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid refinement type specified. Supported types: titles, script_outline, elaborate_angle, hook_ideas' });
        }

        userPrompt += `\n**Refinement Request:** ${specificInstruction}\n`;
        userPrompt += `\n**Output Format:** ${responseFormatInstruction}`;


        // 3. Call OpenAI API
        console.log(`Refining idea ${ideaId} for user ${userId}. Type: ${refinementType}`);
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
            throw new Error("No content received from OpenAI for refinement.");
        }
        console.log("Raw refinement content string from OpenAI:", rawContent);

        // 4. Parse AI Response
        let refinementData;
        try {
            refinementData = JSON.parse(rawContent);
            // Basic validation: Check if expected key exists based on type
             const expectedKey = refinementType.toLowerCase().split('_')[0];
             if (!refinementData[expectedKey] || !Array.isArray(refinementData[expectedKey])) {
                 console.warn(`AI response for ${refinementType} did not contain the expected key '${expectedKey}' or it was not an array.`);
             }
        } catch (parseError) {
            console.error("Failed to parse OpenAI JSON response for refinement:", parseError);
            return res.status(500).json({ success: false, message: "AI refinement received but failed format parsing.", raw_content: rawContent });
        }

        // --- 5. SAVE THE REFINEMENT RESULT ---
        let savedRefinement = null; // Initialize variable to hold saved data if successful
        try {
             savedRefinement = await Refinement.create({
                 userId: userId,
                 originalIdeaId: originalIdea._id,
                 refinementType: refinementType,
                 result: refinementData, // Store the parsed data
                 additionalInstructions: additionalInstructions || null // Optionally store instructions
             });
             console.log(`Refinement type '${refinementType}' saved with ID: ${savedRefinement._id}`);
        } catch (saveError) {
             console.error(`Non-critical: Failed to save refinement result for idea ${ideaId}:`, saveError);
             // Log error but continue to return the generated data
        }
        // --- END SAVE THE REFINEMENT RESULT ---

        // --- (Optional) Update Usage Count ---
        // try {
        //     await User.findByIdAndUpdate(userId, { $inc: { 'usage.refinementsThisMonth': 1 } });
        // } catch (updateError) { /* ... */ }

        // --- 6. Return Response ---
        res.status(200).json({
            success: true,
            message: `Refinement '${refinementType}' generated successfully.`,
            refinementType: refinementType,
            originalIdeaId: ideaId,
            // Include the ID of the *saved refinement* in the response if desired
            savedRefinementId: savedRefinement ? savedRefinement._id : null,
            data: refinementData // Send the generated refinement data back
        });

    } catch (error) { // Catch errors from finding idea, calling AI, etc.
        if (error instanceof OpenAI.APIError) {
            console.error('OpenAI API Refinement Error Details:', { status: error.status, error: error.error });
        } else {
            console.error('Generic Error in refineIdea:', error.message);
        }
        res.status(500).json({ success: false, message: 'Failed to refine idea due to a server or AI error.' });
    }
};

// --- (Optional but Recommended) Add function to get refinements for an idea ---

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
        // First verify the user owns the original idea (optional but good practice)
        const originalIdea = await SavedIdea.findOne({ _id: ideaId, userId: userId }).select('_id'); // Select only ID
        if (!originalIdea) {
            return res.status(404).json({ success: false, message: 'Original saved idea not found or user not authorized.' });
        }

        // Find all refinements linked to this idea ID and user ID
        const refinements = await Refinement.find({ originalIdeaId: ideaId, userId: userId })
                                        .sort({ createdAt: -1 }); // Show newest first

        res.status(200).json({
            success: true,
            count: refinements.length,
            originalIdeaId: ideaId,
            data: refinements
        });

    } catch (error) {
        console.error(`Error fetching refinements for idea ${ideaId}:`, error);
        res.status(500).json({ success: false, message: 'Server error while fetching refinements.' });
    }
};


exports.getIdeaById = async (req, res, next) => {
    try {
        const ideaId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(ideaId)) {
             return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
        }

        const idea = await SavedIdea.findOne({ 
            _id: ideaId,
            userId: req.user._id
        });

        if (!idea) {
            return res.status(404).json({ success: false, message: `No saved idea found with ID ${ideaId}` });
        }

        res.status(200).json({ success: true, data: idea });
    } catch (error) {
        console.error("Error fetching idea:", error);
        res.status(500).json({ success: false, message: 'Server error while fetching idea.' });
    }
};


exports.updateIdea = async (req, res, next) => {
    try {
      const ideaId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(ideaId)) {
        return res.status(400).json({ success: false, message: 'Invalid idea ID format.' });
      }
      
      const idea = await SavedIdea.findOne({ 
        _id: ideaId,
        userId: req.user._id 
      });
      
      if (!idea) {
        return res.status(404).json({ success: false, message: `No saved idea found with ID ${ideaId}` });
      }
      
      // Update allowable fields
      const allowedFields = ['title', 'angle', 'tags', 'hook', 'structure_points', 'platform_suitability', 'intendedEmotion'];
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