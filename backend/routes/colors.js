// backend/routes/colors.js
// 🎨 Color Routes - /api/colors/*
// Color management routes (No Express)

import url from 'url';

/**
 * Color routes handler
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @param {ColorController} controller 
 * @param {string} pathname - Request pathname
 */
export default function colorRoutes(req, res, controller, pathname) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const query = parsedUrl.query;

  // Extract path after /api/colors
  const path = pathname.replace('/api/colors', '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
    // GET /api/colors/:id
    if (segments.length === 1 && method === 'GET') {
      req.params = { id: segments[0] };
      return controller.getColor(req, res);
    }

    // GET /api/colors
    if (path === '/' && method === 'GET') {
      return controller.getColors(req, res);
    }

    // POST /api/colors
    if (path === '/' && method === 'POST') {
      return controller.createColor(req, res);
    }

    // PUT /api/colors/:id
    if (segments.length === 1 && method === 'PUT') {
      req.params = { id: segments[0] };
      return controller.updateColor(req, res);
    }

    // DELETE /api/colors/:id
    if (segments.length === 1 && method === 'DELETE') {
      req.params = { id: segments[0] };
      return controller.deleteColor(req, res);
    }

    // Route not found
    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Color route not found',
        path: pathname,
        method: method
      })
    );

  } catch (error) {
    console.error('Color route error:', error);
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    );
  }
}
