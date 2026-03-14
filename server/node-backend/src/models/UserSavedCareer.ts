// UserSavedCareer.ts — Mongoose model for the many-to-many relationship between
// users and their bookmarked/saved careers. Uses a compound unique index on
// (user_id, career_id) to prevent duplicate saves.
import mongoose, { Schema, Document } from 'mongoose';

// Document interface — one row per user-career bookmark
export interface IUserSavedCareer extends Document {
  user_id: mongoose.Types.ObjectId;
  career_id: string; // Career.id (slug)
  saved_at: Date;
  createdAt?: Date;
  updatedAt?: Date; // (Optional, from timestamps option)
}

// Schema definition for saved careers
const UserSavedCareerSchema = new Schema<IUserSavedCareer>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  career_id: { type: String, required: true },
  saved_at: { type: Date, default: Date.now }
}, { 
    timestamps: true 
});

// Make (user_id, career_id) unique together
UserSavedCareerSchema.index({ user_id: 1, career_id: 1 }, { unique: true });

// Export the compiled UserSavedCareer model
export default mongoose.model<IUserSavedCareer>(
  'UserSavedCareer',
  UserSavedCareerSchema
);
