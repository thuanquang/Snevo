/**
 * Authentication Routes
 * Handles user authentication, registration, and profile management
 */

import url from 'url';
import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import { authMiddleware, authRateLimit } from '../middleware/auth.js';
import AuthController from '../controllers/authController.js';

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
                await authRateLimit(req, res, async () => {
                    await AuthController.register(req, res);
                });
                break;

            // POST /api/auth/login
            case authPath === '/login' && method === 'POST':
                await authRateLimit(req, res, async () => {
                    await AuthController.login(req, res);
                });
                break;

            // POST /api/auth/logout
            case authPath === '/logout' && method === 'POST':
                await authMiddleware(req, res, async () => {
                    await AuthController.logout(req, res);
                });
                break;

            // GET /api/auth/profile
            case authPath === '/profile' && method === 'GET':
                await authMiddleware(req, res, async () => {
                    await AuthController.getProfile(req, res);
                });
                break;

            // PUT /api/auth/profile
            case authPath === '/profile' && method === 'PUT':
                await authMiddleware(req, res, async () => {
                    await AuthController.updateProfile(req, res);
                });
                break;

            // POST /api/auth/refresh
            case authPath === '/refresh' && method === 'POST':
                await AuthController.refreshToken(req, res);
                break;

            // POST /api/auth/forgot-password
            case authPath === '/forgot-password' && method === 'POST':
                await authRateLimit(req, res, async () => {
                    await AuthController.forgotPassword(req, res);
                });
                break;

            // POST /api/auth/reset-password
            case authPath === '/reset-password' && method === 'POST':
                await AuthController.resetPassword(req, res);
                break;

            // POST /api/auth/google
            case authPath === '/google' && method === 'POST':
                await AuthController.googleAuth(req, res);
                break;

            default:
                res.json({
                    success: false,
                    error: 'Authentication endpoint not found'
                }, constants.HTTP_STATUS.NOT_FOUND);
        }
    } catch (error) {
        console.error('Auth route error:', error);
        res.json({
            success: false,
            error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
        }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}

