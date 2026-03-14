import mongoose, { Schema, Document } from 'mongoose';

// TypeScript interface for AIConversation document
// One AI conversation = one continous chat session by a user
export interface IAIConversationDocument extends Document {
    userId: mongoose.Types.ObjectId; // One conversation is always scoped to one user for security purposes
    title?: string; // Short label auto-generated from first message
    lastMessageAt: Date;
    messageCount: number;
    createdAt: Date;
}

// Mongoose schema for AI chatbot conversations
const AIConversationSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Fast lookup by user
    },
    title: {
        type: String,
        maxlength: 100
    },
    lastMessageAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    messageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for user's conversation list (sorted by recent)
AIConversationSchema.index({ userId: 1, lastMessageAt: -1 });

// Export Mongoose model
export default mongoose.model<IAIConversationDocument>('AIConversation', AIConversationSchema);
