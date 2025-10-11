// backend/routes/products.js
// 👟 Product Routes - /api/products/*
// Shoe product management routes (No Express)

import url from 'url';

/**
 * Product routes handler
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {ProductController} controller
 * @param {string} pathname - Request pathname
 */
export default function productRoutes(req, res, controller, pathname) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  
  // ⭐ FIX: Gán query vào req.query
  req.query = parsedUrl.query || {};
  
  console.log('🔍 Product Route:', {
    pathname,
    method,
    query: req.query  // Debug log
  });

  // Extract path after /api/products
  const path = pathname.replace('/api/products', '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
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

    // ⭐ GET /api/products (Main list with filters)
    if (path === '/' && method === 'GET') {
      return controller.getProducts(req, res);
    }

    // POST /api/products
    if (path === '/' && method === 'POST') {
      return controller.createProduct(req, res);
    }

    // PUT /api/products/:id
    if (segments.length === 1 && method === 'PUT') {
      req.params = { id: segments[0] };
      return controller.updateProduct(req, res);
    }

    // DELETE /api/products/:id
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
        method: method
      })
    );

  } catch (error) {
    console.error('❌ Product route error:', error);
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    );
  }
}
