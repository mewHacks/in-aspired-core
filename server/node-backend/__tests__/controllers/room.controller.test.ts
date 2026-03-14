// room.controller.test.ts
// Tests for room management: listing, creating, joining, and eligibility

/// <reference types="jest" />
// Tells TypeScript to include Jest's type definitions
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Response } from 'express';
import * as roomController from '../../src/controllers/room.controller';
import Room from '../../src/models/Room';
import Participation from '../../src/models/Participation';
import RoomMember from '../../src/models/RoomMember';
import Result from '../../src/models/Result';
import { AuthenticatedRequest } from '../../src/types/express';
import * as roomStateStore from '../../src/socket/roomStateStore';

// Mock roomStateStore
jest.mock('../../src/socket/roomStateStore', () => ({
    getRoomUserCount: jest.fn()
}));

// Mock Mongoose Models
// We mock the implicit 'save' method by returning the object itself
jest.mock('../../src/models/Room', () => {
    const mockModel = jest.fn().mockImplementation((data: any) => ({
        ...data,
        _id: { toString: () => 'room-new-id' },
        save: jest.fn().mockImplementation(async function (this: any) { return this; })
    }));
    (mockModel as any).find = jest.fn();
    (mockModel as any).findById = jest.fn();
    return {
        __esModule: true,
        default: mockModel
    };
});

jest.mock('../../src/models/Participation', () => ({
    __esModule: true,
    default: { countDocuments: jest.fn() }
}));

// RoomMember is no longer used for live counts, but we keep the mock if other parts of the system still reference it
jest.mock('../../src/models/RoomMember', () => ({
    __esModule: true,
    default: { countDocuments: jest.fn() }
}));

// Mock Result model (used by RIASEC domain scoring in getRooms)
jest.mock('../../src/models/Result', () => {
    const mockQuery = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(null as never) };
    return {
        __esModule: true,
        default: { findOne: jest.fn().mockReturnValue(mockQuery) }
    };
});

// Mock activity logger (createRoom calls logActivity)
jest.mock('../../src/middleware/activityLogger', () => ({
    logActivity: jest.fn().mockResolvedValue(undefined as never),
    buildMeta: jest.fn().mockReturnValue({})
}));

// Main test suite for Room Controller
describe('Room Controller', () => {

    // Initialize request and response objects for each test
    let req: Partial<AuthenticatedRequest>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    // Runs before each test to reset state
    beforeEach(() => {
        // Clear all mock call history
        jest.clearAllMocks();

        // Suppress console.error for expected error tests
        jest.spyOn(console, 'error').mockImplementation(() => { });

        // Mock response methods
        json = jest.fn();
        status = jest.fn(() => ({ json })); // Allow chaining .status().json()
        res = { status, json } as any;

        // Mock request object with default user
        req = {
            params: {},
            query: {},
            body: {},
            ip: '127.0.0.1',
            user: { id: 'user-123', role: 'user' }
        };

        // Re-apply default mocked methods
        (Room.find as any).mockClear();
        (Room.findById as any).mockClear();
        (Participation.countDocuments as any).mockClear();
        (roomStateStore.getRoomUserCount as any).mockClear();

        // Re-setup Result mock chain (clearAllMocks resets implementations)
        const mockResultQuery = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(null as never) };
        (Result.findOne as any).mockReturnValue(mockResultQuery);
    });

    // ========================================
    // Test Suite: getRooms
    // Description: Verifies listing rooms with various filters
    // ========================================
    describe('getRooms', () => {
        const mockRooms = [
            {
                _id: 'room1',
                name: 'Study Group',
                type: 'public',
                isActive: true,
                toObject: () => ({ _id: 'room1', name: 'Study Group', type: 'public' })
            },
            {
                _id: 'room2',
                name: 'Private Session',
                type: 'private',
                isActive: true,
                toObject: () => ({ _id: 'room2', name: 'Private Session', type: 'private' })
            }
        ];

        // Test 1: Fetch all active rooms
        it('should return all active rooms with member counts', async () => {
            // Mock query chain: find() -> populate() -> sort()
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                sort: (jest.fn() as any).mockResolvedValue(mockRooms)
            };
            (Room.find as any).mockReturnValue(mockQuery);

            // Mock member count for each room (using Redis store now)
            (roomStateStore.getRoomUserCount as any).mockResolvedValue(5);

            // Execute controller
            await roomController.getRooms(req as AuthenticatedRequest, res as Response);

            // Verify Room.find called with isActive: true
            expect(Room.find).toHaveBeenCalledWith({ isActive: true });

            // Verify response contains rooms with appended memberCount
            expect(json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ _id: 'room1', memberCount: 5 }),
                    expect.objectContaining({ _id: 'room2', memberCount: 5 })
                ])
            );
        });

        // Test 2: Filter by search term
        it('should filter rooms by search term', async () => {
            // Set query parameter
            req.query = { search: 'Study' };

            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                sort: (jest.fn() as any).mockResolvedValue([])
            };
            (Room.find as any).mockReturnValue(mockQuery);

            // Execute controller
            await roomController.getRooms(req as AuthenticatedRequest, res as Response);

            // Verify regex search in MongoDB query
            expect(Room.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    isActive: true,
                    name: { $regex: 'Study', $options: 'i' }
                })
            );
        });

        // Test 3: Filter by type
        it('should filter rooms by type (e.g., private)', async () => {
            req.query = { type: 'private' };

            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                sort: (jest.fn() as any).mockResolvedValue([])
            };
            (Room.find as any).mockReturnValue(mockQuery);

            // Execute controller
            await roomController.getRooms(req as AuthenticatedRequest, res as Response);

            expect(Room.find).toHaveBeenCalledWith(
                expect.objectContaining({ isActive: true, type: 'private' })
            );
        });

        // Test 4: Handle database errors gracefully
        it('should return 500 on database error', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                sort: (jest.fn() as any).mockRejectedValue(new Error('DB Error'))
            };
            (Room.find as any).mockReturnValue(mockQuery);

            // Execute controller
            await roomController.getRooms(req as AuthenticatedRequest, res as Response);

            // Verify 500 status code
            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Failed to fetch rooms' });
        });
    });

    // ========================================
    // Test Suite: getEligibility
    // Description: Verifies if a user is allowed to create a room
    // ========================================
    describe('getEligibility', () => {

        // Test 1: Unauthenticated user
        it('should return 401 when user is not authenticated', async () => {
            req.user = undefined;

            await roomController.getEligibility(req as AuthenticatedRequest, res as Response);

            expect(status).toHaveBeenCalledWith(401);
            expect(json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        // Test 2: User has not participated enough
        it('should return eligible=false when participation count is below threshold', async () => {
            // Mock countDocuments to return 2 (threshold is 3)
            (Participation.countDocuments as any).mockResolvedValue(2);

            await roomController.getEligibility(req as AuthenticatedRequest, res as Response);

            // Verify query and response
            expect(Participation.countDocuments).toHaveBeenCalledWith({
                userId: 'user-123',
                durationMin: { $gte: 25 }
            });
            expect(json).toHaveBeenCalledWith({
                eligible: false,
                count: 2,
                threshold: 3
            });
        });

        // Test 3: User meets requirements
        it('should return eligible=true when participation count meets threshold', async () => {
            // Mock countDocuments to return 5
            (Participation.countDocuments as any).mockResolvedValue(5);

            await roomController.getEligibility(req as AuthenticatedRequest, res as Response);

            expect(json).toHaveBeenCalledWith({
                eligible: true,
                count: 5,
                threshold: 3
            });
        });

        // Test 4: Admin Bypass
        it('should allow admin to bypass participation requirements', async () => {
            req.user = { id: 'admin-123', role: 'Admin' };
            // Even with 0 participations
            (Participation.countDocuments as any).mockResolvedValue(0);

            await roomController.getEligibility(req as AuthenticatedRequest, res as Response);

            expect(json).toHaveBeenCalledWith({
                eligible: true, // Should be true for admin
                count: 0,
                threshold: 3
            });
        });
    });

    // ========================================
    // Test Suite: createRoom
    // Description: Verifies room creation logic and validation
    // ========================================
    describe('createRoom', () => {
        const validRoomData = {
            name: 'Study Session',
            description: 'Math study group',
            type: 'public',
            maxParticipants: 10,
            level: 'Intermediate',
            sessionDuration: 45
        };

        beforeEach(() => {
            req.body = { ...validRoomData };
        });

        // Test 1: Eligibility Internal Check
        it('should return 403 when user is not eligible (double check)', async () => {
            // Mock participation count < 3
            (Participation.countDocuments as any).mockResolvedValue(1);

            await roomController.createRoom(req as AuthenticatedRequest, res as Response);

            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({
                message: 'You need to participate in at least 3 study sessions to create a room.'
            });
        });

        // Test 2: Successful Creation
        it('should create room successfully when user is eligible', async () => {
            // Mock participation count > 3
            (Participation.countDocuments as any).mockResolvedValue(5);

            // Mock Room instantiation and save
            const mockSave = jest.fn().mockImplementation(async function (this: any) { return this; });
            (Room as any).mockImplementation((data: any) => ({
                ...data,
                _id: { toString: () => 'room-new-id' },
                save: mockSave
            }));

            await roomController.createRoom(req as AuthenticatedRequest, res as Response);

            // Verify Room constructor called with correct data including ownerId
            expect(Room).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Study Session',
                    ownerId: 'user-123'
                })
            );
            expect(status).toHaveBeenCalledWith(201);
        });

        // Test 3: Private Room Join Code
        it('should set joinCode ONLY for private rooms', async () => {
            (Participation.countDocuments as any).mockResolvedValue(5);
            req.body = { ...validRoomData, type: 'private', joinCode: 'SECRET123' };

            const mockSave = jest.fn().mockImplementation(async function (this: any) { return this; });
            (Room as any).mockImplementation((data: any) => ({
                ...data,
                save: mockSave
            }));

            await roomController.createRoom(req as AuthenticatedRequest, res as Response);

            // Expect joinCode to be preserved
            expect(Room).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'private',
                    joinCode: 'SECRET123'
                })
            );
        });
    });

    // ========================================
    // Test Suite: joinRoom
    // Description: Verifies joining logic, password protection, and capacity
    // ========================================
    describe('joinRoom', () => {
        const mockPublicRoom = {
            _id: 'room-123',
            name: 'Public Room',
            type: 'public',
            maxParticipants: 10,
            ownerId: { toString: () => 'owner-456' }
        };

        const mockPrivateRoom = {
            _id: 'room-456',
            name: 'Private Room',
            type: 'private',
            joinCode: 'SECRET123',
            maxParticipants: 5,
            ownerId: { toString: () => 'owner-789' }
        };

        // Test 1: Public Room
        it('should allow joining a public room without code', async () => {
            req.params = { id: 'room-123' };
            (Room.findById as any).mockResolvedValue(mockPublicRoom);
            (roomStateStore.getRoomUserCount as any).mockResolvedValue(3); // Not full

            await roomController.joinRoom(req as AuthenticatedRequest, res as Response);

            expect(json).toHaveBeenCalledWith({
                message: 'Join allowed',
                roomId: 'room-123'
            });
        });

        // Test 2: Private Room Success
        it('should allow joining a private room with correct code', async () => {
            req.params = { id: 'room-456' };
            req.body = { joinCode: 'SECRET123' };
            (Room.findById as any).mockResolvedValue(mockPrivateRoom);
            (roomStateStore.getRoomUserCount as any).mockResolvedValue(2);

            await roomController.joinRoom(req as AuthenticatedRequest, res as Response);

            expect(json).toHaveBeenCalledWith({
                message: 'Join allowed',
                roomId: 'room-456'
            });
        });

        // Test 3: Private Room Wrong Code
        it('should reject joining a private room with wrong code', async () => {
            req.params = { id: 'room-456' };
            req.body = { joinCode: 'WRONG_CODE' };
            (Room.findById as any).mockResolvedValue(mockPrivateRoom);

            await roomController.joinRoom(req as AuthenticatedRequest, res as Response);

            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({ message: 'Invalid join code' });
        });

        // Test 4: Room Full
        it('should reject join when room is full', async () => {
            req.params = { id: 'room-123' };
            (Room.findById as any).mockResolvedValue(mockPublicRoom);
            (roomStateStore.getRoomUserCount as any).mockResolvedValue(10); // At capacity

            await roomController.joinRoom(req as AuthenticatedRequest, res as Response);

            expect(status).toHaveBeenCalledWith(409);
            expect(json).toHaveBeenCalledWith({ message: 'Room is full' });
        });
    });
});
