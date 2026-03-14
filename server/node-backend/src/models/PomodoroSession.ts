import mongoose, { Schema, Document } from 'mongoose';

// Define TS shape for pomodoro session document
export interface IPomodoroSessionDocument extends Document {
    roomId: mongoose.Types.ObjectId;
    status: 'running' | 'paused' | 'stopped';
    duration: number; // in minutes
    timeLeft: number; // in seconds (snapshot for pause)
    startedAt: Date;
}

// Define Mongoose schema for pomodoro session document
const PomodoroSessionSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    status: { type: String, enum: ['running', 'paused', 'stopped'], default: 'stopped' },
    duration: { type: Number, default: 25 },
    timeLeft: { type: Number, default: 1500 },
    startedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Export Mongoose model
export default mongoose.model<IPomodoroSessionDocument>('PomodoroSession', PomodoroSessionSchema);
