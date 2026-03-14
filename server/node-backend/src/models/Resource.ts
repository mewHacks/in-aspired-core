import mongoose, { Schema, Document } from 'mongoose';

// Resource type
export enum ResourceType {
    LINK = 'link',
    PDF = 'pdf',
    IMAGE = 'image'
}

// Resource scope
export enum ResourceScope {
    SESSION = 'session',
    CURATED = 'curated'
}

// Resource status (change after report)
export enum ResourceStatus {
    ACTIVE = 'active',
    HIDDEN = 'hidden',
    UNDER_REVIEW = 'under_review'
}

// Report interface
interface IReport {
    userId: mongoose.Types.ObjectId;
    reason?: string;
    createdAt: Date;
}

// Define TS shape for resource document
export interface IResourceDocument extends Document {
    roomId: mongoose.Types.ObjectId;
    uploaderId: mongoose.Types.ObjectId;
    type: ResourceType;
    scope: ResourceScope;
    status: ResourceStatus;
    title: string;
    description?: string;
    url: string;
    tags: string[];
    reports: IReport[];
    createdAt: Date;
}

// Define Mongoose schema for resource document
const ResourceSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: Object.values(ResourceType),
        default: ResourceType.LINK
    },
    scope: {
        type: String,
        enum: Object.values(ResourceScope),
        default: ResourceScope.SESSION
    },
    status: {
        type: String,
        enum: Object.values(ResourceStatus),
        default: ResourceStatus.ACTIVE
    },
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    tags: [{ type: String }],
    reports: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Indexes for fast filtering
ResourceSchema.index({ roomId: 1, status: 1, createdAt: -1 });
ResourceSchema.index({ uploaderId: 1 });

// Export Mongoose model
export default mongoose.model<IResourceDocument>('Resource', ResourceSchema);
