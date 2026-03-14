import mongoose, { Schema, Document } from 'mongoose';

// TypeScript interface for AIChatMessage document
// One message inside an AI conversation, can either be from user or assistant
export interface IAIChatMessageDocument extends Document {
    conversationId: mongoose.Types.ObjectId; // Foreign key reference to AIConversation
    role: 'user' | 'assistant'; // Who send this message
    content: string;
    metadata?: {
        intent?: string;
        resultsFound?: number;
        usedLLM?: boolean; // Cost tracking
        latencyMs?: number; // Performance analytics
        confidence?: 'high' | 'medium' | 'low'; // LLM confidence for tuning ambiguity rules
    };
    createdAt: Date;
}

// Mongoose schema for AI chatbot messages
const AIChatMessageSchema: Schema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'AIConversation',
        required: true,
        index: true // Fast lookup by conversation
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    metadata: {
        intent: String,
        resultsFound: Number,
        usedLLM: Boolean,
        latencyMs: Number,
        confidence: { type: String, enum: ['high', 'medium', 'low'] }
    }
}, {
    timestamps: true // Auto-creates createdAt and updatedAt
});

// Compound index for efficient history queries
AIChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

// Export Mongoose model
export default mongoose.model<IAIChatMessageDocument>('AIChatMessage', AIChatMessageSchema);
