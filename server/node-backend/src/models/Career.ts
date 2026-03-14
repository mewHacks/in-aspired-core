// Career.ts — Mongoose model for career listings in the In-Aspired platform.
// Defines career schema with salary ranges, demand levels, RIASEC codes, and
// vector embedding support for AI-powered semantic search.
import mongoose, { Schema, Document } from 'mongoose';
import { embeddingService } from '../services/embedding.service';

// Employment type classification for career listings
export enum CareerJobType {
    FullTime = 'Full-time',
    PartTime = 'Part-time',
    Contract = 'Contract',
    Freelance = 'Freelance'
}

// Market demand level classification for career listings
export enum CareerDemandLevel {
    High = 'High',
    Medium = 'Medium',
    Low = 'Low'
}

// Minimum education level required for the career
export enum CareerEducationLevel {
    Diploma = 'Diploma',
    GeneralPreU = 'General Pre-U',
    Degree = 'Degree',
    Master = 'Master',
    PhD = 'PhD'
}

// Model interface — adds the static vectorSearch method to the base Mongoose model
export interface ICareerModel extends mongoose.Model<ICareer> {
    vectorSearch(query: string, limit?: number, filters?: any): Promise<any[]>;
}

// Document interface — describes every field stored on a Career document
export interface ICareer extends Document {
    id: string;
    name: string;
    description: string;
    job_type: CareerJobType;
    masco_code?: string;
    salary_low: number;
    salary_high: number;
    is_in_demand: boolean;
    demand_level: CareerDemandLevel;
    education_level_required: CareerEducationLevel;
    skills: string[];
    industry: string[];
    work_environment: string;
    related_courses: string[];
    related_domains: string[];
    riasec_code: string;
    career_path: string[];
    view_count: number;
    isArchived?: boolean;
    saved_count?: number;
    createdAt: Date;
    updatedAt: Date;
    vectorEmbedding?: number[];
}

// Mongoose schema definition for the Career collection
const CareerSchema: Schema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 100
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    job_type: {
        type: String,
        enum: Object.values(CareerJobType),
        default: CareerJobType.FullTime
    },
    masco_code: {
        type: String,
        maxlength: 20
    },
    salary_low: {
        type: Number,
        required: true,
        min: 0
    },
    salary_high: {
        type: Number,
        required: true,
        min: 0
    },
    is_in_demand: {
        type: Boolean,
        default: false
    },
    demand_level: {
        type: String,
        enum: Object.values(CareerDemandLevel),
        default: CareerDemandLevel.Medium
    },
    education_level_required: {
        type: String,
        enum: Object.values(CareerEducationLevel),
        required: true
    },
    skills: {
        type: [String],
        default: []
    },
    industry: {
        type: [String],
        required: true
    },
    work_environment: {
        type: String,
        default: 'Office' // Just a string, no enum validation
    },
    related_courses: {
        type: [String],
        default: []
    },
    related_domains: {
        type: [String],
        default: []
    },
    riasec_code: {
        type: String,
        maxlength: 3
    },
    career_path: {
        type: [String],
        default: []
    },
    view_count: {
        type: Number,
        default: 0
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    vectorEmbedding: {
        type: [Number],
        default: undefined
    }
}, {
    timestamps: true
});

// Validator: Salary Low cannot be higher than Salary High
CareerSchema.pre('validate', function (next) {
    if (this.salary_low != null && this.salary_high != null) {
        if (this.salary_low > this.salary_high) {
            this.invalidate('salary_low', 'salary_low cannot exceed salary_high');
        }
    }
    next();
});

// Index for search
CareerSchema.index({ name: 'text', description: 'text', skills: 'text' });

// Pre-save hook to auto-generate vector embedding
CareerSchema.pre('save', async function (next) {
    const career = this as ICareer;

    // Check if relevant fields modified or embedding missing
    if (career.isModified('name') || career.isModified('description') || career.isModified('skills') || !career.vectorEmbedding || career.vectorEmbedding.length === 0) {
        try {
            // Construct rich context: Name + Description + Skills + Industry
            const skillsStr = career.skills ? career.skills.join(', ') : '';
            const textToEmbed = `${career.name}. ${career.description} Skills: ${skillsStr}. Industry: ${career.industry}.`;

            // Call embedding service
            const result = await embeddingService.generateEmbedding(textToEmbed);

            if (result.embedding && !result.usedFallback) {
                career.vectorEmbedding = result.embedding;
            } else {
                console.warn(`[Career Model] Embedding generation failed for ${career.name}: ${result.error}`);
            }
        } catch (error) { // Error handling
            console.error('[Career Model] Embedding hook error:', error);
        }
    }
    next();
});

// Static method for vector search
CareerSchema.statics.vectorSearch = async function (query: string, limit: number = 10, filters: any = {}) {
    const embeddingService = require('../services/embedding.service').embeddingService;

    // Generate embedding for the query
    const queryResult = await embeddingService.generateEmbedding(query);

    if (!queryResult.embedding || queryResult.usedFallback) {
        throw new Error(`Failed to generate query embedding: ${queryResult.error}`);
    }

    // Build the aggregation pipeline
    const pipeline: any[] = [
        {
            $vectorSearch: {
                index: 'vector_index',
                queryVector: queryResult.embedding,
                path: 'vectorEmbedding',
                numCandidates: 100,
                limit: limit,
                filter: { ...filters, isArchived: { $ne: true } }
            }
        },
        {
            $project: {
                score: { $meta: 'vectorSearchScore' },
                name: 1,
                description: 1,
                industry: 1,
                skills: 1,
                salary_low: 1,
                salary_high: 1,
                demand_level: 1,
                education_level_required: 1,
                riasec_code: 1,
                related_courses: 1,
                related_domains: 1,
                work_environment: 1,
                job_type: 1,
                is_in_demand: 1,
                masco_code: 1,
                view_count: 1,
                isArchived: 1,
                createdAt: 1
            }
        },
        {
            $sort: { score: -1 }
        }
    ];

    try {
        const results = await this.aggregate(pipeline);
        return results;
    } catch (error) {
        console.error('Career vector search error:', error);
        throw error;
    }
};

// Lightweight DTO interface used by the API when returning a user's saved careers
export interface UserSavedCareer {
    id: string;
    career_id: string;
    user_id: string;
    saved_at: string;
    notes?: string; // Optional notes for saved career
}

// For the UI state
export interface CareerWithSaveStatus extends Document {
    is_saved?: boolean;
}

// Export the compiled Career model with vector search support
export default mongoose.model<ICareer, ICareerModel>('Career', CareerSchema);