// redis.ts
// This module is responsible only for managing Redis connections (NO business logic).
// It provides:
//   - A general-purpose Redis client (for state storage)
//   - Two dedicated clients (pub/sub) for Socket.IO Redis adapter
//   - A health-check function (isRedisConnected)
//   - Graceful fallback if Redis is unavailable
//   - Graceful shutdown support (closeRedis)

import Redis from 'ioredis';
import { CONFIG } from './env';

// Redis client instances in module scope
// Ensures only ONE connection per type is created
let redisClient: Redis | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;

// Unique ID for this server instance (used for timer claiming)
export const INSTANCE_ID = Math.random().toString(36).substring(2, 15);

// Create a Redis client with error handling.
// Returns null if connection fails (app continues to run with in-memory fallback).
const createRedisClient = (label: string): Redis | null => {
    try {
        const client = new Redis(CONFIG.REDIS_URL, {

            // Track max retries to prevent infinite request retry loops
            maxRetriesPerRequest: 3,

            // Custom connection strategy
            retryStrategy(times: number) {

                // Stop retrying after 5 attempts
                if (times > 5) {
                    console.warn(`[Redis:${label}] Max retries reached, stopping reconnection.`);
                    return null; // Tells ioredis to stop retrying
                }

                // Exponential backoff: 500ms, 1s, 1.5s, 2s, 2.5s
                return Math.min(times * 500, 3000);
            },
            lazyConnect: true, // Don't connect immediately, we call .connect() explicitly
        });

        // Log errors but don't crash the app
        client.on('error', (err) => {
            console.error(`[Redis:${label}] Error:`, err.message);
        });

        // Log successful connection, for debugging deployment issues
        client.on('connect', () => {
            console.log(`[Redis:${label}] Connected to ${CONFIG.REDIS_URL}`);
        });

        // Log connection drops (e.g., Redis restart, network issue)
        client.on('close', () => {
            console.warn(`[Redis:${label}] Connection closed`);
        });

        return client;
    } catch (err: any) { // Error handling if constructor fails (e.g. bad URL)
        console.error(`[Redis:${label}] Failed to create client:`, err.message);
        return null;
    }
};

// Initialize all Redis clients
// - main client (state storage)
// - pub client (Socket.IO adapter publishing)
// - sub client (Socket.IO adapter subscribing)
//
// Safe to call multiple times, only initializes once (guard with redisClient).
export const initRedis = async (): Promise<void> => {

    // Early return if already initialized
    if (redisClient) return;

    // Create clients
    redisClient = createRedisClient('main');
    redisPub = createRedisClient('pub');
    redisSub = createRedisClient('sub');

    // Attempt connection for each client
    const clients = [
        { client: redisClient, label: 'main' },
        { client: redisPub, label: 'pub' },
        { client: redisSub, label: 'sub' },
    ];

    for (const { client, label } of clients) {
        if (client) {
            try {
                // Explicit connect (because lazyConnect: true)
                await client.connect();
            } catch (err: any) { // If Redis is down, app falls back to memory mode
                console.warn(`[Redis:${label}] Connection failed (will use in-memory fallback):`, err.message);
            }
        }
    }
};

// Getter for general-purpose Redis client
// May return null if Redis failed to initialize
export const getRedisClient = (): Redis | null => redisClient;

// Getter for pub client (used by Socket.IO adapter)
export const getRedisPub = (): Redis | null => redisPub;

// Getter for sub client (used by Socket.IO adapter)
export const getRedisSub = (): Redis | null => redisSub;

// Health check used by roomStateStore
export const isRedisConnected = (): boolean => {
    return redisClient?.status === 'ready';
};

// Close all Redis connections gracefully.
export const closeRedis = async (): Promise<void> => {
    const clients = [redisClient, redisPub, redisSub];
    for (const client of clients) {
        if (client) {
            await client.quit();
        }
    }
    console.log('[Redis] All connections closed');
};