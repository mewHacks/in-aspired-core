import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from '@in-aspired/shared';
import User from '../models/User';
import { CONFIG } from '../config/env';

// Auth request interface to extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

// Auth middleware function that verifies JWT and attaches user info to the request
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  // Store JWT if found
  let token: string | undefined;

  // Check for token in cookies (preferred for web)
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  // Fallback to Authorization Header (preferred for mobile / API clients)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token found in either place, deny access
  if (!token) {
    return res.status(401).json({ error: "No token provided, authorization denied" });
  }

  try {
    // Verify JWT using secret
    const decoded = jwt.verify(
      token,
      CONFIG.JWT_SECRET as string
    ) as JwtPayload & { id: string; role?: string };

    const user = await User.findById(decoded.id).select('status role');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    // Attach user info to request
    req.user = {
      id: user._id.toString(),
      role: user.role
    };

    next(); // Proceed to next middleware

  } catch (error) { // Error handling
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Logged-in check
export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Admin-only check
export const adminOnly = (req: any, res: Response, next: NextFunction) => {
  console.log('Admin check - User role:', req.user?.role, 'Type:', typeof req.user?.role);

  if (!req.user || req.user.role !== UserRole.ADMIN) { // Use UserRole.ADMIN
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};