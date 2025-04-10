// backend/models/Script.js
const mongoose = require('mongoose');

const scriptSectionSchema = new mongoose.Schema({
    section: { type: String, required: true },
    content: { type: String, required: true },
    visualDirection: String,
    duration: String
}, { _id: false });

const scriptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true
    },
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SavedIdea',
        index: true
    },
    title: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        required: true
    },
    targetDuration: String,
    intro: {
        type: String,
        required: true
    },
    body: {
        type: [scriptSectionSchema],
        required: true,
        validate: [arr => Array.isArray(arr) && arr.length > 0, 'Script must have at least one body section']
    },
    outro: {
        type: String,
        required: true
    },
    callToAction: {
        type: String,
        required: true
    },
    bRollSuggestions: [String],
    tags: [String],
    // Additional metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    isTransformed: {
        type: Boolean,
        default: false
    },
    originalScriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Script',
        default: null
    },
    // Don't forget to add updatedAt if not already present
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'lastModified' }
});

module.exports = mongoose.model('Script', scriptSchema);