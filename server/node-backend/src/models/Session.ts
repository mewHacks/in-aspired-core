import mongoose, { Schema, Document } from 'mongoose';

// Define TS shape for session document
// Tracks the duration of an active meeting event for the room
export interface ISessionDocument extends Document {
    roomId: mongoose.Types.ObjectId; // Which room this session belongs to
    status: 'active' | 'ended'; // Tracks whether the session is ongoing or finished
    startedAt: Date;
    endedAt?: Date;
}

// Define Mongoose schema for session document
const SessionSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date }
}, {
    timestamps: true
});

// Index for efficient admin management
SessionSchema.index({ roomId: 1, status: 1 });

// Export Mongoose model
export default mongoose.model<ISessionDocument>('Session', SessionSchema);
