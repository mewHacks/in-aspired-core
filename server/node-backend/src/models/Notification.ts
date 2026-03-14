import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType } from '@in-aspired/shared';

// Notification document interface
export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string; // Optional URL to navigate to when clicked
    data?: Record<string, any>; // Extra payload (roomId, etc.)
    read: boolean;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Notification schema
const NotificationSchema: Schema = new Schema({

    // User who receives the notification
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Notification type
    type: {
        type: String,
        enum: ['ROOM_INVITE', 'SAVED_UPDATE', 'SYSTEM', 'MARKETING', 'WEEKLY_DIGEST', 'TEST_REMINDER'],
        required: true
    },

    // Content
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String }, // Optional navigation URL

    // Extra data (roomId, careerId, etc.)
    data: { type: Schema.Types.Mixed },

    // Read status
    read: { type: Boolean, default: false },
    readAt: { type: Date },

}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

// Compound index for efficient queries (get unread notifications for user, sorted by newest)
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Define notification model
const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// Export notification model
export default Notification;
