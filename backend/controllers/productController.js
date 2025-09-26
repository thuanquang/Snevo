/**
 * Product Controller
 * Handles product browsing, search, and details
 */

import constants from '../../config/constants.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

class ProductController {
    /**
     * Get all products with filtering and pagination
     */
    static async getProducts(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                category,
                color,
                size,
                min_price,
                max_price,
                sort = 'created_at',
                order = 'desc'
            } = req.query;

            const filters = {
                category,
                color,
                size,
                min_price: min_price ? parseFloat(min_price) : null,
                max_price: max_price ? parseFloat(max_price) : null
            };

            const pagination = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), constants.PAGINATION.MAX_LIMIT)
            };

            const sortOptions = {
                field: sort,
                order: order.toLowerCase() === 'asc' ? 'asc' : 'desc'
            };

            const result = await Product.findAll(filters, pagination, sortOptions);

            res.json({
                success: true,
                data: {
                    products: result.products,
                    pagination: {
                        current_page: pagination.page,
                        per_page: pagination.limit,
                        total: result.total,
                        total_pages: Math.ceil(result.total / pagination.limit)
                    },
                    filters: filters
                }
            });

        } catch (error) {
            console.error('Get products error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get product by ID
     */
    static async getProductById(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.json({
                    success: false,
                    error: 'Valid product ID is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const product = await Product.findById(parseInt(id));

            if (!product) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.PRODUCT.NOT_FOUND
                }, constants.HTTP_STATUS.NOT_FOUND);
            }

            res.json({
                success: true,
                data: {
                    product
                }
            });

        } catch (error) {
            console.error('Get product by ID error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Search products
     */
    static async searchProducts(req, res) {
        try {
            const {
                q: query,
                page = 1,
                limit = 20,
                category,
                min_price,
                max_price
            } = req.query;

            if (!query || query.trim().length < 2) {
                return res.json({
                    success: false,
                    error: 'Search query must be at least 2 characters long'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const filters = {
                query: query.trim(),
                category,
                min_price: min_price ? parseFloat(min_price) : null,
                max_price: max_price ? parseFloat(max_price) : null
            };

            const pagination = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), constants.PAGINATION.MAX_LIMIT)
            };

            const result = await Product.search(filters, pagination);

            res.json({
                success: true,
                data: {
                    products: result.products,
                    pagination: {
                        current_page: pagination.page,
                        per_page: pagination.limit,
                        total: result.total,
                        total_pages: Math.ceil(result.total / pagination.limit)
                    },
                    query: query
                }
            });

        } catch (error) {
            console.error('Search products error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get products by category
     */
    static async getProductsByCategory(req, res) {
        try {
            const { categoryId } = req.params;
            const {
                page = 1,
                limit = 20,
                sort = 'created_at',
                order = 'desc'
            } = req.query;

            if (!categoryId || isNaN(parseInt(categoryId))) {
                return res.json({
                    success: false,
                    error: 'Valid category ID is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const pagination = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), constants.PAGINATION.MAX_LIMIT)
            };

            const sortOptions = {
                field: sort,
                order: order.toLowerCase() === 'asc' ? 'asc' : 'desc'
            };

            const result = await Product.findByCategory(parseInt(categoryId), pagination, sortOptions);

            res.json({
                success: true,
                data: {
                    products: result.products,
                    category: result.category,
                    pagination: {
                        current_page: pagination.page,
                        per_page: pagination.limit,
                        total: result.total,
                        total_pages: Math.ceil(result.total / pagination.limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get products by category error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get all categories
     */
    static async getCategories(req, res) {
        try {
            const categories = await Category.findAll();

            res.json({
                success: true,
                data: {
                    categories
                }
            });

        } catch (error) {
            console.error('Get categories error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get featured products
     */
    static async getFeaturedProducts(req, res) {
        try {
            const { limit = 10 } = req.query;

            const products = await Product.getFeatured(parseInt(limit));

            res.json({
                success: true,
                data: {
                    products
                }
            });

        } catch (error) {
            console.error('Get featured products error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get product variants
     */
    static async getProductVariants(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.json({
                    success: false,
                    error: 'Valid product ID is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const variants = await Product.getVariants(parseInt(id));

            res.json({
                success: true,
                data: {
                    variants
                }
            });

        } catch (error) {
            console.error('Get product variants error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get product reviews
     */
    static async getProductReviews(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            if (!id || isNaN(parseInt(id))) {
                return res.json({
                    success: false,
                    error: 'Valid product ID is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const pagination = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), constants.PAGINATION.MAX_LIMIT)
            };

            const result = await Product.getReviews(parseInt(id), pagination);

            res.json({
                success: true,
                data: {
                    reviews: result.reviews,
                    pagination: {
                        current_page: pagination.page,
                        per_page: pagination.limit,
                        total: result.total,
                        total_pages: Math.ceil(result.total / pagination.limit)
                    },
                    rating_summary: result.rating_summary
                }
            });

        } catch (error) {
            console.error('Get product reviews error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create product review
     */
    static async createProductReview(req, res) {
        try {
            const { id } = req.params;
            const { rating, comment } = req.body;

            if (!id || isNaN(parseInt(id))) {
                return res.json({
                    success: false,
                    error: 'Valid product ID is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            if (!rating || rating < 1 || rating > 5) {
                return res.json({
                    success: false,
                    error: 'Rating must be between 1 and 5'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Get user ID from database
            const userDetails = await User.findByEmail(req.user.email);
            if (!userDetails) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.AUTH.ACCOUNT_NOT_FOUND
                }, constants.HTTP_STATUS.NOT_FOUND);
            }

            const reviewData = {
                shoe_id: parseInt(id),
                user_id: userDetails.user_id,
                rating: parseInt(rating),
                comment: comment || null
            };

            const review = await Product.createReview(reviewData);

            res.json({
                success: true,
                message: 'Review created successfully',
                data: {
                    review
                }
            }, constants.HTTP_STATUS.CREATED);

        } catch (error) {
            console.error('Create product review error:', error);
            
            if (error.message.includes('duplicate')) {
                return res.json({
                    success: false,
                    error: 'You have already reviewed this product'
                }, constants.HTTP_STATUS.CONFLICT);
            }

            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

export default ProductController;

