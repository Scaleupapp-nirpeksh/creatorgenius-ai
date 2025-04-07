// backend/routes/auth.js
const express = require('express');
const { registerUser } = require('../controllers/authController'); // Import controller function

const router = express.Router();

// Define the registration route: POST request to /api/auth/register
router.post('/register', registerUser);

// --- We will add login route here later ---

module.exports = router;