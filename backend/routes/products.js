/**
 * Product Routes
 * Handles product browsing, search, and details
 */

import url from 'url';
import constants from '../../config/constants.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { productController } from '../controllers/productController.js';

/**
 * Product router
 */
export default async function productRoutes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Remove /api/products prefix for routing
    const productPath = pathname.replace('/api/products', '');

    try {
        // Apply optional auth middleware for personalization
        await optionalAuthMiddleware(req, res, async () => {
            switch (true) {
                // GET /api/products
                case productPath === '' && method === 'GET':
                    await productController.getProducts(req, res);
                    break;

                // GET /api/products/search
                case productPath === '/search' && method === 'GET':
                    await productController.searchProducts(req, res);
                    break;

                // GET /api/products/categories
                case productPath === '/categories' && method === 'GET':
                    await productController.getCategories(req, res);
                    break;

                // GET /api/products/featured
                case productPath === '/featured' && method === 'GET':
                    await productController.getFeaturedProducts(req, res);
                    break;

                // GET /api/products/category/:categoryId
                case productPath.match(/^\/category\/\d+$/) && method === 'GET':
                    const categoryId = productPath.split('/')[2];
                    req.params = { categoryId };
                    await productController.getProductsByCategory(req, res);
                    break;

                // GET /api/products/:id
                case productPath.match(/^\/\d+$/) && method === 'GET':
                    const productId = productPath.substring(1);
                    req.params = { id: productId };
                    await productController.getProductById(req, res);
                    break;

                // GET /api/products/:id/variants
                case productPath.match(/^\/\d+\/variants$/) && method === 'GET':
                    const variantProductId = productPath.split('/')[1];
                    req.params = { id: variantProductId };
                    await productController.getProductVariants(req, res);
                    break;

                // GET /api/products/:id/reviews
                case productPath.match(/^\/\d+\/reviews$/) && method === 'GET':
                    const reviewProductId = productPath.split('/')[1];
                    req.params = { id: reviewProductId };
                    await productController.getProductReviews(req, res);
                    break;

                // POST /api/products/:id/reviews (requires auth)
                case productPath.match(/^\/\d+\/reviews$/) && method === 'POST':
                    if (!req.user) {
                        return res.json({
                            success: false,
                            error: constants.ERROR_MESSAGES.AUTH.UNAUTHORIZED
                        }, constants.HTTP_STATUS.UNAUTHORIZED);
                    }
                    const reviewCreateProductId = productPath.split('/')[1];
                    req.params = { id: reviewCreateProductId };
                    await productController.createProductReview(req, res);
                    break;

                default:
                    res.json({
                        success: false,
                        error: 'Product endpoint not found'
                    }, constants.HTTP_STATUS.NOT_FOUND);
            }
        });
    } catch (error) {
        console.error('Product route error:', error);
        res.json({
            success: false,
            error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
        }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}

