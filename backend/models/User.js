// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

// Optional: Helper function for array size validation
function limitArray(limit) {
    // Returns a validation function
    return function(val) {
        // Allows empty array or array up to the specified limit
        return !val || val.length <= limit;
    };
}

// Schema for connected social media accounts (if used)
const connectedAccountSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    enum: ['youtube', 'instagram', 'facebook', 'moj', 'sharechat', 'twitter', 'linkedin']
  },
  platformUserId: { type: String, required: true },
  accessToken: { type: String, required: true }, // Store encrypted
  refreshToken: { type: String }, // Store encrypted
  tokenExpiry: { type: Date },
  profileInfo: { type: mongoose.Schema.Types.Mixed },
  connectedAt: { type: Date, default: Date.now }
}, {_id: false});

// Main User Schema
const userSchema = new mongoose.Schema({
  // --- Basic Info ---
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true, // Ensures no two users have the same email
    lowercase: true, // Stores email in lowercase for consistency
    match: [ /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[a-zA-Z]{2,})$/, 'Please provide a valid email'],
    index: true // Improves query performance for email lookups
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Prevents password from being sent back in queries by default
  },
  profilePictureUrl: {
    type: String,
    default: '' // URL to the user's avatar
  },

  // --- Subscription & Payment ---
  subscriptionTier: {
    type: String,
    enum: ['free', 'creator_pro', 'agency_growth'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'past_due', 'cancelled', 'trialing'],
    default: 'active'
  },
  paymentGatewayCustomerId: { // ID from Stripe, Razorpay etc.
    type: String,
    index: true
  },
  subscriptionEndDate: { // When the current paid period ends
      type: Date
  },

  // --- App Specific Data ---
  connectedAccounts: [connectedAccountSchema], // Linked social media accounts
  interests: { // For personalized news/content suggestions
      type: [String],
      default: [],
      validate: [limitArray(15), 'Cannot exceed 15 interests'] // Limit to 15 interests
  },
  preferences: { // General user preferences
      newsSources: { type: [String], default: [] }, // Preferred news websites
      preferredNewsLanguage: { type: String, default: 'en' } // e.g., 'en', 'hi', 'kn'
      // Add other preferences like default AI tone, etc.
  },
  usage: { // Tracking feature usage
      // --- Existing Tracking ---
      ideationsThisMonth: { type: Number, default: 0 },
      refinementsThisMonth: { type: Number, default: 0 },
      seoReportsThisMonth: { type: Number, default: 0 }, // Placeholder
      // -- When was usage last reset (e.g., start of month/billing cycle)? --
      lastUsageReset: { type: Date, default: Date.now },

      // --- Search Tracking ---
      dailySearchCount: { type: Number, default: 0 }, // Searches used today
      // -- When was the daily search count last reset? --
      lastSearchReset: { type: Date, default: Date.now }
  },

  // --- Role & Permissions ---
  role: {
    type: String,
    enum: ['user', 'admin'], // Define available roles
    default: 'user'
  },
  // agencyId: { // Link to an Agency model if implementing agency features
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: 'Agency'
  // },

  // --- Account Status & Security ---
  isVerified: { // For email verification status
    type: Boolean,
    default: false
  },
  verificationToken: String, // Token sent in verification email
  verificationExpires: Date, // Expiry for the verification token
  passwordResetToken: String, // Token sent for password reset
  passwordResetExpires: Date, // Expiry for the password reset token
  lastLoginAt: { // Timestamp of the last successful login
      type: Date
  }
}, {
  // --- Schema Options ---
  timestamps: true // Automatically adds `createdAt` and `updatedAt` fields
});

// --- Mongoose Middleware ---

// Hash password automatically BEFORE saving a user document
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  // Hash the password with a cost factor (salt rounds)
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next(); // Proceed to save
});

// --- Mongoose Instance Methods ---

// Method to compare candidate password with the hashed password in DB
// Important: Use a regular function declaration to ensure 'this' refers to the document
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Need to select the password field explicitly as it's select: false in schema
  const user = await this.constructor.findById(this._id).select('+password');
  if (!user) return false; // Should not happen if method is called on existing user doc
  return await bcrypt.compare(candidatePassword, user.password);
};


module.exports = mongoose.model('User', userSchema);