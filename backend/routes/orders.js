// 🛒 Order Routes - /api/orders/*
// Order management routes

import authMiddleware from '../middleware/auth.js';

/**
 * Handle order routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} orderController - Order controller instance
 * @param {String} pathname - Request pathname
 * @param {Function} sendError - Error sender function
 */
export default async function handleOrderRoutes(req, res, orderController, pathname, sendError) {
    const orderPath = pathname.replace('/api/orders', '');
    console.log('📦 Order Route:', { pathname, orderPath, method: req.method });

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        console.warn('⚠️ Auth failed for order route');
        return;
    }
    req.user = authResult.user;
    console.log('✅ Auth OK, user:', req.user.id);

    try {
        if (orderPath === '/' || orderPath === '') {
            console.log('📦 Order root path, method:', req.method);
            if (req.method === 'GET') {
                await orderController.getOrders(req, res);
            } else if (req.method === 'POST') {
                console.log('📦 Creating order');
                await orderController.createOrder(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath === '/preview') {
            console.log('📦 Preview path');
            if (req.method === 'GET') {
                await orderController.previewOrder(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath.match(/^\/\d+$/)) {
            const id = orderPath.substring(1);
            req.params = { id };
            if (req.method === 'GET') {
                await orderController.getOrder(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath.match(/^\/\d+\/status$/)) {
            const id = orderPath.replace('/status', '').replace('/', '');
            if (req.method === 'PUT') {
                req.params = { id };
                await orderController.updateOrderStatus(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath.match(/^\/\d+\/cancel$/)) {
            const id = orderPath.replace('/cancel', '').replace('/', '');
            if (req.method === 'PUT') {
                req.params = { id };
                await orderController.cancelOrder(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath.match(/^\/\d+\/address$/)) {
            const id = orderPath.replace('/address', '').replace('/', '');
            if (req.method === 'PUT') {
                req.params = { id };
                await orderController.updateOrderAddress(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath.match(/^\/\d+\/reorder$/)) {
            const id = orderPath.replace('/reorder', '').replace('/', '');
            if (req.method === 'POST') {
                req.params = { id };
                await orderController.reorderItems(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else {
            console.warn('⚠️ Order route not found:', { orderPath, method: req.method });
            sendError(res, 'API endpoint not found', 404);
        }
    } catch (error) {
        console.error('Order route error:', error);
        sendError(res, 'Internal server error', 500);
    }
}
