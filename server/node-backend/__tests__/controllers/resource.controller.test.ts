// resource.controller.test.ts
// Tests for resource management: library recommendations, room resources, uploads, and reporting

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Response } from 'express';
import * as resourceController from '../../src/controllers/resource.controller';
import Resource, { ResourceStatus } from '../../src/models/Resource';
import CuratedResource from '../../src/models/CuratedResource';
import Room from '../../src/models/Room';
import User from '../../src/models/User';
import Feedback from '../../src/models/Feedback';
import { AuthRequest } from '../../src/middleware/auth.middleware';

// Mock Mongoose Models
// Standardizing mock implementation with explicit 'any' casting for chainable methods
jest.mock('../../src/models/Resource', () => {
    const mockModel = jest.fn().mockImplementation((data: any) => ({
        ...data,
        save: jest.fn().mockImplementation(async function (this: any) { return this; }),
        populate: jest.fn().mockImplementation(async function (this: any) { return this; })
    }));
    (mockModel as any).find = jest.fn();
    (mockModel as any).findById = jest.fn();
    (mockModel as any).countDocuments = jest.fn();
    return {
        __esModule: true,
        default: mockModel,
        ResourceStatus: { ACTIVE: 'active', HIDDEN: 'hidden' }
    };
});

jest.mock('../../src/models/CuratedResource', () => ({
    __esModule: true,
    default: { find: jest.fn() }
}));

jest.mock('../../src/models/Room', () => ({
    __esModule: true,
    default: { findById: jest.fn() }
}));

jest.mock('../../src/models/User', () => ({
    __esModule: true,
    default: {
        findById: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockImplementation(() => Promise.resolve({ name: 'Test User', email: 'test@example.com' }))
            })
        })
    }
}));

jest.mock('../../src/models/Feedback', () => ({
    __esModule: true,
    default: { create: jest.fn().mockImplementation(() => Promise.resolve({})) },
    FeedbackType: { CONTENT: 'content' },
    FeedbackStatus: { PENDING: 'pending' },
    RelatedEntityType: { RESOURCE: 'resource' }
}));

// Main test suite
describe('Resource Controller', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Suppress console.error for expected error tests
        jest.spyOn(console, 'error').mockImplementation(() => { });
        json = jest.fn();
        status = jest.fn(() => ({ json }));
        res = { status, json } as any;
        req = {
            params: {},
            query: {},
            body: {},
            user: { id: 'user-123', role: 'user' }
        };

        // Re-apply mocks after clearAllMocks
        (Resource as any).find = jest.fn();
        (Resource as any).findById = jest.fn();
        (Resource as any).countDocuments = jest.fn();
        (CuratedResource as any).find = jest.fn();
        (Room as any).findById = jest.fn();
    });

    // ========================================
    // getRecommendedResources Tests
    // Description: Verifies filtering and fetching of curated resources
    // ========================================
    describe('getRecommendedResources', () => {
        const mockResources = [
            { _id: 'res1', title: 'React Guide', domainIds: ['computing'] },
            { _id: 'res2', title: 'Python Tutorial', domainIds: ['computing'] }
        ];

        // Test 1: Fetch published resources (no filters)
        it('should return published resources with no filters', async () => {
            // Mock Mongoose chain: find() -> limit()
            const limitMock = (jest.fn() as any).mockResolvedValue(mockResources);
            (CuratedResource.find as any).mockReturnValue({ limit: limitMock });

            req.query = {};

            await resourceController.getRecommendedResources(req as AuthRequest, res as Response);

            expect(CuratedResource.find).toHaveBeenCalledWith({ isPublished: true });
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(mockResources);
        });

        // Test 2: Filter by domain
        it('should filter by domain when provided', async () => {
            const limitMock = (jest.fn() as any).mockResolvedValue(mockResources);
            (CuratedResource.find as any).mockReturnValue({ limit: limitMock });

            req.query = { domain: 'computing' };

            await resourceController.getRecommendedResources(req as AuthRequest, res as Response);

            expect(CuratedResource.find).toHaveBeenCalledWith({
                isPublished: true,
                domainIds: { $regex: expect.any(RegExp) }
            });
        });

        // Test 3: Filter by difficulty level
        it('should filter by level when provided', async () => {
            const limitMock = (jest.fn() as any).mockResolvedValue(mockResources);
            (CuratedResource.find as any).mockReturnValue({ limit: limitMock });

            req.query = { level: 'Beginner' };

            await resourceController.getRecommendedResources(req as AuthRequest, res as Response);

            expect(CuratedResource.find).toHaveBeenCalledWith({
                isPublished: true,
                levels: 'Beginner'
            });
        });

        // Test 4: Special case for "General" filter
        it('should ignore "General" domain filter', async () => {
            const limitMock = (jest.fn() as any).mockResolvedValue(mockResources);
            (CuratedResource.find as any).mockReturnValue({ limit: limitMock });

            req.query = { domain: 'General' };

            await resourceController.getRecommendedResources(req as AuthRequest, res as Response);

            // Should NOT include domainIds filter in query
            expect(CuratedResource.find).toHaveBeenCalledWith({ isPublished: true });
        });

        // Test 5: Error handling
        it('should return 500 on database error', async () => {
            (CuratedResource.find as any).mockReturnValue({
                limit: (jest.fn() as any).mockRejectedValue(new Error('DB Error'))
            });

            await resourceController.getRecommendedResources(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ error: 'Failed to fetch recommendations' });
        });
    });

    // ========================================
    // getRoomResources Tests
    // Description: Verifies pagination logic for room resources
    // ========================================
    describe('getRoomResources', () => {
        const mockResources = [
            { _id: 'res1', title: 'Study Notes', uploaderId: { name: 'John' } },
            { _id: 'res2', title: 'Code Snippet', uploaderId: { name: 'Jane' } }
        ];

        // Test 1: Successful pagination
        it('should return paginated room resources', async () => {
            req.params = { roomId: 'room-123' };
            req.query = { page: '1', limit: '10' };

            // Mock complex query chain: find() -> populate() -> sort() -> skip() -> limit()
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: (jest.fn() as any).mockResolvedValue(mockResources)
            };
            (Resource.find as any).mockReturnValue(mockQuery);
            (Resource.countDocuments as any).mockResolvedValue(25);

            await resourceController.getRoomResources(req as AuthRequest, res as Response);

            expect(Resource.find).toHaveBeenCalledWith({
                roomId: 'room-123',
                status: 'active'
            });
            expect(json).toHaveBeenCalledWith({
                data: mockResources,
                meta: {
                    page: 1,
                    limit: 10,
                    total: 25,
                    hasMore: true
                }
            });
        });

        // Test 2: Default pagination params
        it('should use default pagination values when not provided', async () => {
            req.params = { roomId: 'room-123' };
            req.query = {}; // No pagination params

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: (jest.fn() as any).mockResolvedValue([])
            };
            (Resource.find as any).mockReturnValue(mockQuery);
            (Resource.countDocuments as any).mockResolvedValue(0);

            await resourceController.getRoomResources(req as AuthRequest, res as Response);

            // Default: page 1, limit 20. Skip should be 0.
            expect(mockQuery.skip).toHaveBeenCalledWith(0);
            expect(mockQuery.limit).toHaveBeenCalledWith(20);
        });

        // Test 3: Pagination metadata (hasMore)
        it('should return hasMore=false when on last page', async () => {
            req.params = { roomId: 'room-123' };
            req.query = { page: '2', limit: '10' };

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: (jest.fn() as any).mockResolvedValue([{ _id: 'last' }])
            };
            (Resource.find as any).mockReturnValue(mockQuery);
            // Total 11 items. Page 2 (items 11-20) will have 1 item.
            (Resource.countDocuments as any).mockResolvedValue(11);

            await resourceController.getRoomResources(req as AuthRequest, res as Response);

            expect(json).toHaveBeenCalledWith(
                expect.objectContaining({
                    meta: expect.objectContaining({ hasMore: false })
                })
            );
        });

        // Test 4: Error handling
        it('should return 500 on database error', async () => {
            req.params = { roomId: 'room-123' };

            // Mock query chain that throws error
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: (jest.fn() as any).mockRejectedValue(new Error('DB Error'))
            };
            (Resource.find as any).mockReturnValue(mockQuery);

            await resourceController.getRoomResources(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Failed to fetch resources' });
        });
    });

    // ========================================
    // addResource Tests
    // Description: Verifies uploads, validation, and rate limiting
    // ========================================
    describe('addResource', () => {
        const validResourceData = {
            title: 'Study Guide',
            type: 'document',
            url: 'https://example.com/guide.pdf',
            description: 'A helpful study guide',
            tags: ['study', 'guide'],
            scope: 'session'
        };

        beforeEach(() => {
            req.params = { roomId: 'room-123' };
            req.body = { ...validResourceData };
        });

        // Test 1: Room existence check
        it('should return 404 when room not found', async () => {
            (Room.findById as any).mockResolvedValue(null);

            await resourceController.addResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ message: 'Room not found' });
        });

        // Test 2: Rate limit check
        it('should return 429 when rate limit exceeded (5 uploads in 10 min)', async () => {
            (Room.findById as any).mockResolvedValue({ _id: 'room-123' });
            // Simulate 5 existing resources in last 10 mins
            (Resource.countDocuments as any).mockResolvedValue(5);

            await resourceController.addResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(429);
            expect(json).toHaveBeenCalledWith({ message: 'Upload limit reached. Try again in 10 minutes.' });
        });

        // Test 3: Content Moderation (Title)
        it('should return 400 when title contains banned words', async () => {
            (Room.findById as any).mockResolvedValue({ _id: 'room-123' });
            (Resource.countDocuments as any).mockResolvedValue(0);

            req.body.title = 'This is spam content';

            await resourceController.addResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'Content contains restricted keywords.' });
        });

        // Test 4: Content Moderation (Description)
        it('should return 400 when description contains banned words', async () => {
            (Room.findById as any).mockResolvedValue({ _id: 'room-123' });
            (Resource.countDocuments as any).mockResolvedValue(0);

            req.body.description = 'Contains nsfw material';

            await resourceController.addResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'Content contains restricted keywords.' });
        });

        // Test 5: Successful Creation
        it('should create resource successfully with valid data', async () => {
            (Room.findById as any).mockResolvedValue({ _id: 'room-123' });
            (Resource.countDocuments as any).mockResolvedValue(0);

            // Mock Resource constructor and methods
            const mockSave = jest.fn().mockImplementation(async function (this: any) { return this; });
            const mockPopulate = jest.fn().mockImplementation(async function (this: any) { return this; });
            (Resource as any).mockImplementation((data: any) => ({
                ...data,
                save: mockSave,
                populate: mockPopulate
            }));

            await resourceController.addResource(req as AuthRequest, res as Response);

            expect(Resource).toHaveBeenCalledWith(
                expect.objectContaining({
                    roomId: 'room-123',
                    uploaderId: 'user-123',
                    title: 'Study Guide',
                    type: 'document',
                    status: 'active'
                })
            );
            expect(status).toHaveBeenCalledWith(201);
        });

        // Test 6: Default Scope
        it('should default scope to session when not provided', async () => {
            (Room.findById as any).mockResolvedValue({ _id: 'room-123' });
            (Resource.countDocuments as any).mockResolvedValue(0);

            delete req.body.scope;

            const mockSave = jest.fn().mockImplementation(async function (this: any) { return this; });
            const mockPopulate = jest.fn().mockImplementation(async function (this: any) { return this; });
            (Resource as any).mockImplementation((data: any) => ({
                ...data,
                save: mockSave,
                populate: mockPopulate
            }));

            await resourceController.addResource(req as AuthRequest, res as Response);

            expect(Resource).toHaveBeenCalledWith(
                expect.objectContaining({ scope: 'session' })
            );
        });

        // Test 7: DB Error
        it('should return 500 on database error', async () => {
            (Room.findById as any).mockRejectedValue(new Error('DB Error'));

            await resourceController.addResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Failed to add resource' });
        });
    });

    // ========================================
    // reportResource Tests
    // Description: Verifies reporting logic and auto-hide threshold
    // ========================================
    describe('reportResource', () => {
        const mockResource = {
            _id: 'res-123',
            title: 'Test Resource',
            reports: [] as any[],
            status: 'active',
            save: jest.fn()
        };

        beforeEach(() => {
            req.params = { resourceId: 'res-123' };
            req.body = { reason: 'Inappropriate content' };
            // Reset the mock resource state
            mockResource.reports = [];
            mockResource.status = 'active';
            mockResource.save = jest.fn().mockImplementation(async () => mockResource);
            // Restore User/Feedback mocks cleared by outer beforeEach
            (User.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockImplementation(() => Promise.resolve({ name: 'Test User', email: 'test@example.com' }))
                })
            });
            (Feedback.create as jest.Mock).mockImplementation(() => Promise.resolve({}));
        });

        // Test 1: Resource check
        it('should return 404 when resource not found', async () => {
            (Resource.findById as any).mockResolvedValue(null);

            await resourceController.reportResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ message: 'Resource not found' });
        });

        // Test 2: Duplicate Report Check
        it('should return 400 when user already reported this resource', async () => {
            mockResource.reports = [{ userId: 'user-123', reason: 'Spam' }];
            (Resource.findById as any).mockResolvedValue(mockResource);

            await resourceController.reportResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'You have already reported this resource.' });
        });

        // Test 3: Successful Report
        it('should add report successfully', async () => {
            mockResource.reports = [];
            (Resource.findById as any).mockResolvedValue(mockResource);

            await resourceController.reportResource(req as AuthRequest, res as Response);

            expect(mockResource.reports.length).toBe(1);
            expect(mockResource.reports[0]).toEqual(
                expect.objectContaining({
                    userId: 'user-123',
                    reason: 'Inappropriate content'
                })
            );
            expect(mockResource.save).toHaveBeenCalled();
            expect(json).toHaveBeenCalledWith({ message: 'Resource reported. Thank you for keeping the community safe.' });
        });

        // Test 4: Default Reason
        it('should use default reason when not provided', async () => {
            mockResource.reports = [];
            (Resource.findById as any).mockResolvedValue(mockResource);
            req.body = {}; // No reason provided

            await resourceController.reportResource(req as AuthRequest, res as Response);

            expect(mockResource.reports[0].reason).toBe('Inappropriate content');
        });

        // Test 5: Auto-Hide Logic
        it('should auto-hide resource after 2 distinct reports', async () => {
            // Setup: Already has 1 report from another user
            mockResource.reports = [{ userId: 'other-user', reason: 'Spam' }];
            (Resource.findById as any).mockResolvedValue(mockResource);

            await resourceController.reportResource(req as AuthRequest, res as Response);

            // Post-condition: Should have 2 reports and status='hidden'
            expect(mockResource.reports.length).toBe(2);
            expect(mockResource.status).toBe('hidden');
            expect(mockResource.save).toHaveBeenCalled();
        });

        // Test 6: DB Error
        it('should return 500 on database error', async () => {
            (Resource.findById as any).mockRejectedValue(new Error('DB Error'));

            await resourceController.reportResource(req as AuthRequest, res as Response);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Failed to report resource' });
        });
    });
});
