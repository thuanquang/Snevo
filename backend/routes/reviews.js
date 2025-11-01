// 📝 Review Routes - API endpoints for product reviews
// Handles both public review viewing and authenticated review management

import authMiddleware from '../middleware/auth.js';

export default async function reviewRoutes(req, res, reviewController, pathname) {
    const reviewPath = pathname.replace('/api/reviews', '');
    const productPath = pathname.match(/^\/api\/products\/(\d+)\/reviews/);

    try {
        // ============================================================
        // PUBLIC ROUTES (No authentication required)
        // ============================================================
        
        // GET /api/products/:shoeId/reviews/stats - Get review statistics
        if (productPath && pathname.endsWith('/stats') && req.method === 'GET') {
            const shoeId = productPath[1];
            req.params = { shoeId };
            return await reviewController.getProductReviewStats(req, res);
        }

        // GET /api/products/:shoeId/reviews/me - Get current user's review (requires auth)
        if (productPath && pathname.endsWith('/me') && req.method === 'GET') {
            const authResult = await authMiddleware.authenticate(req, res);
            if (!authResult || !authResult.success) {
                return;
            }
            req.user = authResult.user;
            const shoeId = productPath[1];
            req.params = { shoeId };
            return await reviewController.getMyReviewForProduct(req, res);
        }

        // GET /api/products/:shoeId/reviews - List product reviews
        if (productPath && req.method === 'GET') {
            const shoeId = productPath[1];
            req.params = { shoeId };
            return await reviewController.listProductReviews(req, res);
        }

        // ============================================================
        // AUTHENTICATED ROUTES (Require login)
        // ============================================================

        // Check authentication for protected routes
        const authResult = await authMiddleware.authenticate(req, res);
        if (!authResult || !authResult.success) {
            return;
        }
        req.user = authResult.user;

        // POST /api/reviews - Create new review
        if ((reviewPath === '/' || reviewPath === '') && req.method === 'POST') {
            return await reviewController.createReview(req, res);
        }

        // GET /api/reviews/my-reviews - Get current user's reviews
        if (reviewPath === '/my-reviews' && req.method === 'GET') {
            return await reviewController.listMyReviews(req, res);
        }

        // PUT /api/reviews/:id - Update review
        if (reviewPath.match(/^\/\d+$/) && req.method === 'PUT') {
            const id = reviewPath.substring(1);
            req.params = { id };
            return await reviewController.updateReview(req, res);
        }

        // DELETE /api/reviews/:id - Delete review
        if (reviewPath.match(/^\/\d+$/) && req.method === 'DELETE') {
            const id = reviewPath.substring(1);
            req.params = { id };
            return await reviewController.deleteReview(req, res);
        }

        // Route not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Review endpoint not found' }));

    } catch (error) {
        console.error('Error in review routes:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
    }
}
