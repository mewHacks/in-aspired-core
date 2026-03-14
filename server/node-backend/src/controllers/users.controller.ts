// Users controller — handles profile updates for the currently authenticated user
import { Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity, buildMeta } from '../middleware/activityLogger';

// Update the current authenticated user's profile fields (name, email, phone, etc.)
export const updateCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id; // comes from auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email, phone, phoneCountryCode, gender, dateOfBirth } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, phone, phoneCountryCode, gender, dateOfBirth },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity with WebSocket broadcast
    await logActivity({
      userId: updatedUser._id.toString(),
      activity: 'Updated profile',
      type: 'User',
      ip: req.ip,
      meta: buildMeta(updatedUser, { 
        updatedFields: Object.keys(req.body).join(', ')
      })
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating user' });
  }
};