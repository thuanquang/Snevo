// backend/routes/products.js

// 👟 Product Routes - /api/products/*
// Shoe product management routes (No Express)

import url from 'url';
import uploadMiddleware from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';

/**
 * Product routes handler
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {ProductController} controller
 * @param {string} pathname - Request pathname
 */
export default async function productRoutes(req, res, controller, pathname) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;

  // Gán query vào req.query
  req.query = parsedUrl.query || {};

  console.log('🔍 Product Route:', {
    pathname,
    method,
    query: req.query,
  });

  // Extract path after /api/products
  const path = pathname.replace('/api/products', '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
    // ⭐ AUTHENTICATE WRITE OPERATIONS (POST, PUT, DELETE)
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      console.log('🔐 Authenticating product write operation...');
      
      const authResult = await authMiddleware.authenticate(req, res);
      
      if (!authResult || !authResult.success) {
        // Auth middleware already sent 401 response
        return;
      }

      // ⭐ Attach user to request
      req.user = authResult.user;
      console.log('✅ Product route authenticated for user:', req.user.email);
    }

    // GET /api/products/search
    if (path === '/search' && method === 'GET') {
      return controller.searchProducts(req, res);
    }

    // GET /api/products/featured
    if (path === '/featured' && method === 'GET') {
      return controller.getFeaturedProducts(req, res);
    }

    // GET /api/products/category/:categoryId
    if (path.startsWith('/category/') && method === 'GET') {
      const categoryId = segments[1];
      req.params = { categoryId };
      return controller.getProductsByCategory(req, res);
    }

    // GET /api/products/:id
    if (segments.length === 1 && method === 'GET') {
      req.params = { id: segments[0] };
      return controller.getProduct(req, res);
    }

    // GET /api/products (Main list with filters)
    if (path === '/' && method === 'GET') {
      return controller.getProducts(req, res);
    }

    // POST /api/products ⭐ NOW AUTHENTICATED
    if (path === '/' && method === 'POST') {
      return uploadMiddleware.handleUpload(req, res, () => {
        // After upload middleware processes the file
        return controller.createProduct(req, res);
      });
    }

    // PUT /api/products/:id ⭐ NOW AUTHENTICATED + FIXED req.params
    if (segments.length === 1 && method === 'PUT') {
      const id = parseInt(segments[0]);
      
      // ⭐ SET req.params BEFORE calling middleware
      req.params = { id: id };
      
      // Use handleUpload middleware directly
      return uploadMiddleware.handleUpload(req, res, () => {
        // After upload middleware processes the file
        // Controller will read from req.params.id
        return controller.updateProduct(req, res);  // ✅ No third parameter!
      });
    }

    // DELETE /api/products/:id ⭐ NOW AUTHENTICATED
    if (segments.length === 1 && method === 'DELETE') {
      req.params = { id: segments[0] };
      return controller.deleteProduct(req, res);
    }

    // Route not found
    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Product route not found',
        path: pathname,
        method: method,
      })
    );

  } catch (error) {
    console.error('❌ Product route error:', error);
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      })
    );
  }
}
