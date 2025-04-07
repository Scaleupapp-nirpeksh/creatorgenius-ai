// backend/models/ScheduledIdea.js
const mongoose = require('mongoose');

const scheduledIdeaSchema = new mongoose.Schema({
    // Link to the user who scheduled the idea
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true
    },
    // Reference to the saved idea
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'SavedIdea',
        index: true
    },
    // Scheduling information
    scheduledDate: {
        type: Date,
        required: [true, 'Please provide a scheduled date']
    },
    publishingPlatform: {
        type: String,
        default: 'Not specified'
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'posted', 'delayed'],
        default: 'scheduled'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    dueDate: {
        type: Date
    },
    // Additional information
    postingNotes: {
        type: String
    },
    additionalDetails: {
        type: String
    },
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastModified: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'lastModified' }
});

// Create compound index to ensure a user doesn't schedule the same idea twice
// (consider if this is the behavior you want)
// scheduledIdeaSchema.index({ userId: 1, ideaId: 1 }, { unique: true });

module.exports = mongoose.model('ScheduledIdea', scheduledIdeaSchema);