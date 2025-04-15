// backend/middleware/usageLimitMiddleware.js
const usageUtil = require('../utils/usageUtil');
const limitConfig = require('../config/limitConfig');

/**
 * Middleware factory for enforcing various usage limits
 */

// Middleware for daily limits
const dailyLimit = (featureKey) => {
  return async (req, res, next) => {
    try {
      console.log(`Checking daily limit for feature: ${featureKey}`);
      const result = await usageUtil.enforceUsageLimit(req, res, 'daily', featureKey);
      
      // If response was already sent (limit reached), don't proceed
      if (res.headersSent) {
        return;
      }
      
      // Attach updated user to request for later use if needed
      if (result && typeof result === 'object') {
        req.user = result;
      }
      
      next();
    } catch (error) {
      console.error(`Error in dailyLimit middleware for ${featureKey}:`, error);
      // Don't block the request if limit checking fails
      next();
    }
  };
};

// Middleware for monthly limits
const monthlyLimit = (featureKey) => {
  return async (req, res, next) => {
    try {
      console.log(`Checking monthly limit for feature: ${featureKey}`);
      const result = await usageUtil.enforceUsageLimit(req, res, 'monthly', featureKey);
      
      // If response was already sent (limit reached), don't proceed
      if (res.headersSent) {
        return;
      }
      
      // Attach updated user to request for later use if needed
      if (result && typeof result === 'object') {
        req.user = result;
      }
      
      next();
    } catch (error) {
      console.error(`Error in monthlyLimit middleware for ${featureKey}:`, error);
      // Don't block the request if limit checking fails
      next();
    }
  };
};

// Middleware for permanent storage limits (like max saved ideas)
const storageLimit = (collectionModel, countField, limitField) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      
      // First refresh user data and counters
      const user = await usageUtil.checkAndResetCounters(req.user._id);
      
      // Skip limit checks for paid tiers
      if (user.subscriptionTier !== 'free') {
        return next();
      }
      
      // Get the current count for this collection
      const count = await collectionModel.countDocuments({ userId: req.user._id });
      console.log(`Current ${countField} count:`, count);
      
      // Get the limit from config - using imported variable directly
      const tier = user.subscriptionTier || 'free';
      const limit = limitConfig[tier].permanent[limitField];
      
      // No limit (-1) or not reached
      if (limit < 0 || count < limit) {
        return next();
      }
      
      // Limit reached
      return res.status(429).json({
        success: false,
        message: `You've reached your maximum limit for ${countField} (${count}/${limit}).`,
        limit: limit,
        current: count,
        upgradeTier: true // Flag for frontend to show upgrade prompt
      });
      
    } catch (error) {
      console.error(`Error in storage limit middleware:`, error);
      // Don't block the request if limit checking fails
      next();
    }
  };
};

// Reset counter middleware - can be used at the start of routes to ensure counters are reset
const resetCounters = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(); // Skip for non-authenticated routes
    }
    
    console.log('Checking and resetting counters for user:', req.user._id);
    await usageUtil.checkAndResetCounters(req.user._id);
    next();
  } catch (error) {
    console.error('Error resetting counters:', error);
    next(); // Continue even if reset fails
  }
};

module.exports = {
  dailyLimit,
  monthlyLimit,
  storageLimit,
  resetCounters
};