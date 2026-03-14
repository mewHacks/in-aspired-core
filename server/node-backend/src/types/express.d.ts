// express.d.ts
// Global type augmentation for Express Request to include authenticated user

import { IUserDocument } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

export {};
