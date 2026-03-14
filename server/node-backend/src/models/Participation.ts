import mongoose, { Schema, Document } from 'mongoose';

// Define TS shape for participation document
// Strictly for tracking user participation history (for >3 sessions requirement)
export interface IParticipationDocument extends Document {
    userId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId; // The room they joined
    sessionId?: mongoose.Types.ObjectId; // The specific session event (optional)
    durationMin: number; // how long they stayed, in minutes
    joinedAt: Date;
    leftAt: Date;
}

// Define Mongoose schema for participation document
const ParticipationSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    durationMin: { type: Number, default: 0 },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, required: true }
}, {
    timestamps: true
});

// Index for efficient user participation session tracking 
ParticipationSchema.index({ userId: 1 });

// Export Mongoose model
export default mongoose.model<IParticipationDocument>('Participation', ParticipationSchema);
