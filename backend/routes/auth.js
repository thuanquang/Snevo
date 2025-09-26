/**
 * Authentication Routes
 * Handles user authentication, registration, and profile management
 */

import url from 'url';
import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import { authMiddleware, authRateLimit } from '../middleware/auth.js';
import { authController } from '../controllers/authController.js';

/**
 * Apply middleware with proper promise handling
 */
function applyMiddleware(middleware) {
    return (req, res) => {
        return new Promise((resolve, reject) => {
            middleware(req, res, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    };
}

/**
 * Authentication router
 */
export default async function authRoutes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Remove /api/auth prefix for routing
    const authPath = pathname.replace('/api/auth', '');

    try {
        switch (true) {
            // POST /api/auth/register
            case authPath === '/register' && method === 'POST':
                await applyMiddleware(authRateLimit)(req, res);
                return await authController.register(req, res);

            // POST /api/auth/login
            case authPath === '/login' && method === 'POST':
                await applyMiddleware(authRateLimit)(req, res);
                return await authController.login(req, res);

            // POST /api/auth/logout
            case authPath === '/logout' && method === 'POST':
                await applyMiddleware(authMiddleware)(req, res);
                return await authController.logout(req, res);

            // GET /api/auth/profile
            case authPath === '/profile' && method === 'GET':
                await applyMiddleware(authMiddleware)(req, res);
                return await authController.getProfile(req, res);

            // PUT /api/auth/profile
            case authPath === '/profile' && method === 'PUT':
                await applyMiddleware(authMiddleware)(req, res);
                return await authController.updateProfile(req, res);

            // POST /api/auth/refresh
            case authPath === '/refresh' && method === 'POST':
                return await authController.refreshToken(req, res);

            // POST /api/auth/forgot-password
            case authPath === '/forgot-password' && method === 'POST':
                await applyMiddleware(authRateLimit)(req, res);
                return await authController.forgotPassword(req, res);

            // POST /api/auth/reset-password
            case authPath === '/reset-password' && method === 'POST':
                return await authController.resetPassword(req, res);

            // POST /api/auth/google
            case authPath === '/google' && method === 'POST':
                return await authController.googleAuth(req, res);

            default:
                return res.json({
                    success: false,
                    error: 'Authentication endpoint not found'
                }, constants.HTTP_STATUS.NOT_FOUND);
        }
    } catch (error) {
        console.error('Auth route error:', error);
        return res.json({
            success: false,
            error: error.message || constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
        }, error.statusCode || constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}

