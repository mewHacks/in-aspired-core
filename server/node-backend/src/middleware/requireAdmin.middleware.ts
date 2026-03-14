import { Response, NextFunction } from 'express';
import { UserRole } from '@in-aspired/shared';
import { AuthRequest } from './auth.middleware';

// Middleware to ensure user is ADMIN
// Assumes authenticate middleware has attached req.user
export const requireAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {

    // If authenticate middleware did not attach user
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    // Role-based authorization
    const roleString = req.user.role?.toString().toLowerCase();

    if (roleString !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Admin access only' });
    }

    next();
};
