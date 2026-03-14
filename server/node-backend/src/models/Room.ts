import mongoose, { Schema, Document } from 'mongoose';

// Define room types 
export enum RoomType {
    PUBLIC = 'public', // open to anyone
    PRIVATE = 'private' // requires join code
}

// Define room education levels
export enum RoomLevel {
    FOUNDATION = 'Foundation',
    DIPLOMA = 'Diploma',
    PRE_U = 'General Pre-U',
    ALL_LEVELS = 'All Levels'
}

// Define TS shape for room document
export interface IRoomDocument extends Document {
    name: string;
    description: string;
    type: RoomType;
    joinCode?: string; // Only for private rooms
    maxParticipants: number;
    ownerId: mongoose.Types.ObjectId;
    courseId?: string; // Optional link to a course
    domainIds: string[]; // For recommendations
    coverImage?: string; // URL or Base64 string
    level: string; // Education level
    isActive: boolean;
    isPersistent: boolean; // If true, room resets instead of deactivating when session ends
    createdAt: Date;
    archivedAt?: Date;
    allowCamera: boolean; // Camera access (disabled/enabled) controlled by host
    allowAudio: boolean; // Audio access (disabled/enabled) controlled by host
    allowWhiteboard: boolean; // Whiteboard access (read-only/editable) controlled by host
}

// Define Mongoose schema for room document
const RoomSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(RoomType),
        default: RoomType.PUBLIC
    },
    joinCode: { type: String }, // Optional, required if type is private
    maxParticipants: { type: Number, default: 10, max: 50 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: String }, // Stores course ID (string from static data or ObjectId if moved to DB later)
    domainIds: [{ type: String }], // e.g. ['computing', 'math']
    coverImage: { type: String }, // URL or Base64 string of cover image
    level: {
        type: String,
        enum: Object.values(RoomLevel),
        default: RoomLevel.ALL_LEVELS
    },
    isActive: { type: Boolean, default: true },
    isPersistent: { type: Boolean, default: false }, // Admin-only: room resets instead of dying
    sessionDuration: { type: Number, default: 25 }, // Session length in minutes
    sessionEndTime: { type: Date }, // When the current session is expected to end
    archivedAt: { type: Date },
    allowCamera: { type: Boolean, default: true },
    allowAudio: { type: Boolean, default: true },
    allowWhiteboard: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Index for efficient searching/filtering
RoomSchema.index({ type: 1, isActive: 1 });
RoomSchema.index({ courseId: 1 });

// Export Mongoose model
export default mongoose.model<IRoomDocument>('Room', RoomSchema);
