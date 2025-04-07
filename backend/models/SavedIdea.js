// backend/models/SavedIdea.js
const mongoose = require('mongoose');

const savedIdeaSchema = new mongoose.Schema({
    // Link to the user who saved the idea
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Reference to the User model
        index: true // Index for efficient querying by user
    },
    // --- Core Idea Content ---
    title: {
        type: String,
        required: [true, 'Idea title is required.']
    },
    angle: {
        type: String,
        required: [true, 'Idea angle is required.']
    },
    tags: {
        type: [String], // Array of strings
        validate: [v => Array.isArray(v) && v.length > 0, 'At least one tag is required.']
    },
    // --- Optional Richer Fields ---
    hook: { type: String },
    structure_points: { type: [String] },
    platform_suitability: { type: String, enum: ['High', 'Medium', 'Low', null] }, // Allow null if not provided
    intendedEmotion: { type: String },
    // --- Metadata ---
    savedAt: {
        type: Date,
        default: Date.now
    },
    // Optional: Store the original input that generated this idea
    originalInput: { type: mongoose.Schema.Types.Mixed }
}, {
    timestamps: { createdAt: 'savedAt', updatedAt: false } // Use savedAt instead of default createdAt
});

// Prevent a user from saving the exact same idea title multiple times (optional constraint)
//savedIdeaSchema.index({ userId: 1, title: 1 }, { unique: true }); // Be cautious with this, titles might be similar

module.exports = mongoose.model('SavedIdea', savedIdeaSchema);