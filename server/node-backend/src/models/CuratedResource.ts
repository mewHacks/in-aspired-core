import mongoose, { Schema, Document } from 'mongoose';
import { ResourceType } from './Resource';

// Curated resources are pre-uploaded by admins

// Reuse room education level 
export enum CuratedLevel {
    Foundation = 'Foundation',
    Diploma = 'Diploma',
    GeneralPreU = 'General Pre-U',
    General = 'General'
}

// Define TS shape for curated resource document
export interface ICuratedResource extends Document {
    title: string;
    type: ResourceType;
    url: string;
    source: string; // e.g. "MIT OpenCourseWare"
    domainIds: string[]; // e.g. ["computing", "business"]
    levels: CuratedLevel[]; // e.g. ["Foundation", "Diploma"]
    isPublished: boolean;
    createdAt: Date
}

// Define Mongoose schema for curated resource document
const CuratedResourceSchema: Schema = new Schema({
    title: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(ResourceType),
        default: ResourceType.LINK
    },
    url: { type: String, required: true },
    source: { type: String, required: true },
    domainIds: { type: [String], default: [] },
    levels: {
        type: [String],
        enum: Object.values(CuratedLevel),
        default: [CuratedLevel.General]
    },
    isPublished: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Indexes for fast filtering
// Cannot use compound index on two array fields (MongoDB limitation)
CuratedResourceSchema.index({ domainIds: 1 });
CuratedResourceSchema.index({ levels: 1 });

// Export Mongoose model
export default mongoose.model<ICuratedResource>('CuratedResource', CuratedResourceSchema);
