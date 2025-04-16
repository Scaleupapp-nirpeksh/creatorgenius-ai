// backend/models/PaymentHistory.js
const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    index: true
  },
  // Razorpay IDs
  razorpayPaymentId: {
    type: String,
    index: true
  },
  razorpayOrderId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  // Payment details
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
    required: true
  },
  paymentMethod: {
    type: String
  },
  // Invoice details
  invoiceNumber: {
    type: String
  },
  invoiceUrl: {
    type: String
  },
  // Dates
  paymentDate: {
    type: Date,
    default: Date.now
  },
  // For refunds
  refundAmount: {
    type: Number
  },
  refundReason: {
    type: String
  },
  refundDate: {
    type: Date
  },
  // Additional information
  description: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);