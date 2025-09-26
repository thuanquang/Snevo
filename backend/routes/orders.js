/**
 * Order Routes
 * Handles all order-related endpoints
 */

import url from 'url';
import { orderController } from '../controllers/orderController.js';
import { authMiddleware, requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation.js';

/**
 * Order routes handler
 */
export default async function orderRoutes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname.replace('/api/orders', '');
    const method = req.method;

    // Apply auth middleware first
    await new Promise((resolve, reject) => {
        authMiddleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    // Extract route parameters
    const pathParts = pathname.split('/').filter(part => part);
    
    try {
        // Handle different routes
        switch (true) {
            // GET /api/orders - Get user orders
            case pathname === '' && method === 'GET':
                await requireAuth(req, res, () => {});
                return await orderController.getUserOrders(req, res);

            // POST /api/orders - Create new order
            case pathname === '' && method === 'POST':
                await requireAuth(req, res, () => {});
                return await orderController.createOrder(req, res);

            // GET /api/orders/stats - Get order statistics
            case pathname === '/stats' && method === 'GET':
                await requireAuth(req, res, () => {});
                return await orderController.getOrderStats(req, res);

            // GET /api/orders/all - Get all orders (admin/seller only)
            case pathname === '/all' && method === 'GET':
                await requireRole(['admin', 'seller'])(req, res, () => {});
                return await orderController.getAllOrders(req, res);

            // GET /api/orders/:id - Get order by ID
            case pathParts.length === 1 && method === 'GET':
                req.params = { id: pathParts[0] };
                await requireAuth(req, res, () => {});
                return await orderController.getOrderById(req, res);

            // PUT /api/orders/:id/status - Update order status (admin/seller only)
            case pathParts.length === 2 && pathParts[1] === 'status' && method === 'PUT':
                req.params = { id: pathParts[0] };
                await requireRole(['admin', 'seller'])(req, res, () => {});
                return await orderController.updateOrderStatus(req, res);

            // PUT /api/orders/:id/payment - Update payment status (admin only)
            case pathParts.length === 2 && pathParts[1] === 'payment' && method === 'PUT':
                req.params = { id: pathParts[0] };
                await requireRole(['admin'])(req, res, () => {});
                return await orderController.updatePaymentStatus(req, res);

            // PUT /api/orders/:id/tracking - Add tracking number (admin/seller only)
            case pathParts.length === 2 && pathParts[1] === 'tracking' && method === 'PUT':
                req.params = { id: pathParts[0] };
                await requireRole(['admin', 'seller'])(req, res, () => {});
                return await orderController.addTracking(req, res);

            // PUT /api/orders/:id/cancel - Cancel order
            case pathParts.length === 2 && pathParts[1] === 'cancel' && method === 'PUT':
                req.params = { id: pathParts[0] };
                await requireAuth(req, res, () => {});
                return await orderController.cancelOrder(req, res);

            // POST /api/orders/:id/payment - Process payment
            case pathParts.length === 2 && pathParts[1] === 'payment' && method === 'POST':
                req.params = { id: pathParts[0] };
                await requireAuth(req, res, () => {});
                return await orderController.processPayment(req, res);

            // PUT /api/orders/:id/refund - Refund order (admin only)
            case pathParts.length === 2 && pathParts[1] === 'refund' && method === 'PUT':
                req.params = { id: pathParts[0] };
                await requireRole(['admin'])(req, res, () => {});
                return await orderController.refundOrder(req, res);

            default:
                return res.json({
                    success: false,
                    error: 'Order endpoint not found'
                }, 404);
        }
    } catch (error) {
        console.error('Order route error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error'
        }, error.statusCode || 500);
    }
}
