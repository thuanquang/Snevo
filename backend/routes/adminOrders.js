// 📦 Admin Order Routes - /api/admin/orders/*
// Admin order management routes

import authMiddleware from '../middleware/auth.js';

/**
 * Handle admin order routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} orderController - Order controller instance
 * @param {String} pathname - Request pathname
 * @param {Function} sendError - Error sender function
 */
export default async function handleAdminOrderRoutes(req, res, orderController, pathname, sendError) {
    const adminOrderPath = pathname.replace('/api/admin/orders', '');
    console.log('📦 Admin Order Route:', { pathname, adminOrderPath, method: req.method });

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        console.warn('⚠️ Auth failed for admin order route');
        return;
    }
    req.user = authResult.user;
    console.log('✅ Auth OK, user:', req.user.id);

    try {
        if (adminOrderPath === '/' || adminOrderPath === '') {
            console.log('📦 Admin Order root path, method:', req.method);
            if (req.method === 'GET') {
                await orderController.getAdminOrders(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (adminOrderPath.match(/^\/\d+$/)) {
            const id = adminOrderPath.substring(1);
            req.params = { id };
            if (req.method === 'GET') {
                await orderController.getAdminOrder(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (adminOrderPath.match(/^\/\d+\/status$/)) {
            const id = adminOrderPath.replace('/status', '').replace('/', '');
            if (req.method === 'PUT') {
                req.params = { id };
                await orderController.updateAdminOrderStatus(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (adminOrderPath.match(/^\/\d+\/cancel$/)) {
            const id = adminOrderPath.replace('/cancel', '').replace('/', '');
            if (req.method === 'PUT') {
                req.params = { id };
                await orderController.cancelAdminOrder(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (adminOrderPath.match(/^\/\d+\/address$/)) {
            const id = adminOrderPath.replace('/address', '').replace('/', '');
            if (req.method === 'PUT') {
                req.params = { id };
                await orderController.updateOrderAddress(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (adminOrderPath.match(/^\/\d+\/reorder$/)) {
            const id = adminOrderPath.replace('/reorder', '').replace('/', '');
            if (req.method === 'POST') {
                req.params = { id };
                await orderController.reorderItems(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else {
            console.warn('⚠️ Admin order route not found:', { adminOrderPath, method: req.method });
            sendError(res, 'API endpoint not found', 404);
        }
    } catch (error) {
        console.error('Admin order route error:', error);
        sendError(res, 'Internal server error', 500);
    }
}
