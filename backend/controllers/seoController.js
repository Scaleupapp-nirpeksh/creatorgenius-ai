// backend/controllers/seoController.js
const { OpenAI } = require("openai");
const User = require('../models/User'); // For usage tracking
const { z } = require("zod"); // For validation

// --- Initialize OpenAI Client ---
// Ensure OPENAI_API_KEY is loaded from .env in your main server file (server.js)
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
    console.warn("****************************************************************");
    console.warn("SEO Controller WARN: OPENAI_API_KEY missing in environment variables!");
    console.warn("WARN: AI SEO features will be disabled.");
    console.warn("****************************************************************");
    openai = null;
}
// --- End OpenAI Client Initialization ---

// --- ZOD Schema for SEO Output ---
const seoAnalysisSchema = z.object({
    suggestedKeywords: z.array(z.string()).optional().describe("Relevant keywords (mix of broad and long-tail)."),
    optimizedTitles: z.array(z.string().max(100)).optional().describe("2-3 optimized title suggestions."),
    optimizedDescription: z.string().optional().describe("Suggested optimized description text."),
    suggestedHashtags: z.array(z.string()).optional().describe("Platform-relevant hashtags."),
    contentFeedback: z.string().optional().describe("Actionable feedback on the provided content/script for SEO/engagement."),
    suggestedSaveTitle: z.string().optional().describe("A concise title for saving/referencing this SEO report.") // Added field
});
// --- End Zod Schema ---

// --- Helper Functions ---
const isBeforeToday = (date) => {
    if (!date) return false; // Handle undefined date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today in local time
    return new Date(date) < today; // Ensure comparison is between Date objects
};
// --- End Helper Functions ---

// --- Constants ---
const FREE_USER_DAILY_SEO_LIMIT = 5; // Example limit for SEO analyses per day for free users
// --- End Constants ---


// @desc    Analyze content for SEO suggestions using AI
// @route   POST /api/seo/analyze
// @access  Private (Requires 'protect' middleware)
exports.analyzeContentSeo = async (req, res, next) => {
    // Check if AI service is available
    if (!openai) {
        return res.status(500).json({ success: false, message: 'AI service is not configured on the server.' });
    }

    // --- Get User Info & Input from Request ---
    const userId = req.user?.id;
    const userTier = req.user?.subscriptionTier;
    const userName = req.user?.name; // Optional for prompt personalization

    // Check if user info is available (populated by 'protect' middleware)
    if (!userId || !userTier) {
        // This should ideally not happen if 'protect' runs correctly
        return res.status(401).json({ success: false, message: 'User authentication information not found.' });
    }

    // Destructure expected input fields from request body
    const {
        targetPlatform, // e.g., 'youtube_long', 'youtube_short', 'instagram_reel', 'instagram_post', 'blog_post', 'linkedin_post'
        language = 'en', // Default language if not specified
        topic,
        currentTitle = '',
        currentDescription = '',
        keywords = [], // Expect an array, default to empty
        contentText = '' // Optional: Full script or blog post text
    } = req.body;

    // --- Input Validation ---
    if (!targetPlatform || typeof targetPlatform !== 'string') {
        return res.status(400).json({ success: false, message: 'Target platform is required and must be a string.' });
    }
    // Ensure at least some content context is provided
    if (!topic && !currentTitle && (!keywords || keywords.length === 0) && !contentText) {
        return res.status(400).json({ success: false, message: 'Please provide at least a topic, title, keywords, or content text for analysis.' });
    }

    let user; // Variable to hold user data for usage check if needed

    // --- Usage Limit Check for Free Users ---
    if (userTier === 'free') {
        try {
            // Fetch user specifically selecting the usage field
            user = await User.findById(userId).select('+usage');
            if (!user) {
                // Edge case: user deleted between token validation and now
                return res.status(404).json({ success: false, message: 'User not found for usage check.' });
            }

            // Safely access usage fields with defaults
            let { dailySeoAnalyses = 0, lastSearchReset = new Date(0) } = user.usage || {};

            // Check if the daily reset timestamp is before today
            let needsReset = isBeforeToday(lastSearchReset);
            if (needsReset) {
                console.log(`Resetting all daily counts for user ${userId} (SEO Analysis Trigger)`);
                dailySeoAnalyses = 0; // Reset counter for check
                // Update all daily counts and reset timestamp in DB
                // Run this update non-blockingly or handle potential errors gracefully
                await User.findByIdAndUpdate(userId, {
                   'usage.dailySearchCount': 0,
                   'usage.dailyTrendIdeations': 0,
                   'usage.dailySeoAnalyses': 0, // Reset this one
                   'usage.lastSearchReset': new Date() // Update to now
                }, { new: false }).catch(err => console.error(`Failed to reset daily counts for user ${userId}`, err)); // Log error if reset fails but continue
            }

            // Check if limit is exceeded AFTER potential reset
            if (dailySeoAnalyses >= FREE_USER_DAILY_SEO_LIMIT) {
                console.log(`User ${userId} exceeded daily SEO analysis limit.`);
                return res.status(429).json({ success: false, message: `Daily SEO analysis limit (${FREE_USER_DAILY_SEO_LIMIT}) reached for free tier.` });
            }
        } catch (limitError) {
            console.error(`Error checking/resetting SEO analysis limits for user ${userId}:`, limitError);
            return res.status(500).json({ success: false, message: 'Server error checking usage limits.' });
        }
    }
    // --- End Usage Limit Check ---


    // --- Construct Prompt for OpenAI ---
    const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // Current Date: Wednesday, 9 April 2025
    const currentLocation = "Bengaluru, Karnataka, India"; // Current Location Context

    // System prompt defining the AI's role and context
    let systemPrompt = `You are 'CreatorGenius SEO Expert', specializing in optimizing digital content for discoverability targeting audiences in India (context: ${currentLocation}, Date: ${currentDate}). Analyze the provided content details for the target platform and language. Provide actionable, specific SEO suggestions in the required JSON format. Focus on relevance to Indian search behavior, cultural context, and platform best practices.`;

    // User prompt detailing the specific content and request
    let userPrompt = `Analyze the following content details for SEO on platform: **${targetPlatform}** in language: **${language}**.\n\n`;
    if (topic) userPrompt += `- **Topic/Subject:** ${topic}\n`;
    if (currentTitle) userPrompt += `- **Current Title:** ${currentTitle}\n`;
    if (currentDescription) userPrompt += `- **Current Description:** ${currentDescription}\n`;
    if (keywords && keywords.length > 0) userPrompt += `- **Existing Keywords:** ${keywords.join(', ')}\n`;
    if (contentText) userPrompt += `- **Content Text/Script:** (Provide feedback on this below)\n"${contentText.substring(0, 1500)}${contentText.length > 1500 ? '...' : ''}"\n`; // Limit context length for performance/cost

    userPrompt += `\n**Analysis Request & Output Requirements:**
Provide the output *strictly* as a JSON object with these exact keys:
1.  "suggestedKeywords": (array of strings) Suggest 10-15 relevant keywords (mix of short-tail and long-tail) in **${language}** suitable for Indian audiences searching for this content.
2.  "optimizedTitles": (array of strings) Suggest 2-3 optimized alternative titles (under 70 chars for YouTube/Blog, shorter for Reels/Shorts) incorporating keywords naturally. Output in **${language}**.
3.  "optimizedDescription": (string) Suggest an optimized description (length appropriate for **${targetPlatform}**, e.g., ~150-300 words for YouTube/Blog, concise bullet points/short paragraph for Instagram/Shorts/Reels) incorporating keywords. Output in **${language}**.
4.  "suggestedHashtags": (array of strings) Suggest 10-15 relevant hashtags for **${targetPlatform}** in **${language}** (mix of broad, niche, and potentially trending if applicable).
5.  "contentFeedback": (string) ${contentText ? 'Based ONLY on the provided Content Text/Script, give 2-3 actionable points of feedback focusing strictly on improving SEO elements within the content (e.g., keyword placement, hook strength for retention, call-to-action clarity).' : 'N/A - No content text provided.'}
6.  "suggestedSaveTitle": (string) Generate a concise title suitable for saving this specific SEO analysis report, like "SEO Report for '[Topic or Current Title]'".

Ensure the entire response is a single, valid JSON object starting with { and ending with }.`;


    // --- API Call & Processing ---
    try {
        console.log(`Performing SEO Analysis for user ${userId}. Platform: ${targetPlatform}, Language: ${language}.`);
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Consider GPT-4 for potentially better SEO nuances and consistency
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.5, // Lower temperature for more focused, less overly creative SEO suggestions
            response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
            throw new Error("No content received from OpenAI for SEO analysis.");
        }
        console.log("Raw SEO analysis content string:", rawContent);

        // --- Parse and Validate Response using Zod ---
        let validatedData;
        try {
            validatedData = seoAnalysisSchema.parse(JSON.parse(rawContent));
            console.log("Successfully parsed and validated SEO analysis response.");
        } catch (error) {
            console.error("Failed parsing or validating SEO analysis JSON:", error);
            // Log detailed Zod errors if applicable
            if (error instanceof z.ZodError) {
                console.error("Zod Validation Error Details:", error.errors);
            }
            // Return error response including raw content for debugging
            return res.status(500).json({
                success: false,
                message: "AI SEO response received but failed format validation.",
                details: error instanceof z.ZodError ? error.errors : error.message, // Send Zod errors or general message
                raw_content: rawContent
            });
        }
        // --- End Parse and Validate ---

        // --- Increment Usage Count for Free Users (After Successful Call & Validation) ---
        if (userTier === 'free') {
            try {
                // Increment the counter for this specific feature
                await User.findByIdAndUpdate(userId, { $inc: { 'usage.dailySeoAnalyses': 1 } });
                console.log(`Incremented SEO analysis count for user ${userId}.`);
            } catch (incrementError) {
                // Log error but don't fail the request just for this
                console.error(`Non-critical: Failed to increment SEO usage count for user ${userId}:`, incrementError);
            }
        }
        // --- End Increment Usage Count ---

        // --- Success Response ---
        // Send the validated data object, which now includes suggestedSaveTitle
        res.status(200).json({
            success: true,
            message: "SEO analysis completed successfully.",
            data: validatedData
        });

    } catch (error) { // Catch errors from AI call or other unexpected issues
        // Log specific OpenAI errors
        if (error instanceof OpenAI.APIError) {
            console.error('OpenAI API SEO Error:', { status: error.status, headers: error.headers, error: error.error });
        } else {
            console.error('Generic Error in analyzeContentSeo:', error.message, error.stack);
        }
        // Return generic server error to client
        res.status(500).json({ success: false, message: 'Failed to perform SEO analysis due to a server or AI error.' });
    }
}; // --- End of analyzeContentSeo function ---