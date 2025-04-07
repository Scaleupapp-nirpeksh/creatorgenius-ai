// backend/routes/auth.js
const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController'); // Import controller function

const router = express.Router();


router.post('/register', registerUser);
router.post('/login', loginUser);

// --- We will add login route here later ---

module.exports = router;