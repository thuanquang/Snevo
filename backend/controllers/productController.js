/**
 * Product Controller
 * Handles product browsing, search, and details using OOP principles
 */

import constants from '../../config/constants.js';
import { productModel } from '../models/Product.js';
import Category from '../models/Category.js';
import { userModel } from '../models/User.js';
import BaseController from '../utils/BaseController.js';
import { ValidationError, NotFoundError } from '../utils/ErrorClasses.js';

class ProductController extends BaseController {
    constructor() {
        super();
        this.productModel = productModel;
    }

    /**
     * Get all products with filtering and pagination
     */
    async getProducts(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const pagination = this.getPaginationParams(req, {
                page: 1,
                limit: 20
            });

            const filters = this.getFilterParams(req, [
                'category', 'color', 'size', 'min_price', 'max_price', 'brand'
            ]);

            // Convert price filters to numbers
            if (filters.min_price) filters.min_price = parseFloat(filters.min_price);
            if (filters.max_price) filters.max_price = parseFloat(filters.max_price);

            const sortOptions = {
                field: req.query.sort || 'created_at',
                order: req.query.order || 'desc'
            };

            const result = await this.productModel.findAll(filters, pagination, sortOptions);

            this.sendPaginatedResponse(res, result, pagination);
        });
    }

    /**
     * Get product by ID
     */
    async getProductById(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { id } = req.params;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            const product = await this.productModel.findById(parseInt(id));

            if (!product) {
                throw new NotFoundError('Product');
            }

            this.sendResponse(res, { product });
        });
    }

    /**
     * Search products
     */
    async searchProducts(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { q: query } = req.query;

            if (!query || query.trim().length < 2) {
                throw new ValidationError('Search query must be at least 2 characters long');
            }

            const pagination = this.getPaginationParams(req, {
                page: 1,
                limit: 20
            });

            const filters = {
                query: query.trim(),
                ...this.getFilterParams(req, ['category', 'min_price', 'max_price'])
            };

            // Convert price filters to numbers
            if (filters.min_price) filters.min_price = parseFloat(filters.min_price);
            if (filters.max_price) filters.max_price = parseFloat(filters.max_price);

            const result = await this.productModel.search(filters, pagination);

            this.sendPaginatedResponse(res, result, pagination, null);
        });
    }

    /**
     * Get products by category
     */
    async getProductsByCategory(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { categoryId } = req.params;

            this.validateRequest({ categoryId }, {
                categoryId: { required: true, type: 'integer' }
            });

            const pagination = this.getPaginationParams(req, {
                page: 1,
                limit: 20
            });

            const sortOptions = {
                field: req.query.sort || 'created_at',
                order: req.query.order || 'desc'
            };

            const result = await this.productModel.findByCategory(parseInt(categoryId), pagination, sortOptions);

            this.sendPaginatedResponse(res, {
                data: result.products,
                total: result.total,
                totalPages: result.totalPages
            }, pagination, null);
        });
    }

    /**
     * Get all categories
     */
    async getCategories(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const categories = await Category.findAll();

            this.sendResponse(res, { categories });
        });
    }

    /**
     * Get featured products
     */
    async getFeaturedProducts(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const limit = Math.min(parseInt(req.query.limit || 10), 50);

            const products = await this.productModel.getFeatured(limit);

            this.sendResponse(res, { products });
        });
    }

    /**
     * Get product variants
     */
    async getProductVariants(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { id } = req.params;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            const variants = await this.productModel.getVariants(parseInt(id));

            this.sendResponse(res, { variants });
        });
    }

    /**
     * Get product reviews
     */
    async getProductReviews(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { id } = req.params;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            const pagination = this.getPaginationParams(req, {
                page: 1,
                limit: 10
            });

            const result = await this.productModel.getReviews(parseInt(id), pagination);

            this.sendPaginatedResponse(res, result, pagination);
        });
    }

    /**
     * Create product review
     */
    async createProductReview(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { id } = req.params;
            const { rating, comment } = req.body;

            // Validate input
            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            this.validateRequest(req.body, {
                rating: { required: true, type: 'integer', min: 1, max: 5 },
                comment: { required: false, type: 'string', maxLength: 1000 }
            });

            // Get user details from database
            const userDetails = await userModel.findByEmail(user.email);
            if (!userDetails) {
                throw new NotFoundError('User account');
            }

            const reviewData = {
                shoe_id: parseInt(id),
                user_id: userDetails.user_id,
                rating: parseInt(rating),
                comment: comment || null
            };

            const review = await this.productModel.createReview(reviewData);

            this.sendResponse(res, { review }, 'Review created successfully', constants.HTTP_STATUS.CREATED);
        });
    }

    /**
     * Get related products
     */
    async getRelatedProducts(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { id } = req.params;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            const limit = Math.min(parseInt(req.query.limit || 4), 12);
            const products = await this.productModel.getRelatedProducts(parseInt(id), limit);

            this.sendResponse(res, { products });
        });
    }

    /**
     * Update product stock (admin only)
     */
    async updateProductStock(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin', 'seller']);
            const { variantId } = req.params;
            const { quantity, operation = 'set' } = req.body;

            this.validateRequest({ variantId }, {
                variantId: { required: true, type: 'integer' }
            });

            this.validateRequest(req.body, {
                quantity: { required: true, type: 'integer', min: 0 },
                operation: { required: false, type: 'string', enum: ['set', 'increment', 'decrement'] }
            });

            const updatedVariant = await this.productModel.updateStock(
                parseInt(variantId), 
                parseInt(quantity), 
                operation
            );

            this.sendResponse(res, { variant: updatedVariant }, 'Stock updated successfully');
        });
    }

    /**
     * Create new product (admin/seller only)
     */
    async createProduct(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin', 'seller']);

            this.validateRequest(req.body, {
                shoe_name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
                description: { required: false, type: 'string', maxLength: 2000 },
                base_price: { required: true, type: 'number', min: 0 },
                category_id: { required: true, type: 'integer' },
                brand: { required: false, type: 'string', maxLength: 100 },
                image_url: { required: false, type: 'string' }
            });

            const product = await this.productModel.create(req.body);

            this.sendResponse(res, { product }, 'Product created successfully', constants.HTTP_STATUS.CREATED);
        });
    }

    /**
     * Update product (admin/seller only)
     */
    async updateProduct(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin', 'seller']);
            const { id } = req.params;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            const product = await this.productModel.updateById(parseInt(id), req.body);

            this.sendResponse(res, { product }, 'Product updated successfully');
        });
    }

    /**
     * Delete product (admin only)
     */
    async deleteProduct(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin']);
            const { id } = req.params;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            await this.productModel.deleteById(parseInt(id));

            this.sendResponse(res, null, 'Product deleted successfully');
        });
    }
}

// Create a singleton instance for use in routes
const productController = new ProductController();

export default ProductController;
export { productController };