// backend/config/limitConfig.js
/**
 * Central configuration file for all subscription tier usage limits
 */

module.exports = {
    // Free tier limits
    free: {
      // Daily limits (reset every day at midnight)
      daily: {
        searchQueries: 5,
        seoAnalyses: 3,
        trendIdeations: 5,
        insightsSaved: 10,
        scriptGeneration: 3,
      },
      
      // Monthly limits (reset on the subscription renewal date)
      monthly: {
        contentIdeations: 5,
        refinements: 3,
        scriptGeneration: 15, 
        scriptTransformations: 0, // Not available in free tier
       
      },
      
      // Permanent limits (don't reset)
      permanent: {
        calendarItems: 100, // Maximum scheduled items
        savedIdeas: 200, // Maximum saved ideas
        insightsTotal: 200, // Maximum stored insights
      }
    },
    
    // Creator Pro tier limits
    creator_pro: {
      // Daily limits (essentially unlimited but we set high values for monitoring)
      daily: {
        searchQueries: 10,
        seoAnalyses: 5,
        trendIdeations: 5,
        insightsSaved: 10,
      },
      
      // Monthly limits
      monthly: {
        contentIdeations: -1, // Unlimited (-1)
        refinements: -1, // Unlimited (-1)
        scriptGeneration: -1, // 15 scripts per month
        scriptTransformations: -1, // 10 transformations per month
        insightsTotal: -1, // Unlimited insights storage
      },
      
      // Permanent limits
      permanent: {
        calendarItems: -1, // Unlimited scheduled items
        savedIdeas: -1, // Unlimited saved ideas
      }
    },
    
    // Agency Growth tier limits
    agency_growth: {
      // All unlimited (using high values for monitoring)
      daily: {
        searchQueries: 1000,
        seoAnalyses: 500,
        trendIdeations: 500,
        insightsSaved: 1000,
      },
      
      monthly: {
        contentIdeations: -1, // Unlimited
        refinements: -1, // Unlimited
        scriptGeneration: -1, // Unlimited
        scriptTransformations: -1, // Unlimited
        insightsTotal: -1, // Unlimited
      },
      
      permanent: {
        calendarItems: -1, // Unlimited
        savedIdeas: -1, // Unlimited
        teamMembers: 5 // Maximum team members (could be implemented later)
      }
    }
  };