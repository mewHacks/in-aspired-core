// UserSavedCourse.ts — Mongoose model for the many-to-many relationship between
// users and their bookmarked/saved courses. Uses a compound unique index on
// (user_id, course_id) to prevent duplicate saves.
import mongoose, { Schema, Document } from 'mongoose';

// Document interface — one row per user-course bookmark
export interface IUserSavedCourse extends Document {
  user_id: mongoose.Types.ObjectId;
  course_id: string; // Course.id (slug)
  saved_at: Date;
  createdAt?: Date;
  updatedAt?: Date; // from timestamps
}

// Schema definition for saved courses
const UserSavedCourseSchema = new Schema<IUserSavedCourse>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: String, required: true },
    saved_at: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

// Make (user_id, course_id) unique together
UserSavedCourseSchema.index(
  { user_id: 1, course_id: 1 },
  { unique: true }
);

// Export the compiled UserSavedCourse model
export default mongoose.model<IUserSavedCourse>(
  'UserSavedCourse',
  UserSavedCourseSchema
);
