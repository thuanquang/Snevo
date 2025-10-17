// backend/routes/variants.js

// ⭐ Variant Routes - /api/variants/*

import url from "url";
import authMiddleware from "../middleware/auth.js"; // ⭐ ADD THIS

/**
 * Variant routes handler
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {VariantController} controller
 * @param {string} pathname - Request pathname
 */
export default async function variantRoutes(req, res, controller, pathname) {
  // ⭐ Make ASYNC
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const query = parsedUrl.query;

  // Extract path after /api/variants
  const path = pathname.replace("/api/variants", "") || "/";
  const segments = path.split("/").filter(Boolean);

  try {
    // ⭐ PUBLIC ROUTES (No Auth Required)
    const publicRoutes = [
      "/find",
      /^\/sku\//,
      /^\/shoe\/\d+$/,
      /^\/shoe\/\d+\/color\/\d+$/,
    ];

    const isPublicRoute = publicRoutes.some((route) => {
      if (route instanceof RegExp) {
        return route.test(path);
      }
      return path === route || path.startsWith(route);
    });

    // ⭐ PROTECTED ROUTES (Auth Required) - generate-all, generate-specific
    if (!isPublicRoute) {
      const authResult = await authMiddleware.authenticate(req, res);
      if (!authResult || !authResult.success) {
        // Auth middleware already sent 401 response
        return;
      }

      // Attach user to request
      req.user = authResult.user;
      console.log("✅ Variant route authenticated for user:", req.user.email);
    }

    // GET /api/variants/find (composite key lookup)
    if (path === "/find" && method === "GET") {
      return controller.findVariantByComposite(req, res);
    }

    // GET /api/variants/sku/:sku
    if (path.startsWith("/sku/") && method === "GET") {
      req.params = { sku: segments[1] };
      return controller.getVariantBySku(req, res);
    }

    // GET /api/variants/low-stock
    if (path === "/low-stock" && method === "GET") {
      return controller.getLowStockVariants(req, res);
    }

    // ⭐ GET /api/variants/shoe/:shoeId (Public - No Auth)
    if (
      path.startsWith("/shoe/") &&
      segments.length === 2 &&
      method === "GET"
    ) {
      req.params = { shoeId: segments[1] };
      return controller.getVariantsByShoe(req, res);
    }

    // GET /api/variants/shoe/:shoeId/color/:colorId
    if (segments[0] === "shoe" && segments[2] === "color" && method === "GET") {
      req.params = {
        shoeId: segments[1],
        colorId: segments[3],
      };
      return controller.getVariantsByColor(req, res);
    }

    // ⭐ POST /api/variants/generate-all/:shoeId (Protected - Needs Auth)
    if (
      segments[0] === "generate-all" &&
      segments.length === 2 &&
      method === "POST"
    ) {
      req.params = { shoeId: segments[1] };
      return controller.generateAllVariants(req, res);
    }

    // ⭐ POST /api/variants/generate-specific/:shoeId (Protected - Needs Auth)
    if (
      segments[0] === "generate-specific" &&
      segments.length === 2 &&
      method === "POST"
    ) {
      req.params = { shoeId: segments[1] };
      return controller.generateSpecificVariants(req, res);
    }

    // GET /api/variants/:id
    if (segments.length === 1 && method === "GET") {
      req.params = { id: segments[0] };
      return controller.getVariant(req, res);
    }

    // GET /api/variants
    if (path === "/" && method === "GET") {
      req.query = query;
      return controller.getVariants(req, res);
    }

    // POST /api/variants
    if (path === "/" && method === "POST") {
      return controller.createVariant(req, res);
    }

    // PUT /api/variants/:id
    if (segments.length === 1 && method === "PUT") {
      req.params = { id: segments[0] };
      return controller.updateVariant(req, res);
    }

    // DELETE /api/variants/:id
    if (segments.length === 1 && method === "DELETE") {
      req.params = { id: segments[0] };
      return controller.deleteVariant(req, res);
    }

    // 404 - Route not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Variant route not found",
      })
    );
  } catch (error) {
    console.error("❌ Variant route error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error.message,
      })
    );
  }
}
