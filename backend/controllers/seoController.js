// backend/controllers/seoController.js
const { OpenAI } = require("openai");
const User = require('../models/User'); // For usage tracking
const { z } = require("zod"); // For validation

// --- Initialize OpenAI Client ---
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
    console.warn("SEO Controller WARN: OPENAI_API_KEY missing. AI SEO features disabled.");
    openai = null;
}
// --- End OpenAI Client Initialization ---

// --- ZOD Schema for SEO Output ---
const seoAnalysisSchema = z.object({
    suggestedKeywords: z.array(z.string()).optional().describe("Relevant keywords (mix of broad and long-tail)."),
    optimizedTitles: z.array(z.string().max(100)).optional().describe("2-3 optimized title suggestions."),
    optimizedDescription: z.string().optional().describe("Suggested optimized description text."),
    suggestedHashtags: z.array(z.string()).optional().describe("Platform-relevant hashtags."),
    contentFeedback: z.string().optional().describe("Actionable feedback on the provided content/script for SEO/engagement.")
});
// --- End Zod Schema ---

// --- Helper Functions ---
const isBeforeToday = (date) => { 
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
};
// --- End Helper Functions ---

// --- Constants ---
const FREE_USER_DAILY_SEO_LIMIT = 5; // Example limit
// --- End Constants ---


// @desc    Analyze content for SEO suggestions using AI
// @route   POST /api/seo/analyze
// @access  Private
exports.analyzeContentSeo = async (req, res, next) => {
    if (!openai) return res.status(500).json({ success: false, message: 'AI service not configured.' });

    // --- User Info & Input ---
    const userId = req.user?.id;
    const userTier = req.user?.subscriptionTier;
    const userName = req.user?.name; // For context potentially

    if (!userId || !userTier) return res.status(401).json({ success: false, message: 'User information not found.' });

    const {
        targetPlatform, // e.g., 'youtube_long', 'youtube_short', 'instagram_reel', 'instagram_post', 'blog_post'
        language = 'en', // Default language
        topic,
        currentTitle = '',
        currentDescription = '',
        keywords = [], // Array of existing keywords user might have
        contentText = '' // Optional: Full script or blog post text
    } = req.body;

    // --- Validation ---
    if (!targetPlatform) return res.status(400).json({ success: false, message: 'Target platform is required.' });
    if (!topic && !currentTitle && keywords.length === 0 && !contentText) {
        return res.status(400).json({ success: false, message: 'Please provide at least a topic, title, keywords, or content text.' });
    }

    let user; // For usage tracking

    // --- Usage Limit Check ---
    if (userTier === 'free') {
        try {
            user = await User.findById(userId).select('+usage');
            if (!user) return res.status(404).json({ success: false, message: 'User not found for usage check.' });

            let { dailySeoAnalyses = 0, lastSearchReset = new Date(0) } = user.usage || {};

            let needsReset = isBeforeToday(lastSearchReset);
            if (needsReset) {
                console.log(`Resetting daily SEO analysis count for user ${userId}`);
                dailySeoAnalyses = 0;
                // Reset all daily counts together using the same timestamp
                await User.findByIdAndUpdate(userId, {
                   'usage.dailySearchCount': 0,
                   'usage.dailyTrendIdeations': 0,
                   'usage.dailySeoAnalyses': 0, // Reset this one
                   'usage.lastSearchReset': new Date()
                }, { new: false });
            }

            if (dailySeoAnalyses >= FREE_USER_DAILY_SEO_LIMIT) {
                console.log(`User ${userId} exceeded daily SEO analysis limit.`);
                return res.status(429).json({ success: false, message: `Daily SEO analysis limit (${FREE_USER_DAILY_SEO_LIMIT}) reached.` });
            }
        } catch (limitError) {
            console.error(`Error checking SEO analysis limits for user ${userId}:`, limitError);
            return res.status(500).json({ success: false, message: 'Error checking usage limits.' });
        }
    }
    // --- End Usage Limit Check ---


    // --- Construct Prompt ---
    const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // Current Date: Wednesday, 9 April 2025
    const currentLocation = "Bengaluru, Karnataka, India"; // Current Location Context

    let systemPrompt = `You are 'CreatorGenius SEO Expert', specializing in optimizing digital content for discoverability in India (context: ${currentLocation}, ${currentDate}). Analyze the provided content details for the target platform and language, then provide actionable SEO suggestions in the specified JSON format. Focus on relevance to Indian audiences and search behavior.`;

    let userPrompt = `Analyze the following content details for SEO on platform: **${targetPlatform}** in language: **${language}**.\n\n`;
    if (topic) userPrompt += `- **Topic:** ${topic}\n`;
    if (currentTitle) userPrompt += `- **Current Title:** ${currentTitle}\n`;
    if (currentDescription) userPrompt += `- **Current Description:** ${currentDescription}\n`;
    if (keywords.length > 0) userPrompt += `- **Existing Keywords:** ${keywords.join(', ')}\n`;
    if (contentText) userPrompt += `- **Content Text/Script:** (Provide feedback on this below)\n"${contentText.substring(0, 1500)}${contentText.length > 1500 ? '...' : ''}"\n`; // Limit context length

    userPrompt += `\n**Analysis Request:**
1.  **Keywords:** Suggest 10-15 relevant keywords (mix of short-tail and long-tail) in **${language}** suitable for Indian audiences searching for this content.
2.  **Titles:** Suggest 2-3 optimized alternative titles (under 70 chars for YouTube/Blog, shorter for Reels/Shorts) incorporating keywords naturally. Output in **${language}**.
3.  **Description:** Suggest an optimized description (around 150-300 words for YouTube/Blog, shorter with key points for Instagram, concise for Shorts/Reels) incorporating keywords. Output in **${language}**.
4.  **Hashtags:** Suggest 10-15 relevant hashtags for **${targetPlatform}** in **${language}** (mix of broad, niche, and potentially trending if applicable).
5.  **Content Feedback:** ${contentText ? 'Based on the provided Content Text/Script, give 2-3 actionable points of feedback focusing ONLY on improving SEO, audience retention, or calls-to-action.' : 'No content text provided for feedback.'}\n`;

    userPrompt += `\n**Output Format Requirements:**
Provide the output *strictly* as a JSON object with these exact keys: "suggestedKeywords" (array of strings), "optimizedTitles" (array of strings), "optimizedDescription" (string), "suggestedHashtags" (array of strings), "contentFeedback" (string). Ensure valid JSON starting with { and ending with }.`;


    // --- API Call & Processing ---
    try {
        console.log(`Performing SEO Analysis for user ${userId}. Platform: ${targetPlatform}, Language: ${language}.`);
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Consider GPT-4 for potentially better SEO nuances
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.5, // Lower temperature for more focused SEO suggestions
            response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No content received from OpenAI for SEO analysis.");
        console.log("Raw SEO analysis content string:", rawContent);

        let validatedData;
        try {
            // Use Zod schema to parse and validate the structure
            validatedData = seoAnalysisSchema.parse(JSON.parse(rawContent));
            console.log("Successfully parsed/validated SEO analysis response.");
        } catch (error) {
            console.error("Failed parsing/validating SEO analysis JSON:", error);
            if (error instanceof z.ZodError) console.error("Zod Errors:", error.errors);
            return res.status(500).json({ success: false, message: "AI SEO response format error.", details: error instanceof z.ZodError ? error.errors : error.message, raw_content: rawContent });
        }

        // Increment usage (non-critical)
        if (userTier === 'free') {
            try { await User.findByIdAndUpdate(userId, { $inc: { 'usage.dailySeoAnalyses': 1 } }); }
            catch (incrementError) { console.error(`Non-critical: Failed SEO usage update for ${userId}:`, incrementError); }
        }

        // --- Success Response ---
        res.status(200).json({ success: true, message: "SEO analysis completed successfully.", data: validatedData });

    } catch (error) { // Handle AI call errors or other unexpected errors
        if (error instanceof OpenAI.APIError) console.error('OpenAI API SEO Error:', { status: error.status, error: error.error });
        else console.error('Generic Error in analyzeContentSeo:', error.message);
        res.status(500).json({ success: false, message: 'Failed to perform SEO analysis due to a server or AI error.' });
    }
};