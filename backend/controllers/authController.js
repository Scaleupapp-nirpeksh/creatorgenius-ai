// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Needed for comparison if needed, hashing is in model
const jwt = require('jsonwebtoken');

// Utility function to generate JWT token
const generateToken = (id) => {
    console.log('JWT Secret Value:', process.env.JWT_SECRET); 
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d', // Use expiry from .env or default
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // 1. Validate input (basic check - mongoose schema validation does more)
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
      // Consider using express-validator for more robust validation later
    }

    // 2. Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() }); // Use lowercase for case-insensitive check

    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // 3. Create new user (Password hashing is handled by the pre-save hook in User model)
    user = await User.create({
      name,
      email: email.toLowerCase(), // Store email in lowercase
      password, // Provide plain password, mongoose hook will hash it
    });

    // 4. Generate JWT token
    const token = generateToken(user._id);

    // 5. Send success response with token
    // We typically don't send the full user object back on register
    res.status(201).json({ // 201 Created status
      success: true,
      message: 'User registered successfully',
      token: token,
      // Optionally send back some user info (excluding sensitive fields)
      // user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    console.error('Registration Error:', error); // Log the error for debugging
    // Handle potential Mongoose validation errors
     if (error.name === 'ValidationError') {
         const messages = Object.values(error.errors).map(val => val.message);
         return res.status(400).json({ success: false, message: messages.join('. ') });
     }
    res.status(500).json({ success: false, message: 'Server Error during registration' });
  }
};

// --- ADD LOGIN FUNCTION BELOW ---

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body;
  
    try {
      // 1. Validate input
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
      }
  
      // 2. Check for user by email - IMPORTANT: Select the password field explicitly
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  
      // 3. If user not found or password doesn't match
      // Use a generic error message for security (don't reveal if email exists)
      if (!user || !(await user.comparePassword(password))) {
         return res.status(401).json({ success: false, message: 'Invalid credentials' }); // 401 Unauthorized
      }
  
      // --- User is found and password is correct ---
  
      // 4. (Optional) Update last login timestamp
      user.lastLoginAt = Date.now();
      await user.save({ validateBeforeSave: false }); // Save without running all validators again
  
      // 5. Generate JWT token
      const token = generateToken(user._id);
  
      // 6. Send success response with token
      res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        // Optionally send back some user info (excluding sensitive fields)
        // user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
  
    } catch (error) {
      console.error('Login Error:', error); // Log the error
      res.status(500).json({ success: false, message: 'Server Error during login' });
    }
  };