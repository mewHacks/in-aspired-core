// Admin controller — handles user management, activity logs, suspension, and stats for admin dashboard
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User, { IUserDocument } from '../models/User';
import UserActivity from '../models/UserActivity';
import { logActivity, buildMeta } from '../middleware/activityLogger';
import { UserRole } from '@in-aspired/shared';

// ------------------------------------------------------
// Extended Request Type
// ------------------------------------------------------
// Adds "user" property to the request object after authentication middleware
// This allows controllers to access the logged-in user's info.
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
    name?: string;
    email?: string;
  };
}

// GET /admin/users
// Returns a list of all users (Admin only)
// This endpoint allows admins to view all registered users while excluding sensitive information like passwords and refresh tokens. It also logs this activity for auditing purposes.
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {

    // Only admins are allowed to access this endpoint
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    // Fetch all users while excluding sensitive fields
    const users = await User.find()
      .select('-password -refreshTokens -resetPasswordToken -resetPasswordExpire');


    // Log this admin action for auditing
    if (req.user) {
      await logActivity({
        userId: req.user.id, // admin performing the action
        activity: 'Viewed all users',
        type: 'Admin',
        ip: req.ip,
        meta: buildMeta(req.user, { totalUsers: users.length }) // additional metadata
      });
    }

    // Return users to frontend
    res.status(200).json(users);

  } catch (err) {

    console.error('getAllUsers error:', err);

    res.status(500).json({ message: 'Server error' });

  }
};

// GET /admin/users/:id/activity
// Returns paginated activity logs for a specific user
// This endpoint allows admins to view the activity logs of a specific user. It includes pagination support and logs the admin's action for auditing purposes.
export const getUserActivity = async (req: AuthenticatedRequest, res: Response) => {
  try {

    // Admin access check
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Pagination logic
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // Run queries in parallel for performance
    const [logs, total, targetUser] = await Promise.all([

      // Fetch activity logs
      UserActivity.find({ userId: id })
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(limit),

      // Count total activity logs
      UserActivity.countDocuments({ userId: id }),

      // Get basic info about the user
      User.findById(id).select('name email')

    ]);

    // Calculate total number of pages
    const totalPages = Math.ceil(total / limit);

    // Log that the admin viewed this user's activity
    if (req.user && targetUser) {
      await logActivity({
        userId: req.user.id,
        activity: 'Viewed user activity logs',
        type: 'Admin',
        ip: req.ip,
        meta: buildMeta(req.user, { 
          targetUserId: id,
          targetUserName: targetUser.name,
          targetUserEmail: targetUser.email,
          totalLogs: total
        })
      });
    }

    // Return paginated response
    res.status(200).json({
      data: logs,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (err) {

    console.error('getUserActivity error:', err);

    res.status(500).json({ message: 'Failed to fetch activity logs' });

  }
};

// PATCH /admin/users/:id/suspend
// Allows admin to suspend or unsuspend a user account
// This endpoint allows admins to suspend or unsuspend a user's account. It also logs this action for both the target user and the admin performing the action, ensuring a complete audit trail.
export const suspendUser = async (req: AuthenticatedRequest, res: Response) => {
  try {

    // Admin access check
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    const { id } = req.params;

    // Action must be either "suspend" or "unsuspend"
    const { action } = req.body;

    if (!['suspend', 'unsuspend'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use "suspend" or "unsuspend".' });
    }

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find target user
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find admin performing the action
    const admin = await User.findById(req.user.id);

    // Store previous status for logging
    const previousStatus = user.status;

    // Update user status
    user.status = action === 'suspend' ? 'suspended' : 'active';

    // Clear refresh tokens → force logout all sessions
    user.refreshTokens = [];

    await user.save();

    // Log activity for the TARGET USER
    // This ensures their account history shows
    // when an admin suspended or unsuspended them.
    // This is crucial for transparency and accountability.
    await logActivity({
      userId: user._id.toString(),
      activity: `Account ${action === 'suspend' ? 'suspended' : 'unsuspended'} by Admin`,
      type: 'Admin Action',
      ip: req.ip,
      meta: {
        adminId: admin?._id.toString(),
        adminName: admin?.name,
        adminEmail: admin?.email,
        adminRole: admin?.role,
        userBeforeStatus: previousStatus
      }
    });

    // Log activity for the ADMIN
    // This keeps a full audit trail of admin actions
    // showing which admin performed the suspend/unsuspend action.
    if (req.user && admin) {
      await logActivity({
        userId: req.user.id,
        activity: `${action === 'suspend' ? 'Suspended' : 'Unsuspended'} user account`,
        type: 'Admin',
        ip: req.ip,
        meta: buildMeta(admin, {
          targetUserId: user._id.toString(),
          targetUserName: user.name,
          targetUserEmail: user.email,
          actionType: action,
          previousStatus
        })
      });
    }

    // Send response back to frontend
    res.status(200).json({
      message: `User ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        status: user.status
      }
    });

  } catch (err) {

    console.error('suspendUser error:', err);

    res.status(500).json({ message: 'Failed to update user status' });

  }
};

// GET /admin/users/stats
// Returns admin dashboard statistics
// This endpoint provides key statistics for the admin dashboard, such as total users, active users, suspended users, and new users registered today. It ensures that only admins can access this information.
export const getUserStats = async (req: AuthenticatedRequest, res: Response) => {
  try {

    // Only admins can access this
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    // Start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run counts in parallel for performance
    const [totalUsers, activeUsers, suspendedUsers, newToday] = await Promise.all([

      // Total users
      User.countDocuments(),

      // Active users
      User.countDocuments({ status: 'active' }),

      // Suspended users
      User.countDocuments({ status: 'suspended' }),

      // Users created today
      User.countDocuments({ createdAt: { $gte: today } })

    ]);

    // Return stats for admin dashboard
    res.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      newToday
    });

  } catch (err) {

    console.error('getUserStats error:', err);

    res.status(500).json({ message: 'Failed to fetch stats' });

  }
};