// backend/models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  // Razorpay subscription ID
  razorpaySubscriptionId: {
    type: String,
    sparse: true,
    index: true
  },
  // Razorpay customer ID
  razorpayCustomerId: {
    type: String,
    sparse: true
  },
  // Subscription details
  plan: {
    type: String,
    enum: ['free', 'creator_pro', 'agency_growth'],
    required: true,
    default: 'free'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'none'],
    default: 'none'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'past_due', 'paused', 'pending', 'halted', 'completed'],
    default: 'active'
  },
  priceId: {
    type: String  // Reference to price ID in Razorpay
  },
  // Dates
  startDate: {
    type: Date,
    default: Date.now
  },
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
    type: Date
  },
  // Payment information
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'upi', 'wallet', 'emi', 'other', 'none'],
    default: 'none'
  },
  lastPaymentDate: {
    type: Date
  },
  lastPaymentStatus: {
    type: String,
    enum: ['success', 'failed', 'pending', 'none'],
    default: 'none'
  },
  // Promotional information
  discount: {
    code: String,
    percentOff: Number,
    amountOff: Number,
    validUntil: Date
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficiently finding active subscriptions
subscriptionSchema.index({ userId: 1, status: 1 });
// Index for subscription expiration queries
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);