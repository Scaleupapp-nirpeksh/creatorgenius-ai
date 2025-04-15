// backend/utils/usageUtil.js
const User = require('../models/User');
const limitConfig = require('../config/limitConfig');

/**
 * Utility functions for managing user usage limits
 */

// Check if date is before today (for daily reset)
const isBeforeToday = (date) => {
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  return new Date(date) < today;
};

// Check if date was before current month (for monthly reset)
const isBeforeCurrentMonth = (date) => {
  if (!date) return true;
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return new Date(date) < firstDayOfMonth;
};

// Check if subscription renewal date has passed (for subscription-based reset)
const isAfterRenewalDate = (lastReset, renewalDay) => {
  if (!lastReset) return true;
  
  const today = new Date();
  const lastResetDate = new Date(lastReset);
  
  // If it's been over a month since last reset
  if (today.getMonth() !== lastResetDate.getMonth() || 
      today.getFullYear() !== lastResetDate.getFullYear()) {
    
    // If today is >= the renewal day, or we're in a different month
    if (today.getDate() >= renewalDay || 
        today.getMonth() !== lastResetDate.getMonth()) {
      return true;
    }
  }
  
  return false;
};

/**
 * Map feature keys to actual database field names
 * This is critical because the field names in the database don't follow a consistent pattern
 */
const getFieldNameForFeature = (limitType, featureKey) => {
  // Define mappings between config keys and actual database field names
  const fieldMappings = {
    daily: {
      'searchQueries': 'dailySearchCount',
      'seoAnalyses': 'dailySeoAnalyses',
      'trendIdeations': 'dailyTrendIdeations',
      'insightsSaved': 'dailyInsightsSaved'
    },
    monthly: {
      'contentIdeations': 'ideationsThisMonth',
      'refinements': 'refinementsThisMonth',
      'scriptGeneration': 'scriptsGeneratedThisMonth',
      'scriptTransformations': 'scriptTransformationsThisMonth',
      'seoReports': 'seoReportsThisMonth',
      'insights': 'insightsSavedThisMonth'
    }
  };

  // Return the mapped field name or a default if not found
  return fieldMappings[limitType]?.[featureKey] || `${featureKey}ThisMonth`;
};

/**
 * Check if user has reached a usage limit for a specific feature
 * @param {Object} user - User document with usage data
 * @param {String} limitType - 'daily' or 'monthly'
 * @param {String} featureKey - The specific feature to check
 * @returns {Object} - { hasReachedLimit, currentUsage, limit }
 */
const checkUsageLimit = (user, limitType, featureKey) => {
  if (!user || !user.usage) {
    return { hasReachedLimit: false, currentUsage: 0, limit: 0, error: 'User data not available' };
  }
  
  const tier = user.subscriptionTier || 'free';
  const tierLimits = limitConfig[tier][limitType] || {};
  const limit = tierLimits[featureKey];
  
  // If limit is -1 or undefined, consider it unlimited
  if (!limit || limit < 0) {
    return { hasReachedLimit: false, currentUsage: 0, limit: 'unlimited' };
  }
  
  // Get the correct database field name for this feature
  const dbFieldName = getFieldNameForFeature(limitType, featureKey);
  
  // Get the current usage value from the user object
  const currentUsage = user.usage[dbFieldName] || 0;
  
  return {
    hasReachedLimit: currentUsage >= limit,
    currentUsage,
    limit,
    remaining: Math.max(0, limit - currentUsage),
    field: dbFieldName // Include the field name for debugging
  };
};

/**
 * Update user's usage counter for a feature
 * @param {String} userId - User ID
 * @param {String} limitType - 'daily' or 'monthly'
 * @param {String} featureKey - The specific feature to increment
 * @returns {Promise} - Result of the database operation
 */
const incrementUsageCounter = async (userId, limitType, featureKey) => {
  try {
    // Get the correct database field name for this feature
    const dbFieldName = getFieldNameForFeature(limitType, featureKey);
    
    // Create update object with $inc operator
    const updateObj = { $inc: {} };
    updateObj.$inc[`usage.${dbFieldName}`] = 1;
    
    console.log(`Incrementing counter: ${dbFieldName} for user ${userId}`);
    
    // Update user document
    return await User.findByIdAndUpdate(
      userId,
      updateObj,
      { new: true, select: 'usage' }
    );
  } catch (error) {
    console.error(`Error incrementing usage counter for ${userId}:`, error);
    throw error;
  }
};

/**
 * Check and reset daily and monthly counters if needed
 * @param {String} userId - User ID
 * @returns {Promise} - Updated user with fresh usage counters
 */
const checkAndResetCounters = async (userId) => {
  try {
    // Get user with usage data
    const user = await User.findById(userId).select('+usage +subscriptionEndDate');
    if (!user) {
      throw new Error('User not found');
    }
    
    let needsDailyReset = false;
    let needsMonthlyReset = false;
    let updates = {};
    
    // Get reset timestamps or use defaults
    const { lastSearchReset, lastUsageReset } = user.usage || {};
    
    // Check if daily reset is needed
    if (isBeforeToday(lastSearchReset)) {
      needsDailyReset = true;
      updates['usage.lastSearchReset'] = new Date();
      // Reset all daily counters
      updates['usage.dailySearchCount'] = 0;
      updates['usage.dailySeoAnalyses'] = 0;
      updates['usage.dailyTrendIdeations'] = 0;
      updates['usage.dailyInsightsSaved'] = 0;
    }
    
    // For monthly reset, either use subscription renewal date or first of month
    const renewalDay = 1; // Default to first of month
    
    // Check if monthly reset is needed
    if (isAfterRenewalDate(lastUsageReset, renewalDay)) {
      needsMonthlyReset = true;
      updates['usage.lastUsageReset'] = new Date();
      // Reset all monthly counters
      updates['usage.ideationsThisMonth'] = 0;
      updates['usage.refinementsThisMonth'] = 0;
      updates['usage.scriptsGeneratedThisMonth'] = 0;
      updates['usage.scriptTransformationsThisMonth'] = 0;
      updates['usage.seoReportsThisMonth'] = 0;
      updates['usage.insightsSavedThisMonth'] = 0;
    }
    
    // If any resets needed, update the user document
    if (needsDailyReset || needsMonthlyReset) {
      console.log('Resetting usage counters for user:', userId);
      console.log('Updates:', updates);
      
      await User.findByIdAndUpdate(userId, updates);
      
      // Re-fetch user to get updated usage data
      return await User.findById(userId).select('+usage');
    }
    
    return user;
  } catch (error) {
    console.error(`Error resetting counters for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Check and enforce usage limits for a feature
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {String} limitType - 'daily' or 'monthly'
 * @param {String} featureKey - Feature to check
 * @returns {Boolean|Object} - False if limit reached (response already sent), or updated user object
 */
const enforceUsageLimit = async (req, res, limitType, featureKey) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userId = req.user._id;
    
    // Reset counters if needed and get fresh user data
    const user = await checkAndResetCounters(userId);
    
   
    
    // Check if user has reached the limit
    const limitCheck = checkUsageLimit(user, limitType, featureKey);
    console.log('Limit check result:', limitCheck);
    
    if (limitCheck.hasReachedLimit) {
      // User has reached the limit
      const resetInfo = limitType === 'daily' ? 'tomorrow' : 'next month';
      
      return res.status(429).json({
        success: false,
        message: `You've reached your ${limitType} limit for this feature (${limitCheck.currentUsage}/${limitCheck.limit}).`,
        limit: limitCheck.limit,
        current: limitCheck.currentUsage,
        resetTime: resetInfo,
        upgradeTier: true // Flag for frontend to show upgrade prompt
      });
    }
    
    // Increment the counter for this usage
    await incrementUsageCounter(userId, limitType, featureKey);
    
    return user;
  } catch (error) {
    console.error('Error enforcing usage limit:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking usage limits',
      error: error.message
    });
  }
};

module.exports = {
  checkUsageLimit,
  getFieldNameForFeature,
  incrementUsageCounter,
  checkAndResetCounters,
  enforceUsageLimit,
  isBeforeToday // Export for testing
};