// backend/controllers/paymentController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const PaymentHistory = require('../models/PaymentHistory');
const PricePlan = require('../models/PricePlan');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Get available subscription plans
// @route   GET /api/payments/plans
// @access  Public
exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await PricePlan.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .select('-razorpayPlanId');
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
};

// @desc    Create Razorpay order for subscription
// @route   POST /api/payments/create-subscription
// @access  Private
exports.createSubscription = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    
    // Validate request
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }
    
    // Get the plan details
    const plan = await PricePlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive plan selected'
      });
    }
    
    // Verify billing cycle matches plan
    if (plan.billingCycle !== billingCycle && plan.billingCycle !== 'free') {
      return res.status(400).json({
        success: false,
        message: `Selected billing cycle does not match plan. Expected: ${plan.billingCycle}`
      });
    }
    
    // If plan is free, handle separately
    if (plan.billingCycle === 'free') {
      // Create or update subscription record
      const subscription = await Subscription.findOneAndUpdate(
        { userId: req.user._id, status: 'active' },
        {
          plan: plan.tier,
          billingCycle: 'none',
          status: 'active',
          startDate: new Date(),
          currentPeriodStart: new Date(),
          // Free plans don't expire, but we set a far future date for consistency
          currentPeriodEnd: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 years
        },
        { upsert: true, new: true }
      );
      
      // Update user's subscription tier
      await User.findByIdAndUpdate(req.user._id, {
        subscriptionTier: plan.tier,
        subscriptionStatus: 'active'
      });
      
      return res.status(200).json({
        success: true,
        message: 'Free plan activated successfully',
        data: {
          subscription: {
            id: subscription._id,
            plan: subscription.plan,
            status: subscription.status
          }
        }
      });
    }
    
    // For paid plans, create Razorpay subscription
    
    // First, check if user already has a Razorpay customer ID
    const user = await User.findById(req.user._id);
    let razorpayCustomerId = user.paymentGatewayCustomerId;
    
    // If user doesn't have a Razorpay customer ID, create one
    if (!razorpayCustomerId) {
      const customer = await razorpay.customers.create({
        name: user.name,
        email: user.email,
        contact: user.phone || '',
        notes: {
          userId: user._id.toString()
        }
      });
      
      razorpayCustomerId = customer.id;
      
      // Save the customer ID to the user record
      await User.findByIdAndUpdate(user._id, {
        paymentGatewayCustomerId: razorpayCustomerId
      });
    }
    
    // Calculate amount based on billing cycle
    const amount = plan.discountedPrice && new Date() < plan.discountedPrice.validUntil 
      ? plan.discountedPrice.amount 
      : plan.price.amount;
    
    // Determine period based on billing cycle
    let period;
    let interval;
    
    if (billingCycle === 'monthly') {
      period = 'monthly';
      interval = 1;
    } else if (billingCycle === 'yearly') {
      period = 'yearly';
      interval = 1;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle'
      });
    }
    
    // Create or retrieve Razorpay plan
    let razorpayPlan;
    
    if (plan.razorpayPlanId) {
      // Retrieve existing plan
      razorpayPlan = await razorpay.plans.fetch(plan.razorpayPlanId);
    } else {
      // Create new plan in Razorpay
      razorpayPlan = await razorpay.plans.create({
        period,
        interval,
        item: {
          name: plan.name,
          description: plan.description,
          amount: amount * 100, // Razorpay uses paise
          currency: plan.price.currency
        },
        notes: {
          planId: plan._id.toString(),
          tier: plan.tier
        }
      });
      
      // Save Razorpay plan ID to our plan record
      await PricePlan.findByIdAndUpdate(plan._id, {
        razorpayPlanId: razorpayPlan.id
      });
    }
    
    // Create a subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlan.id,
      customer_notify: 1, // Notify customer about the subscription
      total_count: billingCycle === 'monthly' ? 12 : 1, // 12 months for monthly, 1 for yearly
      customer_id: razorpayCustomerId,
      notes: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        tier: plan.tier
      }
    });
    
    // Create a record in our database
    const subscriptionRecord = await Subscription.create({
      userId: user._id,
      razorpaySubscriptionId: subscription.id,
      razorpayCustomerId: razorpayCustomerId,
      plan: plan.tier,
      billingCycle,
      status: 'pending', // Will be updated when payment is confirmed
      priceId: plan._id.toString(),
      startDate: new Date(),
      // These will be updated after successful payment
      currentPeriodStart: null,
      currentPeriodEnd: null
    });
    
    res.status(200).json({
      success: true,
      data: {
        subscriptionId: subscriptionRecord._id,
        razorpaySubscriptionId: subscription.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        planDetails: {
          name: plan.name,
          description: plan.description,
          amount,
          currency: plan.price.currency,
          billingCycle
        },
        customerInfo: {
          name: user.name,
          email: user.email,
          contact: user.phone || ''
        }
      }
    });
    
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message
    });
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify-payment
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, subscriptionId } = req.body;
    
    // Validate required fields
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification details'
      });
    }
    
    // Find the subscription record
    const subscription = await Subscription.findOne({
      razorpaySubscriptionId: subscriptionId,
      userId: req.user._id
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Verify the payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
    
    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    
    // Create payment history record
    const paymentHistory = await PaymentHistory.create({
      userId: req.user._id,
      subscriptionId: subscription._id,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.method,
      description: `Payment for ${subscription.plan} subscription`,
      paymentDate: new Date()
    });
    
    // Update subscription status
    let subscriptionStatus;
    if (payment.status === 'captured') {
      subscriptionStatus = 'active';
    } else if (payment.status === 'authorized') {
      subscriptionStatus = 'pending';
    } else {
      subscriptionStatus = 'past_due';
    }
    
    // Calculate period dates
    const today = new Date();
    let periodEnd;
    
    if (subscription.billingCycle === 'monthly') {
      periodEnd = new Date(today);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (subscription.billingCycle === 'yearly') {
      periodEnd = new Date(today);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    // Update subscription
    await Subscription.findByIdAndUpdate(subscription._id, {
      status: subscriptionStatus,
      currentPeriodStart: today,
      currentPeriodEnd: periodEnd,
      lastPaymentDate: today,
      lastPaymentStatus: payment.status
    });
    
    // If payment was successful, update user subscription tier
    if (payment.status === 'captured') {
      await User.findByIdAndUpdate(req.user._id, {
        subscriptionTier: subscription.plan,
        subscriptionStatus: 'active',
        subscriptionEndDate: periodEnd
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: paymentHistory._id,
        status: payment.status,
        subscriptionStatus
      }
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// @desc    Handle Razorpay webhooks
// @route   POST /api/payments/webhook
// @access  Public (but verified by webhook signature)
exports.handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    if (!webhookSignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing webhook signature'
      });
    }
    
    // Verify the webhook signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (generatedSignature !== webhookSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }
    
    // Process the webhook event
    const event = req.body;
    
    switch (event.event) {
      case 'subscription.authenticated':
        // Handle successful subscription authentication
        await handleSubscriptionAuthenticated(event.payload.subscription.entity);
        break;
      
      case 'subscription.charged':
        // Handle successful subscription charge
        await handleSubscriptionCharged(event.payload.subscription.entity, event.payload.payment.entity);
        break;
      
      case 'subscription.cancelled':
        // Handle subscription cancellation
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;
      
      case 'subscription.halted':
        // Handle subscription halt (due to payment failures)
        await handleSubscriptionHalted(event.payload.subscription.entity);
        break;
      
      case 'payment.failed':
        // Handle payment failure
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      
      case 'payment.captured':
        // Handle successful payment capture
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
        
      case 'refund.created':
        // Handle refund creation
        await handleRefundCreated(event.payload.refund.entity, event.payload.payment.entity);
        break;
        
      case 'subscription.pending':
        // Handle subscription pending
        await handleSubscriptionPending(event.payload.subscription.entity);
        break;
        
      case 'invoice.paid':
        // Handle invoice paid
        await handleInvoicePaid(event.payload.invoice.entity);
        break;
    }
    
    // Acknowledge the webhook
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Error handling webhook:', error);
    // Still return 200 to acknowledge receipt of the webhook
    res.status(200).json({ received: true, error: error.message });
  }
};

// @desc    Get current user's subscription details
// @route   GET /api/payments/subscription
// @access  Private
exports.getUserSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: { $in: ['active', 'past_due', 'pending'] }
    }).sort({ createdAt: -1 });
    
    if (!subscription) {
      // If no active subscription, user is on free tier
      return res.status(200).json({
        success: true,
        data: {
          plan: 'free',
          status: 'active',
          billingCycle: 'none',
          isFree: true
        }
      });
    }
    
    // Get plan details if applicable
    let planDetails = null;
    if (subscription.priceId) {
      planDetails = await PricePlan.findById(subscription.priceId)
        .select('name description features');
    }
    
    res.status(200).json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        planDetails
      }
    });
    
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details',
      error: error.message
    });
  }
};

// @desc    Cancel subscription
// @route   POST /api/payments/cancel-subscription
// @access  Private
exports.cancelSubscription = async (req, res) => {
  try {
    const { cancelImmediately = false } = req.body;
    
    // Find the active subscription
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }
    
    // If it's a free subscription, just update status
    if (subscription.billingCycle === 'none' || !subscription.razorpaySubscriptionId) {
      await Subscription.findByIdAndUpdate(subscription._id, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
      
      // Update user to free tier
      await User.findByIdAndUpdate(req.user._id, {
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        subscriptionEndDate: null
      });
      
      return res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: {
          cancelledAt: new Date()
        }
      });
    }
    
    // For Razorpay subscriptions
    
    if (cancelImmediately) {
      // Cancel immediately
      await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);
      
      // Update subscription
      await Subscription.findByIdAndUpdate(subscription._id, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
      
      // Update user to free tier
      await User.findByIdAndUpdate(req.user._id, {
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        subscriptionEndDate: null
      });
      
      return res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: {
          cancelledAt: new Date()
        }
      });
    } else {
      // Cancel at period end
      await razorpay.subscriptions.update(subscription.razorpaySubscriptionId, {
        cancel_at_cycle_end: 1
      });
      
      // Update subscription
      await Subscription.findByIdAndUpdate(subscription._id, {
        cancelAtPeriodEnd: true
      });
      
      return res.status(200).json({
        success: true,
        message: 'Subscription will be cancelled at the end of the billing period',
        data: {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: subscription.currentPeriodEnd
        }
      });
    }
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

// @desc    Get payment history for current user
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const payments = await PaymentHistory.find({ userId: req.user._id })
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaymentHistory.countDocuments({ userId: req.user._id });
    
    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

// @desc    Generate invoice for a payment
// @route   GET /api/payments/invoice/:paymentId
// @access  Private
exports.generateInvoice = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Find payment record
    const payment = await PaymentHistory.findOne({
      _id: paymentId,
      userId: req.user._id
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }
    
    // Find subscription details
    const subscription = await Subscription.findById(payment.subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Find plan details
    const plan = await PricePlan.findById(subscription.priceId);
    
    // Get user details
    const user = await User.findById(req.user._id);
    
    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${payment._id.toString().substring(0, 8).toUpperCase()}`,
      invoiceDate: payment.paymentDate,
      customerName: user.name,
      customerEmail: user.email,
      customerAddress: user.address || 'Not provided',
      planName: plan ? plan.name : subscription.plan,
      billingCycle: subscription.billingCycle,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.status,
      paymentId: payment.razorpayPaymentId,
      transactionDate: payment.paymentDate,
      taxAmount: payment.amount * 0.18, // Assuming 18% GST
      totalAmount: payment.amount * 1.18,
      companyName: 'CreatorGenius',
      companyAddress: 'Your Company Address, City, State, PIN',
      companyGST: 'GSTIN12345678901', // Replace with actual GSTIN
      terms: 'This is a computer-generated invoice and does not require a signature.'
    };
    
    // In a real-world scenario, you would generate a PDF here
    // For this example, we just return the invoice data
    res.status(200).json({
      success: true,
      data: invoiceData
    });
    
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

// @desc    Update payment method
// @route   POST /api/payments/update-payment-method
// @access  Private
exports.updatePaymentMethod = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Payment method token is required'
      });
    }
    
    // Find active subscription
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }
    
    // Update payment method with Razorpay
    // Note: This is a simplified example. In reality, you would use Razorpay's APIs
    // to update the payment method associated with the customer or subscription.
    const updatedPaymentMethod = await razorpay.tokens.process(token);
    
    // Update subscription with new payment method
    await Subscription.findByIdAndUpdate(subscription._id, {
      paymentMethod: updatedPaymentMethod.method,
      // Add any other payment method details you want to save
    });
    
    res.status(200).json({
      success: true,
      message: 'Payment method updated successfully',
      data: {
        paymentMethod: updatedPaymentMethod.method
      }
    });
    
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment method',
      error: error.message
    });
  }
};

// @desc    Request refund for a payment
// @route   POST /api/payments/refund/:paymentId
// @access  Private
exports.requestRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Refund reason is required'
      });
    }
    
    // Find payment record
    const payment = await PaymentHistory.findOne({
      _id: paymentId,
      userId: req.user._id
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }
    
    // Check if payment is eligible for refund
    if (payment.status !== 'captured' || payment.refundAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment is not eligible for refund'
      });
    }
    
    // Check if within refund window (e.g., 7 days)
    const refundWindowDays = 7;
    const paymentDate = new Date(payment.paymentDate);
    const refundDeadline = new Date(paymentDate);
    refundDeadline.setDate(refundDeadline.getDate() + refundWindowDays);
    
    if (new Date() > refundDeadline) {
      return res.status(400).json({
        success: false,
        message: `Refund can only be requested within ${refundWindowDays} days of payment`
      });
    }
    
    // Request refund via Razorpay
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: payment.amount * 100, // Convert to paise
      notes: {
        reason: reason,
        requestedBy: req.user._id.toString()
      }
    });
    
    // Update payment record with refund information
    await PaymentHistory.findByIdAndUpdate(payment._id, {
      refundAmount: payment.amount,
      refundReason: reason,
      refundDate: new Date(),
      status: 'refunded'
    });
    
    // Find and update subscription
    const subscription = await Subscription.findById(payment.subscriptionId);
    if (subscription) {
      await Subscription.findByIdAndUpdate(subscription._id, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
      
      // Update user to free tier
      await User.findByIdAndUpdate(req.user._id, {
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        subscriptionEndDate: null
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Refund requested successfully',
      data: {
        refundId: refund.id,
        amount: payment.amount,
        reason
      }
    });
    
  } catch (error) {
    console.error('Error requesting refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund request',
      error: error.message
    });
  }
};

// ================ Helper functions for webhook events ================

// Handle subscription authenticated event
const handleSubscriptionAuthenticated = async (subscription) => {
  const userId = subscription.notes.userId;
  
  await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: subscription.id },
    {
      status: 'active',
      // Other fields if needed
    }
  );
};

// Handle subscription charged event
const handleSubscriptionCharged = async (subscription, payment) => {
  const userId = subscription.notes.userId;
  
  // Find our subscription record
  const subscriptionRecord = await Subscription.findOne({
    razorpaySubscriptionId: subscription.id
  });
  
  if (!subscriptionRecord) {
    console.error(`Subscription record not found for Razorpay ID: ${subscription.id}`);
    return;
  }
  
  // Calculate new period dates
  let periodStart, periodEnd;
  
  // If this is a new subscription
  if (!subscriptionRecord.currentPeriodEnd) {
    periodStart = new Date();
  } else {
    // For renewals, start from the previous end date
    periodStart = new Date(subscriptionRecord.currentPeriodEnd);
  }
  
  // Calculate end date based on billing cycle
  periodEnd = new Date(periodStart);
  if (subscriptionRecord.billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else if (subscriptionRecord.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }
  
  // Update subscription record
  await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
    status: 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    lastPaymentDate: new Date(),
    lastPaymentStatus: 'success'
  });
  
  // Create payment history record
  await PaymentHistory.create({
    userId: subscriptionRecord.userId,
    subscriptionId: subscriptionRecord._id,
    razorpayPaymentId: payment.id,
    razorpayOrderId: payment.order_id || null,
    amount: payment.amount / 100, // Convert from paise to rupees
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.method,
    paymentDate: new Date(payment.created_at * 1000) // Convert Unix timestamp to Date
  });
  
  // Update user's subscription info
  await User.findByIdAndUpdate(subscriptionRecord.userId, {
    subscriptionTier: subscriptionRecord.plan,
    subscriptionStatus: 'active',
    subscriptionEndDate: periodEnd
  });
};

// Handle subscription cancelled event
const handleSubscriptionCancelled = async (subscription) => {
    const subscriptionRecord = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });
    
    if (!subscriptionRecord) {
      console.error(`Subscription record not found for Razorpay ID: ${subscription.id}`);
      return;
    }
    
    // Update subscription record
    await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
      status: 'cancelled',
      cancelledAt: new Date()
    });
    
    // Update user to free tier
    await User.findByIdAndUpdate(subscriptionRecord.userId, {
      subscriptionTier: 'free',
      subscriptionStatus: 'active'
    });
  };
  
  // Handle subscription halted event
  const handleSubscriptionHalted = async (subscription) => {
    const subscriptionRecord = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });
    
    if (!subscriptionRecord) {
      console.error(`Subscription record not found for Razorpay ID: ${subscription.id}`);
      return;
    }
    
    // Update subscription record
    await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
      status: 'halted'
    });
    
    // Update user status
    await User.findByIdAndUpdate(subscriptionRecord.userId, {
      subscriptionStatus: 'past_due'
    });
  };
  
  // Handle payment failed event
  const handlePaymentFailed = async (payment) => {
    // Find associated subscription
    const subscriptionId = payment.subscription_id;
    
    if (!subscriptionId) {
      console.error('No subscription ID found in failed payment:', payment.id);
      return;
    }
    
    const subscriptionRecord = await Subscription.findOne({
      razorpaySubscriptionId: subscriptionId
    });
    
    if (!subscriptionRecord) {
      console.error(`Subscription record not found for Razorpay ID: ${subscriptionId}`);
      return;
    }
    
    // Update subscription status
    await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
      lastPaymentStatus: 'failed'
    });
    
    // Create payment history record
    await PaymentHistory.create({
      userId: subscriptionRecord.userId,
      subscriptionId: subscriptionRecord._id,
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id || null,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      status: 'failed',
      paymentMethod: payment.method,
      description: `Failed payment for ${subscriptionRecord.plan} subscription`,
      paymentDate: new Date(payment.created_at * 1000)
    });
    
    // If multiple consecutive failures, consider downgrading the user
    // This logic depends on your business requirements
    const failedPayments = await PaymentHistory.countDocuments({
      subscriptionId: subscriptionRecord._id,
      status: 'failed',
      paymentDate: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    });
    
    if (failedPayments >= 3) {
      // Downgrade user after 3 consecutive failures
      await User.findByIdAndUpdate(subscriptionRecord.userId, {
        subscriptionTier: 'free',
        subscriptionStatus: 'past_due'
      });
      
      // Optionally notify the user via email
    }
  };
  
  // Handle payment captured event
  const handlePaymentCaptured = async (payment) => {
    // Check if this is related to a subscription
    const subscriptionId = payment.subscription_id;
    
    if (!subscriptionId) {
      console.log('Payment not associated with a subscription:', payment.id);
      return;
    }
    
    const subscriptionRecord = await Subscription.findOne({
      razorpaySubscriptionId: subscriptionId
    });
    
    if (!subscriptionRecord) {
      console.error(`Subscription record not found for Razorpay ID: ${subscriptionId}`);
      return;
    }
    
    // Check if payment is already recorded
    const existingPayment = await PaymentHistory.findOne({
      razorpayPaymentId: payment.id
    });
    
    if (existingPayment) {
      console.log(`Payment ${payment.id} already processed, skipping`);
      return;
    }
    
    // Create payment history record
    await PaymentHistory.create({
      userId: subscriptionRecord.userId,
      subscriptionId: subscriptionRecord._id,
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id || null,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      status: 'captured',
      paymentMethod: payment.method,
      description: `Payment for ${subscriptionRecord.plan} subscription`,
      paymentDate: new Date(payment.created_at * 1000)
    });
    
    // Update subscription status if needed
    if (subscriptionRecord.status !== 'active') {
      await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
        status: 'active',
        lastPaymentStatus: 'success',
        lastPaymentDate: new Date()
      });
      
      // Update user subscription status
      await User.findByIdAndUpdate(subscriptionRecord.userId, {
        subscriptionTier: subscriptionRecord.plan,
        subscriptionStatus: 'active'
      });
    }
  };
  
  // Handle refund created event
  const handleRefundCreated = async (refund, payment) => {
    // Find the payment in our database
    const paymentRecord = await PaymentHistory.findOne({
      razorpayPaymentId: payment.id
    });
    
    if (!paymentRecord) {
      console.error(`Payment record not found for Razorpay payment ID: ${payment.id}`);
      return;
    }
    
    // Update payment record with refund information
    await PaymentHistory.findByIdAndUpdate(paymentRecord._id, {
      status: 'refunded',
      refundAmount: refund.amount / 100, // Convert from paise to rupees
      refundDate: new Date(refund.created_at * 1000)
    });
    
    // If this payment was for a subscription, update the subscription as well
    if (paymentRecord.subscriptionId) {
      const subscription = await Subscription.findById(paymentRecord.subscriptionId);
      
      if (subscription) {
        // Determine if this was the initial payment or a renewal
        const isInitialPayment = !subscription.currentPeriodStart || 
          (new Date(subscription.currentPeriodStart).getTime() === new Date(paymentRecord.paymentDate).getTime());
        
        if (isInitialPayment) {
          // If this was the initial payment, cancel the subscription
          await Subscription.findByIdAndUpdate(subscription._id, {
            status: 'cancelled',
            cancelledAt: new Date()
          });
          
          // Update user to free tier
          await User.findByIdAndUpdate(subscription.userId, {
            subscriptionTier: 'free',
            subscriptionStatus: 'active',
            subscriptionEndDate: null
          });
        } else {
          // If this was a renewal, keep the subscription but flag it
          await Subscription.findByIdAndUpdate(subscription._id, {
            lastPaymentStatus: 'refunded'
          });
        }
      }
    }
  };
  
  // Handle subscription pending event
  const handleSubscriptionPending = async (subscription) => {
    const subscriptionRecord = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });
    
    if (!subscriptionRecord) {
      console.error(`Subscription record not found for Razorpay ID: ${subscription.id}`);
      return;
    }
    
    // Update subscription status to pending
    await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
      status: 'pending'
    });
    
    // Optionally notify user about pending subscription
  };
  
  // Handle invoice paid event
  const handleInvoicePaid = async (invoice) => {
    // This event is fired when an invoice is paid
    // It's useful for tracking recurring payments
    
    const subscriptionId = invoice.subscription_id;
    
    if (!subscriptionId) {
      console.log('Invoice not associated with a subscription:', invoice.id);
      return;
    }
    
    const subscriptionRecord = await Subscription.findOne({
      razorpaySubscriptionId: subscriptionId
    });
    
    if (!subscriptionRecord) {
      console.error(`Subscription record not found for Razorpay ID: ${subscriptionId}`);
      return;
    }
    
    // Update subscription with invoice information
    await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
      lastPaymentDate: new Date(invoice.paid_at * 1000),
      lastPaymentStatus: 'success',
      // Store invoice URL if available
      'metadata.lastInvoiceUrl': invoice.short_url || null
    });
    
    // Ensure payment history record exists
    const existingPayment = await PaymentHistory.findOne({
      razorpayPaymentId: invoice.payment_id
    });
    
    if (!existingPayment && invoice.payment_id) {
      // Create payment history record if not already created by payment.captured event
      await PaymentHistory.create({
        userId: subscriptionRecord.userId,
        subscriptionId: subscriptionRecord._id,
        razorpayPaymentId: invoice.payment_id,
        razorpayOrderId: null,
        invoiceNumber: invoice.receipt || invoice.id,
        invoiceUrl: invoice.short_url || null,
        amount: invoice.amount / 100, // Convert from paise to rupees
        currency: invoice.currency,
        status: 'captured',
        paymentMethod: invoice.payment_id ? 'unknown' : 'credit', // Might not have payment method info in invoice
        description: `Invoice payment for ${subscriptionRecord.plan} subscription`,
        paymentDate: new Date(invoice.paid_at * 1000)
      });
    }
  };
  
  