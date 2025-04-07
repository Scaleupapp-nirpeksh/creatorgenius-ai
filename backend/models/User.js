// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const connectedAccountSchema = new mongoose.Schema({
  platform: { // e.g., 'youtube', 'instagram', 'moj'
    type: String,
    required: true,
    enum: ['youtube', 'instagram', 'facebook', 'moj', 'sharechat', 'twitter', 'linkedin'] // Add more as needed
  },
  platformUserId: { // The user's ID on that platform (e.g., YouTube Channel ID)
    type: String,
    required: true
  },
  accessToken: { // Store encrypted token
    type: String,
    required: true
  },
  refreshToken: { // Store encrypted token, if applicable
    type: String
  },
  tokenExpiry: {
    type: Date
  },
  profileInfo: { // Optional: Store basic profile info like name/handle from the platform
      type: mongoose.Schema.Types.Mixed
  },
  connectedAt: {
    type: Date,
    default: Date.now
  }
}, {_id: false}); // Prevent Mongoose from creating an _id for each connected account

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true, // Store emails consistently
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ],
    index: true // Add index for faster email lookups
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8, // Increased minimum length for better security
    select: false // Automatically exclude password field from query results by default
  },
  profilePictureUrl: {
    type: String,
    default: '' // Or a default avatar URL
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'creator_pro', 'agency_growth'], // Matches your revenue model
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'past_due', 'cancelled', 'trialing'],
    default: 'active' // Assuming 'free' tier is active by default
  },
  paymentGatewayCustomerId: { // e.g., Stripe or Razorpay customer ID
    type: String,
    index: true // Index for quick lookups if needed
  },
  subscriptionEndDate: { // When the current paid period ends (for pro/agency)
      type: Date
  },
  connectedAccounts: [connectedAccountSchema], // Array to store linked social accounts
  preferences: {
    defaultLanguage: { type: String, default: 'en' }, // Default content language preference
    // Add other preferences as needed
  },
  // --- Usage Tracking (for Freemium limits) ---
  usage: {
    ideationsThisMonth: { type: Number, default: 0 },
    seoReportsThisMonth: { type: Number, default: 0 },
    lastUsageReset: { type: Date, default: Date.now } // Track when usage was last reset
  },
  // --- Security & Access ---
  role: {
    type: String,
    enum: ['user', 'admin', 'agency_owner'], // Basic roles
    default: 'user'
  },
  agencyId: { // If the user belongs to an agency (links to a potential future Agency model)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency' // Assuming an 'Agency' model might exist later
  },
  isVerified: { // For email verification
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLoginAt: {
      type: Date
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// --- Mongoose Middleware ---

// Hash password BEFORE saving using a pre-save hook
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    return next();
  }

  // Hash the password with cost factor 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Delete password confirm field if you add one for validation
  // this.passwordConfirm = undefined;
  next();
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