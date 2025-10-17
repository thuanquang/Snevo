// backend/routes/imports.js

// 📥 Import Routes - /api/imports/*
// Inventory import management routes (No Express)

import url from 'url';
import authMiddleware from '../middleware/auth.js';  // ⭐ ADD THIS

/**
 * Import routes handler
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {ImportController} controller
 * @param {string} pathname - Request pathname
 */
export default async function importRoutes(req, res, controller, pathname) {  // ⭐ Make ASYNC
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    
    // Assign query to req.query
    req.query = parsedUrl.query || {};

    // Extract path after /api/imports
    const path = pathname.replace('/api/imports', '') || '/';
    const segments = path.split('/').filter(Boolean);

    try {
        // ⭐ AUTHENTICATE ALL IMPORT ROUTES
        const authResult = await authMiddleware.authenticate(req, res);
        
        if (!authResult || !authResult.success) {
            // Auth middleware already sent 401 response
            return;
        }

        // ⭐ Attach user to request
        req.user = authResult.user;
        console.log('✅ Import route authenticated for user:', req.user.email);

        // GET /api/imports/statistics
        if (path === '/statistics' && method === 'GET') {
            return controller.getImportStatistics(req, res);
        }

        // POST /api/imports/batch ⭐ NOW AUTHENTICATED
        if (path === '/batch' && method === 'POST') {
            return controller.createBatchImport(req, res);
        }

        // GET /api/imports/shoe/:shoeId
        if (path.startsWith('/shoe/') && method === 'GET' && segments.length === 2) {
            req.params = { shoeId: segments[1] };
            return controller.getImportsByShoe(req, res);
        }

        // GET /api/imports/variant/:variantId
        if (path.startsWith('/variant/') && method === 'GET' && segments.length === 2) {
            req.params = { variantId: segments[1] };
            return controller.getImportsByVariant(req, res);
        }

        // GET /api/imports/:id
        if (segments.length === 1 && method === 'GET') {
            req.params = { id: segments[0] };
            return controller.getImport(req, res);
        }

        // GET /api/imports
        if (path === '/' && method === 'GET') {
            return controller.getImports(req, res);
        }

        // POST /api/imports
        if (path === '/' && method === 'POST') {
            return controller.createImport(req, res);
        }

        // PUT /api/imports/:id
        if (segments.length === 1 && method === 'PUT') {
            req.params = { id: segments[0] };
            return controller.updateImport(req, res);
        }

        // DELETE /api/imports/:id
        if (segments.length === 1 && method === 'DELETE') {
            req.params = { id: segments[0] };
            return controller.deleteImport(req, res);
        }

        // 404 - Route not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'Import route not found'
        }));

    } catch (error) {
        console.error('❌ Import route error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'Internal server error'
        }));
    }
}
