// backend/controllers/paymentController.js
let razorpay = null;

// Try to initialize Razorpay only if keys are available
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn("Razorpay credentials not found. Payment features will be disabled.");
}

// Simplified controller with feature detection
const getSubscriptionPlans = async (req, res) => {
  // Return mock data if we're not using payments yet
  return res.status(200).json({
    success: true,
    message: "Payments not enabled yet - returning mock data",
    data: [
      {
        name: 'Free Plan',
        tier: 'free',
        description: 'Basic access to CreatorGenius with limited features',
        billingCycle: 'free',
        price: {
          amount: 0,
          currency: 'INR'
        }
      },
      {
        name: 'Creator Pro Monthly',
        tier: 'creator_pro',
        description: 'Professional tools for serious content creators (MOCK - Payments not enabled yet)',
        billingCycle: 'monthly',
        price: {
          amount: 1999,
          currency: 'INR'
        }
      }
    ]
  });
};

// Other functions with checks for Razorpay availability
const createSubscription = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Payments not enabled yet. This is a mock response.",
    data: {
      status: "mock"
    }
  });
};

const verifyPayment = async (req, res) => {
  return res.status(200).json({
    success: true, 
    message: "Payments not enabled yet. This is a mock response.",
    data: {
      status: "mock"
    }
  });
};

const handleWebhook = async (req, res) => {
  return res.status(200).json({ received: true });
};

const getUserSubscription = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      plan: 'free',
      status: 'active',
      billingCycle: 'none',
      isFree: true
    }
  });
};

const cancelSubscription = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Mock cancelation response"
  });
};

const getPaymentHistory = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      payments: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      }
    }
  });
};

module.exports = {
  getSubscriptionPlans,
  createSubscription,
  verifyPayment,
  handleWebhook,
  getUserSubscription,
  cancelSubscription,
  getPaymentHistory
};