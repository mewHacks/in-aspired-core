import mongoose, { Schema, Document } from 'mongoose';

// Define TS shape for whiteboard document
export interface IWhiteboardDocument extends Document {
    roomId: mongoose.Types.ObjectId;
    data: string; // Serialized JSON string of canvas state (e.g. from Tldraw/Fabric.js)
    snapshot?: string; // URL to image preview
    updatedAt: Date;
}

// Define Mongoose schema for whiteboard document
const WhiteboardSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, unique: true }, // One whiteboard per room
    data: { type: String, default: '' },
    snapshot: { type: String }
}, {
    timestamps: true
});

// Export Mongoose model
export default mongoose.model<IWhiteboardDocument>('Whiteboard', WhiteboardSchema);
