import mongoose, { Schema, Document } from 'mongoose';

// Define message types
export enum MessageType {
    TEXT = 'text',
    SYSTEM = 'system' // e.g., "User joined the room"
}

// Define TS shape for message document
export interface IMessageDocument extends Document {
    roomId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; // null for system messages
    content: string;
    type: MessageType;
    createdAt: Date;
}

// Define Mongoose schema for message document
const MessageSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional for system messages
    content: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(MessageType),
        default: MessageType.TEXT
    }
}, {
    timestamps: true
});

// Optimize chat history loading
MessageSchema.index({ roomId: 1, createdAt: 1 });

// Export Mongoose model
export default mongoose.model<IMessageDocument>('Message', MessageSchema);
