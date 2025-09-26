/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */

import constants from '../../config/constants.js';

/**
 * CORS middleware function
 */
export default function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://localhost:3000'
    ];

    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Methods', constants.CORS_CONFIG.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', constants.CORS_CONFIG.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    next();
}

