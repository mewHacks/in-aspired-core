import { CONFIG } from './config/env';

// Import app and mongoose
import app from './app'; // Express app (routes, middleware, etc.)
import http from 'http'; // HTTP server
import { initSocket } from './socket'; // Socket.io initialization

// Read config value
const PORT = CONFIG.PORT;

// Import the robust connection function
import connectDB from './config/database';

// Create HTTP server and attach Socket.io immediately
// Server starts regardless of DB status so health probes can reach it
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});

// Connect to MongoDB (retries internally, does not crash on failure)
connectDB();

