import mongoose, { Document, Schema } from 'mongoose';

// Define TS shape for contact document
export interface IContact extends Document {
    name: string;
    email: string;
    topic: 'general' | 'support' | 'partnership' | 'feedback';
    message: string;
    status: 'new' | 'read' | 'replied';
    createdAt: Date;
}

// Define Mongoose schema for contact document
const ContactSchema: Schema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    topic: {
        type: String,
        required: true,
        enum: ['general', 'support', 'partnership', 'feedback'],
        default: 'general'
    },
    message: { type: String, required: true, maxlength: 2000 },
    status: {
        type: String,
        enum: ['new', 'read', 'replied'],
        default: 'new'
    }
}, {
    timestamps: true
});

// Index for efficient admin dashboard sorting/filtering
ContactSchema.index({ status: 1, createdAt: -1 });

// Export model to create collection
export default mongoose.model<IContact>('Contact', ContactSchema);
