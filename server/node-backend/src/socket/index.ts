import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import Room from '../models/Room';
import Participation from '../models/Participation';
import User from '../models/User';
import { CONFIG } from '../config/env';
import { setSocketIO } from './socketEmitter';
import { createNotification } from '../services/notification.service';
import { initRedis, getRedisPub, getRedisSub, INSTANCE_ID, closeRedis } from '../config/redis';
import * as store from './roomStateStore';

// This file acts as a postman that routes signals between specific socket IDs (io.to(id).emit(...))

// Initializes and attaches a Socket.IO server to an existing HTTP server
export const initSocket = (httpServer: HttpServer) => {

    // Initialize Socket.IO server with CORS configuration
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: CONFIG.CLIENT_URL,
            methods: ["GET", "POST"],
            credentials: true
        },
        // Allow larger payloads for whiteboard image data
        maxHttpBufferSize: 20 * 1024 * 1024 // 20 MB
    });

    // Store socket.io instance in singleton for services to use
    setSocketIO(io);

    // Initialize Redis and attach adapter for cross-instance broadcasting.
    // Async IIFE: adapter setup is non-blocking (if Redis is unavailable, Socket.IO falls back to its default in-memory adapter)
    (async () => {
        try {
            await initRedis();
            const pub = getRedisPub();
            const sub = getRedisSub();
            if (pub && sub && pub.status === 'ready' && sub.status === 'ready') {
                io.adapter(createAdapter(pub, sub));
                console.log('[Socket.IO] Redis adapter attached (cross-instance broadcasting enabled)');
            } else {
                console.warn('[Socket.IO] Redis not ready — using default in-memory adapter');
            }
        } catch (err: any) {
            console.warn('[Socket.IO] Failed to attach Redis adapter:', err.message);
        }
    })();

    // Handle graceful shutdown for Redis
    process.on('SIGTERM', async () => {
        console.log('[Server] SIGTERM received. Closing Redis...');
        await closeRedis();
        process.exit(0);
    });

    // Process-local timer handles (setInterval/setTimeout are not serializable).
    // Timer STATE is stored in Redis via store.setTimerState(), but the
    // interval/timeout references must live in this process.
    const roomTimerHandles = new Map<string, {
        interval?: NodeJS.Timeout;
        extensionTimeout?: NodeJS.Timeout;
    }>();

    // Store timeouts for room deactivation (grace period)
    const roomCleanupHandles = new Map<string, NodeJS.Timeout>();


    // Helper: Check if socket is the active host of a room
    // Used to authorize privileged actions (kick, settings, extend, end)
    const isCurrentHost = async (socket: Socket, roomId: string): Promise<boolean> => {
        try {
            const currentHostId = await store.getRoomHost(roomId);
            return socket.id === currentHostId;
        } catch (err) {
            console.error('[Socket Auth] Error checking room host:', err);
            return false;
        }
    };

    // Helper: Deactivate a room, or reset it if it's persistent (so it stays in the listing)
    const deactivateOrResetRoom = async (roomId: string) => {
        const room = await Room.findById(roomId);
        if (room?.isPersistent) {
            await Room.findByIdAndUpdate(roomId, { isActive: true, sessionEndTime: null });
        } else {
            await Room.findByIdAndUpdate(roomId, { isActive: false, sessionEndTime: new Date() });
        }
        io.emit('room-list-updated');
    };

    // Helper: Transfer host to the next available participant
    const transferHost = async (roomId: string) => {
        try {
            const users = await store.getRoomUsers(roomId);
            if (users.length > 0) {
                // Pick the first available user (could be more complex, but first-in-list is simplest)
                const newHost = users[0];
                await store.setRoomHost(roomId, newHost.socketId);

                console.log(`[HOST_TRANSFER] Room ${roomId}: New host is ${newHost.socketId} (${newHost.info.name})`);

                // Broadcast to room
                io.to(roomId).emit('host-changed', {
                    socketId: newHost.socketId,
                    user: newHost.info
                });
            } else {
                // Room is empty, will be cleaned up by the calling handler
                console.log(`[HOST_TRANSFER] Room ${roomId}: No users left to transfer host to.`);
            }
        } catch (err) {
            console.error('[HOST_TRANSFER] Failed to transfer host');
        }
    };

    // Helper to record participation if duration > 25 minute
    const recordParticipation = async (userId: string, roomId: string, joinTime: number) => {
        if (!userId || !roomId || !joinTime) return;

        const now = Date.now();
        const durationMs = now - joinTime;
        const durationMin = Math.floor(durationMs / 60000); // Convert to minutes

        // Only record if stayed for at least 25 minutes
        if (durationMin >= 25) {
            try {
                await Participation.create({
                    userId,
                    roomId,
                    durationMin,
                    joinedAt: new Date(joinTime),
                    leftAt: new Date(now)
                });
                console.log(`[PARTICIPATION] Recorded ${durationMin} mins for session`);

                // Check for "Focus Master" badge (50 sessions of > 25 mins)
                const count = await Participation.countDocuments({
                    userId,
                    durationMin: { $gte: 25 }
                });

                if (count >= 50) {
                    const user = await User.findById(userId);
                    if (user) {
                        // Award "Focus Master" badge for 50 sessions of > 25 mins if not present
                        if (!user.badges) user.badges = [];
                        if (!user.badges.includes('focus-master')) {
                            user.badges.push('focus-master');
                            await user.save();
                            console.log(`[BADGE] Awarded 'focus-master' badge`);

                        }
                    }
                }
            } catch (err) {
                console.error('[PARTICIPATION] Failed to record history:', err);
            }
        } else {
            console.log(`[PARTICIPATION] Skipped recording (duration < 60s)`);
        }
    };

    // Fires when a new client establishes a socket connection (socket.io handshake completes)
    io.on('connection', (socket: Socket) => {
        console.log('New client connected:', socket.id);

        // Allow authenticated users to join their personal notification room
        // Called from frontend after socket connect + user is authenticated
        socket.on('authenticate-user', (userId: string) => {
            if (userId) {
                socket.data.userId = userId; // Store for authZ checks on privileged events
                if (!socket.data.rooms) socket.data.rooms = new Set<string>();
                socket.join(`user:${userId}`);
                console.log(`Socket authenticated: ${socket.id.slice(0, 8)}...`);
            }
        });

        // Allow admins to join the admin activity room
        socket.on('join-admin-room', (userData: { role: string; name: string }) => {
            if (userData.role === 'admin') {
                socket.join('admin-room');
                console.log(`Admin joined admin-room for activity monitoring`);
            }
        });

        // Request recent activities (for initial load on dashboard)
        socket.on('request-recent-activities', async (limit: number = 50) => {
            try {
                const UserActivity = (await import('../models/UserActivity')).default;
                const activities = await UserActivity.find()
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .populate('userId', 'name email role');

                socket.emit('activities:recent', activities);
            } catch (err) {
                console.error('Failed to fetch recent activities:', err);
                socket.emit('activities:recent', []);
            }
        });

        // Allow a client to join a specific room
        socket.on('join-room', async (payload: { roomId: string, user: any, duration?: number }) => {
            const { roomId, user, duration } = payload;
            socket.join(roomId); // Add this socket to the specified room
            console.log(`Socket ${socket.id} joined room ${roomId}`);

            // Track which rooms this socket is in (for disconnect cleanup)
            if (!socket.data.rooms) socket.data.rooms = new Set<string>();
            socket.data.rooms.add(roomId);

            // Store user info in Redis/memory
            await store.setRoomUser(roomId, socket.id, { ...user, joinTime: Date.now() });

            // Grace Period Fix: Cancel pending room deactivation if any
            if (roomCleanupHandles.has(roomId)) {
                console.log(`[ROOM_CLEANUP] Room ${roomId}: User joined during grace period. Cancelling deactivation.`);
                clearTimeout(roomCleanupHandles.get(roomId));
                roomCleanupHandles.delete(roomId);
            }

            // Initialize Timer if not exists
            const existingTimer = await store.getTimerState(roomId);
            if (!existingTimer) {
                // Use provided duration or default to 25
                const sessionDuration = duration || 25;

                const timerState: store.TimerStateData = {
                    timeLeft: sessionDuration * 60, // Convert to seconds
                    isRunning: true,
                    duration: sessionDuration
                };
                await store.setTimerState(roomId, timerState);

                // Immediately broadcast initial timer state so host sees it running right away
                io.to(roomId).emit('timer-update', {
                    timeLeft: timerState.timeLeft,
                    isRunning: timerState.isRunning
                });

                // Start the server-side timer for this room ONLY if not already running on ANY server (distributed coordination)
                const canClaim = await store.claimTimerOwnership(roomId, INSTANCE_ID);
                if (canClaim) {
                    const handles: { interval?: NodeJS.Timeout; extensionTimeout?: NodeJS.Timeout } = {};

                    handles.interval = setInterval(async () => {
                        // Refresh ownership every 2 seconds (well before the 5s TTL expires)
                        await store.claimTimerOwnership(roomId, INSTANCE_ID);

                        const currentTimer = await store.getTimerState(roomId);
                        if (!currentTimer) {
                            clearInterval(handles.interval);
                            return;
                        }

                        if (currentTimer.timeLeft > 0) {
                            currentTimer.timeLeft--;
                            await store.setTimerState(roomId, currentTimer);

                            // Broadcast every second
                            io.to(roomId).emit('timer-update', {
                                timeLeft: currentTimer.timeLeft,
                                isRunning: true
                            });
                        } else {
                            // Timer ended logic
                            clearInterval(handles.interval);
                            currentTimer.isRunning = false;
                            await store.setTimerState(roomId, currentTimer);

                            // Notify room: Session ended
                            io.to(roomId).emit('session-ended');

                            // Start 60s extension timeout
                            console.log(`[TIMER] Room ${roomId}: Setting 60s auto-close timeout`);
                            handles.extensionTimeout = setTimeout(async () => {
                                console.log(`[TIMER] Room ${roomId}: 60s timeout EXECUTED - closing room`);
                                io.to(roomId).emit('room-closed');

                                // Update DB (reset if persistent, deactivate otherwise)
                                try {
                                    await deactivateOrResetRoom(roomId);
                                } catch (err) {
                                    console.error('Failed to close room in DB', err);
                                }

                                // Cleanup all state
                                await store.cleanupRoom(roomId);
                                roomTimerHandles.delete(roomId);
                            }, 60000); // 60 seconds

                            roomTimerHandles.set(roomId, handles);
                        }
                    }, 1000);

                    roomTimerHandles.set(roomId, handles);
                } else {
                    console.log(`[Timer] Room ${roomId} already has an active timer on another instance or claimed just now.`);
                }
            }

            // Sync current timer state to joining user
            const timer = await store.getTimerState(roomId);
            if (timer) {
                socket.emit('timer-update', {
                    timeLeft: timer.timeLeft,
                    isRunning: timer.isRunning
                });

                // If session ended, notify new user too
                if (timer.timeLeft === 0 && !timer.isRunning) {
                    socket.emit('session-ended');
                }
            }

            // Notify others (include socketId so they can map to WebRTC peer)
            socket.to(roomId).emit('user-joined-room', { socketId: socket.id, ...user });

            // Sync existing whiteboard state
            const existingState = await store.getWhiteboardState(roomId);
            socket.emit('whiteboard-state', existingState);

            // Send user snapshot to render who is in the room
            const usersInRoom = await store.getRoomUsers(roomId);
            socket.emit('room-users-snapshot', usersInRoom);

            // Host Assignment Logic
            const currentHost = await store.getRoomHost(roomId);
            if (!currentHost) {
                // No host assigned yet (e.g., first joiner)
                await store.setRoomHost(roomId, socket.id);
                console.log(`[HOST_ASSIGN] Room ${roomId}: Assigned first joiner as host`);
                io.to(roomId).emit('host-changed', { socketId: socket.id, user });
            } else {
                // Send current host info to the joining user
                const hostUser = await store.getRoomUser(roomId, currentHost);
                if (hostUser) {
                    socket.emit('host-changed', { socketId: currentHost, user: hostUser });
                }
            }

            // Broadcast room list update so progress bars reflect real-time capacity
            io.emit('room-list-updated');
        });

        // Handle session extension (Host Only - server-side authZ enforced)
        socket.on('extend-session', async (roomId: string) => {
            // AuthZ: Only current host can extend session
            if (!await isCurrentHost(socket, roomId)) {
                socket.emit('error', { message: 'Only the current host can extend the session.' });
                return;
            }

            const timer = await store.getTimerState(roomId);
            if (timer) {
                // Clear extension timeout if pending
                const handles = roomTimerHandles.get(roomId);
                if (handles?.extensionTimeout) {
                    console.log(`[TIMER] Room ${roomId}: Clearing auto-close timeout (session extended)`);
                    clearTimeout(handles.extensionTimeout);
                    handles.extensionTimeout = undefined;
                }

                // Reset timer
                timer.timeLeft = timer.duration * 60;
                timer.isRunning = true;
                await store.setTimerState(roomId, timer);

                // Restart interval if stopped
                if (handles?.interval) clearInterval(handles.interval);

                const newHandles = handles || {};

                newHandles.interval = setInterval(async () => {
                    const currentTimer = await store.getTimerState(roomId);
                    if (!currentTimer) {
                        clearInterval(newHandles.interval);
                        return;
                    }

                    if (currentTimer.timeLeft > 0) {
                        currentTimer.timeLeft--;
                        await store.setTimerState(roomId, currentTimer);
                        io.to(roomId).emit('timer-update', { timeLeft: currentTimer.timeLeft, isRunning: true });
                    } else {
                        // Timer ended again
                        clearInterval(newHandles.interval);
                        currentTimer.isRunning = false;
                        await store.setTimerState(roomId, currentTimer);
                        io.to(roomId).emit('session-ended');

                        newHandles.extensionTimeout = setTimeout(async () => {
                            io.to(roomId).emit('room-closed');

                            // Update DB (reset if persistent, deactivate otherwise)
                            try {
                                await deactivateOrResetRoom(roomId);
                            } catch (err) {
                                console.error('Failed to close room in DB', err);
                            }

                            // Cleanup all state
                            await store.cleanupRoom(roomId);
                            roomTimerHandles.delete(roomId);
                        }, 60000);

                        roomTimerHandles.set(roomId, newHandles);
                    }
                }, 1000);

                roomTimerHandles.set(roomId, newHandles);

                // Notify room that session resumed
                io.to(roomId).emit('session-resumed');
                io.to(roomId).emit('timer-update', { timeLeft: timer.timeLeft, isRunning: true });
            }
        });

        // Handle Session End (Manually triggered by Host - server-side authZ enforced)
        socket.on('end-session', async (roomId: string) => {
            // AuthZ: Only current host can end session
            if (!await isCurrentHost(socket, roomId)) {
                socket.emit('error', { message: 'Only the current host can end the session.' });
                return;
            }

            // Clear process-local timer handles
            const handles = roomTimerHandles.get(roomId);
            if (handles) {
                if (handles.interval) clearInterval(handles.interval);
                if (handles.extensionTimeout) clearTimeout(handles.extensionTimeout);
                roomTimerHandles.delete(roomId);
            }

            // Delete timer state from store
            await store.deleteTimerState(roomId);

            // Update DB (reset if persistent, deactivate otherwise)
            deactivateOrResetRoom(roomId).catch(err => console.error('Failed to end room in DB', err));

            io.to(roomId).emit('room-closed');
            io.emit('room-list-updated');

            // Cleanup all state
            await store.cleanupRoom(roomId);
        });

        // Handle explicit room leave (navigation)
        socket.on('leave-room', async (roomId: string) => {
            if (await store.hasRoomUser(roomId, socket.id)) {
                const user = await store.getRoomUser(roomId, socket.id);

                // Record participation
                if (user) {
                    const userId = user.id || user._id;
                    if (userId) {
                        recordParticipation(userId, roomId, user.joinTime);
                    }
                }

                await store.deleteRoomUser(roomId, socket.id);

                // Check if the leaving user was the host
                const currentHost = await store.getRoomHost(roomId);
                const wasHost = currentHost === socket.id;

                // Notify room
                socket.to(roomId).emit('user-left-room', { socketId: socket.id, user });
                socket.leave(roomId);

                console.log(`Socket ${socket.id} left room ${roomId}`);

                // Cleanup empty rooms if needed (with 10s grace period)
                const remainingCount = await store.getRoomUserCount(roomId);
                if (remainingCount === 0) {
                    console.log(`[ROOM_CLEANUP] Room ${roomId} is empty. Starting 10s grace period before deactivation.`);
                    
                    const cleanupTimeout = setTimeout(async () => {
                        console.log(`[ROOM_CLEANUP] Grace period expired for room ${roomId}. Deactivating.`);
                        
                        // Stop timer if empty
                        const handles = roomTimerHandles.get(roomId);
                        if (handles) {
                            clearInterval(handles.interval);
                            clearTimeout(handles.extensionTimeout);
                            roomTimerHandles.delete(roomId);
                        }

                        // Update DB (reset if persistent, deactivate otherwise)
                        try {
                            await deactivateOrResetRoom(roomId);
                        } catch (err) {
                            console.error('Failed to close room in DB during cleanup', err);
                        }

                        // Cleanup all state
                        await store.cleanupRoom(roomId);
                        roomCleanupHandles.delete(roomId);
                    }, 10000); // 10 seconds grace period

                    roomCleanupHandles.set(roomId, cleanupTimeout);
                } else if (wasHost) {
                    // Transfer host if there are remaining users
                    await transferHost(roomId);
                }
            }
        });

        // Explicitly join video capability (avoids race condition with getUserMedia)
        // Requires video and audio permission, stream readiness
        socket.on('join-video', (roomId) => {
            // Gets all sockets currently in the room
            const clients = io.sockets.adapter.rooms.get(roomId);

            // Filter out yourself
            const users = clients ? Array.from(clients).filter(id => id !== socket.id) : [];

            // Client will now create WebRTC offers, one peer per user
            socket.emit('all-users', users);
        });

        // WebRTC signaling
        // Forward offer from initiator to specific user (Caller -> Server -> Receiver)
        socket.on('sending-signal', (payload) => {
            const { userToSignal, callerID, signal } = payload;
            io.to(userToSignal).emit('user-joined', { signal, callerID });
        });

        // WebRTC signaling
        // Forward answer from receiver back to caller (Receiver -> Server -> Caller)
        // Completes the WebRTC handshake
        socket.on('returning-signal', (payload) => {
            const { callerID, signal } = payload;
            io.to(callerID).emit('receiving-returned-signal', { signal, id: socket.id });
        });

        // Listen for explicit state request
        socket.on('get-whiteboard-state', async (roomId: string) => {
            const existingState = await store.getWhiteboardState(roomId);
            socket.emit('whiteboard-state', existingState);
        });

        // Handle whiteboard drawing sync updates
        socket.on('draw', async (data: any) => {

            // Extract roomId and drawing payload
            const { roomId, elements, files } = data;

            // Update server-side state (allow file-only updates so images sync)
            if ((elements && elements.length > 0) || (files && Object.keys(files).length > 0)) {
                const currentState = await store.getWhiteboardState(roomId);

                // Merge files if provided, otherwise keep existing
                const newFiles = files ? { ...currentState.files, ...files } : currentState.files;

                await store.setWhiteboardState(roomId, { elements, files: newFiles });
            }

            // Broadcast to others in room except sender (include both elements and files)
            socket.to(roomId).emit('draw', {
                elements,
                files
            });
        });

        // Relay resource-added event to all others in the room
        socket.on('resource-added', (data: { roomId: string }) => {
            socket.to(data.roomId).emit('resource-added');
        });

        // Handle cursor movement
        socket.on('cursor-move', (data: any) => {
            const { roomId, ...cursorData } = data;
            // Broadcast to others in room
            socket.to(roomId).emit('cursor-move', {
                userId: socket.id,
                ...cursorData
            });
        });

        // Handle real-time chat messages
        socket.on('send-message', (data: any) => {

            // Extract roomId, message, user data, and senderId
            const { roomId, message, user, senderId } = data;

            // Broadcast to OTHER users in the room (optimistic UI handles local render)
            socket.to(roomId).emit('receive-message', { user, message, senderId, time: new Date().toISOString() });
        });

        // Handle client disconnection
        socket.on('disconnect', async () => {
            console.log('Client disconnected:', socket.id);

            // Find which rooms this socket was in and clean up (optimized)
            const roomIds = await store.getRoomIdsForSocket(socket);

            for (const roomId of roomIds) {
                if (await store.hasRoomUser(roomId, socket.id)) {
                    const user = await store.getRoomUser(roomId, socket.id);

                    // Record participation
                    if (user) {
                        const userId = user.id || user._id;
                        if (userId) {
                            recordParticipation(userId, roomId, user.joinTime);
                        }
                    }

                    await store.deleteRoomUser(roomId, socket.id);

                    // Check if the disconnecting user was the host
                    const currentHost = await store.getRoomHost(roomId);
                    const wasHost = currentHost === socket.id;

                    // Notify room
                    io.to(roomId).emit('user-left-room', { socketId: socket.id, user });

                    // Cleanup empty rooms if needed (with 10s grace period)
                    const remainingCount = await store.getRoomUserCount(roomId);
                    if (remainingCount === 0) {
                        console.log(`[ROOM_CLEANUP] Room ${roomId} empty on disconnect. Starting 10s grace period.`);
                        
                        const cleanupTimeout = setTimeout(async () => {
                            console.log(`[ROOM_CLEANUP] Grace period expired (disconnect) for room ${roomId}. Deactivating.`);
                            
                            const handles = roomTimerHandles.get(roomId);
                            if (handles) {
                                clearInterval(handles.interval);
                                clearTimeout(handles.extensionTimeout);
                                roomTimerHandles.delete(roomId);
                            }

                            // Update DB (reset if persistent, deactivate otherwise)
                            try {
                                await deactivateOrResetRoom(roomId);
                            } catch (err) {
                                console.error('Failed to close room in DB during cleanup', err);
                            }

                            await store.cleanupRoom(roomId);
                            roomCleanupHandles.delete(roomId);
                        }, 10000);

                        roomCleanupHandles.set(roomId, cleanupTimeout);
                    } else if (wasHost) {
                        // Transfer host if there are remaining users
                        await transferHost(roomId);
                    }
                }
            }
        });

        // Room admin controls (server-side authZ enforced)
        socket.on('update-room-settings', async (data: { roomId: string, allowCamera: boolean, allowAudio: boolean, allowWhiteboard: boolean }) => {

            // Destructure incoming data from the host
            const { roomId, allowCamera, allowAudio, allowWhiteboard } = data;

            // AuthZ: Only current host can change settings
            if (!await isCurrentHost(socket, roomId)) {
                socket.emit('error', { message: 'Only the current host can update room settings.' });
                return;
            }

            // Store new media settings in Redis/memory
            await store.setRoomSettings(roomId, { allowCamera, allowAudio, allowWhiteboard });

            // Broadcast to room so clients can enforce it
            io.to(roomId).emit('room-settings-updated', { allowCamera, allowAudio, allowWhiteboard });

            // Update DB asynchronously for persistence if room restarts
            Room.findByIdAndUpdate(roomId, { allowCamera, allowAudio, allowWhiteboard }).catch(console.error);
        });

        // Kick user (host only - server-side authZ enforced)
        socket.on('kick-user', async (data: { roomId: string, targetSocketId: string }) => {
            const { roomId, targetSocketId } = data;

            // AuthZ: Only current host can kick users
            if (!await isCurrentHost(socket, roomId)) {
                socket.emit('error', { message: 'Only the current host can kick users.' });
                return;
            }

            // Notify the kicked user
            io.to(targetSocketId).emit('you-were-kicked');

            // Remove from room users
            if (await store.hasRoomUser(roomId, targetSocketId)) {
                const user = await store.getRoomUser(roomId, targetSocketId);

                // Record participation
                if (user) {
                    const userId = user.id || user._id;
                    if (userId) {
                        recordParticipation(userId, roomId, user.joinTime);
                    }
                }

                await store.deleteRoomUser(roomId, targetSocketId);

                // Notify others (including host)
                io.to(roomId).emit('user-left-room', { socketId: targetSocketId, user });
            }

            // Ensure the kicked socket actually leaves the room to avoid stale membership
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.leave(roomId);
            }
        });

        // Ask host for permission to join private rooms
        socket.on('ask-to-join', async (data: { roomId: string, user: { name: string, id: string } }) => {
            const { roomId, user } = data;

            // Check for rate limiting using Redis (atomic SET NX EX)
            const allowed = await store.checkAskJoinRateLimit(user.id);
            if (!allowed) {
                socket.emit('ask-join-error', { message: 'Please wait a few seconds before asking again.' });
                return;
            }

            try {
                // Locate the current active host's socket ID
                const hostSocketId = await store.getRoomHost(roomId);

                // If host is connected
                if (hostSocketId) {
                    // Send join request specifically to host
                    io.to(hostSocketId).emit('join-request', {
                        requesterName: user.name,
                        requesterId: user.id,
                        requesterSocketId: socket.id
                    });
                    socket.emit('ask-join-sent'); // Confirm to sender
                } else { // Host is not currently connected
                    socket.emit('ask-join-error', { message: 'Host is not currently in the room.' });
                }
            } catch (err) {
                console.error(err);
                socket.emit('ask-join-error', { message: 'Failed to locate room.' });
            }
        });

        // Register host presence from detail page (before entering the room)
        socket.on('register-host-presence', async (roomId: string) => {
            await store.setRoomHost(roomId, socket.id);
        });

        // Handle host response (approve /deny) to join request
        socket.on('respond-to-join', async (data: {
            requesterSocketId: string,
            requesterId: string,
            requesterName: string,
            roomId: string,
            roomName: string,
            hostName: string,
            approved: boolean
        }) => {
            const { requesterSocketId, requesterId, requesterName, roomId, roomName, hostName, approved } = data;

            // Notify the waiting user via socket
            io.to(requesterSocketId).emit('join-response', { approved });

            // If approved, create a notification for the requester
            if (approved && requesterId) {
                try {
                    await createNotification({
                        userId: requesterId,
                        type: 'ROOM_INVITE',
                        title: 'Join Request Approved!',
                        message: `${hostName} approved your request to join "${roomName}"`,
                        link: `/rooms/${roomId}/meet`,
                        data: { roomId, hostName }
                    });
                    console.log(`[NOTIFICATION] Sent join approval notification to ${requesterName}`);
                } catch (err) {
                    console.error('[NOTIFICATION] Failed to create join approval notification:', err);
                }
            }
        });

    });

    // Return instance for reuse
    return io;
};
