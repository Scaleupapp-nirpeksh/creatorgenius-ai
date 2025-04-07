// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

// Middleware function to protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers (Authorization: Bearer TOKEN)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header (split 'Bearer TOKEN' and take the token part)
      token = req.headers.authorization.split(' ')[1];

      // Verify token using the JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token's payload (we signed it with user._id)
      // Exclude the password when fetching user data
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
          // Optional: Handle case where user might have been deleted after token issuance
           return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      // User is valid and attached to req.user, proceed to the next middleware/route handler
      next();

    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  // If no token is found in the header
  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Optional: Middleware for role-based access (Example for 'admin')
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) { // Should have been set by 'protect' middleware first
            return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ // 403 Forbidden status
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};