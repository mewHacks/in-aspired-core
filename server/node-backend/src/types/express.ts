// express.ts
// Custom Express request interface with authenticated user payload

import { Request } from 'express';

// Extend the default Express Request to include our User payload
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    }
}
