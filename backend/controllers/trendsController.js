// backend/controllers/trendsController.js
const axios = require('axios');
const User = require('../models/User'); // Need User model for checking limits/updating counts
const Insight = require('../models/Insight'); // Add this for direct saving of insights
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

// Helper function to extract potential tags from a query
const extractTagsFromQuery = (query) => {
    // Simple implementation - split by spaces and take words that are 3+ chars
    return query.split(/\s+/)
        .filter(word => word.length >= 3)  // Only words 3+ chars
        .filter(word => !['the', 'and', 'for', 'with', 'new'].includes(word.toLowerCase())) // Remove common words
        .map(word => word.toLowerCase())
        .slice(0, 5); // Limit to 5 tags
};

// Helper function to format search result as insight
const formatAsInsight = (result, query) => {
    // Generate a summary from the snippet
    const summary = result.snippet || "No summary available.";
    
    // Extract potential tags from query and title
    const queryTags = extractTagsFromQuery(query);
    const titleTags = extractTagsFromQuery(result.title);
    
    // Combine tags and remove duplicates
    const tags = [...new Set([...queryTags, ...titleTags])].slice(0, 8);
    
    // Generate key points (this is simplified - could be enhanced with AI)
    const keyPoints = [
        `Based on information from ${result.displayLink}`,
        `Related to search: ${query}`
    ];
    
    // Format as insight-compatible structure
    return {
        type: 'search_result',
        title: result.title,
        content: {
            summary: summary,
            source_details: {
                title: result.title,
                url: result.link,
                published: "Recent" // This is a limitation - we don't have the exact date
            },
            keyPoints: keyPoints
        },
        source: {
            url: result.link,
            name: "Google Search via CreatorGenius",
            query: query
        },
        tags: tags
    };
};

// @desc    Query trends/news using Google Search API with usage limits
// @route   POST /api/trends/query
// @access  Private
exports.queryTrends = async (req, res, next) => {
    const userId = req.user.id;
    const userTier = req.user.subscriptionTier; // Assuming tier is populated by 'protect'
    const { query, saveAsInsight } = req.body; // Add saveAsInsight parameter

    if (!Search_API_KEY || !Search_CX) {
        console.error("Google Search API Key or CX ID is missing in environment variables.");
        return res.status(500).json({ success: false, message: "Search service is not configured on the server." });
    }

    if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ success: false, message: 'Please provide a valid search query.' });
    }



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

       

        // --- NEW: Save result as insight if requested ---
        let savedInsight = null;
        if (saveAsInsight && searchResults.length > 0) {
            try {
                // Format the first result as an insight
                const insightData = formatAsInsight(searchResults[0], query);
                insightData.userId = userId; // Add the user ID
                
                // Save to database
                savedInsight = await Insight.create(insightData);
                
                // Increment insight count
                try {
                    await User.findByIdAndUpdate(userId, {
                        $inc: { 'usage.insightsSavedThisMonth': 1, 'usage.dailyInsightsSaved': 1 }
                    });
                } catch (countError) {
                    console.error(`Non-critical: Failed to increment insight count for user ${userId}:`, countError);
                }
                
                console.log(`Saved search result as insight for user ${userId}`);
            } catch (insightError) {
                console.error(`Error saving search result as insight:`, insightError);
                // Don't fail the request if insight saving fails
            }
        }
        // --- End Save as Insight ---

        // Include savedInsight in response if applicable
        res.status(200).json({
            success: true,
            query: query,
            count: searchResults.length,
            data: searchResults,
            ...(savedInsight && { savedInsight })
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

// @desc    Save a search result as an insight
// @route   POST /api/trends/save-insight
// @access  Private
exports.saveSearchAsInsight = async (req, res) => {
    try {
        const { resultIndex, query, searchResults } = req.body;
        
        // Validate input
        if (!searchResults || !Array.isArray(searchResults) || resultIndex === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid searchResults array and resultIndex'
            });
        }
        
        // Ensure the index is valid
        if (resultIndex < 0 || resultIndex >= searchResults.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resultIndex'
            });
        }
        
        // Get the selected result
        const selectedResult = searchResults[resultIndex];
        
        // Format as insight
        const insightData = formatAsInsight(selectedResult, query);
        insightData.userId = req.user._id; // Add the user ID
        
        // Save to database
        const savedInsight = await Insight.create(insightData);
        
        
        
        return res.status(201).json({
            success: true,
            message: 'Search result saved as insight successfully',
            data: savedInsight
        });
        
    } catch (error) {
        console.error('Error in saveSearchAsInsight:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error when saving insight'
        });
    }
};