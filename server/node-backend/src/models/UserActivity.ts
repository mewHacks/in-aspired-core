// UserActivity.ts — Mongoose model for logging user actions (login, page views,
// admin actions, etc.). Used by the activityLogger middleware and admin monitoring.
import mongoose, { Schema, Document, Types } from 'mongoose';

// Document interface — one row per logged action
export interface IUserActivityDocument extends Document {
  userId: Types.ObjectId;             // Reference to the user
  activity: string;                   // Description of the action
  type?: string;                      // Category/type of activity, e.g., 'Auth', 'Course', 'Admin Action'
  ip?: string;                        // IP address of the user
  meta?: Record<string, any>;         // Snapshot or extra info (name, email, role, avatar, etc.)
  createdAt: Date;
}

// Schema definition — only createdAt timestamp (no updatedAt needed for logs)
const UserActivitySchema: Schema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activity: { type: String, required: true },
    type: { type: String },
    ip: { type: String },
    meta: { type: Schema.Types.Mixed },  // flexible snapshot field
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'useractivities',
  }
);

// Export the compiled UserActivity model
export default mongoose.model<IUserActivityDocument>('UserActivity', UserActivitySchema);
