// backend/models/Insight.js
const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
    // Link to the user who saved the insight
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true // Index for efficient querying by user
    },
    // Type of insight
    type: {
        type: String,
        required: true,
        enum: ['trend', 'news', 'idea', 'search_result' ,'seo_result'],
        index: true // Index for filtering by type
    },
    // Title of the insight
    title: {
        type: String,
        required: [true, 'Insight title is required.'],
        trim: true
    },
    // Main content of the insight
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Insight content is required.']
    },
    // Source information - where the insight came from
    source: {
        url: String,
        name: String, // Name of source (e.g., "Google Search", "News API", "CreatorGenius AI")
        query: String // Original query that led to this insight (if applicable)
    },
    // Optional tags or categories for organizing insights
    tags: {
        type: [String],
        default: []
    },
    // Optional notes added by the user
    notes: {
        type: String,
        default: ''
    },
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Create compound indexes for common query patterns
insightSchema.index({ userId: 1, type: 1, createdAt: -1 }); // For fetching user's insights by type, sorted by date

module.exports = mongoose.model('Insight', insightSchema);