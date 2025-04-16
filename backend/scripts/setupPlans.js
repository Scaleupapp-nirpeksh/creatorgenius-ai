// backend/scripts/setupPlans.js
require('dotenv').config();
const mongoose = require('mongoose');
const PricePlan = require('../models/PricePlan');
const connectDB = require('../config/db');

// Connect to the database
connectDB();

// Define initial plans
const initialPlans = [
  {
    name: 'Free Plan',
    tier: 'free',
    description: 'Basic access to CreatorGenius with limited features',
    billingCycle: 'free',
    price: {
      amount: 0,
      currency: 'INR'
    },
    features: {
      contentIdeationsPerMonth: 5,
      refinementsPerMonth: 3,
      scriptGenerationPerMonth: 15,
      scriptTransformationsPerMonth: 0,
      searchQueriesPerDay: 5,
      seoAnalysesPerDay: 3,
      calendarItems: 100,
      savedIdeas: 200
    },
    sortOrder: 1
  },
  {
    name: 'Creator Pro Monthly',
    tier: 'creator_pro',
    description: 'Professional tools for serious content creators',
    billingCycle: 'monthly',
    price: {
      amount: 1999,
      currency: 'INR'
    },
    features: {
      contentIdeationsPerMonth: -1, // Unlimited
      refinementsPerMonth: -1, // Unlimited
      scriptGenerationPerMonth: -1, // Unlimited
      scriptTransformationsPerMonth: -1, // Unlimited
      searchQueriesPerDay: 10,
      seoAnalysesPerDay: 5,
      calendarItems: -1, // Unlimited
      savedIdeas: -1 // Unlimited
    },
    sortOrder: 2
  },
  {
    name: 'Creator Pro Yearly',
    tier: 'creator_pro',
    description: 'Professional tools for serious content creators (annual billing)',
    billingCycle: 'yearly',
    price: {
      amount: 19990,
      currency: 'INR'
    },
    discountedPrice: {
      amount: 17990,
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
    },
    features: {
      contentIdeationsPerMonth: -1, // Unlimited
      refinementsPerMonth: -1, // Unlimited
      scriptGenerationPerMonth: -1, // Unlimited
      scriptTransformationsPerMonth: -1, // Unlimited
      searchQueriesPerDay: 10,
      seoAnalysesPerDay: 5,
      calendarItems: -1, // Unlimited
      savedIdeas: -1 // Unlimited
    },
    sortOrder: 3
  },
  {
    name: 'Agency Growth Monthly',
    tier: 'agency_growth',
    description: 'Complete solution for agencies and teams',
    billingCycle: 'monthly',
    price: {
      amount: 4999,
      currency: 'INR'
    },
    features: {
      contentIdeationsPerMonth: -1, // Unlimited
      refinementsPerMonth: -1, // Unlimited
      scriptGenerationPerMonth: -1, // Unlimited
      scriptTransformationsPerMonth: -1, // Unlimited
      searchQueriesPerDay: 1000, // Essentially unlimited
      seoAnalysesPerDay: 500, // Essentially unlimited
      calendarItems: -1, // Unlimited
      savedIdeas: -1, // Unlimited
      teamMembers: 5
    },
    sortOrder: 4
  },
  {
    name: 'Agency Growth Yearly',
    tier: 'agency_growth',
    description: 'Complete solution for agencies and teams (annual billing)',
    billingCycle: 'yearly',
    price: {
      amount: 49990,
      currency: 'INR'
    },
    discountedPrice: {
      amount: 44990,
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
    },
    features: {
      contentIdeationsPerMonth: -1, // Unlimited
      refinementsPerMonth: -1, // Unlimited
      scriptGenerationPerMonth: -1, // Unlimited
      scriptTransformationsPerMonth: -1, // Unlimited
      searchQueriesPerDay: 1000, // Essentially unlimited
      seoAnalysesPerDay: 500, // Essentially unlimited
      calendarItems: -1, // Unlimited
      savedIdeas: -1, // Unlimited
      teamMembers: 5
    },
    sortOrder: 5
  }
];

// Function to set up plans
const setupPlans = async () => {
  try {
    // Clear existing plans
    await PricePlan.deleteMany({});
    
    // Insert new plans
    await PricePlan.insertMany(initialPlans);
    
    console.log('Subscription plans have been set up successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up subscription plans:', error);
    process.exit(1);
  }
};

// Run the setup
setupPlans();