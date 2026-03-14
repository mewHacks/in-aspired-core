// embedding.service.test.ts
// Tests for embedding service: Gemini SDK integration (inline, no Python)

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
// Shared mock — will be referenced by the factory
const mockEmbedContent = jest.fn() as jest.Mock<any>;

// Must use jest.mock with a factory that returns a class-like constructor.
// Jest hoists this to the top, but the mockEmbedContent ref is still valid.
jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: function () {
            return {
                getGenerativeModel: function () {
                    return {
                        embedContent: mockEmbedContent
                    };
                }
            };
        }
    };
});

// Mock CONFIG
jest.mock('../../src/config/env', () => ({
    CONFIG: {
        GEMINI_API_KEY: 'test-api-key'
    }
}));

import { embeddingService } from '../../src/services/embedding.service'; // Import once (use unique text per test to avoid cache hits)

// Main test suite for embedding service
describe('Embedding Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockEmbedContent.mockReset();
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    // Test suite for generateEmbedding
    describe('generateEmbedding', () => {

        // Test 1: Successful embedding generation
        it('should return embedding when Gemini SDK responds successfully', async () => {
            const mockEmbedding = new Array(768).fill(0.1);
            mockEmbedContent.mockResolvedValueOnce({
                embedding: { values: mockEmbedding }
            });

            const result = await embeddingService.generateEmbedding('success test text');

            expect(result.embedding).toEqual(mockEmbedding);
            expect(result.usedFallback).toBe(false);
        });

        // Test 2: Fallback on empty text
        it('should return fallback for empty text', async () => {
            const result = await embeddingService.generateEmbedding('');

            expect(result.embedding).toBeNull();
            expect(result.usedFallback).toBe(true);
            expect(result.error).toBe('Empty text provided');
        });

        // Test 3: Fallback on SDK error
        it('should return fallback when Gemini SDK throws error', async () => {
            mockEmbedContent.mockRejectedValueOnce(new Error('API quota exceeded'));

            const result = await embeddingService.generateEmbedding('error test text');

            expect(result.embedding).toBeNull();
            expect(result.usedFallback).toBe(true);
            expect(result.error).toBe('API quota exceeded');
        });

        // Test 4: Fallback on invalid embedding dimensions
        it('should return fallback for invalid embedding dimensions', async () => {
            mockEmbedContent.mockResolvedValueOnce({
                embedding: { values: [0.1, 0.2] } // Only 2 dimensions instead of 768
            });

            const result = await embeddingService.generateEmbedding('dimensions test text');

            expect(result.embedding).toBeNull();
            expect(result.usedFallback).toBe(true);
            expect(result.error).toBe('Invalid embedding dimensions');
        });
    });

    // Main test suite for buildVectorSearchStage
    describe('buildVectorSearchStage', () => {
        // Test 1: Build valid vector search stage
        it('should build valid MongoDB vector search aggregation stage', () => {
            const mockEmbedding = new Array(768).fill(0.1);
            const stage = embeddingService.buildVectorSearchStage(mockEmbedding);

            expect(stage).toEqual({
                $vectorSearch: {
                    index: 'vector_index',
                    path: 'vectorEmbedding',
                    queryVector: mockEmbedding,
                    numCandidates: 100,
                    limit: 5
                }
            });
        });

        // Test 2: Accept custom parameters
        it('should accept custom parameters', () => {
            const mockEmbedding = new Array(768).fill(0.1);
            const stage = embeddingService.buildVectorSearchStage(
                mockEmbedding,
                'custom_index',
                'customPath',
                10,
                200
            );

            expect(stage.$vectorSearch.index).toBe('custom_index');
            expect(stage.$vectorSearch.path).toBe('customPath');
            expect(stage.$vectorSearch.limit).toBe(10);
            expect(stage.$vectorSearch.numCandidates).toBe(200);
        });
    });
});
