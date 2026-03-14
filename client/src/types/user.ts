// TypeScript interfaces for User and UserActivityLog types
import { UserRole } from "@in-aspired/shared";

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  gender?: string;
  dateOfBirth?: string;
  avatar?: string;
  authProvider?: "local" | "google";
  googleId?: string;
  isTwoFactorEnabled?: boolean;
  role: UserRole;
  status: 'active' | 'suspended';
  lastActive?: string | Date;

  preferences?: {
    theme: string;
    language: string;
    notifications: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
}

export interface UserActivityLog {
  _id: string;
  userId: string;
  activity: string;
  type: string; // 'Admin Action' | 'Room' | 'Course' | etc.
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Can also re-export from shared if available
export type { UserRole };