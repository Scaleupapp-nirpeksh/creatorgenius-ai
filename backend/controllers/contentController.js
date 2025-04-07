// backend/controllers/contentController.js
const { OpenAI } = require("openai");
require('dotenv').config();
const User = require('../models/User'); // Import User model for usage tracking
const { z } = require("zod"); // Import Zod for validation

// --- Define Expected Output Structure using Zod ---
const ideaSchema = z.object({
  title: z.string().min(5, { message: "Title seems too short." }),
  angle: z.string().min(10, { message: "Angle description is too brief." }),
  tags: z.array(z.string()).min(2, { message: "At least two tags are expected." }),
  hook: z.string().optional().describe("A catchy opening line or visual idea (3-5 seconds)."),
  structure_points: z.array(z.string()).optional().describe("Key segments or talking points for the content."),
  platform_suitability: z.enum(['High', 'Medium', 'Low']).optional().describe("How suitable the idea is for the requested platform."),
  intendedEmotion: z.string().optional().describe("The primary emotion this idea aims to evoke (e.g., Joy, Curiosity, Empathy, Urgency, Nostalgia).") // <-- Added Field
});

const ideasResponseSchema = z.object({
  ideas: z.array(ideaSchema).min(1, { message: "Expected at least one content idea." })
});
// --- End Zod Schema Definition ---


// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// @desc    Generate Enhanced Content Ideas using AI
// @route   POST /api/content/ideation
// @access  Private (Requires Login)
exports.generateContentIdeas = async (req, res, next) => {
  // --- Enhanced Input ---
  const {
      topic,
      keywords = [],
      platform,
      language,
      niche = "General Indian Audience",
      tone = "Engaging and Informative",
      targetAudienceDetails = "Broad audience across India",
      numberOfIdeas = 5,
      // --- NEW INPUT FIELDS ---
      emotionalGoal = null, // e.g., "Inspiring", "Funny", "Nostalgic", "Educational"
      keyTakeaway = null, // Main message for the audience
      targetAudiencePainPoint = null // Specific problem/desire to address
      // --- End New Input Fields ---
  } = req.body;

  const userId = req.user._id;
  const userName = req.user.name;

  // Basic Input Validation
  if (!topic && keywords.length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide a topic or some keywords.' });
  }
  if (numberOfIdeas < 1 || numberOfIdeas > 10) {
     return res.status(400).json({ success: false, message: 'Number of ideas must be between 1 and 10.' });
  }

  // --- Enhanced Prompt Engineering ---
  const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // e.g., "Monday, 7 April 2025"
  const currentLocation = "Bengaluru, Karnataka, India";

  // System Prompt: Emphasize emotional connection and goals
  let systemPrompt = `You are 'CreatorGenius', an expert AI assistant specializing in empowering Indian content creators. Your goal is to generate highly relevant, creative, and actionable content ideas tailored to the Indian context (specifically considering ${currentLocation} trends where applicable, current date: ${currentDate}). **Crucially, focus on generating ideas that connect emotionally with the audience and align with the creator's stated goals.** Focus on cultural relevance, local nuances, platform best practices, and providing concrete, structured suggestions.`;

  // User Prompt: Incorporate new goal-oriented fields
  let userPrompt = `Creator ${userName} (User ID: ${userId}) needs ${numberOfIdeas} unique content ideas. Details:\n`;
  userPrompt += `- **Primary Niche/Focus:** ${niche}\n`;
  if (topic) userPrompt += `- **Main Topic:** ${topic}\n`;
  if (keywords.length > 0) userPrompt += `- **Keywords:** ${keywords.join(', ')}\n`;
  if (platform) userPrompt += `- **Target Platform:** ${platform}\n`;
  if (language) userPrompt += `- **Preferred Language:** ${language}\n`;
  userPrompt += `- **Target Audience:** ${targetAudienceDetails}\n`;
  if (targetAudiencePainPoint) userPrompt += `- **Audience Pain Point/Desire to Address:** ${targetAudiencePainPoint}\n`; // New
  userPrompt += `- **Desired Tone:** ${tone}\n`;
  if (emotionalGoal) userPrompt += `- **Desired Emotional Goal/Audience Feeling:** ${emotionalGoal}\n`; // New
  if (keyTakeaway) userPrompt += `- **Key Message/Takeaway for Audience:** ${keyTakeaway}\n`; // New

  // Detailed Output Instructions - Added intendedEmotion
  userPrompt += `\n**Output Requirements:**
Generate the output strictly as a JSON object containing a single key "ideas". This key must hold an array of exactly ${numberOfIdeas} distinct idea objects. Each idea object must include:
1.  "title": A catchy, engaging headline (string).
2.  "angle": A unique perspective or brief description explaining the idea, **considering the emotional goal and key takeaway** (string).
3.  "tags": An array of 2-5 relevant keywords/hashtags (array of strings).
4.  "hook": (Recommended) A short, compelling hook (first 3-5 seconds) idea suitable for the platform and **aligned with the desired emotion** (string).
5.  "structure_points": (Recommended) An array of 2-4 key talking points or segments for the content, leading to the key takeaway (array of strings).
6.  "platform_suitability": (Optional) Rate suitability for '${platform || 'the primary platform'}' as 'High', 'Medium', or 'Low' (enum string).
7.  "intendedEmotion": (Recommended) The primary emotion this specific idea aims to evoke in the audience (e.g., Joy, Curiosity, Empathy, Urgency, Nostalgia, Humor, Inspiration) (string).

Example Object within the 'ideas' array: {"title": "...", "angle": "...", "tags": ["...", "..."], "hook": "...", "structure_points": ["...", "..."], "platform_suitability": "High", "intendedEmotion": "Joy"}

Ensure the entire output is valid JSON, starting with { and ending with }.`;

  const modelToUse = "gpt-3.5-turbo";

  try {
    console.log(`Generating ${numberOfIdeas} ideas for user ${userId} (${userName}) with input:`, req.body);
    console.log(`Using model: ${modelToUse}`);

    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.75,
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
        console.error("No content received in OpenAI response choice.");
        throw new Error("No content received from OpenAI.");
    }
    console.log("Raw content string from OpenAI:", rawContent);

    // Parse and Validate JSON using Zod
    let parsedResponse;
    let validatedData;
    try {
        parsedResponse = JSON.parse(rawContent);
        validatedData = ideasResponseSchema.parse(parsedResponse); // Zod validation
        console.log("Successfully parsed and validated AI response.");
    } catch (error) {
        console.error("Failed to parse or validate OpenAI JSON response:", error);
        if (error instanceof SyntaxError) { console.error("JSON Parsing Syntax Error:", error.message); }
        if (error instanceof z.ZodError) { console.error("Zod Validation Error Details:", error.errors); }
        return res.status(500).json({
            success: false,
            message: "AI response received but failed format validation.",
            details: (error instanceof z.ZodError) ? error.errors : error.message,
            raw_content: rawContent
        });
    }

    // Increment usage counter
    try {
        await User.findByIdAndUpdate(userId, { $inc: { 'usage.ideationsThisMonth': 1 } });
    } catch (updateError) {
        console.error(`Non-critical: Failed to update usage count for user ${userId}:`, updateError);
    }

    // Send validated data
    res.status(200).json({
      success: true,
      message: `Generated ${validatedData.ideas.length} content ideas successfully.`,
      data: validatedData.ideas
    });

  } catch (error) {
     if (error instanceof OpenAI.APIError) { console.error('OpenAI API Error Details:', { status: error.status, error: error.error }); }
     else if (!(error instanceof z.ZodError) && !(error instanceof SyntaxError)){ console.error('Generic Error in generateContentIdeas:', error.message); }
     res.status(500).json({ success: false, message: 'Failed to generate content ideas due to a server or AI error.' });
  }
};