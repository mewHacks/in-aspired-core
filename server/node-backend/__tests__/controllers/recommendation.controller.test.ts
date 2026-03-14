// recommendation.controller.test.ts
// Test file for recommendation logic (inline affinity calculation, saving results, retrieving latest results)

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { getRecommendations, saveResult, getLatestResult } from '../../src/controllers/recommendation.controller';
import Result from '../../src/models/Result';
import { AuthenticatedRequest } from '../../src/types/express';
import User from '../../src/models/User';

// Mock Mongoose Model
jest.mock('../../src/models/Result', () => {
    const MockModel = jest.fn().mockImplementation((data: any) => {
        return {
            ...data,
            save: jest.fn().mockImplementation(async () => ({ _id: 'mock-result-id', ...data }))
        };
    });
    (MockModel as any).findOne = jest.fn();
    return {
        __esModule: true,
        default: MockModel
    };
});

// Mock User Model
jest.mock('../../src/models/User', () => {
    return {
        __esModule: true,
        default: {
            findById: jest.fn()
        }
    };
});



// Main test suite for Recommendation Controller
describe('Recommendation Controller', () => {
    // Initialize reusable request/response mocks
    let req: Partial<Request>;
    let authReq: Partial<AuthenticatedRequest>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        // Re-apply common mocks
        (Result as unknown as jest.Mock).mockImplementation((data: any) => ({
            ...data,
            save: jest.fn().mockImplementation(async () => ({ _id: 'mock-result-id', ...data }))
        }));
        (Result as any).findOne = jest.fn();

        // Mock User.findById to return a user with save method
        (User.findById as any).mockResolvedValue({
            _id: 'user-123',
            badges: [],
            save: (jest.fn() as any).mockResolvedValue(true)
        });

        // Suppress console methods for cleaner output
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });

        // Clear all mocks call history
        jest.clearAllMocks();

        json = jest.fn();
        status = jest.fn(() => ({ json }));
        res = { status, json } as any;
        req = { body: {}, query: {}, params: {} };
        authReq = { body: {}, user: { id: 'user-123', role: 'user' } };
    });

    // ========================================
    // getRecommendations
    // Description: Calculates RIASEC affinity inline and returns ranked domains + courses
    // ========================================
    describe('getRecommendations', () => {
        const mockScores = [
            { type: 'R', score: 10 },
            { type: 'I', score: 20 },
            { type: 'A', score: 15 },
            { type: 'S', score: 5 },
            { type: 'E', score: 8 },
            { type: 'C', score: 12 }
        ];

        // Test 1: Missing input
        it('returns 400 when scores are missing', async () => {
            req.body = {};
            await getRecommendations(req as Request, res as Response);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'Scores are required' });
        });

        // Test 2: Successful inline calculation
        it('calculates affinity inline and returns recommendations', async () => {
            req.body = { scores: mockScores };

            await getRecommendations(req as Request, res as Response);

            // Should return JSON with rankedDomains, topDomains, recommendedCourses
            expect(json).toHaveBeenCalledWith(
                expect.objectContaining({
                    rankedDomains: expect.any(Array),
                    topDomains: expect.any(Array),
                    recommendedCourses: expect.any(Array)
                })
            );
        });

        // Test 3: Top 3 Filtering
        it('returns only top 3 domains', async () => {
            req.body = { scores: mockScores };

            await getRecommendations(req as Request, res as Response);

            const responseBody = (json as jest.Mock).mock.calls[0][0] as any;
            expect(responseBody.topDomains.length).toBeLessThanOrEqual(3);
        });

        // Test 4: Ranked domains are sorted by score descending
        it('returns ranked domains sorted by score descending', async () => {
            req.body = { scores: mockScores };

            await getRecommendations(req as Request, res as Response);

            const responseBody = (json as jest.Mock).mock.calls[0][0] as any;
            const scores = responseBody.rankedDomains.map((d: any) => d.score);
            for (let i = 1; i < scores.length; i++) {
                expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
            }
        });

        // Test 5: Empty scores array
        it('returns 400 for empty scores array', async () => {
            req.body = { scores: [] };
            await getRecommendations(req as Request, res as Response);

            expect(status).toHaveBeenCalledWith(400);
        });
    });

    // ========================================
    // saveResult
    // Description: Saves recommendation results to DB
    // ========================================
    describe('saveResult', () => {
        const mockResultData = {
            scores: [{ domain: 'R', score: 10 }],
            topDomains: [{ id: 'software-engineering', label: 'Software Engineering' }],
            recommendedCourses: [{ id: 'cs101', title: 'Intro to CS' }]
        };

        // Test 1: Unauthorized
        it('returns 401 when user is not authenticated', async () => {
            authReq.user = undefined;
            await saveResult(authReq as AuthenticatedRequest, res as Response);
            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 2: Success
        it('saves result to database for authenticated user', async () => {
            authReq.body = mockResultData;
            await saveResult(authReq as AuthenticatedRequest, res as Response);

            expect(Result).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-123'
            }));
            expect(status).toHaveBeenCalledWith(201);
        });

        // Test 3: DB Error
        it('returns 500 when save operation fails', async () => {
            authReq.body = mockResultData;

            // Mock save to throw
            (Result as any).mockImplementationOnce(() => ({
                save: (jest.fn() as any).mockRejectedValue(new Error('DB Error'))
            }));

            await saveResult(authReq as AuthenticatedRequest, res as Response);
            expect(status).toHaveBeenCalledWith(500);
        });
    });

    // ========================================
    // getLatestResult
    // Description: Retrives most recent result for user
    // ========================================
    describe('getLatestResult', () => {
        const mockStoredResult = {
            _id: 'result-123',
            scores: [],
            topDomains: [],
            recommendedCourses: [],
            createdAt: new Date()
        };

        // Test 1: Unauthorized
        it('returns 401 when user is not authenticated', async () => {
            authReq.user = undefined;
            await getLatestResult(authReq as AuthenticatedRequest, res as Response);
            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 2: Success
        it('returns latest result for authenticated user', async () => {
            // Mock Mongoose chain: findOne -> sort -> limit
            const limitMock = (jest.fn() as any).mockResolvedValue(mockStoredResult);
            const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
            (Result.findOne as any).mockReturnValue({ sort: sortMock });

            await getLatestResult(authReq as AuthenticatedRequest, res as Response);

            expect(Result.findOne).toHaveBeenCalledWith({ userId: 'user-123' });
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                results: expect.anything()
            }));
        });

        // Test 3: No Results
        it('returns 404 when no result found', async () => {
            const limitMock = (jest.fn() as any).mockResolvedValue(null);
            const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
            (Result.findOne as any).mockReturnValue({ sort: sortMock });

            await getLatestResult(authReq as AuthenticatedRequest, res as Response);

            expect(status).toHaveBeenCalledWith(404);
        });

        // Test 4: DB Error
        it('returns 500 when database query fails', async () => {
        });
    });
});
