import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Interface for socket context
interface SocketContextType {
    socket: Socket | null; // Active socket.io connection instance
    connected: boolean; // Connection status
}

// Create socket context to share the socket instance across the entire app
const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

// Custom hook to use the socket context for components to access easily
export const useSocket = () => useContext(SocketContext);

// Socket provider component to wrap the app and provide the socket instance
// Backbone for real-time collaboration features
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    // Stores the active Socket.IO instance
    const [socket, setSocket] = useState<Socket | null>(null);

    // Tracks whether the client is currently connected
    const [connected, setConnected] = useState(false);

    // Initialize socket connection once on mount
    useEffect(() => {
        // Connect directly to the backend to bypass Vercel's proxy which does not support WebSockets
        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://in-aspired-backend.fly.dev';

        // Create a new socket.io client instance
        const newSocket = io(socketUrl, {
            withCredentials: true, // Send cookies
            autoConnect: true, // Connects immediately when created
            reconnection: true, // Reconnects automatically on loss
            reconnectionAttempts: 5, // Limits reconnection attempts
            reconnectionDelay: 1000, // Delay between reconnection attempts
            transports: ['websocket'] // Force websocket to prevent 'Session ID Unknown' polling errors on Fly.io
        });

        // Store socket instance in state so it can be shared via context
        setSocket(newSocket);

        // When the socket connects, update connection status
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setConnected(true);
        });

        // When the socket disconnects, mark client as offline for real-time features
        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setConnected(false);
        });

        // When the socket fails to connect, shows error (useful for debugging)
        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        // Clean up the socket connection on unmount (e.g., app reload, logout)
        // Ensures no dangling socket connections remain
        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Provide socket and connection status to all child components
    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
