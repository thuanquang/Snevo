// 🏠 Address Routes - /api/addresses/*
// User address management routes

import authMiddleware from '../middleware/auth.js';

/**
 * Handle address routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} addressController - Address controller instance
 * @param {String} pathname - Request pathname
 * @param {Function} sendError - Error sender function
 */
export default async function handleAddressRoutes(req, res, addressController, pathname, sendError) {
    const addressPath = pathname.replace('/api/addresses', '');

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        return;
    }
    req.user = authResult.user;

    try {
        if (addressPath === '/' || addressPath === '') {
            if (req.method === 'GET') {
                await addressController.getAddresses(req, res);
            } else if (req.method === 'POST') {
                await addressController.createAddress(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (addressPath.match(/^\/\d+$/)) {
            const id = addressPath.substring(1);
            req.params = { id };
            
            if (req.method === 'GET') {
                await addressController.getAddress(req, res);
            } else if (req.method === 'PUT') {
                await addressController.updateAddress(req, res);
            } else if (req.method === 'DELETE') {
                await addressController.deleteAddress(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else {
            sendError(res, 'Address endpoint not found', 404);
        }
    } catch (error) {
        console.error('Address route error:', error);
        sendError(res, 'Internal server error', 500);
    }
}

