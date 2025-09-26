/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

import jwt from 'jsonwebtoken';
import { supabase, supabaseHelpers } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import { AuthenticationError, AuthorizationError } from '../utils/ErrorClasses.js';

/**
 * Authentication middleware - verifies JWT token
 */
export async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token with Supabase
        const user = await supabaseHelpers.getUserFromToken(token);
        
        if (!user) {
            req.user = null;
            return next();
        }

        // Add user to request object with enhanced info
        req.user = {
            ...user,
            email_confirmed_at: user.email_confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
            created_at: user.created_at
        };
        
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        req.user = null;
        next();
    }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const user = await supabaseHelpers.getUserFromToken(token);
            req.user = user;
        } else {
            req.user = null;
        }
        
        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        req.user = null;
        next();
    }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req, res, next) {
    if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
    }
    next();
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles) {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Authentication required'));
        }

        try {
            // Get user role from database
            const { data: userData, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .select('role')
                .eq('email', req.user.email)
                .single();

            if (error || !userData) {
                return next(new AuthenticationError('User account not found'));
            }

            const userRole = userData.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return next(new AuthorizationError('Insufficient permissions'));
            }

            req.userRole = userRole;
            next();
            
        } catch (error) {
            console.error('Role authorization error:', error);
            return next(error);
        }
    };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req, res, next) {
    return requireRole(['admin'])(req, res, next);
}

/**
 * Middleware to require seller or admin role
 */
export function requireSeller(req, res, next) {
    return requireRole(['admin', 'seller'])(req, res, next);
}

/**
 * Middleware to check if user owns resource or is admin
 */
export function requireOwnership(getUserId) {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Authentication required'));
        }

        try {
            // Get user role from database
            const { data: userData, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .select('role, user_id')
                .eq('email', req.user.email)
                .single();

            if (error || !userData) {
                return next(new AuthenticationError('User account not found'));
            }

            // Admin can access any resource
            if (userData.role === 'admin') {
                return next();
            }

            const resourceUserId = typeof getUserId === 'function' 
                ? getUserId(req) 
                : req.params[getUserId] || req.body[getUserId];

            if (userData.user_id !== resourceUserId) {
                return next(new AuthorizationError('Access denied to this resource'));
            }

            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            return next(error);
        }
    };
}

/**
 * Middleware to check email verification
 */
export function requireEmailVerification(req, res, next) {
    if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
    }

    if (!req.user.email_confirmed_at) {
        return next(new AuthenticationError('Email verification required'));
    }

    next();
}

/**
 * Middleware to log user activity
 */
export function logActivity(action) {
    return (req, res, next) => {
        if (req.user) {
            // Log user activity (implement with your logging service)
            console.log(`User ${req.user.id} performed action: ${action}`, {
                user_id: req.user.id,
                email: req.user.email,
                action,
                timestamp: new Date().toISOString(),
                ip: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                url: req.url,
                method: req.method
            });
        }
        next();
    };
}

/**
 * Middleware to check session freshness
 */
export function requireFreshSession(maxAge = 3600000) { // 1 hour default
    return (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Authentication required'));
        }

        if (!req.user.last_sign_in_at) {
            return next();
        }

        const lastSignIn = new Date(req.user.last_sign_in_at);
        const now = new Date();
        const sessionAge = now - lastSignIn;

        if (sessionAge > maxAge) {
            return next(new AuthenticationError('Session expired, please login again'));
        }

        next();
    };
}

/**
 * Middleware for API key authentication (for external integrations)
 */
export function requireApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return next(new AuthenticationError('API key required'));
    }

    // Validate API key (implement your API key validation logic)
    const validApiKey = process.env.API_KEY || 'your-api-key';
    
    if (apiKey !== validApiKey) {
        return next(new AuthenticationError('Invalid API key'));
    }

    // Set API user context
    req.user = {
        id: 'api',
        email: 'api@system.local',
        role: 'api',
        is_api: true
    };

    next();
}

/**
 * Middleware to handle both user auth and API key auth
 */
export function requireAuthOrApiKey(req, res, next) {
    const hasApiKey = req.headers['x-api-key'];
    const hasAuthHeader = req.headers.authorization;

    if (hasApiKey) {
        return requireApiKey(req, res, next);
    } else if (hasAuthHeader) {
        return requireAuth(req, res, next);
    } else {
        return next(new AuthenticationError('Authentication required (Bearer token or API key)'));
    }
}

/**
 * Rate limiting middleware for authentication endpoints
 */
const authAttempts = new Map();

export function authRateLimit(req, res, next) {
    const clientIP = req.connection.remoteAddress || req.socket.remoteAddress;
    const now = Date.now();
    const windowStart = now - constants.RATE_LIMITING.AUTH_WINDOW_MS;

    // Clean old attempts
    const attempts = authAttempts.get(clientIP) || [];
    const recentAttempts = attempts.filter(time => time > windowStart);

    if (recentAttempts.length >= constants.RATE_LIMITING.AUTH_MAX_REQUESTS) {
        const error = new AuthenticationError('Too many authentication attempts. Please try again later.');
        error.statusCode = 429;
        return next(error);
    }

    // Add current attempt
    recentAttempts.push(now);
    authAttempts.set(clientIP, recentAttempts);

    next();
}

/**
 * Enhanced rate limiting with different limits for different endpoints
 */
export function createRateLimit(options = {}) {
    const {
        maxRequests = 100,
        windowMs = 3600000, // 1 hour
        keyGenerator = (req) => req.ip || req.connection.remoteAddress,
        message = 'Rate limit exceeded'
    } = options;

    const store = new Map();

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!store.has(key)) {
            store.set(key, []);
        }

        const requests = store.get(key);
        const recentRequests = requests.filter(timestamp => timestamp > windowStart);

        if (recentRequests.length >= maxRequests) {
            const error = new AuthenticationError(message);
            error.statusCode = 429;
            error.retryAfter = Math.ceil((recentRequests[0] - windowStart) / 1000);
            return next(error);
        }

        recentRequests.push(now);
        store.set(key, recentRequests);

        next();
    };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req, res, next) {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add CSP header for API
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    next();
}

export default {
    authMiddleware,
    optionalAuthMiddleware,
    requireAuth,
    requireRole,
    requireAdmin,
    requireSeller,
    requireOwnership,
    requireEmailVerification,
    logActivity,
    requireFreshSession,
    requireApiKey,
    requireAuthOrApiKey,
    authRateLimit,
    createRateLimit,
    securityHeaders
};