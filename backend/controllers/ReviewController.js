// 📝 Review Controller - Product review management
// Handles review CRUD operations with purchase verification

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class ReviewController extends BaseController {
    constructor() {
        super();
        this.Review = null;
        this.Order = null;
        this.OrderItem = null;
        this.ShoeVariant = null;
    }

    setModels(models) {
        this.Review = models.Review;
        this.Order = models.Order;
        this.OrderItem = models.OrderItem;
        this.ShoeVariant = models.ShoeVariant;
    }

    // POST /api/reviews - Create a new review (requires authentication & purchase verification)
    async createReview(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);

            const { shoe_id, rating, comment } = req.body || {};

            // Validate input
            this.validateRequest(
                { shoe_id: parseInt(shoe_id), rating: parseInt(rating) },
                {
                    shoe_id: { required: true, type: 'integer', min: 1 },
                    rating: { 
                        required: true, 
                        type: 'integer', 
                        min: constants.VALIDATION_RULES.RATING.MIN,
                        max: constants.VALIDATION_RULES.RATING.MAX
                    }
                }
            );

            // Optional comment validation
            if (comment && typeof comment === 'string') {
                if (comment.length > 2000) {
                    this.sendError(res, 'Comment must not exceed 2000 characters', constants.HTTP_STATUS.BAD_REQUEST);
                    return;
                }
            }

            // Check if user has purchased this product
            const hasPurchased = await this.Review.verifyPurchase(req.user.id, parseInt(shoe_id));
            if (!hasPurchased) {
                this.sendError(res, 'You can only review products you have purchased', constants.HTTP_STATUS.FORBIDDEN);
                return;
            }

            // Check if user has already reviewed this product
            const existingReview = await this.Review.findByUserAndShoe(req.user.id, parseInt(shoe_id));
            if (existingReview) {
                this.sendError(res, 'You have already reviewed this product', constants.HTTP_STATUS.CONFLICT);
                return;
            }

            // Create review
            const reviewData = {
                shoe_id: parseInt(shoe_id),
                user_id: req.user.id,
                rating: parseInt(rating),
                comment: comment ? comment.trim() : null,
                is_verified_purchase: true,
                review_date: new Date().toISOString()
            };

            const review = await this.Review.create(reviewData);
            this.sendResponse(res, review, 'Review created successfully', constants.HTTP_STATUS.CREATED);
        });
    }

    // GET /api/products/:shoeId/reviews - Get all reviews for a product (public)
    async listProductReviews(req, res) {
        return this.handleRequest(req, res, async () => {
            const { shoeId } = req.params;
            const { page = 1, limit = 10, rating } = req.query || {};

            const filters = {};
            if (rating) {
                filters.rating = parseInt(rating);
            }

            const result = await this.Review.findByShoeId(parseInt(shoeId), {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), constants.PAGINATION.MAX_LIMIT),
                filters
            });

            this.sendPaginatedResponse(res, result, { page: parseInt(page), limit: parseInt(limit) }, 'Reviews fetched');
        });
    }

    // GET /api/products/:shoeId/reviews/stats - Get review statistics for a product (public)
    async getProductReviewStats(req, res) {
        return this.handleRequest(req, res, async () => {
            const { shoeId } = req.params;
            const stats = await this.Review.getReviewStats(parseInt(shoeId));
            this.sendResponse(res, stats, 'Review stats fetched');
        });
    }

    // GET /api/products/:shoeId/reviews/me - Get current user's review for a specific product (requires authentication)
    async getMyReviewForProduct(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);

            const { shoeId } = req.params;
            const shoeIdInt = parseInt(shoeId);

            if (!shoeIdInt || shoeIdInt < 1) {
                this.sendError(res, 'Invalid product ID', constants.HTTP_STATUS.BAD_REQUEST);
                return;
            }

            const review = await this.Review.findUserReviewForProduct(req.user.id, shoeIdInt);
            
            this.sendResponse(res, review, review ? 'Review found' : 'No review found');
        });
    }

    // GET /api/reviews/my-reviews - Get current user's reviews (requires authentication)
    async listMyReviews(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);

            const { page = 1, limit = 10 } = req.query || {};

            const result = await this.Review.findByUserId(req.user.id, {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), constants.PAGINATION.MAX_LIMIT)
            });

            this.sendPaginatedResponse(res, result, { page: parseInt(page), limit: parseInt(limit) }, 'My reviews fetched');
        });
    }

    // PUT /api/reviews/:id - Update a review (requires authentication & ownership)
    async updateReview(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);

            const { id } = req.params;
            const { rating, comment } = req.body || {};

            // Check if review exists and belongs to user
            const existingReview = await this.Review.findById(parseInt(id));
            if (!existingReview) {
                this.sendError(res, 'Review not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            if (existingReview.user_id !== req.user.id) {
                this.sendError(res, 'You can only update your own reviews', constants.HTTP_STATUS.FORBIDDEN);
                return;
            }

            // Validate updates
            const updates = {};
            
            if (rating !== undefined) {
                this.validateRequest(
                    { rating: parseInt(rating) },
                    {
                        rating: { 
                            required: true, 
                            type: 'integer', 
                            min: constants.VALIDATION_RULES.RATING.MIN,
                            max: constants.VALIDATION_RULES.RATING.MAX
                        }
                    }
                );
                updates.rating = parseInt(rating);
            }

            if (comment !== undefined) {
                if (comment && typeof comment === 'string' && comment.length > 2000) {
                    this.sendError(res, 'Comment must not exceed 2000 characters', constants.HTTP_STATUS.BAD_REQUEST);
                    return;
                }
                updates.comment = comment ? comment.trim() : null;
            }

            // Update review
            const updatedReview = await this.Review.updateById(parseInt(id), updates);
            this.sendResponse(res, updatedReview, 'Review updated successfully');
        });
    }

    // DELETE /api/reviews/:id - Delete a review (requires authentication & ownership)
    async deleteReview(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);

            const { id } = req.params;

            // Check if review exists and belongs to user
            const existingReview = await this.Review.findById(parseInt(id));
            if (!existingReview) {
                this.sendError(res, 'Review not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            if (existingReview.user_id !== req.user.id) {
                this.sendError(res, 'You can only delete your own reviews', constants.HTTP_STATUS.FORBIDDEN);
                return;
            }

            // Delete review
            await this.Review.deleteById(parseInt(id));
            this.sendResponse(res, null, 'Review deleted successfully');
        });
    }
}

export default ReviewController;
