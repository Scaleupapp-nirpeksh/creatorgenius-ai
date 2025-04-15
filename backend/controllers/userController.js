// backend/controllers/userController.js
const User = require('../models/User');
const SavedIdea = require('../models/SavedIdea'); // Needed for cascade delete
const Refinement = require('../models/Refinement'); // Needed for cascade delete
const ScheduledIdea = require('../models/ScheduledIdea'); // Needed for cascade delete
const mongoose = require('mongoose');
const limitConfig = require('../config/limitConfig');
const { getFieldNameForFeature } = require('../utils/usageUtil'); // So we can see the DB fields

// --- Helper Function for Input Validation/Filtering ---
// (Could be expanded or moved to a utility file)
const filterObject = (obj, allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((key) => {
        if (allowedFields.includes(key) && obj[key] !== undefined && obj[key] !== null) {
            // Add further specific validation/sanitization per key if needed
            newObj[key] = obj[key];
        }
    });
    return newObj;
};


// @desc    Get current logged-in user profile
// @route   GET /api/users/me
// @access  Private (requires 'protect' middleware)
exports.getUserProfile = async (req, res, next) => {
    // req.user is attached by the 'protect' middleware
    if (req.user) {
        res.status(200).json({ success: true, data: req.user });
    } else {
         // This case should technically not be reached if 'protect' works
        res.status(404).json({ success: false, message: 'User not found after authentication.' });
    }
};


// @desc    Update logged-in user profile details (non-sensitive)
// @route   PUT /api/users/me
// @access  Private (requires 'protect' middleware)
exports.updateUserProfile = async (req, res, next) => {
    // Define fields a user is allowed to update for themselves via this route
    const allowedUpdates = ['name', 'profilePictureUrl', 'interests', 'preferences'];
    const updateData = filterObject(req.body, allowedUpdates);

    // Prevent empty updates
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid updatable fields provided.' });
    }

    try {
        // Find the user by ID (from token) and update
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, // User ID from protect middleware
            updateData,
            { new: true, runValidators: true } // Return updated doc, run schema validators
        ).select('-password'); // Exclude password from the returned object

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found during update.' });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            data: updatedUser
        });

    } catch (error) {
        console.error("Error updating user profile:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }
        res.status(500).json({ success: false, message: 'Server error while updating profile.' });
    }
};


// @desc    Update logged-in user password
// @route   PUT /api/users/updatepassword
// @access  Private (requires 'protect' middleware)
exports.updatePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Please provide both current and new passwords.' });
    }
     if (newPassword.length < 8) {
         return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
     }
     if (currentPassword === newPassword) {
         return res.status(400).json({ success: false, message: 'New password cannot be the same as the current password.' });
     }

    try {
        // Get user WITH password field explicitly selected
        const user = await User.findById(req.user.id).select('+password');

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        // Check if current password matches the stored hash
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        // Assign new password (pre-save hook in User model will hash it)
        user.password = newPassword;
        await user.save(); // This triggers the pre-save hook

        // Send success response (no need to send user data or token)
        res.status(200).json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ success: false, message: 'Server error while updating password.' });
    }
};


// @desc    Delete logged-in user account (self-delete)
// @route   DELETE /api/users/me
// @access  Private (requires 'protect' middleware)
exports.deleteMyAccount = async (req, res, next) => {
    const userId = req.user.id;

    // --- Optional: Require password confirmation ---
    // const { currentPassword } = req.body;
    // if (!currentPassword) return res.status(400).json({ success: false, message: 'Password confirmation required to delete account.' });
    // try {
    //     const userForCheck = await User.findById(userId).select('+password');
    //     if (!userForCheck || !(await userForCheck.comparePassword(currentPassword))) {
    //         return res.status(401).json({ success: false, message: 'Incorrect password.' });
    //     }
    // } catch (pwCheckError) { return res.status(500).json({ success: false, message: 'Error verifying password.'});}
    // --- End Optional Password Check ---

    // Use a transaction for atomicity if your DB supports it (e.g., replica sets)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // --- Cascade Delete within transaction ---
        console.log(`Attempting cascade delete for user: ${userId}`);
        await SavedIdea.deleteMany({ userId: userId }).session(session);
        await Refinement.deleteMany({ userId: userId }).session(session);
        await ScheduledIdea.deleteMany({ userId: userId }).session(session);
        // Add deletion for other user-related data here
        console.log(`Cascade delete staged for user: ${userId}`);
        // --- End Cascade Delete ---

        await user.deleteOne({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'Account and associated data deleted successfully.' });

    } catch (error) {
        // If an error occurred, abort the whole transaction
        await session.abortTransaction();
        session.endSession();
        console.error(`Error deleting user account ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Server error while deleting account.' });
    }
};


// ===============================================
// --- ADMIN ONLY Functions ---
// ===============================================
// Note: Routes using these MUST have `authorize('admin')` middleware applied

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
    // Basic pagination example (enhance as needed)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    try {
        const totalUsers = await User.countDocuments();
        const users = await User.find({})
            .select('-password') // Exclude passwords
            .sort({ createdAt: -1 }) // Sort by creation date
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: users.length,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers: totalUsers
            },
            data: users
        });
    } catch (error) {
        console.error("Admin: Error getting all users:", error);
        res.status(500).json({ success: false, message: 'Server error fetching users.' });
    }
};

// @desc    Get single user by ID (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
    try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
             return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
        }
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: `User not found with ID ${userId}` });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Admin: Error getting user by ID:", error);
        res.status(500).json({ success: false, message: 'Server error fetching user.' });
    }
};

// @desc    Update user by ID (Admin action)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
    // Define fields admin is allowed to update
    const adminAllowedUpdates = [
        'name', 'email', 'role', 'isVerified',
        'subscriptionTier', 'subscriptionStatus', 'subscriptionEndDate',
        'interests', 'preferences'
        // Exclude password, usage stats that should be system-managed
    ];
    const updateData = filterObject(req.body, adminAllowedUpdates);

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
    }

    try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
             return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
        }

        // Don't allow password update via this route
        delete updateData.password;

        const updatedUser = await User.findByIdAndUpdate(userId, updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: `User not found with ID ${userId}` });
        }
        res.status(200).json({ success: true, message: "User updated successfully by admin.", data: updatedUser });
    } catch (error) {
        console.error("Admin: Error updating user:", error);
         if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ success: false, message: messages.join('. ') });
         }
         // Handle potential duplicate email errors if email is changed
         if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
             return res.status(400).json({ success: false, message: 'Email already in use by another account.' });
         }
        res.status(500).json({ success: false, message: 'Server error while updating user.' });
    }
};

// @desc    Delete user by ID (Admin action)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
     const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
         return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    // Prevent admin from deleting themselves via this route (optional safety check)
    if (req.user.id === userId) {
        return res.status(400).json({ success: false, message: 'Admin cannot delete own account via this route. Use self-delete.'});
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: `User not found with ID ${userId}` });
        }

        // Perform cascade delete similar to self-delete, within transaction
        console.log(`Attempting ADMIN cascade delete for user: ${userId}`);
        await SavedIdea.deleteMany({ userId: userId }).session(session);
        await Refinement.deleteMany({ userId: userId }).session(session);
        await ScheduledIdea.deleteMany({ userId: userId }).session(session);
        // Add other cascade deletes here
        console.log(`ADMIN Cascade delete staged for user: ${userId}`);

        await user.deleteOne({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: `User ${userId} and associated data deleted successfully by admin.` });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Admin: Error deleting user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Server error while deleting user.' });
    }
};


exports.getUserUsage = async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('subscriptionTier usage');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
      const tier = user.subscriptionTier || 'free';
      const dailyUsage = {};
      const dailyLimits = limitConfig[tier].daily || {};
  
      for (let featureKey of Object.keys(dailyLimits)) {
        const dbField = getFieldNameForFeature('daily', featureKey);
        const currentVal = user.usage[dbField] || 0;
        const limitVal = dailyLimits[featureKey];
        if (limitVal < 0) {
          dailyUsage[featureKey] = { current: currentVal, limit: 'unlimited', remaining: 'unlimited' };
        } else {
          dailyUsage[featureKey] = {
            current: currentVal,
            limit: limitVal,
            remaining: Math.max(0, limitVal - currentVal)
          };
        }
      }
  
      const monthlyUsage = {};
      const monthlyLimits = limitConfig[tier].monthly || {};
  
      for (let featureKey of Object.keys(monthlyLimits)) {
        const dbField = getFieldNameForFeature('monthly', featureKey);
        const currentVal = user.usage[dbField] || 0;
        const limitVal = monthlyLimits[featureKey];
        if (limitVal < 0) {
          monthlyUsage[featureKey] = { current: currentVal, limit: 'unlimited', remaining: 'unlimited' };
        } else {
          monthlyUsage[featureKey] = {
            current: currentVal,
            limit: limitVal,
            remaining: Math.max(0, limitVal - currentVal)
          };
        }
      }
  
      // For permanent usage, you can do DB counts or just show the limit
      const permanentUsage = {};
      const permLimits = limitConfig[tier].permanent || {};
      for (let featureKey of Object.keys(permLimits)) {
        const limitVal = permLimits[featureKey];
        if (limitVal < 0) {
          permanentUsage[featureKey] = { limit: 'unlimited' };
        } else {
          permanentUsage[featureKey] = { limit: limitVal };
        }
      }
  
      return res.status(200).json({
        success: true,
        data: { daily: dailyUsage, monthly: monthlyUsage, permanent: permanentUsage }
      });
  
    } catch (err) {
      console.error('Error in getUserUsage:', err);
      return res.status(500).json({ success: false, message: 'Server error retrieving usage' });
    }
  };