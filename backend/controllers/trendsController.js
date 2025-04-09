// backend/controllers/trendsController.js
const axios = require('axios');
const User = require('../models/User'); // Need User model for checking limits/updating counts
//require('dotenv').config(); // Ensure env vars are loaded

const Search_API_KEY = process.env.Search_API_KEY;
const Search_CX = process.env.Search_CX;
const FREE_USER_DAILY_SEARCH_LIMIT = 5; // Define the limit for free users

// Helper function to check if a date was before today
const isBeforeToday = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    return date < today;
};

// @desc    Query trends/news using Google Search API with usage limits
// @route   POST /api/trends/query
// @access  Private
exports.queryTrends = async (req, res, next) => {
    const userId = req.user.id;
    const userTier = req.user.subscriptionTier; // Assuming tier is populated by 'protect'
    const { query } = req.body;

    if (!Search_API_KEY || !Search_CX) {
        console.error("Google Search API Key or CX ID is missing in environment variables.");
        return res.status(500).json({ success: false, message: "Search service is not configured on the server." });
    }

    if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ success: false, message: 'Please provide a valid search query.' });
    }

    let user; // Define user variable in the outer scope

    // --- Usage Limit Check ---
    if (userTier === 'free') {
        try {
            user = await User.findById(userId).select('+usage'); // Select usage field
            if (!user) return res.status(404).json({ success: false, message: 'User not found.' }); // Should not happen

            let { dailySearchCount = 0, lastSearchReset = new Date(0) } = user.usage || {}; // Default if usage obj is missing

            // Reset daily count if last reset was before today
            if (isBeforeToday(lastSearchReset)) {
                console.log(`Resetting daily search count for user ${userId}`);
                dailySearchCount = 0;
                lastSearchReset = new Date(); // Set to now
                // Update reset time immediately (can be done later too)
                 await User.findByIdAndUpdate(userId, {
                     'usage.dailySearchCount': 0,
                     'usage.lastSearchReset': lastSearchReset
                 });
            }

            // Check limit
            if (dailySearchCount >= FREE_USER_DAILY_SEARCH_LIMIT) {
                console.log(`User ${userId} exceeded daily search limit.`);
                return res.status(429).json({ success: false, message: `Daily search limit (${FREE_USER_DAILY_SEARCH_LIMIT}) reached for free users.` });
            }

            // If limit not reached, we will increment later *after* successful API call

        } catch (limitError) {
             console.error(`Error checking usage limits for user ${userId}:`, limitError);
             return res.status(500).json({ success: false, message: 'Error checking usage limits.' });
        }
    }
    // --- End Usage Limit Check ---


    // --- Call Google Search API ---
    try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1`;
        const params = {
            key: Search_API_KEY,
            cx: Search_CX,
            q: query.trim(), // User's search query
            num: 5, // Number of results (adjust as needed, max 10 per call usually)
            // Optional parameters:
            dateRestrict: 'd[7]', // Restrict to past 7 days (d[N], w[N], m[N], y[N])
            sort: 'date', // Sort by date (might require specific setup in CSE)
            gl: 'in', // Geolocation bias to India
            cr: 'countryIN', // Restrict results to India
            lr: 'lang_en' // Restrict results to English (or user's preferred language)
        };

        console.log(`Performing Google Search for user ${userId} with query: "${query}"`);
        const response = await axios.get(searchUrl, { params });

        // Process results
        const items = response.data.items || [];
        const searchResults = items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            displayLink: item.displayLink
            // Add other fields if needed, like item.pagemap?.cse_thumbnail?.[0]?.src
        }));

        // --- Increment Usage Count for Free Users (AFTER successful API call) ---
        if (userTier === 'free' && user) { // Ensure user was fetched earlier
            try {
                 const updatedUserUsage = await User.findByIdAndUpdate(
                     userId,
                     {
                         $inc: { 'usage.dailySearchCount': 1 },
                         'usage.lastSearchReset': user.usage.lastSearchReset || new Date() // Ensure reset time is set if it was just reset
                     },
                     { new: true } // Return updated document if needed
                 ).select('usage'); // Select only usage to log if needed
                 console.log(`Incremented search count for user ${userId}. New count: ${updatedUserUsage?.usage?.dailySearchCount}`);

            } catch (incrementError) {
                 console.error(`Non-critical: Failed to increment search count for user ${userId}:`, incrementError);
                 // Log but don't fail the request just because count didn't increment
            }
        }
        // --- End Increment Usage Count ---

        res.status(200).json({
            success: true,
            query: query,
            count: searchResults.length,
            data: searchResults
        });

    } catch (error) {
        console.error('Google Search API Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        // Provide more specific error messages based on Google's response if possible
        let message = 'Failed to fetch search results due to a server or external API error.';
         if (error.response && error.response.data && error.response.data.error) {
             message = `Google API Error: ${error.response.data.error.message || 'Unknown Google API error'}`;
         }
        res.status(500).json({ success: false, message });
    }
};