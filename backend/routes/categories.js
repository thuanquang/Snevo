// backend/routes/categories.js
// 📂 Category Routes - /api/categories/*
// Shoe category management routes (No Express)

import url from 'url';

/**
 * Category routes handler
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @param {CategoryController} controller 
 * @param {string} pathname - Request pathname
 */
export default function categoryRoutes(req, res, controller, pathname) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const query = parsedUrl.query;

  // Extract path after /api/categories
  const path = pathname.replace('/api/categories', '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
    // GET /api/categories/:id
    if (segments.length === 1 && method === 'GET') {
      req.params = { id: segments[0] };
      return controller.getCategory(req, res);
    }

    // GET /api/categories
    if (path === '/' && method === 'GET') {
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

    // Route not found
    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Category route not found',
        path: pathname,
        method: method
      })
    );

  } catch (error) {
    console.error('Category route error:', error);
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    );
  }
}
