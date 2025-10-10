// backend/routes/index.js
// 🛣️ Main Router - Central routing hub
// Aggregates all route handlers (No Express)

import url from 'url';
import apiRoutes from './api.js';
import productRoutes from './products.js';
import variantRoutes from './variants.js';
import categoryRoutes from './categories.js';
import colorRoutes from './colors.js';
import sizeRoutes from './sizes.js';

/**
 * Main router that delegates to specific route handlers
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @param {Object} controllers - Object containing all controllers
 */
export default function router(req, res, controllers) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  try {
    // API info routes (/api/health, /api/docs, etc.)
    if (pathname === '/api/health' || 
        pathname === '/api/status' || 
        pathname === '/api/docs' || 
        pathname === '/api/version') {
      return apiRoutes(req, res);
    }

    // Product routes
    if (pathname.startsWith('/api/products')) {
      return productRoutes(req, res, controllers.productController, pathname);
    }

    // Variant routes
    if (pathname.startsWith('/api/variants')) {
      return variantRoutes(req, res, controllers.variantController, pathname);
    }

    // Category routes
    if (pathname.startsWith('/api/categories')) {
      return categoryRoutes(req, res, controllers.categoryController, pathname);
    }

    // Color routes
    if (pathname.startsWith('/api/colors')) {
      return colorRoutes(req, res, controllers.colorController, pathname);
    }

    // Size routes
    if (pathname.startsWith('/api/sizes')) {
      return sizeRoutes(req, res, controllers.sizeController, pathname);
    }

    // Default: Route not found
    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Route not found',
        message: 'The requested endpoint does not exist',
        path: pathname,
        availableEndpoints: [
          '/api/health',
          '/api/docs',
          '/api/products',
          '/api/variants',
          '/api/categories',
          '/api/colors',
          '/api/sizes'
        ]
      })
    );

  } catch (error) {
    console.error('Router error:', error);
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    );
  }
}
