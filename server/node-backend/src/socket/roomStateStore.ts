// roomStateStore.ts
// This file abstracts ALL state logic away from socket handlers
// Redis-backed state with in-memory fallback (same API as old Map<> stores but durable)
// If Redis is down, falls back to in-memory Maps transparently

import { getRedisClient, isRedisConnected } from '../config/redis';

// TTL for all room keys (4 hours — rooms auto-cleanup if abandoned)
const ROOM_TTL_SECONDS = 4 * 60 * 60;

// Rate limit window for ask-to-join (10 seconds)
const RATE_LIMIT_SECONDS = 10;

// Claim TTL for timer (if server dies, another can pick up after 5s)
const TIMER_CLAIM_TTL = 5;

// In-Memory fallbacks 
// Used when Redis is unavailable (dev mode, connection failure, tests)
const inMemoryRoomUsers = new Map<string, Map<string, any>>();
const inMemoryWhiteboard = new Map<string, { elements: any[]; files: any }>();
const inMemoryRoomSettings = new Map<string, { allowCamera: boolean; allowAudio: boolean; allowWhiteboard: boolean }>();
const inMemoryRoomTimers = new Map<string, { timeLeft: number; isRunning: boolean; duration: number }>();
const inMemoryAskJoinRateLimit = new Map<string, number>();
const inMemoryRoomHost = new Map<string, string>();

// Reset all in-memory state (for testing)
export const resetStore = () => {
    inMemoryWhiteboard.clear();
    inMemoryRoomUsers.clear();
    inMemoryRoomSettings.clear();
    inMemoryRoomTimers.clear();
    inMemoryAskJoinRateLimit.clear();
    inMemoryRoomHost.clear();
    console.log('[Store] In-memory state reset');
};

// Helper
const useRedis = (): boolean => isRedisConnected();

// Room users (Redis Hash: room:{roomId}:users)

// Set user from redis hash
export const setRoomUser = async (roomId: string, socketId: string, user: any): Promise<void> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const key = `room:${roomId}:users`;

        // Set user from redis hash
        await redis.hset(key, socketId, JSON.stringify(user));

        // Refresh TTL every time user changes
        await redis.expire(key, ROOM_TTL_SECONDS);

    } else { // In-memory fallback
        if (!inMemoryRoomUsers.has(roomId)) inMemoryRoomUsers.set(roomId, new Map());
        inMemoryRoomUsers.get(roomId)!.set(socketId, user);
    }
};

// Get user from redis hash
export const getRoomUser = async (roomId: string, socketId: string): Promise<any | null> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const raw = await redis.hget(`room:${roomId}:users`, socketId);
        return raw ? JSON.parse(raw) : null;
    }
    return inMemoryRoomUsers.get(roomId)?.get(socketId) ?? null;
};

// Delete user from redis hash
export const deleteRoomUser = async (roomId: string, socketId: string): Promise<void> => {
    if (useRedis()) {
        await getRedisClient()!.hdel(`room:${roomId}:users`, socketId);
    } else {
        inMemoryRoomUsers.get(roomId)?.delete(socketId);
    }
};

// Get all users from redis hash
export const getRoomUsers = async (roomId: string): Promise<Array<{ socketId: string; info: any }>> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const all = await redis.hgetall(`room:${roomId}:users`);
        return Object.entries(all).map(([socketId, raw]) => ({ socketId, info: JSON.parse(raw) }));
    }
    const map = inMemoryRoomUsers.get(roomId);
    if (!map) return [];
    return Array.from(map.entries()).map(([socketId, info]) => ({ socketId, info }));
};

// Get user count from redis hash
export const getRoomUserCount = async (roomId: string): Promise<number> => {
    if (useRedis()) {
        return getRedisClient()!.hlen(`room:${roomId}:users`);
    }
    return inMemoryRoomUsers.get(roomId)?.size ?? 0;
};

// Check if user exists in redis hash
export const hasRoomUser = async (roomId: string, socketId: string): Promise<boolean> => {
    if (useRedis()) {
        return (await getRedisClient()!.hexists(`room:${roomId}:users`, socketId)) === 1;
    }
    return inMemoryRoomUsers.get(roomId)?.has(socketId) ?? false;
};

// Check if room exists
export const hasRoom = async (roomId: string): Promise<boolean> => {
    if (useRedis()) {
        return (await getRedisClient()!.exists(`room:${roomId}:users`)) === 1;
    }
    return inMemoryRoomUsers.has(roomId);
}
    ;

// Get all room IDs that a given socket is in (for disconnect cleanup)
export const getRoomIdsForSocket = async (socket: any): Promise<string[]> => {

    // Check if the socket already has its joined rooms cached (fastest)
    if (socket.data?.rooms instanceof Set) {
        return Array.from(socket.data.rooms);
    }

    const socketId = socket.id;

    if (useRedis()) {
        const redis = getRedisClient()!;
        // Scan for room:*:users keys that contain this socket
        const roomIds: string[] = [];
        let cursor = '0';
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'room:*:users', 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                const exists = await redis.hexists(key, socketId);
                if (exists) {
                    // Extract roomId from "room:{roomId}:users"
                    const roomId = key.split(':')[1];
                    roomIds.push(roomId);
                }
            }
        } while (cursor !== '0');
        return roomIds;
    }

    // In-memory: iterate all rooms
    const roomIds: string[] = [];
    inMemoryRoomUsers.forEach((usersMap, roomId) => {
        if (usersMap.has(socketId)) roomIds.push(roomId);
    });
    return roomIds;
};

// Whiteboard state (Redis Key: room:{roomId}:whiteboard)

// Set whiteboard state
export const setWhiteboardState = async (roomId: string, state: { elements: any[]; files: any }): Promise<void> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const key = `room:${roomId}:whiteboard`;
        await redis.set(key, JSON.stringify(state), 'EX', ROOM_TTL_SECONDS);
    } else {
        inMemoryWhiteboard.set(roomId, state);
    }
};

// Get whiteboard state
export const getWhiteboardState = async (roomId: string): Promise<{ elements: any[]; files: any }> => {
    if (useRedis()) {
        const raw = await getRedisClient()!.get(`room:${roomId}:whiteboard`);
        return raw ? JSON.parse(raw) : { elements: [], files: {} };
    }
    return inMemoryWhiteboard.get(roomId) ?? { elements: [], files: {} };
};

// Room settings (Redis Key: room:{roomId}:settings)

// Set room settings
export const setRoomSettings = async (
    roomId: string,
    settings: { allowCamera: boolean; allowAudio: boolean; allowWhiteboard: boolean }
): Promise<void> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const key = `room:${roomId}:settings`;
        await redis.set(key, JSON.stringify(settings), 'EX', ROOM_TTL_SECONDS);
    } else {
        inMemoryRoomSettings.set(roomId, settings);
    }
};

// Get room settings
export const getRoomSettings = async (
    roomId: string
): Promise<{ allowCamera: boolean; allowAudio: boolean; allowWhiteboard: boolean } | null> => {
    if (useRedis()) {
        const raw = await getRedisClient()!.get(`room:${roomId}:settings`);
        return raw ? JSON.parse(raw) : null;
    }
    return inMemoryRoomSettings.get(roomId) ?? null;
};

// Host state (Redis Key: room:{roomId}:host)

// Set the current active host for a room
export const setRoomHost = async (roomId: string, socketId: string): Promise<void> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const key = `room:${roomId}:host`;
        await redis.set(key, socketId, 'EX', ROOM_TTL_SECONDS);
    } else {
        inMemoryRoomHost.set(roomId, socketId);
    }
};

// Get the current active host socket ID for a room
export const getRoomHost = async (roomId: string): Promise<string | null> => {
    if (useRedis()) {
        const raw = await getRedisClient()!.get(`room:${roomId}:host`);
        return raw || null;
    }
    return inMemoryRoomHost.get(roomId) ?? null;
};

// Timer state (Redis Key: room:{roomId}:timer)

export interface TimerStateData {
    timeLeft: number;
    isRunning: boolean;
    duration: number; // in minutes
}

// Set timer state
export const setTimerState = async (roomId: string, state: TimerStateData): Promise<void> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const key = `room:${roomId}:timer`;
        await redis.set(key, JSON.stringify(state), 'EX', ROOM_TTL_SECONDS);
    } else {
        inMemoryRoomTimers.set(roomId, state);
    }
};

// Get timer state
export const getTimerState = async (roomId: string): Promise<TimerStateData | null> => {
    if (useRedis()) {
        const raw = await getRedisClient()!.get(`room:${roomId}:timer`);
        return raw ? JSON.parse(raw) : null;
    }
    return inMemoryRoomTimers.get(roomId) ?? null;
};

// Delete timer state
export const deleteTimerState = async (roomId: string): Promise<void> => {
    if (useRedis()) {
        await getRedisClient()!.del(`room:${roomId}:timer`);
    } else {
        inMemoryRoomTimers.delete(roomId);
    }
};

// Attempt to claim timer ownership for this instance.
// Returns true if claimed, false if already owned by someone else.
export const claimTimerOwnership = async (roomId: string, instanceId: string): Promise<boolean> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        const key = `room:${roomId}:timer_owner`;
        // SET key value EX seconds NX: only if NOT exists
        const result = await redis.set(key, instanceId, 'EX', TIMER_CLAIM_TTL, 'NX');
        if (result === 'OK') return true;

        // If it exists, check if WE already own it and refresh
        const owner = await redis.get(key);
        if (owner === instanceId) {
            await redis.expire(key, TIMER_CLAIM_TTL);
            return true;
        }
        return false;
    }
    return true; // Always allow in memory-only mode
};

// Rate Limiting (ask-to-join)

// Check if a user is rate-limited for ask-to-join.
// Returns true if the request is ALLOWED, false if rate-limited.
// Uses Redis SET NX EX for atomic check-and-set with auto-expiry (SET key value EX seconds NX)
export const checkAskJoinRateLimit = async (userId: string): Promise<boolean> => {
    if (useRedis()) {
        const redis = getRedisClient()!;

        // NX → only set if NOT exists
        // EX → auto expire after X seconds
        const result = await redis.set(`ratelimit:askjoin:${userId}`, '1', 'EX', RATE_LIMIT_SECONDS, 'NX');

        // 'OK' means key was set (not rate-limited)
        return result === 'OK';
    }

    // In-memory fallback
    const lastRequest = inMemoryAskJoinRateLimit.get(userId);
    const now = Date.now();
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_SECONDS * 1000) {
        return false; // Rate-limited
    }
    inMemoryAskJoinRateLimit.set(userId, now);
    return true; // Allowed
};

// Cleanup
// Delete all state for a room (users, whiteboard, settings, timer)
export const cleanupRoom = async (roomId: string): Promise<void> => {
    if (useRedis()) {
        const redis = getRedisClient()!;
        await redis.del(
            `room:${roomId}:users`,
            `room:${roomId}:whiteboard`,
            `room:${roomId}:settings`,
            `room:${roomId}:timer`,
            `room:${roomId}:host`
        );
    } else {
        inMemoryRoomUsers.delete(roomId);
        inMemoryWhiteboard.delete(roomId);
        inMemoryRoomSettings.delete(roomId);
        inMemoryRoomTimers.delete(roomId);
        inMemoryRoomHost.delete(roomId);
    }
};

// Delete whiteboard state only
export const deleteWhiteboardState = async (roomId: string): Promise<void> => {
    if (useRedis()) {
        await getRedisClient()!.del(`room:${roomId}:whiteboard`);
    } else {
        inMemoryWhiteboard.delete(roomId);
    }
};

// Delete room settings only
export const deleteRoomSettings = async (roomId: string): Promise<void> => {
    if (useRedis()) {
        await getRedisClient()!.del(`room:${roomId}:settings`);
    } else {
        inMemoryRoomSettings.delete(roomId);
    }
};

// Delete all user entries for a room
export const deleteRoomUsers = async (roomId: string): Promise<void> => {
    if (useRedis()) {
        await getRedisClient()!.del(`room:${roomId}:users`);
    } else {
        inMemoryRoomUsers.delete(roomId);
    }
};
