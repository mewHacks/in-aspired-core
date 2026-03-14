// TypeScript interfaces for user activity log entries
export interface UserActivityLog {
  _id: string;
  userId: string;                     // Reference to the user
  activity: string;                   // Description of the action
  type?: string;                      // Category/type of activity, e.g., 'Auth', 'Course', 'Admin Action'
  ip?: string;                        // IP address of the user
  meta?: Record<string, unknown>;         // Snapshot or extra info (name, email, role, avatar, etc.)
  createdAt: string;
}
