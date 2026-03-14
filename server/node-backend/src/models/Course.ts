// Course.ts — Mongoose model for educational courses in the In-Aspired platform.
// Defines course schema with accreditation details, cost levels, and vector
// embedding support for AI-powered semantic search.
import mongoose, { Schema, Document } from 'mongoose';
import { embeddingService } from '../services/embedding.service';

// Academic level of the course (Foundation → Diploma → Pre-U)
export enum CourseLevel {
    Foundation = 'Foundation',
    Diploma = 'Diploma',
    GeneralPreU = 'General Pre-U'
}

// Whether the institution is Public or Private
export enum CourseType {
    Public = 'Public',
    Private = 'Private'
}

// Subjective difficulty rating for the course
export enum CourseDifficulty {
    Easy = 'Easy',
    Medium = 'Medium',
    Hard = 'Hard'
}

// Tuition cost bracket (in Malaysian Ringgit)
export enum CostLevel {
    Low = '< RM 20k',
    Medium = 'RM 20k - 50k',
    High = '> RM 50k'
}

// Model interface — adds the static vectorSearch method to the base Mongoose model
export interface ICourseModel extends mongoose.Model<ICourse> {
    vectorSearch(query: string, limit?: number, filters?: any): Promise<any[]>;
}

// Document interface — describes every field stored on a Course document
export interface ICourse extends Document {
    id: string; // Custom ID (e.g., 'apu-cs-foundation')
    title: string;
    institutionId: string;
    level: CourseLevel;
    type: CourseType;
    mqa_code: string;
    campuses: string[];
    accredited_from?: Date;
    accredited_to?: Date;
    difficulty?: CourseDifficulty;
    duration_year: string;
    cost_level: CostLevel;
    tags: string[];
    description: string;
    domainIds: string[];
    apply_url: string;
    view_count: number;
    isArchived: boolean;
    is_featured: boolean;
    careers: string[]; // Array of strings for now (Career IDs)
    saved_count?: number;
    vectorEmbedding?: number[]; // 768-dimension vector for semantic search
    createdAt: Date;
    updatedAt: Date;
}

// Mongoose schema definition for the Course collection
const CourseSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    institutionId: { type: String, required: true, maxlength: 50 }, // references Institution ID
    level: { type: String, enum: Object.values(CourseLevel), required: true },
    type: { type: String, enum: Object.values(CourseType), required: true },
    mqa_code: { type: String, required: true, maxlength: 50 },
    campuses: { type: [String], default: [] },
    accredited_from: { type: Date },
    accredited_to: { type: Date },
    difficulty: { type: String, enum: Object.values(CourseDifficulty) },
    duration_year: { type: String, required: true, maxlength: 20 },
    cost_level: { type: String, enum: Object.values(CostLevel), required: true },
    tags: { type: [String], default: [] },
    description: { type: String, required: true, maxlength: 2000 },
    domainIds: { type: [String], default: [] },
    apply_url: { type: String, required: true },
    view_count: { type: Number, default: 0 },
    is_featured: { type: Boolean, default: false },
    careers: { type: [String], default: [] },
    // Archive 
    isArchived: {
        type: Boolean,
        default: false
    },
    vectorEmbedding: { type: [Number], default: undefined } // 768-dim vector for semantic search
}, {
    timestamps: true // Automatically creates createdAt and updatedAt
});

// Index for search
CourseSchema.index({ title: 'text', description: 'text', institutionId: 'text' });

// Pre-save hook to auto-generate vector embedding
CourseSchema.pre('save', async function (next) {
    const course = this as ICourse;

    // Check if relevant fields modified or embedding missing
    if (course.isModified('title') || course.isModified('description') || !course.vectorEmbedding || course.vectorEmbedding.length === 0) {
        try {
            // Construct rich context text
            const textToEmbed = `${course.title}. ${course.description} Offered by ${course.institutionId}.`;

            // Call embedding service
            const result = await embeddingService.generateEmbedding(textToEmbed);

            if (result.embedding && !result.usedFallback) {
                course.vectorEmbedding = result.embedding;
                // console.log(`[Course Model] Generated embedding for: ${course.title}`);
            } else {
                console.warn(`[Course Model] Embedding generation failed for ${course.title}: ${result.error}`);
                // Continue saving without embedding (or keep old one if exists)
            }
        } catch (error) {
            console.error('[Course Model] Embedding hook error:', error);
            // Don't error out the save, just log
        }
    }
    next();
});

// Static method for vector search
CourseSchema.statics.vectorSearch = async function (query: string, limit: number = 10, filters: any = {}) {
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
                numCandidates: 100, // MongoDB recommends 10-20x the limit for better recall
                limit: limit,
                filter: { ...filters, isArchived: { $ne: true } } // Incorporate archive check into vector search
            }
        },
        {
            $project: {
                score: { $meta: 'vectorSearchScore' },
                title: 1,
                description: 1,
                institutionId: 1,
                level: 1,
                type: 1,
                cost_level: 1,
                tags: 1,
                domainIds: 1,
                careers: 1,
                duration_year: 1,
                mqa_code: 1,
                campuses: 1,
                apply_url: 1,
                view_count: 1,
                is_featured: 1,
                isArchived: 1,
                createdAt: 1
            }
        },
        {
            $sort: { score: -1 } // Sort by relevance score
        }
    ];

    try {
        const results = await this.aggregate(pipeline);
        return results;
    } catch (error) {
        console.error('Vector search error:', error);
        throw error;
    }
};

// Export the compiled Course model with vector search support
export default mongoose.model<ICourse, ICourseModel>('Course', CourseSchema);
