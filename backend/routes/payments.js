// backend/routes/payments.js
const express = require('express');
const {
  getSubscriptionPlans,
  createSubscription,
  verifyPayment,
  handleWebhook,
  getUserSubscription,
  cancelSubscription,
  getPaymentHistory
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/webhook', handleWebhook);
router.get('/plans', getSubscriptionPlans);

// Protected routes
router.use(protect);
router.post('/create-subscription', createSubscription);
router.post('/verify-payment', verifyPayment);
router.get('/subscription', getUserSubscription);
router.post('/cancel-subscription', cancelSubscription);
router.get('/history', getPaymentHistory);

module.exports = router;