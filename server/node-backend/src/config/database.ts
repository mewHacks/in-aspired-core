import mongoose from 'mongoose';
import { CONFIG } from './env';

// Max retry attempts for initial connection
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s (exponential backoff)

// Check if the database is connected and ready.
// Use this in health/readiness endpoints.
export const isDBConnected = (): boolean => {
    return mongoose.connection.readyState === 1;
};

const connectDB = async () => {
    // If already connected, do nothing
    if (mongoose.connection.readyState === 1) {
        return;
    }

    // If currently connecting, wait a bit
    if (mongoose.connection.readyState === 2) {
        console.log('MongoDB is already connecting...');
        return;
    }

    // Create a masked version of the URI for logging
    const maskedUri = CONFIG.MONGODB_URI.replace(/\/\/.*:.*@/, '//****:****@');

    const isSrv = CONFIG.MONGODB_URI.startsWith('mongodb+srv://');
    if (isSrv) {
        console.log('Detection: Using SRV connection string (requires DNS SRV support).');
    }

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Attempting to connect to MongoDB (attempt ${attempt}/${MAX_RETRIES}): ${maskedUri}`);

            const conn = await mongoose.connect(CONFIG.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            });

            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return; // Success — exit the function
        } catch (error: any) {
            console.error(`--- MongoDB Connection Error (attempt ${attempt}/${MAX_RETRIES}) ---`);
            console.error(`Message: ${error.message}`);
            console.error(`Code: ${error.code}`);

            if (error.message.includes('timeout')) {
                console.error('TIP: Your network might be blocking MongoDB (Port 27017) or your IP whitelist is not propagation yet.');
            }

            if (error.message.includes('auth failed') || error.message.includes('authentication failed')) {
                console.error('TIP: Check your MONGODB_URI username and password. If your password has special characters like @ or #, you must URL-encode them.');
            }

            console.error('--------------------------------');

            // If not the last attempt, wait before retrying
            if (attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries exhausted — do NOT crash the process
    console.error('CRITICAL: All MongoDB connection attempts failed. Server will start in degraded mode (no DB access).');
    console.error('Database-dependent routes will return 503 until connection is restored.');
};

export default connectDB;
