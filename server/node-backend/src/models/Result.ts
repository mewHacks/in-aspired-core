import mongoose, { Schema, Document } from 'mongoose'; // Import ODM + schema typing
import { RiasecScore, InterestDomain, Course } from '../types/education'; // Import TS types

export interface IResultDocument extends Document { // Define TS shape of a result document
    userId: mongoose.Types.ObjectId; // User ID
    scores: RiasecScore[]; // RIASEC scores
    topDomains: (InterestDomain & { matchExplanation?: string })[]; // Top matched domains with explanations, redundant on purpose for snapshot
    recommendedCourses: Course[]; // Recommended courses, stored fully 
    aiInsight?: {
        mirror: string;
        structure: string;
        gap: string;
        suppression: string;
    }; // Cached AI psychological analysis
    createdAt: Date; // Timestamp
}

// Define sub-schemas for flexible storage
const RiasecScoreSchema = new Schema({
    type: { type: String, required: true }, // R/I/A/S/E/C 
    score: { type: Number, required: true } // Score
}, { _id: false }); // Prevents MongoDB from creating an _id for each sub-document

// Define main result schema
const ResultSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // User ID, also works in PostgreSQL
    scores: [RiasecScoreSchema], // RIASEC scores object array

    // Store full domain object 
    // Use a Mixed array because InterestDomain is complex and we want a snapshot
    topDomains: { type: [Schema.Types.Mixed], required: true },

    // Store full domain object 
    // Use a Mixed array because RecommendedCourses is complex and we want a snapshot
    recommendedCourses: { type: [Schema.Types.Mixed], required: true },

    // Cached AI insight to save credits
    aiInsight: {
        mirror: { type: String },
        structure: { type: String },
        gap: { type: String },
        suppression: { type: String }
    }
} , {
    // Enable timestamps to add createdAt and updatedAt 
    timestamps: true
});

// Export model to create collection
export default mongoose.model<IResultDocument>('Result', ResultSchema);
