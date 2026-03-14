// room-events.test.ts
// Test file for real-time room socket events (joining room, drawing, messaging, kicking user and session cleanup)

// For socket.io, always attach event listeners before emitting events
// Prevent flaky tests and race conditions
// e.g. clientSocket.on('room-users-snapshot', ...);
// clientSocket.emit('join-room', { roomId, user });

/// <reference types="jest" />
// Tells TypeScript to include Jest's type definitions
// Enables autocomplete and type checking for Jest functions (e.g., describe, it, expect, jest.fn)
import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createServer } from 'http';
import { Server } from 'socket.io'; // Socket.IO Server type
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { initSocket } from '../../src/socket';
import { resetStore } from '../../src/socket/roomStateStore';
import * as redisConfig from '../../src/config/redis';
import { AddressInfo } from 'net';
import Room from '../../src/models/Room';

jest.mock('../../src/models/Room');
jest.mock('../../src/config/redis', () => {
    const original = jest.requireActual('../../src/config/redis') as any;
    return {
        ...original,
        initRedis: jest.fn().mockImplementation(() => Promise.resolve()),
        closeRedis: jest.fn().mockImplementation(() => Promise.resolve()),
        isRedisConnected: jest.fn().mockReturnValue(false),
        getRedisClient: jest.fn().mockReturnValue(null),
    };
});

// Main test suite
describe('Room Socket Events', () => {

    // Initialize server and clients
    let io: Server;
    let serverSocket: any;
    let clientSocket: ClientSocket;
    let clientSocket2: ClientSocket; // Second user for interaction tests
    let httpServer: any;
    let port: number;

    // Start Server before all tests because Socket server setup is expensive
    beforeAll((done) => {

        // Create HTTP server and attach Socket.IO
        httpServer = createServer();
        io = initSocket(httpServer);

        // Listen on random available port
        httpServer.listen(() => {

            // Save port number for clients to connect and signal Jest async setup completion
            const addr = httpServer.address() as AddressInfo;
            port = addr.port;
            done();
        });
    });

    // Clean up after all tests to prevent Jest hanging due to open sockets
    afterAll(async () => {
        io.close();
        httpServer.close();
        await redisConfig.closeRedis();
    });

    // Connect new clients before each test to prevent state leakage
    beforeEach((done) => {
        // Reset in-memory store state to prevent leakage between tests
        resetStore();

        // Simulates two real users (clients)
        clientSocket = Client(`http://localhost:${port}`);
        clientSocket2 = Client(`http://localhost:${port}`);

        // Tracks when both clients finish connecting
        let connectedCount = 0;
        const checkConnected = () => {
            connectedCount++;
            if (connectedCount === 2) done();
        };

        // Ensures test only starts after both clients are ready
        clientSocket.on('connect', checkConnected);
        clientSocket2.on('connect', checkConnected);
    });

    // Disconnect clients and clear Jest mocks after each test
    afterEach(() => {
        if (clientSocket.connected) clientSocket.disconnect();
        if (clientSocket2.connected) clientSocket2.disconnect();
        jest.clearAllMocks();
    });

    // Test suite for room joining and initialization route
    describe('Room Joining & Initialization', () => {

        // Case 1: User joins a room and receives initial state (timer state and current users snapshot)
        it('should allow a user to join a room and receive initial state', (done) => {

            // Setup test data
            const roomId = 'test-room-1';
            const user = { id: 'u1', name: 'Alice' };

            // Listen for initial state events
            let receivedTimer = false;
            let receivedSnapshot = false;

            // Verify timer is running and has time left
            clientSocket.on('timer-update', (data) => {
                expect(data.isRunning).toBe(true);
                expect(data.timeLeft).toBeGreaterThan(0);
                receivedTimer = true;

                // Finish test only after all required events arrive
                if (receivedTimer && receivedSnapshot) done();
            });

            // Verify user list is sent and user is present in the room
            clientSocket.on('room-users-snapshot', (users) => {
                expect(Array.isArray(users)).toBe(true);
                expect(users[0].info).toEqual(expect.objectContaining(user));
                receivedSnapshot = true;
                if (receivedTimer && receivedSnapshot) done();
            });

            // Action: Join Room (triggers the flow)
            clientSocket.emit('join-room', { roomId, user });
        });

        // Case 2: Existing users are notified when someone joins
        it('should broadcast to others when a user joins', (done) => {

            // Setup test data
            const roomId = 'test-room-2';
            const user1 = { id: 'u1', name: 'Alice' };
            const user2 = { id: 'u2', name: 'Bob' };

            // First user (client) joins the room
            clientSocket.emit('join-room', { roomId, user: user1 });

            // After first user is fully joined, second user joins
            clientSocket.on('room-users-snapshot', () => {
                clientSocket2.emit('join-room', { roomId, user: user2 });
            });

            // First client should receive notification about second user joining the room
            clientSocket.on('user-joined-room', (data) => {
                expect(data.id).toBe(user2.id);
                expect(data.name).toBe(user2.name);
                done();
            });
        });
    });

    // Test suite for drawing collaboration
    describe('Drawing Collaboration', () => {

        // Case: When a user draws, the drawing data is sent by one user and broadcast to others without mutation
        it('should broadcast drawing events to other users in room', (done) => {

            // Setup test data
            const roomId = 'draw-room-1';
            const user1 = { id: 'u1', name: 'Alice' };
            const user2 = { id: 'u2', name: 'Bob' };
            const drawData = { // Example drawing payload
                roomId,
                elements: [{ type: 'line', x: 10, y: 10 }],
                files: {}
            };

            // Second user validates received drawing data
            clientSocket2.on('draw', (data) => {
                expect(data.elements).toEqual(drawData.elements);
                done();
            });

            // Ensure both users are fully joined before drawing
            let joinedCount = 0;
            const checkJoined = () => {
                joinedCount++;
                if (joinedCount === 2) { // First user sends drawing data
                    clientSocket.emit('draw', drawData);
                }
            };

            // Wait for both to join
            clientSocket.on('room-users-snapshot', checkJoined);
            clientSocket2.on('room-users-snapshot', checkJoined);

            // Both users join the room
            clientSocket.emit('join-room', { roomId, user: user1 });
            clientSocket2.emit('join-room', { roomId, user: user2 });
        });
    });

    // Test suite for messaging
    describe('Messaging', () => {

        // Case: When a user sends a message, it gets broadcasted to other users in the room
        it('should broadcast messages to other users in room', (done) => {

            // Setup test data
            const roomId = 'chat-room-1';
            const user1 = { id: 'u1', name: 'Alice' };
            const user2 = { id: 'u2', name: 'Bob' };
            const message = "Hello World";

            // Receiver validates message payload
            clientSocket2.on('receive-message', (data) => {
                expect(data.message).toBe(message);
                // The backend sends 'user' back, which in the test is the 'user1' object
                expect(data.user).toEqual(user1);
                expect(data.senderId).toBe(user1.id);
                expect(data.time).toBeDefined();
                done();
            });

            // Ensure both are joined
            let joinedCount = 0;
            const checkJoined = () => {
                joinedCount++;
                if (joinedCount === 2) {
                    clientSocket.emit('send-message', {
                        roomId,
                        user: user1,
                        senderId: user1.id,
                        message
                    });
                }
            };

            clientSocket.on('room-users-snapshot', checkJoined);
            clientSocket2.on('room-users-snapshot', checkJoined);

            // Both users join the room
            clientSocket.emit('join-room', { roomId, user: user1 });
            clientSocket2.emit('join-room', { roomId, user: user2 });
        });
    });

    // Test suite for host controls
    describe('Host Controls (Kick)', () => {

        // Case: Host can forcibly kick a user out of the room
        it('should disconnect a user when kicked by host', (done) => {

            // Setup test data
            const roomId = 'kick-room-1';
            const hostUser = { id: 'host', name: 'Host' };
            const guestUser = { id: 'guest', name: 'Guest' };

            // Mock Room.findById for authZ check (host is owner)
            (Room.findById as any) = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    // @ts-ignore - mock typing
                    lean: (jest.fn() as jest.Mock).mockResolvedValue({ ownerId: { toString: () => 'host' } })
                })
            });

            // Authenticate host socket so authZ check can find userId
            clientSocket.emit('authenticate-user', 'host');

            const checkJoined = () => {
                // Host kicks the guest using their socket ID
                const guestSocketId = clientSocket2.id;
                clientSocket.emit('kick-user', { roomId, targetSocketId: guestSocketId });
            };

            // Guest listens for kick event
            clientSocket2.on('you-were-kicked', () => {
                done();
            });

            // Sequential join: Host joins first to ensure they are the first joiner (and thus the host)
            clientSocket.on('room-users-snapshot', () => {
                // Now that host is in and confirmed as host, guest joins
                clientSocket2.emit('join-room', { roomId, user: guestUser });
            });

            clientSocket2.on('room-users-snapshot', checkJoined);

            // Trigger the flow
            clientSocket.emit('join-room', { roomId, user: hostUser });
        });
    });

    // Test suite for session management
    describe('Session Management', () => {

        // Case: Ending a session cleans up room state and updates DB
        it('should clean up room state when session ends', (done) => {

            // Setup test data
            const roomId = 'end-room-1';
            const user = { id: 'host', name: 'Host' };

            // Mock DB update call
            (Room.findByIdAndUpdate as any).mockResolvedValue({});

            // Mock Room.findById for authZ check (host is owner)
            (Room.findById as any) = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    // @ts-ignore - mock typing
                    lean: (jest.fn() as jest.Mock).mockResolvedValue({ ownerId: { toString: () => 'host' } })
                })
            });

            // Authenticate host socket so authZ check can find userId
            clientSocket.emit('authenticate-user', 'host');

            // Listen for room closure confirmation
            clientSocket.on('room-closed', () => {

                // Verify room is marked inactive in DB
                expect(Room.findByIdAndUpdate).toHaveBeenCalledWith(
                    roomId,
                    expect.objectContaining({ isActive: false })
                );
                done();
            });

            // End session only after successful join
            clientSocket.on('room-users-snapshot', () => {
                clientSocket.emit('end-session', roomId);
            });

            // Listen for errors
            clientSocket.on('error', (err) => {
                console.error('[TEST ERROR] Received error from socket:', err);
                done(new Error(err.message));
            });

            // Join room
            clientSocket.emit('join-room', { roomId, user });
        }, 10000); // 10s timeout
    });
});
