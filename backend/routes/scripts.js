// backend/routes/scripts.js
const express = require('express');
const { 
    generateScript, 
    saveScript, 
    getUserScripts, 
    getScriptById,
    transformScript,
    saveTransformedScript,
    updateScript,
    deleteScript,
    getTransformedScripts
} = require('../controllers/scriptController');
const { protect } = require('../middleware/authMiddleware');
const { dailyLimit, monthlyLimit, resetCounters } = require('../middleware/usageLimitMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Apply resetCounters to ensure usage stats are current
router.use(resetCounters);

// Basic CRUD operations

router.post(
    '/generate/:ideaId', 
    // Combine daily + monthly
    dailyLimit('scriptGeneration'),
    monthlyLimit('scriptGeneration'),
    generateScript
  );
  
router.post('/', saveScript);
router.get('/', getUserScripts);
router.get('/:id', getScriptById);
router.put('/:id', updateScript);
router.delete('/:id', deleteScript);

// Transformation routes - limit transformations for free tier
router.post('/:id/transform', monthlyLimit('scriptTransformations'), transformScript);
router.post('/transformed', saveTransformedScript);
router.get('/:id/transformed', getTransformedScripts);

module.exports = router;