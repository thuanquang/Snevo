/**
 * Main API Routes Handler
 * Central routing for all API endpoints
 */

import url from 'url';
import constants from '../../config/constants.js';

/**
 * Main API router
 */
export default async function apiRoutes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Remove /api prefix for routing
    const apiPath = pathname.replace('/api', '');

    // Health check endpoint
    if (apiPath === '/health' && method === 'GET') {
        return res.json({
            success: true,
            message: 'Snevo API is running',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }

    // API documentation endpoint
    if (apiPath === '/docs' && method === 'GET') {
        return res.json({
            success: true,
            message: 'Snevo E-commerce API',
            version: '1.0.0',
            endpoints: {
                auth: {
                    'POST /api/auth/login': 'User login',
                    'POST /api/auth/register': 'User registration',
                    'POST /api/auth/logout': 'User logout',
                    'GET /api/auth/profile': 'Get user profile',
                    'PUT /api/auth/profile': 'Update user profile'
                },
                products: {
                    'GET /api/products': 'Get all products',
                    'GET /api/products/:id': 'Get product by ID',
                    'GET /api/products/category/:categoryId': 'Get products by category',
                    'GET /api/products/search': 'Search products'
                },
                categories: {
                    'GET /api/categories': 'Get all categories'
                },
                orders: {
                    'GET /api/orders': 'Get user orders',
                    'POST /api/orders': 'Create new order',
                    'GET /api/orders/:id': 'Get order by ID',
                    'PUT /api/orders/:id/status': 'Update order status'
                },
                users: {
                    'GET /api/users/addresses': 'Get user addresses',
                    'POST /api/users/addresses': 'Add new address',
                    'PUT /api/users/addresses/:id': 'Update address',
                    'DELETE /api/users/addresses/:id': 'Delete address'
                },
                reviews: {
                    'GET /api/products/:id/reviews': 'Get product reviews',
                    'POST /api/products/:id/reviews': 'Add product review',
                    'PUT /api/reviews/:id': 'Update review',
                    'DELETE /api/reviews/:id': 'Delete review'
                }
            }
        });
    }

    // Default API response
    return res.json({
        success: false,
        error: 'API endpoint not found',
        message: 'Please check the API documentation at /api/docs'
    }, constants.HTTP_STATUS.NOT_FOUND);
}

