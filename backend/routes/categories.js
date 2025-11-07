// backend/routes/categories.js

import url from 'url';
import authMiddleware from '../middleware/auth.js'; 

/**
 * Category routes handler
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {CategoryController} controller
 * @param {string} pathname - Request pathname
 */
export default async function categoryRoutes(req, res, controller, pathname) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const query = parsedUrl.query;

  // Extract path after /api/categories
  const path = pathname.replace('/api/categories', '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
    // This sets req.user if token is valid
    const authResult = await authMiddleware.authenticate(req, res);
    
    // If authentication fails and response already sent, return early
    if (!authResult.success && res.writableEnded) {
      return;
    }
    // If auth fails but no response sent yet, continue (for public routes)
    // req.user will be null for unauthenticated requests

    // ⭐ Now req.user is set, proceed with routing

    // GET /api/categories/:id
    if (segments.length === 1 && method === 'GET') {
      req.params = { id: segments[0] };
      req.query = query;
      return controller.getCategory(req, res);
    }

    // GET /api/categories
    if (path === '/' && method === 'GET') {
      req.query = query;
      return controller.getCategories(req, res);
    }

    // POST /api/categories
    if (path === '/' && method === 'POST') {
      return controller.createCategory(req, res);
    }

    // PUT /api/categories/:id
    if (segments.length === 1 && method === 'PUT') {
      req.params = { id: segments[0] };
      return controller.updateCategory(req, res);
    }

    // DELETE /api/categories/:id
    if (segments.length === 1 && method === 'DELETE') {
      req.params = { id: segments[0] };
      return controller.deleteCategory(req, res);
    }

    // 404 - Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Route not found'
    }));

  } catch (error) {
    console.error('Category route error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }));
  }
}
