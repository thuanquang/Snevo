// 👨‍💼 Profile Routes - /api/profiles/*
// User profile management routes

import authMiddleware from '../middleware/auth.js';

/**
 * Handle profile routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} profileController - Profile controller instance
 * @param {String} pathname - Request pathname
 * @param {Function} sendError - Error sender function
 */
export default async function handleProfileRoutes(req, res, profileController, pathname, sendError) {
    const profilePath = pathname.replace('/api/profiles', '');

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        return;
    }
    req.user = authResult.user;

    try {
        if (profilePath === '/' || profilePath === '') {
            if (req.method === 'GET') {
                await profileController.getProfile(req, res);
            } else if (req.method === 'PUT') {
                await profileController.updateProfile(req, res);
            } else if (req.method === 'DELETE') {
                await profileController.deleteProfile(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else {
            sendError(res, 'Profile endpoint not found', 404);
        }
    } catch (error) {
        console.error('Profile route error:', error);
        sendError(res, 'Internal server error', 500);
    }
}

