// ⭐ Review Model - reviews table
// Handles product review data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';

const supabaseConfig = createSupabaseConfig();

class Review extends BaseModel {
    constructor() {
        super('reviews', 'review_id');
    }

    /**
     * Verify if user has purchased a product (order status = 'processing' or 'delivered' means completed)
     * @param {string} userId - User UUID
     * @param {number} shoeId - Shoe ID
     * @returns {Promise<boolean>} - True if user has purchased product
     */
    async verifyPurchase(userId, shoeId) {
        try {
            const { data, error } = await supabaseConfig.getAdminClient()
                .from('order_items')
                .select(`
                    order_item_id,
                    orders!inner (
                        order_id,
                        user_id,
                        status
                    ),
                    shoe_variants!inner (
                        variant_id,
                        shoe_id
                    )
                `)
                .eq('orders.user_id', userId)
                .eq('shoe_variants.shoe_id', shoeId)
                .in('orders.status', ['processing', 'delivered']) // Accept both statuses
                .limit(1);

            if (error) {
                console.error('Error verifying purchase:', error);
                return false;
            }

            return data && data.length > 0;
        } catch (err) {
            console.error('Error in verifyPurchase:', err);
            return false;
        }
    }

    /**
     * Find review by user and shoe (to check if already reviewed)
     * @param {string} userId - User UUID
     * @param {number} shoeId - Shoe ID
     * @returns {Promise<Object|null>}
     */
    async findByUserAndShoe(userId, shoeId) {
        try {
            const { data, error } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .eq('shoe_id', shoeId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                throw new Error(`Failed to find review: ${error.message}`);
            }

            return data || null;
        } catch (err) {
            console.error('Error in findByUserAndShoe:', err);
            return null;
        }
    }

    /**
     * Find user's review for a specific product (optimized single query)
     * @param {string} userId - User UUID
     * @param {number} shoeId - Shoe ID
     * @returns {Promise<Object|null>} - Review with shoe details or null
     */
    async findUserReviewForProduct(userId, shoeId) {
        try {
            const { data, error } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select(`
                    review_id,
                    shoe_id,
                    rating,
                    comment,
                    is_verified_purchase,
                    review_date,
                    shoes!inner (
                        shoe_name,
                        image_url
                    )
                `)
                .eq('user_id', userId)
                .eq('shoe_id', shoeId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error in findUserReviewForProduct:', error);
                return null;
            }

            if (!data) return null;

            // Transform data
            return {
                review_id: data.review_id,
                shoe_id: data.shoe_id,
                rating: data.rating,
                comment: data.comment,
                is_verified_purchase: data.is_verified_purchase,
                review_date: data.review_date,
                shoe_name: data.shoes?.shoe_name || 'Product',
                shoe_image: data.shoes?.image_url || null
            };
        } catch (err) {
            console.error('Error in findUserReviewForProduct:', err);
            return null;
        }
    }

    /**
     * Get reviews by shoe ID with pagination and filters
     * @param {number} shoeId - Shoe ID
     * @param {Object} options - { page, limit, filters }
     * @returns {Promise<Object>} - { data, total, page, limit, totalPages }
     */
    async findByShoeId(shoeId, options = {}) {
        try {
            const { page = 1, limit = 10, filters = {} } = options;
            const offset = (page - 1) * limit;

            // First, get the reviews with count
            let reviewQuery = supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select('*', { count: 'exact' })
                .eq('shoe_id', shoeId)
                .order('review_date', { ascending: false });

            // Apply rating filter if provided
            if (filters.rating) {
                reviewQuery = reviewQuery.eq('rating', filters.rating);
            }

            // Apply pagination
            reviewQuery = reviewQuery.range(offset, offset + limit - 1);

            const { data: reviews, error: reviewError, count } = await reviewQuery;

            if (reviewError) {
                throw new Error(`Failed to fetch reviews: ${reviewError.message}`);
            }

            if (!reviews || reviews.length === 0) {
                return {
                    data: [],
                    total: count || 0,
                    page,
                    limit,
                    totalPages: 0
                };
            }

            // Get user IDs from reviews
            const userIds = reviews.map(r => r.user_id);

            // Fetch profiles separately
            const { data: profiles, error: profileError } = await supabaseConfig.getAdminClient()
                .from('profiles')
                .select('user_id, username, avatar_url')
                .in('user_id', userIds);

            if (profileError) {
                console.warn('Failed to fetch profiles:', profileError);
            }

            // Create a map of user_id to profile
            const profileMap = (profiles || []).reduce((map, profile) => {
                map[profile.user_id] = profile;
                return map;
            }, {});

            // Transform data to include profile info
            const transformedData = reviews.map(review => ({
                review_id: review.review_id,
                shoe_id: review.shoe_id,
                user_id: review.user_id,
                rating: review.rating,
                comment: review.comment,
                is_verified_purchase: review.is_verified_purchase,
                review_date: review.review_date,
                username: profileMap[review.user_id]?.username || 'Anonymous',
                avatar_url: profileMap[review.user_id]?.avatar_url || null
            }));

            return {
                data: transformedData,
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
        } catch (error) {
            console.error('Error fetching reviews by shoe:', error);
            throw error;
        }
    }

    /**
     * Get reviews by user ID with pagination
     * @param {string} userId - User UUID
     * @param {Object} options - { page, limit }
     * @returns {Promise<Object>} - { data, total, page, limit, totalPages }
     */
    async findByUserId(userId, options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select(`
                    review_id,
                    shoe_id,
                    rating,
                    comment,
                    is_verified_purchase,
                    review_date,
                    shoes!inner (
                        shoe_name,
                        image_url
                    )
                `, { count: 'exact' })
                .eq('user_id', userId)
                .order('review_date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw new Error(`Failed to fetch user reviews: ${error.message}`);
            }

            // Transform data
            const transformedData = (data || []).map(review => ({
                review_id: review.review_id,
                shoe_id: review.shoe_id,
                rating: review.rating,
                comment: review.comment,
                is_verified_purchase: review.is_verified_purchase,
                review_date: review.review_date,
                shoe_name: review.shoes?.shoe_name || 'Product',
                shoe_image: review.shoes?.image_url || null
            }));

            return {
                data: transformedData,
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
        } catch (error) {
            console.error('Error fetching user reviews:', error);
            throw error;
        }
    }

    /**
     * Get average rating for shoe
     * @param {number} shoeId - Shoe ID
     * @returns {Promise<number>} - Average rating (1 decimal)
     */
    async getAverageRating(shoeId) {
        try {
            const { data, error } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select('rating')
                .eq('shoe_id', shoeId);

            if (error) {
                throw new Error(`Failed to get average rating: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return 0;
            }

            const sum = data.reduce((acc, review) => acc + review.rating, 0);
            const average = sum / data.length;
            return Math.round(average * 10) / 10; // Round to 1 decimal
        } catch (error) {
            console.error('Error getting average rating:', error);
            return 0;
        }
    }

    /**
     * Get review count for shoe
     * @param {number} shoeId - Shoe ID
     * @returns {Promise<number>} - Total review count
     */
    async getReviewCount(shoeId) {
        try {
            const { count, error } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .eq('shoe_id', shoeId);

            if (error) {
                throw new Error(`Failed to get review count: ${error.message}`);
            }

            return count || 0;
        } catch (error) {
            console.error('Error getting review count:', error);
            return 0;
        }
    }

    /**
     * Get comprehensive review statistics for a shoe
     * @param {number} shoeId - Shoe ID
     * @returns {Promise<Object>} - { average_rating, total_reviews, distribution: { 1: count, 2: count, ... } }
     */
    async getReviewStats(shoeId) {
        try {
            const { data, error } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select('rating')
                .eq('shoe_id', shoeId);

            if (error) {
                throw new Error(`Failed to get review stats: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return {
                    average_rating: 0,
                    total_reviews: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    percentage_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }

            const total = data.length;
            const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

            // Count distribution
            data.forEach(review => {
                if (review.rating >= 1 && review.rating <= 5) {
                    distribution[review.rating]++;
                }
            });

            // Calculate percentages
            const percentageDistribution = {};
            for (let i = 1; i <= 5; i++) {
                percentageDistribution[i] = total > 0 ? Math.round((distribution[i] / total) * 100) : 0;
            }

            // Calculate average
            const sum = data.reduce((acc, review) => acc + review.rating, 0);
            const average = Math.round((sum / total) * 10) / 10;

            return {
                average_rating: average,
                total_reviews: total,
                distribution,
                percentage_distribution: percentageDistribution
            };
        } catch (error) {
            console.error('Error getting review stats:', error);
            return {
                average_rating: 0,
                total_reviews: 0,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                percentage_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
        }
    }
}

export default Review;

