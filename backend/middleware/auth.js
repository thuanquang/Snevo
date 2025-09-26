/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

import jwt from 'jsonwebtoken';
import { supabase, supabaseHelpers } from '../../config/supabase.js';
import constants from '../../config/constants.js';

/**
 * Authentication middleware - verifies JWT token
 */
export async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({
                success: false,
                error: constants.ERROR_MESSAGES.AUTH.UNAUTHORIZED
            }, constants.HTTP_STATUS.UNAUTHORIZED);
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token with Supabase
        const user = await supabaseHelpers.getUserFromToken(token);
        
        if (!user) {
            return res.json({
                success: false,
                error: constants.ERROR_MESSAGES.AUTH.TOKEN_EXPIRED
            }, constants.HTTP_STATUS.UNAUTHORIZED);
        }

        // Add user to request object
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.json({
            success: false,
            error: constants.ERROR_MESSAGES.AUTH.UNAUTHORIZED
        }, constants.HTTP_STATUS.UNAUTHORIZED);
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
        }
        
        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        // Continue without user
        next();
    }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.json({
                success: false,
                error: constants.ERROR_MESSAGES.AUTH.UNAUTHORIZED
            }, constants.HTTP_STATUS.UNAUTHORIZED);
        }

        try {
            // Get user role from database
            const { data: userData, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .select('role')
                .eq('email', req.user.email)
                .single();

            if (error || !userData) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.AUTH.ACCOUNT_NOT_FOUND
                }, constants.HTTP_STATUS.NOT_FOUND);
            }

            const userRole = userData.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.AUTH.UNAUTHORIZED
                }, constants.HTTP_STATUS.FORBIDDEN);
            }

            req.userRole = userRole;
            next();
            
        } catch (error) {
            console.error('Role authorization error:', error);
            return res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    };
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
        return res.json({
            success: false,
            error: 'Too many authentication attempts. Please try again later.'
        }, constants.HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    // Add current attempt
    recentAttempts.push(now);
    authAttempts.set(clientIP, recentAttempts);

    next();
}

export default {
    authMiddleware,
    optionalAuthMiddleware,
    requireRole,
    authRateLimit
};

