// socketEmitter.ts
// Singleton to store and export socket.io instance for use in services

import { Server as SocketIOServer } from 'socket.io';

// Private variable to store the io instance
let io: SocketIOServer | null = null;

// Store the socket.io instance (called from socket/index.ts after initialization)
export const setSocketIO = (ioInstance: SocketIOServer): void => {
    io = ioInstance;
};

// Get the socket.io instance (used by services to emit events)
export const getSocketIO = (): SocketIOServer | null => {
    return io;
};

// Emit an event to a specific user (by userId)
// Users join a personal room `user:${userId}` on socket connection
export const emitToUser = (userId: string, event: string, data: any): void => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    } else {
        console.warn('[socketEmitter] Socket.io not initialized, cannot emit to user');
    }
};
