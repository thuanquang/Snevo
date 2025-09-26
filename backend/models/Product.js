/**
 * Product Model
 * Handles product data operations with Supabase
 */

import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';

class Product {
    /**
     * Find all products with filtering and pagination
     */
    static async findAll(filters = {}, pagination = {}, sortOptions = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const { field = 'created_at', order = 'desc' } = sortOptions;
            const offset = (page - 1) * limit;

            let query = supabase
                .from(constants.DATABASE_TABLES.SHOES)
                .select(`
                    *,
                    categories:category_id (
                        category_name,
                        description
                    ),
                    shoe_variants:${constants.DATABASE_TABLES.SHOE_VARIANTS} (
                        variant_id,
                        stock_quantity,
                        variant_price,
                        sku,
                        colors:color_id (
                            color_name
                        ),
                        sizes:size_id (
                            size_value
                        )
                    )
                `, { count: 'exact' });

            // Apply filters
            if (filters.category) {
                query = query.eq('category_id', filters.category);
            }

            if (filters.min_price || filters.max_price) {
                // Need to filter by variant price - this is more complex with Supabase
                // For now, we'll get all products and filter in memory
                // In production, you might want to create a database view or function
            }

            // Apply sorting
            const validSortFields = ['shoe_name', 'base_price', 'created_at'];
            const sortField = validSortFields.includes(field) ? field : 'created_at';
            query = query.order(sortField, { ascending: order === 'asc' });

            // Apply pagination
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            // Process the results to include variant information
            const processedProducts = this.processProductsWithVariants(data || []);

            // Apply price filtering if needed
            let filteredProducts = processedProducts;
            if (filters.min_price || filters.max_price) {
                filteredProducts = processedProducts.filter(product => {
                    const price = product.min_price || product.base_price;
                    if (filters.min_price && price < filters.min_price) return false;
                    if (filters.max_price && price > filters.max_price) return false;
                    return true;
                });
            }

            return {
                products: filteredProducts,
                total: count || 0
            };
        } catch (error) {
            console.error('Find all products error:', error);
            throw new Error(`Failed to fetch products: ${error.message}`);
        }
    }

    /**
     * Find product by ID
     */
    static async findById(productId) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.SHOES)
                .select(`
                    *,
                    categories:category_id (
                        category_name,
                        description
                    ),
                    shoe_variants:${constants.DATABASE_TABLES.SHOE_VARIANTS} (
                        variant_id,
                        stock_quantity,
                        variant_price,
                        sku,
                        colors:color_id (
                            color_id,
                            color_name
                        ),
                        sizes:size_id (
                            size_id,
                            size_value
                        )
                    )
                `)
                .eq('shoe_id', productId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!data) return null;

            return this.processProductWithVariants(data);
        } catch (error) {
            console.error('Find product by ID error:', error);
            throw new Error(`Failed to fetch product: ${error.message}`);
        }
    }

    /**
     * Search products
     */
    static async search(filters = {}, pagination = {}) {
        try {
            const { query: searchQuery } = filters;
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;

            let query = supabase
                .from(constants.DATABASE_TABLES.SHOES)
                .select(`
                    *,
                    categories:category_id (
                        category_name,
                        description
                    ),
                    shoe_variants:${constants.DATABASE_TABLES.SHOE_VARIANTS} (
                        variant_id,
                        stock_quantity,
                        variant_price,
                        sku,
                        colors:color_id (
                            color_name
                        ),
                        sizes:size_id (
                            size_value
                        )
                    )
                `, { count: 'exact' });

            // Apply text search
            if (searchQuery) {
                query = query.or(`shoe_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            // Apply other filters
            if (filters.category) {
                query = query.eq('category_id', filters.category);
            }

            // Apply pagination
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            const processedProducts = this.processProductsWithVariants(data || []);

            return {
                products: processedProducts,
                total: count || 0
            };
        } catch (error) {
            console.error('Search products error:', error);
            throw new Error(`Failed to search products: ${error.message}`);
        }
    }

    /**
     * Find products by category
     */
    static async findByCategory(categoryId, pagination = {}, sortOptions = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const { field = 'created_at', order = 'desc' } = sortOptions;
            const offset = (page - 1) * limit;

            // Get category info
            const { data: category } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .select('*')
                .eq('category_id', categoryId)
                .single();

            let query = supabase
                .from(constants.DATABASE_TABLES.SHOES)
                .select(`
                    *,
                    categories:category_id (
                        category_name,
                        description
                    ),
                    shoe_variants:${constants.DATABASE_TABLES.SHOE_VARIANTS} (
                        variant_id,
                        stock_quantity,
                        variant_price,
                        sku,
                        colors:color_id (
                            color_name
                        ),
                        sizes:size_id (
                            size_value
                        )
                    )
                `, { count: 'exact' })
                .eq('category_id', categoryId);

            // Apply sorting
            const validSortFields = ['shoe_name', 'base_price', 'created_at'];
            const sortField = validSortFields.includes(field) ? field : 'created_at';
            query = query.order(sortField, { ascending: order === 'asc' });

            // Apply pagination
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            const processedProducts = this.processProductsWithVariants(data || []);

            return {
                products: processedProducts,
                category,
                total: count || 0
            };
        } catch (error) {
            console.error('Find products by category error:', error);
            throw new Error(`Failed to fetch products by category: ${error.message}`);
        }
    }

    /**
     * Get featured products
     */
    static async getFeatured(limit = 10) {
        try {
            // For now, we'll get the latest products
            // In a real app, you might have a featured flag or use sales data
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.SHOES)
                .select(`
                    *,
                    categories:category_id (
                        category_name,
                        description
                    ),
                    shoe_variants:${constants.DATABASE_TABLES.SHOE_VARIANTS} (
                        variant_id,
                        stock_quantity,
                        variant_price,
                        sku,
                        colors:color_id (
                            color_name
                        ),
                        sizes:size_id (
                            size_value
                        )
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return this.processProductsWithVariants(data || []);
        } catch (error) {
            console.error('Get featured products error:', error);
            throw new Error(`Failed to fetch featured products: ${error.message}`);
        }
    }

    /**
     * Get product variants
     */
    static async getVariants(productId) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                .select(`
                    *,
                    colors:color_id (
                        color_id,
                        color_name
                    ),
                    sizes:size_id (
                        size_id,
                        size_value
                    )
                `)
                .eq('shoe_id', productId)
                .order('color_id')
                .order('size_id');

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get product variants error:', error);
            throw new Error(`Failed to fetch product variants: ${error.message}`);
        }
    }

    /**
     * Get product reviews
     */
    static async getReviews(productId, pagination = {}) {
        try {
            const { page = 1, limit = 10 } = pagination;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from(constants.DATABASE_TABLES.REVIEWS)
                .select(`
                    *,
                    users:user_id (
                        username,
                        full_name
                    )
                `, { count: 'exact' })
                .eq('shoe_id', productId)
                .order('review_date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            // Get rating summary
            const { data: ratingData } = await supabase
                .from(constants.DATABASE_TABLES.REVIEWS)
                .select('rating')
                .eq('shoe_id', productId);

            const ratings = ratingData || [];
            const ratingCounts = [1, 2, 3, 4, 5].map(rating => 
                ratings.filter(r => r.rating === rating).length
            );
            const averageRating = ratings.length > 0 
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
                : 0;

            const ratingSummary = {
                average_rating: Math.round(averageRating * 10) / 10,
                total_reviews: ratings.length,
                rating_distribution: {
                    1: ratingCounts[0],
                    2: ratingCounts[1],
                    3: ratingCounts[2],
                    4: ratingCounts[3],
                    5: ratingCounts[4]
                }
            };

            return {
                reviews: data || [],
                total: count || 0,
                rating_summary: ratingSummary
            };
        } catch (error) {
            console.error('Get product reviews error:', error);
            throw new Error(`Failed to fetch product reviews: ${error.message}`);
        }
    }

    /**
     * Create product review
     */
    static async createReview(reviewData) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.REVIEWS)
                .insert([reviewData])
                .select(`
                    *,
                    users:user_id (
                        username,
                        full_name
                    )
                `)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Create product review error:', error);
            throw new Error(`Failed to create review: ${error.message}`);
        }
    }

    /**
     * Process products with variants to include pricing and availability
     */
    static processProductsWithVariants(products) {
        return products.map(product => this.processProductWithVariants(product));
    }

    /**
     * Process single product with variants
     */
    static processProductWithVariants(product) {
        const variants = product.shoe_variants || [];
        
        // Calculate pricing from variants
        const prices = variants
            .filter(v => v.variant_price)
            .map(v => parseFloat(v.variant_price));
        
        const minPrice = prices.length > 0 ? Math.min(...prices) : product.base_price;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : product.base_price;
        
        // Calculate total stock
        const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
        
        // Get available colors and sizes
        const colors = [...new Set(variants.map(v => v.colors?.color_name).filter(Boolean))];
        const sizes = [...new Set(variants.map(v => v.sizes?.size_value).filter(Boolean))];
        
        return {
            ...product,
            min_price: minPrice,
            max_price: maxPrice,
            total_stock: totalStock,
            available_colors: colors,
            available_sizes: sizes,
            in_stock: totalStock > 0,
            variants: variants
        };
    }
}

export default Product;

