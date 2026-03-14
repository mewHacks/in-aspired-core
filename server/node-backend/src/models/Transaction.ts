import mongoose, { Schema, Document } from 'mongoose';

// Enum for transaction status to ensure type safety
export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

// Enum for fulfillment status (PDF generation + email delivery)
export enum FulfillmentStatus {
    PENDING = 'pending',       // Payment received, fulfillment not yet started
    PROCESSING = 'processing', // PDF generation in progress
    DELIVERED = 'delivered',   // PDF emailed successfully
    FAILED = 'failed'          // PDF or email delivery failed (needs manual review)
}

// Transaction model for tracking purchase attempts and PDF generation status
export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    provider: 'lemonsqueezy' | 'stripe'; // Extensible for Stripe if needed
    providerTransactionId: string;
    amount: number;
    currency: string;
    status: TransactionStatus;
    fulfillmentStatus: FulfillmentStatus;
    attempts: number; // For tracking retry attempts of PDF generation/fulfillment
    productId: 'full_report_v1';
    downloadIp?: string; // For fraud detection
    createdAt?: Date;
    updatedAt?: Date;
}

// Transaction schema for MongoDB
const TransactionSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Indexed for fast lookup of a user's purchase history
    },
    provider: {
        type: String,
        enum: ['lemonsqueezy', 'stripe'],
        required: true
        // We store the provider to allow multi-gateway support in the future
    },
    providerTransactionId: {
        type: String,
        required: true,
        unique: true // Ensure we don't process the same webhook twice (Idempotency)
    },
    amount: {
        type: Number,
        required: true
        // Stored in smallest currency unit (e.g., cents) or standard format depending on provider
    },
    currency: {
        type: String,
        required: true,
        default: 'USD'
    },
    status: {
        type: String,
        enum: Object.values(TransactionStatus),
        default: TransactionStatus.PENDING,
        index: true // Indexed to easily find stuck or failed transactions for monitoring
    },
    attempts: {
        type: Number,
        default: 0
        // Tracks how many times we've tried to fulfill this order (PDF generation)
    },
    productId: {
        type: String,
        required: true,
        enum: ['full_report_v1']
        // SKU identifier to know WHICH product they bought
    },
    downloadIp: {
        type: String
        // Security: We log the IP of the download/purchase to detect account sharing (Fraud)
    },
    fulfillmentStatus: {
        type: String,
        enum: Object.values(FulfillmentStatus),
        default: FulfillmentStatus.PENDING,
        index: true // Indexed to find stuck or failed fulfillments for monitoring/alerting
    }
}, {
    timestamps: true // Automatically manages createdAt and updatedAt
});

// Index for finding recent transactions by a user for rate limiting or status checks
TransactionSchema.index({ userId: 1, createdAt: -1 });

// Export the model
export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
