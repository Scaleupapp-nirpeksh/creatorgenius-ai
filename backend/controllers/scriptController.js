// backend/controllers/scriptController.js
const { OpenAI } = require("openai");
const mongoose = require('mongoose');
const User = require('../models/User'); // For usage tracking
const SavedIdea = require('../models/SavedIdea'); // To access idea details
const Script = require('../models/Script'); // Import the Script model
const { z } = require("zod"); // For validation
const { withRetry } = require('../utils/aiUtils');
// Initialize OpenAI client (similar to other controllers)
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
    console.warn("Script generation features will not function - OPENAI_API_KEY missing");
    openai = null;
}

// Define Zod schema for script output validation with improved flexibility
const scriptSchema = z.object({
    title: z.string(),
    platform: z.string(),
    targetDuration: z.string().optional(),
    // Allow intro to be either a string or an object with content property
    intro: z.union([
        z.string(),
        z.object({
            content: z.string()
        }).transform(obj => obj.content)
    ]),
    body: z.array(z.object({
        section: z.string(),
        content: z.string(),
        visualDirection: z.string().optional(),
        duration: z.string().optional()
    })),
    // Allow outro to be either a string or an object with content property
    outro: z.union([
        z.string(),
        z.object({
            content: z.string()
        }).transform(obj => obj.content)
    ]),
    callToAction: z.string(),
    bRollSuggestions: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional()
});

/**
 * @desc    Generate script from a saved idea
 * @route   POST /api/scripts/generate/:ideaId
 * @access  Private
 */
exports.generateScript = async (req, res) => {
    if (!openai) return res.status(500).json({ success: false, message: 'AI service not configured.' });

    const { ideaId } = req.params;
    const userId = req.user._id;
    const userName = req.user.name;
    
    // Additional parameters that can be passed
    const { 
        platform = 'youtube', // Default platform
        style = 'conversational', // Script style: conversational, educational, storytelling
        targetDuration = 'medium', // short, medium, long
        focusKeywords = [], // Specific keywords to emphasize
        additionalInstructions = '' // Any specific instructions
    } = req.body;

    try {
        // Retrieve the idea
        const idea = await SavedIdea.findOne({ _id: ideaId, userId });
        
        if (!idea) {
            return res.status(404).json({ 
                success: false, 
                message: 'Idea not found or you do not have permission to access it' 
            });
        }

        // Construct prompt for OpenAI
        const systemPrompt = `You are ScriptCraft AI, a specialized script writing assistant for content creators. 
        Generate a detailed, platform-optimized script based on the content idea, following proper script structure and format.
        Consider the platform best practices, optimal pacing, and engagement techniques for ${platform}.
        Make the script sound natural, engaging, and authentic to the creator's voice.
        
        IMPORTANT: Your response MUST be a valid JSON object with the exact structure described in the request. 
        Make sure intro and outro are simple strings, not objects.`;

        const userPrompt = `Generate a complete ${style} script for ${platform} based on this content idea:
        
        TITLE: ${idea.title}
        ANGLE/CONCEPT: ${idea.angle}
        TAGS: ${idea.tags.join(', ')}
        ${idea.hook ? `HOOK IDEA: ${idea.hook}` : ''}
        ${idea.structure_points && idea.structure_points.length > 0 ? 
            `STRUCTURE POINTS: \n${idea.structure_points.join('\n')}` : ''}
        ${idea.intendedEmotion ? `INTENDED EMOTION: ${idea.intendedEmotion}` : ''}
        
        ADDITIONAL REQUIREMENTS:
        - Target duration: ${targetDuration}
        - Style: ${style}
        - Focus keywords: ${focusKeywords.join(', ')}
        - Platform: ${platform}
        ${additionalInstructions ? `- Special instructions: ${additionalInstructions}` : ''}
        
        REQUESTED OUTPUT FORMAT:
        Return a complete script structured as a JSON object with these sections:
        1. "title": An optimized title for the script (string)
        2. "platform": The platform this is optimized for (string)
        3. "targetDuration": Estimated duration (string)
        4. "intro": Opening hook/greeting (30-60 seconds of content) (string)
        5. "body": Array of sections, each with "section" name, "content" (actual script), "visualDirection" (optional), and "duration" (optional)
        6. "outro": Conclusion text (30-45 seconds of content) (string)
        7. "callToAction": Specific viewer prompt/CTA (string)
        8. "bRollSuggestions": Array of suggested supplementary footage ideas (array of strings)
        9. "tags": Recommended hashtags/tags for the platform (array of strings)

        Make the script conversational, authentic, and ready to use without further editing.
        
        IMPORTANT: Make sure intro and outro are simple strings, not objects or nested structures.
        RETURN YOUR RESPONSE AS A VALID JSON OBJECT, WITH NO ADDITIONAL TEXT OR EXPLANATIONS.`;

        // Call OpenAI API - REMOVED response_format parameter
        const response = await withRetry(() => openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Using a model definitely available
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7
            // No response_format parameter
        }));

        // Extract and validate the response
        const responseContent = response.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error("No content received from AI service");
        }

        // Parse and preprocess the JSON response
        let parsedResponse;
        try {
            // First try to find valid JSON in the response
            const jsonMatch = responseContent.match(/```json\n([\s\S]*)\n```/) || 
                             responseContent.match(/{[\s\S]*}/);
            
            const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseContent;
            
            parsedResponse = JSON.parse(jsonContent);
            
            // Handle normalization of potential object structures
            if (parsedResponse.intro && typeof parsedResponse.intro === 'object') {
                parsedResponse.intro = parsedResponse.intro.content || JSON.stringify(parsedResponse.intro);
            }
            
            if (parsedResponse.outro && typeof parsedResponse.outro === 'object') {
                parsedResponse.outro = parsedResponse.outro.content || JSON.stringify(parsedResponse.outro);
            }
            
            // Ensure body is an array of objects with required properties
            if (parsedResponse.body && !Array.isArray(parsedResponse.body)) {
                if (typeof parsedResponse.body === 'object') {
                    // Convert object to array of objects
                    parsedResponse.body = Object.entries(parsedResponse.body).map(([section, content]) => {
                        if (typeof content === 'object') {
                            return {
                                section,
                                content: content.content || JSON.stringify(content),
                                visualDirection: content.visualDirection,
                                duration: content.duration
                            };
                        } else {
                            return {
                                section,
                                content: String(content)
                            };
                        }
                    });
                } else {
                    // Set as empty array if completely invalid
                    parsedResponse.body = [];
                }
            }
            
            // Validate with Zod
            const scriptData = scriptSchema.parse(parsedResponse);
            
           

            // Return successful response
            res.status(200).json({
                success: true,
                message: "Script generated successfully",
                data: scriptData,
                ideaDetails: {
                    id: idea._id,
                    title: idea.title
                }
            });
            
        } catch (parseError) {
            console.error("Error parsing or validating JSON response:", parseError);
            console.log("Raw response:", responseContent);
            
            if (parseError instanceof z.ZodError) {
                return res.status(500).json({
                    success: false,
                    message: "Generated script did not match expected format",
                    errors: parseError.errors,
                    rawResponse: responseContent.substring(0, 500) + "..." // Include partial raw response for debugging
                });
            }
            
            throw new Error("Failed to parse AI response: " + parseError.message);
        }

    } catch (error) {
        console.error("Script generation error:", error);
        
        // Handle OpenAI-specific errors
        if (error.name === 'APIError') {
            return res.status(500).json({
                success: false,
                message: "OpenAI API error",
                error: error.message,
                details: error.status ? `Status code: ${error.status}` : undefined
            });
        }
        
        // Handle other errors
        res.status(500).json({
            success: false,
            message: "Failed to generate script",
            error: error.message
        });
    }
};

/**
 * @desc    Save a generated script
 * @route   POST /api/scripts
 * @access  Private
 */
exports.saveScript = async (req, res) => {
    const userId = req.user._id;
    
    try {
        // Extract script data from request
        const {
            ideaId,
            title,
            platform,
            targetDuration,
            intro,
            body,
            outro,
            callToAction,
            bRollSuggestions,
            tags
        } = req.body;
        
        // Validate required fields
        if (!title || !platform || !intro || !outro || !callToAction || !Array.isArray(body)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required script fields'
            });
        }
        
        // Validate ideaId format if provided
        if (ideaId && !mongoose.Types.ObjectId.isValid(ideaId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid idea ID format'
            });
        }
        
        // Check if ideaId belongs to user if provided
        if (ideaId) {
            const idea = await SavedIdea.findOne({ _id: ideaId, userId });
            if (!idea) {
                return res.status(404).json({
                    success: false,
                    message: 'Idea not found or you do not have permission to access it'
                });
            }
        }
        
        // Create the script
        const script = await Script.create({
            userId,
            ideaId: ideaId || null,
            title,
            platform,
            targetDuration,
            intro,
            body,
            outro,
            callToAction,
            bRollSuggestions: bRollSuggestions || [],
            tags: tags || []
        });
        
        res.status(201).json({
            success: true,
            message: 'Script saved successfully',
            data: script
        });
        
    } catch (error) {
        console.error("Error saving script:", error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error when saving script'
        });
    }
};

/**
 * @desc    Get all scripts for the user
 * @route   GET /api/scripts
 * @access  Private
 */
exports.getUserScripts = async (req, res) => {
    try {
        const scripts = await Script.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('ideaId', 'title')
            .lean();
            
        res.status(200).json({
            success: true,
            count: scripts.length,
            data: scripts
        });
        
    } catch (error) {
        console.error("Error retrieving scripts:", error);
        res.status(500).json({
            success: false,
            message: 'Server error when retrieving scripts'
        });
    }
};

/**
 * @desc    Get a specific script
 * @route   GET /api/scripts/:id
 * @access  Private
 */
exports.getScriptById = async (req, res) => {
    try {
        const script = await Script.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate('ideaId', 'title angle tags');
        
        if (!script) {
            return res.status(404).json({
                success: false,
                message: 'Script not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: script
        });
        
    } catch (error) {
        console.error("Error retrieving script:", error);
        res.status(500).json({
            success: false,
            message: 'Server error when retrieving script'
        });
    }
};


/**
 * @desc    Transform a script for multiple platforms
 * @route   POST /api/scripts/:id/transform
 * @access  Private
 */
exports.transformScript = async (req, res) => {
    if (!openai) return res.status(500).json({ success: false, message: 'AI service not configured.' });

    try {
        // Get the original script
        const originalScript = await Script.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate('ideaId', 'title angle tags');
        
        if (!originalScript) {
            return res.status(404).json({
                success: false,
                message: 'Script not found'
            });
        }
        
        // Get target platforms from request
        const { targetPlatforms } = req.body;
        
        if (!targetPlatforms || !Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one target platform'
            });
        }
        
        // Validate platforms
        const validPlatforms = ['youtube_short', 'instagram_reel', 'tiktok', 'linkedin', 'twitter', 'facebook'];
        const invalidPlatforms = targetPlatforms.filter(p => !validPlatforms.includes(p));
        
        if (invalidPlatforms.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid platforms: ${invalidPlatforms.join(', ')}. Valid options are: ${validPlatforms.join(', ')}`
            });
        }
        
        // Create platform transformation prompts
        const transformationPromises = targetPlatforms.map(async (platform) => {
            // Create platform-specific prompt
            const systemPrompt = `You are PlatformTransformer AI, an expert in adapting content for different social media platforms.
            Your task is to transform a script from its original platform to ${platform}, considering the unique characteristics, 
            audience expectations, duration limits, and best practices of ${platform}.
            
            IMPORTANT: Your response MUST be a valid JSON object with the exact structure described in the request.
            Make sure the 'intro' and 'outro' fields are simple strings, not objects.`;
            
            const userPrompt = `Transform this original script to an optimized version for ${platform}.
            
            ORIGINAL SCRIPT:
            Title: ${originalScript.title}
            Platform: ${originalScript.platform}
            Intro: ${originalScript.intro}
            Body: ${JSON.stringify(originalScript.body)}
            Outro: ${originalScript.outro}
            Call to Action: ${originalScript.callToAction}
            
            PLATFORM CONTEXT FOR ${platform.toUpperCase()}:
            ${getPlatformContext(platform)}
            
            TRANSFORMATION INSTRUCTIONS:
            1. Adjust length appropriately for the platform (much shorter for short-form)
            2. Modify pacing and hook for platform-specific attention patterns
            3. Update call-to-action to match platform capabilities
            4. Adapt visual directions for platform-specific features
            5. Preserve the core message and value of the original content
            
            Return the transformed script as a JSON object with the same structure as the original script:
            {
              "title": "Platform-optimized title",
              "platform": "${platform}",
              "targetDuration": "Platform-appropriate duration",
              "intro": "Platform-optimized intro", // Must be a string
              "body": [{"section": "Section name", "content": "Script content", "visualDirection": "Visual guidance", "duration": "Timing"}],
              "outro": "Platform-optimized conclusion", // Must be a string
              "callToAction": "Platform-appropriate CTA",
              "bRollSuggestions": ["Suggestion 1", "Suggestion 2"],
              "tags": ["tag1", "tag2"]
            }
            
            IMPORTANT: Your response should ONLY be the JSON object, with no additional text, markdown formatting, or explanations.`;
            
            // Call OpenAI API for this platform - REMOVED response_format parameter
            const response = await withRetry(() =>openai.chat.completions.create({
                model: "gpt-3.5-turbo", // Using a model that's definitely available
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
                // No response_format parameter
            }));
            
            // Parse and validate response with better error handling
            const responseContent = response.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error(`No content received for ${platform} transformation`);
            }
            
            // Parse and preprocess the JSON response with more robust handling
            let parsedResponse;
            try {
                // First try to find valid JSON in the response
                const jsonMatch = responseContent.match(/```json\n([\s\S]*)\n```/) || 
                                responseContent.match(/{[\s\S]*}/);
                
                const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseContent;
                
                parsedResponse = JSON.parse(jsonContent);
                
                // Handle normalization of potential object structures
                if (parsedResponse.intro && typeof parsedResponse.intro === 'object') {
                    parsedResponse.intro = parsedResponse.intro.content || JSON.stringify(parsedResponse.intro);
                }
                
                if (parsedResponse.outro && typeof parsedResponse.outro === 'object') {
                    parsedResponse.outro = parsedResponse.outro.content || JSON.stringify(parsedResponse.outro);
                }
                
                // Ensure body is an array of objects with required properties
                if (parsedResponse.body && !Array.isArray(parsedResponse.body)) {
                    if (typeof parsedResponse.body === 'object') {
                        // Convert object to array of objects
                        parsedResponse.body = Object.entries(parsedResponse.body).map(([section, content]) => {
                            if (typeof content === 'object') {
                                return {
                                    section,
                                    content: content.content || JSON.stringify(content),
                                    visualDirection: content.visualDirection,
                                    duration: content.duration
                                };
                            } else {
                                return {
                                    section,
                                    content: String(content)
                                };
                            }
                        });
                    } else {
                        // Set as empty array if completely invalid
                        parsedResponse.body = [];
                    }
                }
                
                // Apply schema validation
                const transformedScript = scriptSchema.parse(parsedResponse);
                
                return {
                    platform,
                    script: transformedScript
                };
            } catch (parseError) {
                console.error(`Error parsing transformation for ${platform}:`, parseError);
                console.log("Raw response:", responseContent);
                
                // Return error info for this platform instead of failing the whole batch
                return {
                    platform,
                    error: parseError.message,
                    partialResponse: responseContent.substring(0, 300) + "..."
                };
            }
        });
        
        // Execute all transformations in parallel
        const transformationResults = await Promise.all(transformationPromises);
        
        // Separate successful and failed transformations
        const transformedScripts = transformationResults.filter(result => !result.error);
        const failedTransformations = transformationResults.filter(result => result.error);
        
        
        
        // Return successful response with all transformations
        res.status(200).json({
            success: true,
            message: `Script transformed for ${transformedScripts.length} platforms` + 
                    (failedTransformations.length > 0 ? ` (${failedTransformations.length} failed)` : ""),
            originalScript: {
                id: originalScript._id,
                title: originalScript.title,
                platform: originalScript.platform
            },
            transformedScripts,
            failedTransformations: failedTransformations.length > 0 ? failedTransformations : undefined
        });
        
    } catch (error) {
        console.error("Script transformation error:", error);
        
        if (error instanceof z.ZodError) {
            return res.status(500).json({
                success: false,
                message: "Transformed script did not match expected format",
                errors: error.errors
            });
        }
        
        // Handle OpenAI-specific errors
        if (error.name === 'APIError') {
            return res.status(500).json({
                success: false,
                message: "OpenAI API error during transformation",
                error: error.message,
                details: error.status ? `Status code: ${error.status}` : undefined
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Failed to transform script",
            error: error.message
        });
    }
};

// Helper function for platform-specific context
function getPlatformContext(platform) {
    const platformContexts = {
        youtube_short: "YouTube Shorts are vertical videos up to 60 seconds. They're designed for mobile viewing with quick, engaging content. Viewers typically expect fast-paced delivery, a strong hook in the first 3 seconds, and clear value delivery. Text overlays are common. No end screens or cards are available.",
        
        instagram_reel: "Instagram Reels can be up to 90 seconds. They perform best with trending audio, text overlays, and visual effects. Expect viewers to watch without sound initially. Content should be visually striking with fast transitions. Hashtags are important for discovery.",
        
        tiktok: "TikTok videos can be up to 3 minutes but perform best under 60 seconds. The platform favors authentic, trend-based content with popular sounds. Hooks are critical in the first 2 seconds. The audience expects entertainment value with educational content delivered in a fun, casual way.",
        
        linkedin: "LinkedIn favors professional, value-driven content. Videos should maintain a more business-appropriate tone while still being conversational. Opening with a professional problem statement works well. Content should deliver actionable insights for career or business growth. Maximum video length is 10 minutes but 1-3 minutes performs best.",
        
        twitter: "Twitter videos should be concise (ideally under 45 seconds) and get straight to the point. Content needs a very strong opening as the timeline is fast-moving. Captions are critical as many view without sound. The tone can be conversational but must deliver value quickly.",
        
        facebook: "Facebook videos can be longer (3-5 minutes performs well). The platform favors storytelling approaches and content that drives discussion. Videos are often viewed in-feed without clicking, so the first 5-10 seconds must capture attention. Square format often performs better than landscape."
    };
    
    return platformContexts[platform] || "Please adapt the content appropriately for this platform's unique characteristics and audience expectations.";
}

/**
 * @desc    Save a transformed script
 * @route   POST /api/scripts/transformed
 * @access  Private
 */
exports.saveTransformedScript = async (req, res) => {
    const userId = req.user._id;
    
    try {
        // Extract script data from request
        const {
            originalScriptId, // Reference to the original script
            title,
            platform,
            targetDuration,
            intro,
            body,
            outro,
            callToAction,
            bRollSuggestions,
            tags
        } = req.body;
        
        // Validate required fields
        if (!title || !platform || !intro || !outro || !callToAction || !Array.isArray(body)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required script fields'
            });
        }
        
        // Validate originalScriptId
        if (!originalScriptId || !mongoose.Types.ObjectId.isValid(originalScriptId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid original script ID'
            });
        }
        
        // Check if original script exists and belongs to the user
        const originalScript = await Script.findOne({ _id: originalScriptId, userId });
        if (!originalScript) {
            return res.status(404).json({
                success: false,
                message: 'Original script not found or you do not have permission to access it'
            });
        }
        
        // Create the transformed script with reference to original
        const transformedScript = await Script.create({
            userId,
            originalScriptId, // Reference to the parent script
            ideaId: originalScript.ideaId, // Inherit the same idea ID
            title,
            platform,
            targetDuration,
            intro,
            body,
            outro,
            callToAction,
            bRollSuggestions: bRollSuggestions || [],
            tags: tags || [],
            isTransformed: true // Flag to identify it as a transformed script
        });
        
        res.status(201).json({
            success: true,
            message: 'Transformed script saved successfully',
            data: transformedScript
        });
        
    } catch (error) {
        console.error("Error saving transformed script:", error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error when saving transformed script'
        });
    }
};

/**
 * @desc    Update a script
 * @route   PUT /api/scripts/:id
 * @access  Private
 */
exports.updateScript = async (req, res) => {
    const scriptId = req.params.id;
    const userId = req.user._id;
    
    try {
        // Find the script and verify ownership
        const script = await Script.findOne({ _id: scriptId, userId });
        
        if (!script) {
            return res.status(404).json({
                success: false,
                message: 'Script not found or you do not have permission to update it'
            });
        }
        
        // Extract fields that can be updated
        const {
            title,
            platform,
            targetDuration,
            intro,
            body,
            outro,
            callToAction,
            bRollSuggestions,
            tags
        } = req.body;
        
        // Update script with new values or keep existing ones
        const updatedScript = await Script.findByIdAndUpdate(
            scriptId,
            {
                title: title || script.title,
                platform: platform || script.platform,
                targetDuration: targetDuration || script.targetDuration,
                intro: intro || script.intro,
                body: body || script.body,
                outro: outro || script.outro,
                callToAction: callToAction || script.callToAction,
                bRollSuggestions: bRollSuggestions || script.bRollSuggestions,
                tags: tags || script.tags,
                updatedAt: Date.now() // Update timestamp
            },
            { new: true, runValidators: true } // Return updated document and run validators
        );
        
        res.status(200).json({
            success: true,
            message: 'Script updated successfully',
            data: updatedScript
        });
        
    } catch (error) {
        console.error("Error updating script:", error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error when updating script'
        });
    }
};


/**
 * @desc    Delete a script
 * @route   DELETE /api/scripts/:id
 * @access  Private
 */
exports.deleteScript = async (req, res) => {
    const scriptId = req.params.id;
    const userId = req.user._id;
    
    try {
        // Find the script
        const script = await Script.findOne({ _id: scriptId, userId });
        
        if (!script) {
            return res.status(404).json({
                success: false,
                message: 'Script not found or you do not have permission to delete it'
            });
        }
        
        // If this is an original script, optionally find and delete all its transformed versions
        if (!script.isTransformed) {
            try {
                const deleteResult = await Script.deleteMany({ 
                    originalScriptId: scriptId,
                    userId
                });
                console.log(`Deleted ${deleteResult.deletedCount} transformed scripts linked to original script ${scriptId}`);
            } catch (relatedDeleteError) {
                console.error('Error deleting related transformed scripts:', relatedDeleteError);
                // Continue with deletion of the main script
            }
        }
        
        // Delete the script itself
        await script.deleteOne();
        
        res.status(200).json({
            success: true,
            message: 'Script deleted successfully',
            data: {}
        });
        
    } catch (error) {
        console.error("Error deleting script:", error);
        res.status(500).json({
            success: false,
            message: 'Server error when deleting script'
        });
    }
};


/**
 * @desc    Get all transformed versions of a script
 * @route   GET /api/scripts/:id/transformed
 * @access  Private
 */
exports.getTransformedScripts = async (req, res) => {
    const originalScriptId = req.params.id;
    const userId = req.user._id;
    
    try {
        // Check if the original script exists and belongs to the user
        const originalScript = await Script.findOne({ _id: originalScriptId, userId });
        
        if (!originalScript) {
            return res.status(404).json({
                success: false,
                message: 'Original script not found or you do not have permission to access it'
            });
        }
        
        // Get all transformed scripts for this original script
        const transformedScripts = await Script.find({ 
            originalScriptId: originalScriptId,
            userId,
            isTransformed: true
        }).sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: transformedScripts.length,
            originalScript: {
                id: originalScript._id,
                title: originalScript.title,
                platform: originalScript.platform
            },
            data: transformedScripts
        });
        
    } catch (error) {
        console.error("Error retrieving transformed scripts:", error);
        res.status(500).json({
            success: false,
            message: 'Server error when retrieving transformed scripts'
        });
    }
};

// Export all the controller functions
module.exports = {
    generateScript: exports.generateScript,
    saveScript: exports.saveScript,
    getUserScripts: exports.getUserScripts,
    getScriptById: exports.getScriptById,
    transformScript: exports.transformScript,
    saveTransformedScript: exports.saveTransformedScript,
    updateScript: exports.updateScript,
    deleteScript: exports.deleteScript,
    getTransformedScripts: exports.getTransformedScripts
};