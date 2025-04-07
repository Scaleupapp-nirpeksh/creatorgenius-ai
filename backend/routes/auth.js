// backend/routes/auth.js
const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController'); // Import controller function
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();


router.post('/register', registerUser);
router.post('/login', loginUser);

// --- ADD PROTECTED ROUTE BELOW ---
// @desc    Get current logged-in user details
// @route   GET /api/auth/me
// @access  Private (requires token)
router.get('/me', protect, (req, res) => {
    // If the 'protect' middleware succeeds, req.user will contain the user document
    res.status(200).json({
      success: true,
      data: req.user
    });
  });

module.exports = router;