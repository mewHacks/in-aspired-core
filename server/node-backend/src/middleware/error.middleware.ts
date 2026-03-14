import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config/env';

// Custom error interface
interface AppError extends Error {
    statusCode?: number;
    code?: number | string; // For MongoDB error codes
    errors?: any; // For validation errors
}

// Global error handler
export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Default error values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';

    // Log error for debugging (server-side only)
    console.error(`[Error] ${req.method} ${req.url}:`, err);

    // Mongoose: Bad ObjectId
    if (err.name === 'CastError') {
        message = 'Resource not found';
        statusCode = 404;
    }

    // Mongoose: Duplicate Key
    if (err.code === 11000) {
        message = 'Duplicate field value entered';
        statusCode = 400;
    }

    // Mongoose: Validation Error
    if (err.name === 'ValidationError') {
        message = Object.values(err.errors || {}).map((val: any) => val.message).join(', ');
        statusCode = 400;
    }

    // Zod: Validation Error
    if (err.name === 'ZodError') {
        statusCode = 400;
        message = 'Validation Error';
        // Format Zod errors if available
        if (Array.isArray((err as any).issues)) {
            message = (err as any).issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        }
    }

    // JWT: Invalid Token
    if (err.name === 'JsonWebTokenError') {
        message = 'Invalid token. Please log in again.';
        statusCode = 401;
    }

    // JWT: Expired Token
    if (err.name === 'TokenExpiredError') {
        message = 'Session expired. Please log in again.';
        statusCode = 401;
    }

    // Response structure
    res.status(statusCode).json({
        success: false,
        message,
        // Only show stack trace in development, hidden in production
        stack: CONFIG.NODE_ENV === 'development' ? err.stack : undefined
    });
};
