import rateLimit from 'express-rate-limit';

// Rate limiter for sign up, login (local and google), forgot password, reset password 
// Limits to 5 requests per minute to prevent brute force attacks
export const authRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per time window
    standardHeaders: true, // Send RFC-compliant `RateLimit-*` headers in the response
    legacyHeaders: false, // Disable old, deprecated `X-RateLimit-*` headers
    message: { // Return error message when limit is exceeded
        message: "Too many attempts, please try again later."
    }
});

// Rate limiter for contact form (Strict anti-spam)
// Limits to 3 requests per hour to prevent spamming or DDoS
export const contactRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "You have sent too many messages. Please try again in an hour."
    }
});
