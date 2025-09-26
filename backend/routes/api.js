/**
 * Main API Routes Handler
 * Central routing for all API endpoints
 */

import url from 'url';
import constants from '../../config/constants.js';
import { ErrorHandler } from '../utils/ErrorClasses.js';

/**
 * Main API router
 */
export default async function apiRoutes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Remove /api prefix for routing
    const apiPath = pathname.replace('/api', '');

    try {
        // Health check endpoint
        if (apiPath === '/health' && method === 'GET') {
            return res.json({
                success: true,
                message: 'Snevo API is running',
                timestamp: new Date().toISOString(),
                version: process.env.APP_VERSION || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                database: 'connected',
                uptime: process.uptime()
            });
        }

        // API status endpoint with detailed information
        if (apiPath === '/status' && method === 'GET') {
            return res.json({
                success: true,
                status: 'operational',
                version: process.env.APP_VERSION || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'operational',
                    authentication: 'operational',
                    file_storage: 'operational'
                },
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    node_version: process.version
                }
            });
        }

        // API documentation endpoint
        if (apiPath === '/docs' && method === 'GET') {
            return res.json({
                success: true,
                message: 'Snevo E-commerce API Documentation',
                version: process.env.APP_VERSION || '1.0.0',
                base_url: process.env.API_BASE_URL || 'http://localhost:3001/api',
                authentication: {
                    type: 'Bearer Token',
                    header: 'Authorization: Bearer <token>',
                    note: 'Obtain token from /api/auth/login'
                },
                endpoints: {
                    general: {
                        'GET /api/health': 'Health check',
                        'GET /api/status': 'Detailed API status',
                        'GET /api/docs': 'API documentation'
                    },
                    authentication: {
                        'POST /api/auth/register': 'User registration',
                        'POST /api/auth/login': 'User login',
                        'POST /api/auth/logout': 'User logout',
                        'GET /api/auth/profile': 'Get user profile',
                        'PUT /api/auth/profile': 'Update user profile',
                        'POST /api/auth/forgot-password': 'Request password reset',
                        'POST /api/auth/reset-password': 'Reset password',
                        'POST /api/auth/google': 'Google OAuth login',
                        'POST /api/auth/refresh': 'Refresh access token'
                    },
                    products: {
                        'GET /api/products': 'Get all products with filters',
                        'GET /api/products/featured': 'Get featured products',
                        'GET /api/products/search': 'Search products',
                        'GET /api/products/:id': 'Get product by ID',
                        'GET /api/products/:id/variants': 'Get product variants',
                        'GET /api/products/:id/reviews': 'Get product reviews',
                        'POST /api/products/:id/reviews': 'Add product review',
                        'GET /api/products/:id/related': 'Get related products',
                        'GET /api/products/category/:categoryId': 'Get products by category',
                        'POST /api/products': 'Create product (admin/seller)',
                        'PUT /api/products/:id': 'Update product (admin/seller)',
                        'DELETE /api/products/:id': 'Delete product (admin)',
                        'PUT /api/products/variants/:variantId/stock': 'Update stock (admin/seller)'
                    },
                    categories: {
                        'GET /api/categories': 'Get all categories',
                        'GET /api/categories/:id': 'Get category by ID',
                        'GET /api/categories/popular': 'Get popular categories',
                        'POST /api/categories': 'Create category (admin)',
                        'PUT /api/categories/:id': 'Update category (admin)',
                        'DELETE /api/categories/:id': 'Delete category (admin)'
                    },
                    orders: {
                        'GET /api/orders': 'Get user orders',
                        'POST /api/orders': 'Create new order',
                        'GET /api/orders/stats': 'Get order statistics',
                        'GET /api/orders/all': 'Get all orders (admin/seller)',
                        'GET /api/orders/:id': 'Get order by ID',
                        'PUT /api/orders/:id/status': 'Update order status (admin/seller)',
                        'PUT /api/orders/:id/payment': 'Update payment status (admin)',
                        'PUT /api/orders/:id/tracking': 'Add tracking number (admin/seller)',
                        'PUT /api/orders/:id/cancel': 'Cancel order',
                        'POST /api/orders/:id/payment': 'Process payment',
                        'PUT /api/orders/:id/refund': 'Refund order (admin)'
                    },
                    users: {
                        'GET /api/users/addresses': 'Get user addresses',
                        'POST /api/users/addresses': 'Add new address',
                        'PUT /api/users/addresses/:id': 'Update address',
                        'DELETE /api/users/addresses/:id': 'Delete address',
                        'GET /api/users/orders': 'Get user orders',
                        'GET /api/users/reviews': 'Get user reviews'
                    }
                },
                query_parameters: {
                    pagination: {
                        page: 'Page number (default: 1)',
                        limit: 'Items per page (default: 20, max: 100)'
                    },
                    filtering: {
                        category: 'Filter by category ID',
                        min_price: 'Minimum price filter',
                        max_price: 'Maximum price filter',
                        brand: 'Filter by brand',
                        status: 'Filter by status'
                    },
                    sorting: {
                        sort: 'Sort field (e.g., created_at, price, name)',
                        order: 'Sort order (asc or desc)'
                    }
                },
                response_format: {
                    success: {
                        success: true,
                        data: '{ ... response data ... }',
                        message: 'Optional success message',
                        pagination: '{ page, limit, total, totalPages } (for paginated responses)'
                    },
                    error: {
                        success: false,
                        error: 'Error message',
                        code: 'ERROR_CODE',
                        details: 'Additional error details (optional)'
                    }
                },
                status_codes: {
                    200: 'OK - Request successful',
                    201: 'Created - Resource created successfully',
                    400: 'Bad Request - Invalid request data',
                    401: 'Unauthorized - Authentication required',
                    403: 'Forbidden - Insufficient permissions',
                    404: 'Not Found - Resource not found',
                    409: 'Conflict - Resource already exists',
                    422: 'Unprocessable Entity - Validation failed',
                    429: 'Too Many Requests - Rate limit exceeded',
                    500: 'Internal Server Error - Server error'
                }
            });
        }

        // API version endpoint
        if (apiPath === '/version' && method === 'GET') {
            return res.json({
                success: true,
                version: process.env.APP_VERSION || '1.0.0',
                api_version: 'v1',
                build_date: process.env.BUILD_DATE || new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            });
        }

        // Default API response
        return res.json({
            success: false,
            error: 'API endpoint not found',
            message: 'Please check the API documentation at /api/docs',
            available_endpoints: ['/api/health', '/api/status', '/api/docs', '/api/version']
        }, constants.HTTP_STATUS.NOT_FOUND);

    } catch (error) {
        console.error('API route error:', error);
        const errorResponse = ErrorHandler.handleError(error, req);
        return res.json(errorResponse, errorResponse.statusCode);
    }
}

