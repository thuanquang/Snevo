// backend/routes/variants.js
// ⭐ Variant Routes - /api/variants/*
// Shoe variant management routes (No Express)

import url from 'url';

/**
 * Variant routes handler
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @param {VariantController} controller 
 * @param {string} pathname - Request pathname
 */
export default function variantRoutes(req, res, controller, pathname) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const query = parsedUrl.query;

  // Extract path after /api/variants
  const path = pathname.replace('/api/variants', '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
    // GET /api/variants/find (composite key lookup)
    if (path === '/find' && method === 'GET') {
      return controller.findVariantByComposite(req, res);
    }

    // GET /api/variants/sku/:sku
    if (path.startsWith('/sku/') && method === 'GET') {
      req.params = { sku: segments[1] };
      return controller.getVariantBySku(req, res);
    }

    // GET /api/variants/low-stock
    if (path === '/low-stock' && method === 'GET') {
      return controller.getLowStockVariants(req, res);
    }

    // GET /api/variants/shoe/:shoeId/color/:colorId
    if (segments[0] === 'shoe' && segments[2] === 'color' && method === 'GET') {
      req.params = { 
        shoeId: segments[1],
        colorId: segments[3]
      };
      return controller.getVariantsByColor(req, res);
    }

    // POST /api/variants/bulk
    if (path === '/bulk' && method === 'POST') {
      return controller.bulkCreateVariants(req, res);
    }

    // POST /api/variants/:id/check-stock
    if (segments.length === 2 && segments[1] === 'check-stock' && method === 'POST') {
      req.params = { id: segments[0] };
      return controller.checkStock(req, res);
    }

    // PATCH /api/variants/:id/stock
    if (segments.length === 2 && segments[1] === 'stock' && method === 'PATCH') {
      req.params = { id: segments[0] };
      return controller.updateStock(req, res);
    }

    // GET /api/variants/:id
    if (segments.length === 1 && method === 'GET') {
      req.params = { id: segments[0] };
      return controller.getVariant(req, res);
    }

    // GET /api/variants (with optional shoe_id query)
    if (path === '/' && method === 'GET') {
      return controller.getVariants(req, res);
    }

    // POST /api/variants
    if (path === '/' && method === 'POST') {
      return controller.createVariant(req, res);
    }

    // PUT /api/variants/:id
    if (segments.length === 1 && method === 'PUT') {
      req.params = { id: segments[0] };
      return controller.updateVariant(req, res);
    }

    // DELETE /api/variants/:id
    if (segments.length === 1 && method === 'DELETE') {
      req.params = { id: segments[0] };
      return controller.deleteVariant(req, res);
    }

    // Route not found
    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Variant route not found',
        path: pathname,
        method: method
      })
    );

  } catch (error) {
    console.error('Variant route error:', error);
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    );
  }
}
