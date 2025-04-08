// backend/routes/users.js
const express = require('express');

// Import Controller Functions
const {
    getUserProfile,
    updateUserProfile,
    updatePassword,
    deleteMyAccount,
    getAllUsers,      // Admin
    getUserById,      // Admin
    updateUser,       // Admin
    deleteUser        // Admin
} = require('../controllers/userController');

// Import Middleware
const { protect, authorize } = require('../middleware/authMiddleware');

// Initialize Router
const router = express.Router();

// ===============================================
// --- Routes for the Logged-In User ('/me') ---
// ===============================================
// Apply 'protect' middleware to all routes below that need authentication

// Get, Update, Delete own profile
router.route('/me')
    .get(protect, getUserProfile)      // GET /api/users/me
    .put(protect, updateUserProfile)   // PUT /api/users/me (Update non-sensitive details)
    .delete(protect, deleteMyAccount); // DELETE /api/users/me (Delete own account)

// Update own password (separate route for clarity and security)
router.put('/updatepassword', protect, updatePassword); // PUT /api/users/updatepassword


// ===============================================
// --- ADMIN ONLY Routes ---
// ===============================================
// Apply 'protect' first, then 'authorize' for admin roles

// Get all users
router.route('/')
    .get(protect, authorize('admin'), getAllUsers); // GET /api/users

// Operations on a specific user by ID (Admin only)
router.route('/:id')
    .get(protect, authorize('admin'), getUserById)       // GET /api/users/:id
    .put(protect, authorize('admin'), updateUser)        // PUT /api/users/:id
    .delete(protect, authorize('admin'), deleteUser);     // DELETE /api/users/:id

// Export the router
module.exports = router;