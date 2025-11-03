// 👑 Admin Routes - API endpoints for admin dashboard and management
// All routes require authentication middleware

import authMiddleware from '../middleware/auth.js';

export default async function handleAdminRoutes(req, res, adminController, pathname, sendError) {
    const adminPath = pathname.replace('/api/admin', '');

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        return;
    }
    req.user = authResult.user;

    try {
        // GET /api/admin/ or /api/admin (Dashboard - Legacy)
        if ((adminPath === '/' || adminPath === '') && req.method === 'GET') {
            return await adminController.getDashboard(req, res);
        }

        // ⭐ GET /api/admin/metrics (Enhanced Dashboard Metrics with 30-day analytics)
        if (adminPath === '/metrics' && req.method === 'GET') {
            return await adminController.getDashboardMetrics(req, res);
        }

        // GET /api/admin/statistics
        if (adminPath === '/statistics' && req.method === 'GET') {
            return await adminController.getStatistics(req, res);
        }

        // GET /api/admin/users
        if (adminPath === '/users' && req.method === 'GET') {
            return await adminController.getUserManagement(req, res);
        }

        // GET /api/admin/inventory
        if (adminPath === '/inventory' && req.method === 'GET') {
            return await adminController.getInventoryManagement(req, res);
        }

        // GET /api/admin/orders
        if (adminPath === '/orders' && req.method === 'GET') {
            return await adminController.getOrderManagement(req, res);
        }

        // Route not found
        return sendError(res, 'Admin endpoint not found', 404);

    } catch (error) {
        console.error('Admin route error:', error);
        return sendError(res, 'Internal server error', 500);
    }
}
