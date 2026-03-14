// feedback.controller.test.ts
// Tests for feedback submission, retrieval, resolution, and deletion

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import {
    submitFeedback,
    getMyFeedback,
    getAllFeedback,
    getFeedbackById,
    resolveFeedback,
    deleteFeedback
} from '../../src/controllers/feedback.controller';
import Feedback, { FeedbackType, FeedbackStatus } from '../../src/models/Feedback';
import User from '../../src/models/User';

// Mock Feedback model
jest.mock('../../src/models/Feedback', () => {
    return {
        __esModule: true,
        default: {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            getStats: jest.fn()
        },
        FeedbackType: {
            BUG: 'bug',
            CONTENT: 'content',
            FEATURE: 'feature',
            GENERAL: 'general'
        },
        FeedbackStatus: {
            PENDING: 'pending',
            RESOLVED: 'resolved'
        },
        RelatedEntityType: {
            COURSE: 'course',
            CAREER: 'career',
            ROOM: 'room',
            RESOURCE: 'resource',
            GENERAL: 'general'
        }
    };
});

// Mock User model
jest.mock('../../src/models/User', () => ({
    __esModule: true,
    default: {
        findById: jest.fn()
    }
}));

// Mock Resource model (used by unresolveFeedback)
jest.mock('../../src/models/Resource', () => ({
    __esModule: true,
    default: {
        findByIdAndUpdate: jest.fn()
    },
    ResourceStatus: {
        ACTIVE: 'active',
        HIDDEN: 'hidden'
    }
}));

// Mock upload middleware
jest.mock('../../src/middleware/upload', () => ({
    uploadFeedbackFiles: jest.fn()
}));

// Mock @in-aspired/shared
jest.mock('@in-aspired/shared', () => ({
    UserRole: {
        ADMIN: 'admin',
        STUDENT: 'student'
    }
}));

describe('Feedback Controller', () => {
    let req: any;
    let res: any;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});

        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        res = { status, json } as any;
        req = {
            user: { id: 'user123', email: 'user@test.com', role: 'student', name: 'Test User' },
            body: {},
            params: {},
            query: {},
            files: []
        };
    });

    // ========================================
    // submitFeedback
    // ========================================
    describe('submitFeedback', () => {

        // Test 1: Unauthenticated user
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;

            await submitFeedback(req, res);

            expect(status).toHaveBeenCalledWith(401);
            expect(json).toHaveBeenCalledWith({ message: 'Authentication required' });
        });

        // Test 2: Message too short
        it('should return 400 if message is under 10 characters', async () => {
            req.body = { message: 'short' };

            await submitFeedback(req, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('at least 10 characters')
            }));
        });

        // Test 3: Message too long
        it('should return 400 if message exceeds 1000 characters', async () => {
            req.body = { message: 'a'.repeat(1001) };

            await submitFeedback(req, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('cannot exceed 1000 characters')
            }));
        });

        // Test 4: Invalid feedback type
        it('should return 400 for invalid feedback type', async () => {
            req.body = { message: 'This is valid feedback message', type: 'invalid_type' };

            await submitFeedback(req, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Invalid feedback type')
            }));
        });

        // Test 5: Successful submission
        it('should create feedback successfully with valid data', async () => {
            req.body = { message: 'This is a valid bug report about the quiz feature', type: 'bug' };

            const mockUser = { _id: 'user123', name: 'Test User', email: 'user@test.com' };
            (User.findById as any).mockResolvedValue(mockUser);

            const mockFeedback = {
                _id: 'fb123',
                type: 'bug',
                message: 'This is a valid bug report about the quiz feature',
                status: 'pending',
                attachments: [],
                createdAt: new Date()
            };
            (Feedback.create as any).mockResolvedValue(mockFeedback);

            await submitFeedback(req, res);

            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(Feedback.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user123',
                userName: 'Test User',
                userEmail: 'user@test.com',
                type: 'bug',
                message: 'This is a valid bug report about the quiz feature',
                status: 'pending'
            }));
            expect(status).toHaveBeenCalledWith(201);
        });

        // Test 6: User not found
        it('should return 404 if user not found in DB', async () => {
            req.body = { message: 'This is a valid feedback message' };
            (User.findById as any).mockResolvedValue(null);

            await submitFeedback(req, res);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });

    // ========================================
    // getMyFeedback
    // ========================================
    describe('getMyFeedback', () => {

        // Test 7: Unauthenticated
        it('should return 401 if not authenticated', async () => {
            req.user = undefined;

            await getMyFeedback(req, res);

            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 8: Returns user's feedback
        it('should return the authenticated user\'s feedback', async () => {
            const mockFeedback = [
                { _id: 'fb1', message: 'Feedback 1' },
                { _id: 'fb2', message: 'Feedback 2' }
            ];

            (Feedback.find as any).mockReturnValue({
                sort: (jest.fn() as any).mockReturnValue({
                    select: (jest.fn() as any).mockResolvedValue(mockFeedback)
                })
            });

            await getMyFeedback(req, res);

            expect(Feedback.find).toHaveBeenCalledWith({ userId: 'user123' });
            expect(json).toHaveBeenCalledWith({
                count: 2,
                feedback: mockFeedback
            });
        });
    });

    // ========================================
    // getAllFeedback (admin)
    // ========================================
    describe('getAllFeedback', () => {

        // Test 9: Non-admin rejected
        it('should return 403 if user is not admin', async () => {
            req.user = { id: 'user123', role: 'student' };

            await getAllFeedback(req, res);

            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({ message: 'Admin access required' });
        });

        // Test 10: Admin gets paginated feedback
        it('should return paginated feedback for admin', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.query = { page: '1', limit: '10' };

            const mockFeedbackList = [{ _id: 'fb1' }, { _id: 'fb2' }];
            const mockStats = { total: 2, pending: 1, resolved: 1, byType: {} };

            (Feedback.find as any).mockReturnValue({
                sort: (jest.fn() as any).mockReturnValue({
                    limit: (jest.fn() as any).mockReturnValue({
                        skip: (jest.fn() as any).mockReturnValue({
                            select: (jest.fn() as any).mockReturnValue({
                                lean: (jest.fn() as any).mockResolvedValue(mockFeedbackList)
                            })
                        })
                    })
                })
            });
            (Feedback.countDocuments as any).mockResolvedValue(2);
            (Feedback.getStats as any).mockResolvedValue(mockStats);

            await getAllFeedback(req, res);

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                feedback: mockFeedbackList,
                pagination: expect.objectContaining({
                    total: 2,
                    page: 1,
                    limit: 10
                }),
                stats: mockStats
            }));
        });
    });

    // ========================================
    // getFeedbackById (admin)
    // ========================================
    describe('getFeedbackById', () => {

        // Test 11: Non-admin rejected
        it('should return 403 for non-admin', async () => {
            req.user = { id: 'user123', role: 'student' };
            req.params = { id: 'fb1' };

            await getFeedbackById(req, res);

            expect(status).toHaveBeenCalledWith(403);
        });

        // Test 12: Not found
        it('should return 404 if feedback not found', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.params = { id: 'nonexistent' };

            (Feedback.findById as any).mockReturnValue({
                populate: (jest.fn() as any).mockReturnValue({
                    populate: (jest.fn() as any).mockResolvedValue(null)
                })
            });

            await getFeedbackById(req, res);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ message: 'Feedback not found' });
        });

        // Test 13: Found and returned
        it('should return feedback when found', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.params = { id: 'fb1' };

            const mockFb = { _id: 'fb1', message: 'Test feedback', type: 'bug' };
            (Feedback.findById as any).mockReturnValue({
                populate: (jest.fn() as any).mockReturnValue({
                    populate: (jest.fn() as any).mockResolvedValue(mockFb)
                })
            });

            await getFeedbackById(req, res);

            expect(json).toHaveBeenCalledWith({ feedback: mockFb });
        });
    });

    // ========================================
    // resolveFeedback (admin)
    // ========================================
    describe('resolveFeedback', () => {

        // Test 14: Non-admin rejected
        it('should return 403 for non-admin', async () => {
            req.user = { id: 'user123', role: 'student' };
            req.params = { id: 'fb1' };

            await resolveFeedback(req, res);

            expect(status).toHaveBeenCalledWith(403);
        });

        // Test 15: Not found
        it('should return 404 if feedback not found', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.params = { id: 'nonexistent' };

            (Feedback.findById as any).mockResolvedValue(null);

            await resolveFeedback(req, res);

            expect(status).toHaveBeenCalledWith(404);
        });

        // Test 16: Already resolved
        it('should return 400 if feedback is already resolved', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.params = { id: 'fb1' };

            (Feedback.findById as any).mockResolvedValue({
                _id: 'fb1',
                status: 'resolved'
            });

            await resolveFeedback(req, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'Feedback already resolved' });
        });

        // Test 17: Successful resolve
        it('should resolve feedback successfully', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.params = { id: 'fb1' };

            const mockFb = {
                _id: 'fb1',
                status: 'pending',
                resolvedAt: undefined,
                resolvedBy: undefined,
                resolve: (jest.fn() as any).mockResolvedValue(undefined)
            };
            // After resolve is called, the status should be updated
            (mockFb.resolve as any).mockImplementation(function (this: any) {
                mockFb.status = 'resolved';
                mockFb.resolvedAt = new Date() as any;
                mockFb.resolvedBy = 'admin1' as any;
                return Promise.resolve();
            });

            (Feedback.findById as any).mockResolvedValue(mockFb);

            await resolveFeedback(req, res);

            expect(mockFb.resolve).toHaveBeenCalledWith('admin1');
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Feedback resolved successfully'
            }));
        });
    });

    // ========================================
    // deleteFeedback (admin)
    // ========================================
    describe('deleteFeedback', () => {

        // Test 18: Non-admin rejected
        it('should return 403 for non-admin', async () => {
            req.user = { id: 'user123', role: 'student' };
            req.params = { id: 'fb1' };

            await deleteFeedback(req, res);

            expect(status).toHaveBeenCalledWith(403);
        });

        // Test 19: Not found
        it('should return 404 if feedback not found', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.params = { id: 'nonexistent' };

            (Feedback.findByIdAndDelete as any).mockResolvedValue(null);

            await deleteFeedback(req, res);

            expect(status).toHaveBeenCalledWith(404);
        });

        // Test 20: Successful delete
        it('should delete feedback successfully', async () => {
            req.user = { id: 'admin1', role: 'admin' };
            req.params = { id: 'fb1' };

            (Feedback.findByIdAndDelete as any).mockResolvedValue({ _id: 'fb1' });

            await deleteFeedback(req, res);

            expect(json).toHaveBeenCalledWith({ message: 'Feedback deleted successfully' });
        });
    });
});
