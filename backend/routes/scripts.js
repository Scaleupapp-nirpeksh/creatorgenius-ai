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

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Basic CRUD operations
router.post('/generate/:ideaId', generateScript);
router.post('/', saveScript);
router.get('/', getUserScripts);
router.get('/:id', getScriptById);
router.put('/:id', updateScript);  // New route for updating scripts
router.delete('/:id', deleteScript); // New route for deleting scripts

// Transformation routes
router.post('/:id/transform', transformScript);
router.post('/transformed', saveTransformedScript); // New route for saving transformed scripts
router.get('/:id/transformed', getTransformedScripts); // New route for getting transformed scripts

module.exports = router;