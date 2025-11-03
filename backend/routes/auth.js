// 🔐 Auth Routes - /api/auth/*
// Authentication and profile management routes

import authMiddleware from '../middleware/auth.js';
import { createAvatarUploadMiddleware } from '../middleware/upload.js';

/**
 * Handle authentication routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} controllers - Controllers object {profileController, addressController}
 * @param {String} pathname - Request pathname
 * @param {Function} sendError - Error sender function
 */
export default async function handleAuthRoutes(req, res, controllers, pathname, sendError) {
    const authPath = pathname.replace('/api/auth', '');

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        return;
    }
    req.user = authResult.user;

    try {
        if (authPath === '/profile') {
            if (req.method === 'GET') {
                await controllers.profileController.getProfile(req, res);
            } else if (req.method === 'PUT') {
                // Handle avatar upload for multipart requests
                const contentType = req.headers['content-type'] || '';
                if (contentType.includes('multipart/form-data')) {
                    console.log('📤 Processing avatar upload for profile');
                    const avatarMiddleware = createAvatarUploadMiddleware(req.user.id);
                    
                    try {
                        await new Promise((resolve, reject) => {
                            avatarMiddleware.handleUpload(req, res, async () => {
                                try {
                                    req.body = req.body || {};
                                    await controllers.profileController.updateProfile(req, res);
                                    resolve();
                                } catch (err) {
                                    reject(err);
                                }
                            });
                        });
                    } catch (error) {
                        console.error('Avatar upload error:', error);
                        if (!res.headersSent) {
                            sendError(res, error.message || 'Avatar upload failed', 400);
                        }
                    }
                } else {
                    // Regular JSON request
                    await controllers.profileController.updateProfile(req, res);
                }
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (authPath === '/addresses' || authPath === '/addresses/') {
            // ⭐ GET /api/auth/addresses - List addresses
            if (req.method === 'GET') {
                await controllers.addressController.getAddresses(req, res);
            } 
            // ⭐ POST /api/auth/addresses - Create address
            else if (req.method === 'POST') {
                await controllers.addressController.createAddress(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (authPath.match(/^\/addresses\/\d+$/)) {
            // ⭐ Handle /api/auth/addresses/:id routes
            const id = authPath.replace('/addresses/', '');
            req.params = { id };
            
            if (req.method === 'GET') {
                await controllers.addressController.getAddress(req, res);
            } else if (req.method === 'PUT') {
                await controllers.addressController.updateAddress(req, res);
            } else if (req.method === 'DELETE') {
                await controllers.addressController.deleteAddress(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else {
            sendError(res, 'Auth endpoint not found', 404);
        }
    } catch (error) {
        console.error('Auth route error:', error);
        sendError(res, 'Internal server error', 500);
    }
}
