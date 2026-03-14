import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import UserActivity from '../models/UserActivity';
import { IUserDocument } from '../models/User';
import { getSocketIO } from '../socket/socketEmitter';

// Build consistent meta info for logging
// Changed signature: now accepts user object and additional meta data separately
export const buildMeta = (
  user: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    authProvider?: string;
    googleId?: string;
  }, 
  additionalMeta?: Record<string, any>
) => ({
  userName: user.name,      // Changed from 'name' to 'userName'
  userEmail: user.email,    // Changed from 'email' to 'userEmail'  
  userRole: user.role,      // Changed from 'role' to 'userRole'
  authProvider: user.authProvider,
  googleId: user.googleId,
  ...additionalMeta,
});

// Params for logging
interface LogActivityParams {
  userId: string;
  activity: string;
  type?: string;
  ip?: string;
  meta?: Record<string, any>;
}

// Unified function to log activity (DB + WebSocket)
export const logActivity = async (params: LogActivityParams) => {
  if (!mongoose.Types.ObjectId.isValid(params.userId)) return;

  try {
    // 1. Save to database
    const activity = await UserActivity.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      activity: params.activity,
      type: params.type || 'General',
      ip: params.ip,
      meta: params.meta,
    });

    // 2. Broadcast via WebSocket (if connected)
    const io = getSocketIO();
    if (io) {
      const broadcastData = {
        _id: activity._id.toString(),
        userId: {
          _id: params.userId,
          name: params.meta?.userName || 'Unknown User',
          email: params.meta?.userEmail || '',
          role: params.meta?.userRole || 'user',
        },
        activity: params.activity,
        type: params.type || 'General',
        ip: params.ip,
        createdAt: (activity.createdAt || new Date()).toISOString(),
        meta: params.meta,
      };

      // Emit to all connected clients
      io.emit('activity:new', broadcastData);

      // Emit to admin room only (for admin dashboard)
      io.to('admin-room').emit('activity:admin', broadcastData);

      // Emit specific events for different activity types
      if (params.type) {
        io.emit(`activity:${params.type.toLowerCase()}`, broadcastData);
      }
    }

    return activity;
  } catch (err) {
    console.error('Activity log failed:', err);
  }
};

// Middleware placeholder (currently does nothing)
export const activityLogger = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};