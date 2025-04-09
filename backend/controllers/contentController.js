// backend/controllers/contentController.js
const { OpenAI } = require("openai");
// Ensure dotenv is configured early in your entry point (e.g., server.js)
// require('dotenv').config(); // Usually not needed here if loaded in server.js
const User = require('../models/User'); // Import User model for usage tracking
const { z } = require("zod"); // Import Zod for validation

// --- ZOD Schema Definition ---
const ideaSchema = z.object({
  title: z.string().min(5, { message: "Title seems too short." }),
  angle: z.string().min(10, { message: "Angle description is too brief." }),
  tags: z.array(z.string()).min(2, { message: "At least two tags are expected." }),
  hook: z.string().optional().describe("A catchy opening line or visual idea (3-5 seconds)."),
  structure_points: z.array(z.string()).optional().describe("Key segments or talking points for the content."),
  platform_suitability: z.enum(['High', 'Medium', 'Low', null]).optional().describe("How suitable the idea is for the requested platform ('High', 'Medium', 'Low', or null)."),
  intendedEmotion: z.string().optional().describe("The primary emotion this idea aims to evoke (e.g., Joy, Curiosity, Empathy).")
});

const ideasResponseSchema = z.object({
  ideas: z.array(ideaSchema).min(1, { message: "Expected at least one content idea." })
});
// --- End Zod Schema Definition ---


// --- Initialize OpenAI Client ---
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
} else {
    console.warn("****************************************************************");
    console.warn("WARN: OPENAI_API_KEY not found in environment variables!");
    console.warn("WARN: AI features in contentController will not function.");
    console.warn("****************************************************************");
    openai = null;
}
// --- End OpenAI Client Initialization ---


// --- Helper Functions ---
const isBeforeToday = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
};
// --- End Helper Functions ---


// --- Constants ---
const FREE_USER_DAILY_TREND_IDEATION_LIMIT = 3; // Example limit
// --- End Constants ---


// @desc    Generate Enhanced Content Ideas using AI
// @route   POST /api/content/ideation
// @access  Private (Requires Login)
exports.generateContentIdeas = async (req, res, next) => {
  if (!openai) return res.status(500).json({ success: false, message: 'AI service not configured.' });

  // --- Input ---
  const {
      topic, keywords = [], platform, language,
      niche = "General Indian Audience", tone = "Engaging and Informative",
      targetAudienceDetails = "Broad audience across India", numberOfIdeas = 5,
      emotionalGoal = null, keyTakeaway = null, targetAudiencePainPoint = null
  } = req.body;
  const userId = req.user?._id;
  const userName = req.user?.name;

  if (!userId || !userName) return res.status(401).json({ success: false, message: 'User information not found in request.' });

  // --- Validation ---
  if (!topic && keywords.length === 0) return res.status(400).json({ success: false, message: 'Please provide topic or keywords.' });
  if (numberOfIdeas < 1 || numberOfIdeas > 10) return res.status(400).json({ success: false, message: 'Number of ideas must be between 1 and 10.' });

  // --- Enhanced Prompt Engineering ---
  const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // Current Date: Wednesday, 9 April 2025
  const currentLocation = "Bengaluru, Karnataka, India"; // Current Location Context

  let systemPrompt = `You are 'CreatorGenius', an expert AI assistant for Indian content creators in ${currentLocation} (Date: ${currentDate}). Generate relevant, creative, actionable ideas focusing on cultural nuances, platform best practices, and emotional connection based on the creator's goals.`;
  let userPrompt = `Creator ${userName} (User ID: ${userId}) needs ${numberOfIdeas} unique content ideas. Details:\n`;
  userPrompt += `- Niche: ${niche}\n`;
  if (topic) userPrompt += `- Topic: ${topic}\n`;
  if (keywords.length > 0) userPrompt += `- Keywords: ${keywords.join(', ')}\n`;
  if (platform) userPrompt += `- Platform: ${platform}\n`;
  if (language) userPrompt += `- Language: ${language}\n`;
  userPrompt += `- Audience: ${targetAudienceDetails}\n`;
  if (targetAudiencePainPoint) userPrompt += `- Audience Pain Point: ${targetAudiencePainPoint}\n`;
  userPrompt += `- Tone: ${tone}\n`;
  if (emotionalGoal) userPrompt += `- Emotional Goal: ${emotionalGoal}\n`;
  if (keyTakeaway) userPrompt += `- Key Takeaway: ${keyTakeaway}\n`;

  // --- MODIFIED Output Requirements ---
  userPrompt += `\n**Output Requirements:**
Generate the output strictly as a JSON object containing a single key "ideas". This key must hold an array of exactly ${numberOfIdeas} distinct idea objects. Each idea object must include:
1.  "title": A catchy, engaging headline (string).
2.  "angle": A **detailed** description (approx. 2-3 sentences) explaining the idea's unique perspective, key message, **how it aligns with the creator's emotional goal or addresses the audience pain point**, and why it would be engaging (string).
3.  "tags": An array of 2-5 relevant keywords/hashtags (array of strings).
4.  "hook": (Recommended) A **descriptive** hook idea (visual or verbal, ~20-30 words) suitable for the platform and aligned with the desired emotion (string).
5.  "structure_points": (Recommended) An array of 2-4 key talking points or segments, **each with a short phrase explaining its content**, leading to the key takeaway (array of strings).
6.  "platform_suitability": (Optional) Rate suitability for '${platform || 'the primary platform'}' using **ONLY ONE** of these exact words: 'High', 'Medium', or 'Low'. **Do NOT output the platform name.** (enum string: 'High'|'Medium'|'Low'|null).
7.  "intendedEmotion": (Recommended) The primary emotion this specific idea aims to evoke (e.g., Joy, Curiosity, Empathy, Urgency, Nostalgia, Humor, Inspiration) (string).

Example Object within the 'ideas' array: {"title": "...", "angle": "Detailed angle description connecting to goals...", "tags": ["...", "..."], "hook": "Descriptive hook idea...", "structure_points": ["Point 1: Brief explanation...", "Point 2: Brief explanation..."], "platform_suitability": "High", "intendedEmotion": "Joy"}

Ensure the entire output is valid JSON, starting with { and ending with }.`;
  // --- End MODIFIED Output Requirements ---

  const modelToUse = "gpt-3.5-turbo";

  // --- API Call & Processing ---
  try {
    console.log(`Generating ${numberOfIdeas} ideas for user ${userId} (${userName}). Input:`, req.body);
    const response = await openai.chat.completions.create({
      model: modelToUse, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.75, response_format: { type: "json_object" },
    });
    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) throw new Error("No content received from OpenAI.");
    console.log("Raw content string:", rawContent);

    let validatedData;
    try {
        validatedData = ideasResponseSchema.parse(JSON.parse(rawContent));
        console.log("Successfully parsed/validated response.");
    } catch (error) { // Handle parsing or Zod validation error
        console.error("Failed parsing/validating OpenAI JSON:", error);
        if (error instanceof z.ZodError) console.error("Zod Errors:", error.errors);
        return res.status(500).json({ success: false, message: "AI response format error.", details: error instanceof z.ZodError ? error.errors : error.message, raw_content: rawContent });
    }

    // Increment usage (non-critical)
    try { await User.findByIdAndUpdate(userId, { $inc: { 'usage.ideationsThisMonth': 1 } }); }
    catch (updateError) { console.error(`Non-critical: Failed usage update for ${userId}:`, updateError); }

    // --- Success Response ---
    res.status(200).json({ success: true, message: `Generated ${validatedData.ideas.length} ideas successfully.`, data: validatedData.ideas });

  } catch (error) { // Handle AI call errors or other unexpected errors
     if (error instanceof OpenAI.APIError) console.error('OpenAI API Error:', { status: error.status, error: error.error });
     else console.error('Generic Error in generateContentIdeas:', error.message);
     res.status(500).json({ success: false, message: 'Failed to generate ideas from AI.' });
  }
};


// @desc    Generate Ideas based on a specific Trend
// @route   POST /api/content/trend-ideation
// @access  Private (Requires Login)
exports.generateTrendIdeas = async (req, res, next) => {
  if (!openai) return res.status(500).json({ success: false, message: 'AI service is not configured.' });

  // --- Input & User Context ---
  const userId = req.user?.id;
  const userTier = req.user?.subscriptionTier;
  const userName = req.user?.name;
  const userInterests = req.user?.interests || [];

  if (!userId || !userTier || !userName) return res.status(401).json({ success: false, message: 'User information not found.' });

  const {
      trendDescription, platform, language,
      niche = "General Indian Audience", tone = "Relevant and Timely",
      numberOfIdeas = 3
  } = req.body;

  // --- Validation ---
  if (!trendDescription || typeof trendDescription !== 'string' || trendDescription.trim() === '') return res.status(400).json({ success: false, message: 'Please provide trend description.' });
  if (numberOfIdeas < 1 || numberOfIdeas > 5) return res.status(400).json({ success: false, message: 'Number of ideas must be 1-5.' });

  let user; // For usage tracking state

  // --- Usage Limit Check ---
  if (userTier === 'free') {
      try {
          user = await User.findById(userId).select('+usage');
          if (!user) return res.status(404).json({ success: false, message: 'User not found for usage check.' });
          let { dailyTrendIdeations = 0, lastSearchReset = new Date(0) } = user.usage || {};
          let needsReset = isBeforeToday(lastSearchReset);
          if (needsReset) {
              console.log(`Resetting daily trend ideation count for user ${userId}`);
              dailyTrendIdeations = 0;
              await User.findByIdAndUpdate(userId, { 'usage.dailyTrendIdeations': 0, 'usage.lastSearchReset': new Date() }, { new: false });
          }
          if (dailyTrendIdeations >= FREE_USER_DAILY_TREND_IDEATION_LIMIT) {
              console.log(`User ${userId} exceeded daily trend ideation limit.`);
              return res.status(429).json({ success: false, message: `Daily trend ideation limit (${FREE_USER_DAILY_TREND_IDEATION_LIMIT}) reached.` });
          }
      } catch (limitError) {
          console.error(`Error checking trend ideation limits for user ${userId}:`, limitError);
          return res.status(500).json({ success: false, message: 'Error checking usage limits.' });
       }
  }
  // --- End Usage Limit Check ---

  // --- Construct Prompt ---
  const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // Current Date: Wednesday, 9 April 2025
  const currentLocation = "Bengaluru, Karnataka, India"; // Current Location Context

  let systemPrompt = `You are 'CreatorGenius', an AI assistant helping Indian content creators leverage trends in ${currentLocation} (Date: ${currentDate}). Generate creative, actionable ideas inspired by the provided trend.`;
  let userPrompt = `Creator ${userName} (Interests: ${userInterests.join(', ') || 'General'}) needs ${numberOfIdeas} unique content ideas based on the following trend:\n`;
  userPrompt += `**TREND:** "${trendDescription}"\n\nContext:\n`;
  userPrompt += `- Niche: ${niche}\n`;
  if (platform) userPrompt += `- Platform: ${platform}\n`;
  if (language) userPrompt += `- Language: ${language}\n`;
  userPrompt += `- Tone: ${tone}\n`;

  // --- MODIFIED Output Requirements ---
  userPrompt += `\n**Output Requirements:**
Generate the output strictly as a JSON object containing a single key "ideas". This key must hold an array of exactly ${numberOfIdeas} idea objects. Each idea object must include:
1.  "title": A catchy, engaging headline related to the trend (string).
2.  "angle": A **detailed** description (approx. 2-3 sentences) explaining the idea's unique perspective, **how it specifically connects to or leverages the provided TREND**, and why it's relevant now for the target audience (string).
3.  "tags": An array of 2-5 relevant keywords/hashtags including trend-related ones (array of strings).
4.  "hook": (Recommended) A **descriptive** hook idea (visual or verbal, ~20-30 words) suitable for the platform and relevant to the trend (string).
5.  "structure_points": (Recommended) An array of 2-4 key talking points or segments, **each with a short phrase explaining its content**, relevant to the trend (array of strings).
6.  "platform_suitability": (Optional) Rate suitability for '${platform || 'the primary platform'}' using **ONLY ONE** of these exact words: 'High', 'Medium', or 'Low'. **Do NOT output the platform name.** (enum string: 'High'|'Medium'|'Low'|null).
7.  "intendedEmotion": (Recommended) The primary emotion this specific trend-based idea aims to evoke (string).

Example Object within the 'ideas' array: {"title": "...", "angle": "Detailed angle description linking to trend...", "tags": ["...", "..."], "hook": "Descriptive hook idea...", "structure_points": ["Point 1: Explanation...", "Point 2: Explanation..."], "platform_suitability": "High", "intendedEmotion": "Joy"}

Ensure the entire output is valid JSON, starting with { and ending with }.`;
  // --- End MODIFIED Output Requirements ---


  // --- API Call & Processing ---
  try {
      console.log(`Generating ${numberOfIdeas} trend ideas for user ${userId}. Trend: "${trendDescription}"`);
      const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.8, response_format: { type: "json_object" },
      });
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No content from OpenAI for trend ideation.");
      console.log("Raw trend ideation content string:", rawContent);

      let validatedData;
      try {
          validatedData = ideasResponseSchema.parse(JSON.parse(rawContent));
          console.log("Successfully parsed/validated trend ideation response.");
      } catch (error) { // Handle parsing or Zod validation error
          console.error("Failed parsing/validating trend ideation JSON:", error);
           if (error instanceof z.ZodError) console.error("Zod Errors:", error.errors);
           return res.status(500).json({ success: false, message: "AI response format error.", details: error instanceof z.ZodError ? error.errors : error.message, raw_content: rawContent });
      }

      // Increment usage (non-critical)
      if (userTier === 'free') {
          try { await User.findByIdAndUpdate(userId, { $inc: { 'usage.dailyTrendIdeations': 1 } }); }
          catch (incrementError) { console.error(`Non-critical: Failed usage update for ${userId}:`, incrementError); }
      }

      // --- Success Response ---
      res.status(200).json({ success: true, message: `Generated ${validatedData.ideas.length} trend ideas successfully.`, trendDescription: trendDescription, data: validatedData.ideas });

  } catch (error) { // Handle AI call errors or other unexpected errors
      if (error instanceof OpenAI.APIError) console.error('OpenAI API Trend Ideation Error:', { status: error.status, error: error.error });
      else console.error('Generic Error in generateTrendIdeas:', error.message);
      res.status(500).json({ success: false, message: 'Failed to generate trend ideas from AI.' });
  }
};