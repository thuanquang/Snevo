// backend/routes/sizes.js
// 📏 Size Routes - /api/sizes/*
// Size management routes (No Express)

import url from 'url';

/**
 * Size routes handler
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @param {SizeController} controller 
 * @param {string} pathname - Request pathname
 */
export default function sizeRoutes(req, res, controller, pathname) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const query = parsedUrl.query;

  // Extract path after /api/sizes
  const path = pathname.replace('/api/sizes', '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
    // GET /api/sizes/:id
    if (segments.length === 1 && method === 'GET') {
      req.params = { id: segments[0] };
      return controller.getSize(req, res);
    }

    // GET /api/sizes
    if (path === '/' && method === 'GET') {
      return controller.getSizes(req, res);
    }

    // POST /api/sizes
    if (path === '/' && method === 'POST') {
      return controller.createSize(req, res);
    }

    // PUT /api/sizes/:id
    if (segments.length === 1 && method === 'PUT') {
      req.params = { id: segments[0] };
      return controller.updateSize(req, res);
    }

    // DELETE /api/sizes/:id
    if (segments.length === 1 && method === 'DELETE') {
      req.params = { id: segments[0] };
      return controller.deleteSize(req, res);
    }

    // Route not found
    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Size route not found',
        path: pathname,
        method: method
      })
    );

  } catch (error) {
    console.error('Size route error:', error);
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    );
  }
}
