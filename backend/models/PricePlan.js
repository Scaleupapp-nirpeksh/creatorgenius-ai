// backend/models/PricePlan.js
const mongoose = require('mongoose');

const pricePlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  tier: {
    type: String,
    required: true,
    enum: ['free', 'creator_pro', 'agency_growth']
  },
  description: {
    type: String,
    required: true
  },
  // Pricing information
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'one_time', 'free'],
    required: true
  },
  price: {
    amount: {
      type: Number,
      required: function() { return this.billingCycle !== 'free'; }
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  discountedPrice: {
    amount: Number,
    validUntil: Date
  },
  // Razorpay ID
  razorpayPlanId: {
    type: String
  },
  // Feature flags and limits
  features: {
    type: mongoose.Schema.Types.Mixed
  },
  // Plan metadata
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PricePlan', pricePlanSchema);