// 🛒 Cart Routes - API endpoints for shopping cart management
// All routes require authentication middleware

import authMiddleware from '../middleware/auth.js';

export default async function cartRoutes(req, res, cartController, pathname) {
    const cartPath = pathname.replace('/api/cart', '');

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        return;
    }

    req.user = authResult.user;

    try {
        // GET /api/cart/ or /api/cart (Get user's cart)
        if ((cartPath === '/' || cartPath === '') && req.method === 'GET') {
            return await cartController.getCart(req, res);
        }

        // POST /api/cart/ or /api/cart (Add item to cart)
        if ((cartPath === '/' || cartPath === '') && req.method === 'POST') {
            return await cartController.addToCart(req, res);
        }

        // GET /api/cart/summary
        if (cartPath === '/summary' && req.method === 'GET') {
            return await cartController.getSummary(req, res);
        }

        // PUT /api/cart/:cart_id (Update cart item quantity)
        if (cartPath.match(/^\/\d+$/) && req.method === 'PUT') {
            const cart_id = cartPath.substring(1);
            req.params = { cart_id };
            return await cartController.updateCartItem(req, res);
        }

        // DELETE /api/cart/:cart_id (Remove cart item)
        if (cartPath.match(/^\/\d+$/) && req.method === 'DELETE') {
            const cart_id = cartPath.substring(1);
            req.params = { cart_id };
            return await cartController.removeCartItem(req, res);
        }

        // Route not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Cart endpoint not found' }));

    } catch (error) {
        console.error('Error in cart routes:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
    }
}
