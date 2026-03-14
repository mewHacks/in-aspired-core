import express from 'express';
import path from 'path';
import cors from 'cors'; // Controls which frontend origins are allowed to access the API
import helmet from 'helmet'; // Adds security-related HTTP headers
import morgan from 'morgan'; // Logs incoming HTTP requests
import cookieParser from 'cookie-parser'; // Parse Cookie header and populate req.cookies
import swaggerUi from 'swagger-ui-express'; // API Documentation UI
import { swaggerSpec } from './config/swagger'; // OpenAPI Specification

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import recommendationRoutes from './routes/recommendation.routes';
import contactRoutes from './routes/contact.routes';
import courseRoutes from './routes/course.routes';
import careerRoutes from './routes/career.routes';
import roomRoutes from './routes/room.routes';
import resourceRoutes from './routes/resource.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';
import connectDB from './config/database';
import { errorHandler } from './middleware/error.middleware';
import { activityLogger } from './middleware/activityLogger';
import feedbackRoutes from './routes/feedback.routes';

// Import config (this loads dotenv under the hood)
import './config/env';
import { CONFIG } from './config/env';
import { authenticate, authMiddleware, adminOnly } from './middleware/auth.middleware';

// Initialize Express app
const app = express();

// Trust proxy for Fly.io/Vercel (required for rate limiting and secure cookies)
app.set('trust proxy', 1);

/* Middleware */

// Adds security-related HTTP headers
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Logs incoming HTTP requests (method, URL, status, response time)
app.use(morgan('dev'));

/* Cross-Origin Resource Sharing (CORS) configuration */

// List of allowed frontend origins
const allowedOrigins = [
  CONFIG.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://in-aspired.vercel.app'
];
// Enable CORS
app.use(cors({
  origin: function (origin, callback) {

    // Allow requests without an origin (e.g., mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // Block requests from untrusted origins
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }

    // Allow request if origin is in the whitelist
    return callback(null, true);
  },

  // Allow cookies and authorization headers to be sent
  credentials: true
}));


// Body parser to capture raw body for Webhook signature verification
app.use(express.json({
  limit: '50mb', // file size max 50MB
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Body parser to parse URL-encoded form data (file size max 50MB)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Body parser to parse cookies
app.use(cookieParser());

// Safety middleware to ensure req.body and req.cookies are always objects
// Prevents TypeErrors after Express 5 update for empty/malformed requests
app.use((req, res, next) => {
  if (!req.body) req.body = {};
  if (!req.cookies) req.cookies = {};
  next();
});

// Extend Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Serve static files (admin-only — feedback attachments are not public)
app.use('/uploads', authenticate, adminOnly, express.static(path.join(__dirname, '../uploads')));

{/* API routes */ }
app.use("/api/auth", authRoutes);

// Health check — must be before auth middleware so Fly.io can reach it unauthenticated
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mixed public/private routes (handle their own auth internally or are public)
app.use('/api', recommendationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/payment', paymentRoutes);

// Auth middleware that attaches req.user (Global Lock for subsequent routes)
app.use(authenticate);
app.use(authMiddleware);

// activityLogger can see req.user
app.use(activityLogger);

// Protected routes (require global auth)
app.use("/api/users", userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

// AI Chat Route

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root route for quick API verification
app.get('/', (req, res) => {
  res.json({
    message: 'In-Aspired API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      tests: '/api/tests',
      careers: '/api/careers',
      rooms: '/api/rooms'
    }
  });
});

// Health check endpoint used for monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Catch all undefined routes and return 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized global error handler
app.use(errorHandler);

// Export app instance for server startup
export default app;
