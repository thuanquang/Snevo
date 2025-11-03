// 👤 User Routes - /api/users/*
// User management routes

import authMiddleware from '../middleware/auth.js';

/**
 * Handle user routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} controllers - Controllers object {profileController, addressController}
 * @param {String} pathname - Request pathname
 * @param {Function} sendError - Error sender function
 */
export default async function handleUserRoutes(req, res, controllers, pathname, sendError) {
    const userPath = pathname.replace('/api/users', '');

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        return;
    }
    req.user = authResult.user;

    try {
        // GET /api/users/addresses - Get user addresses
        if (userPath === '/addresses' && req.method === 'GET') {
            return await controllers.addressController.getAddresses(req, res);
        }

        // POST /api/users/addresses - Create address
        if (userPath === '/addresses' && req.method === 'POST') {
            return await controllers.addressController.createAddress(req, res);
        }

        // PUT /api/users/addresses/:id - Update address
        if (userPath.match(/^\/addresses\/\d+$/) && req.method === 'PUT') {
            const id = userPath.replace('/addresses/', '');
            req.params = { id };
            return await controllers.addressController.updateAddress(req, res);
        }

        // DELETE /api/users/addresses/:id - Delete address
        if (userPath.match(/^\/addresses\/\d+$/) && req.method === 'DELETE') {
            const id = userPath.replace('/addresses/', '');
            req.params = { id };
            return await controllers.addressController.deleteAddress(req, res);
        }

        // GET /api/users/ or /api/users (placeholder)
        if ((userPath === '/' || userPath === '') && req.method === 'GET') {
            return sendError(res, 'User routes not fully implemented yet', 501);
        }

        // Route not found
        return sendError(res, 'User endpoint not found', 404);

    } catch (error) {
        console.error('User route error:', error);
        return sendError(res, 'Internal server error', 500);
    }
}
