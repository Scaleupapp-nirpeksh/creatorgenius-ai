// backend/models/Refinement.js
const mongoose = require('mongoose');

const refinementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true
    },
    originalIdeaId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'SavedIdea', // Link back to the specific saved idea
        index: true
    },
    refinementType: { // e.g., 'titles', 'script_outline', 'elaborate_angle', 'hook_ideas'
        type: String,
        required: true,
        trim: true
    },
    // Store the actual result from the AI.
    // Using Mixed allows flexibility for different structures (array of strings, array of objects)
    // Consider defining specific sub-schemas if structure is highly consistent per type
    result: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    // Optional: Store the instructions that led to this refinement
    additionalInstructions: { type: String },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: false }
});

module.exports = mongoose.model('Refinement', refinementSchema);