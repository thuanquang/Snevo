/**
 * Product Model
 * Handles product data operations with Supabase using OOP principles
 */

import { supabase, supabaseAdmin } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import BaseModel from '../utils/BaseModel.js';
import { ValidationError, NotFoundError } from '../utils/ErrorClasses.js';

class Product extends BaseModel {
    constructor() {
        super(constants.DATABASE_TABLES.SHOES, 'shoe_id');
        
        this.fillable = [
            'shoe_name', 'description', 'base_price', 'category_id',
            'brand', 'image_url', 'images', 'specifications', 'is_featured'
        ];
        
        this.validationRules = {
            shoe_name: {
                required: true,
                type: 'string',
                minLength: 2,
                maxLength: 200
            },
            description: {
                required: false,
                type: 'string',
                maxLength: 2000
            },
            base_price: {
                required: true,
                type: 'number',
                min: 0
            },
            category_id: {
                required: true,
                type: 'integer'
            },
            brand: {
                required: false,
                type: 'string',
                maxLength: 100
            },
            image_url: {
                required: false,
                type: 'string'
            }
        };
    }

    /**
     * Find all products with filtering and pagination
     */
    async findAll(filters = {}, pagination = {}, sortOptions = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const { field = 'created_at', order = 'desc' } = sortOptions;
            const offset = (page - 1) * limit;

            let query = supabase
                .from(this.tableName)
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

            if (filters.brand) {
                query = query.eq('brand', filters.brand);
            }

            if (filters.is_featured !== undefined) {
                query = query.eq('is_featured', filters.is_featured);
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
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
        } catch (error) {
            console.error('Find all products error:', error);
            throw new Error(`Failed to fetch products: ${error.message}`);
        }
    }

    /**
     * Override findById to include relationships
     */
    async findById(productId) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
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
                .eq(this.primaryKey, productId)
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
    async search(filters = {}, pagination = {}) {
        try {
            const { query: searchQuery } = filters;
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;

            let query = supabase
                .from(this.tableName)
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
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
        } catch (error) {
            console.error('Search products error:', error);
            throw new Error(`Failed to search products: ${error.message}`);
        }
    }

    /**
     * Find products by category
     */
    async findByCategory(categoryId, pagination = {}, sortOptions = {}) {
        try {
            const filters = { category: categoryId };
            const result = await this.findAll(filters, pagination, sortOptions);
            
            // Get category info
            const { data: category } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .select('*')
                .eq('category_id', categoryId)
                .single();

            return {
                ...result,
                category
            };
        } catch (error) {
            console.error('Find products by category error:', error);
            throw new Error(`Failed to fetch products by category: ${error.message}`);
        }
    }

    /**
     * Get featured products
     */
    async getFeatured(limit = 10) {
        try {
            const filters = { is_featured: true };
            const pagination = { page: 1, limit };
            const sortOptions = { field: 'created_at', order: 'desc' };
            
            const result = await this.findAll(filters, pagination, sortOptions);
            return result.products;
        } catch (error) {
            console.error('Get featured products error:', error);
            throw new Error(`Failed to fetch featured products: ${error.message}`);
        }
    }

    /**
     * Get product variants
     */
    async getVariants(productId) {
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
    async getReviews(productId, pagination = {}) {
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
            const ratingSummary = await this.getRatingSummary(productId);

            return {
                reviews: data || [],
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
                rating_summary: ratingSummary
            };
        } catch (error) {
            console.error('Get product reviews error:', error);
            throw new Error(`Failed to fetch product reviews: ${error.message}`);
        }
    }

    /**
     * Get rating summary for a product
     */
    async getRatingSummary(productId) {
        try {
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

            return {
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
        } catch (error) {
            console.error('Get rating summary error:', error);
            throw new Error(`Failed to get rating summary: ${error.message}`);
        }
    }

    /**
     * Create product review
     */
    async createReview(reviewData) {
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
     * Get related products
     */
    async getRelatedProducts(productId, limit = 4) {
        try {
            // First get the current product's category
            const product = await this.findById(productId);
            if (!product) {
                throw new NotFoundError('Product');
            }

            // Find other products in the same category
            const filters = { category: product.category_id };
            const pagination = { page: 1, limit: limit + 1 }; // +1 to exclude current product
            
            const result = await this.findAll(filters, pagination);
            
            // Filter out the current product
            const relatedProducts = result.products
                .filter(p => p.shoe_id !== productId)
                .slice(0, limit);

            return relatedProducts;
        } catch (error) {
            console.error('Get related products error:', error);
            throw new Error(`Failed to get related products: ${error.message}`);
        }
    }

    /**
     * Process products with variants to include pricing and availability
     */
    processProductsWithVariants(products) {
        return products.map(product => this.processProductWithVariants(product));
    }

    /**
     * Process single product with variants
     */
    processProductWithVariants(product) {
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

    /**
     * Update product stock
     */
    async updateStock(variantId, quantity, operation = 'set') {
        try {
            let updateData;
            
            if (operation === 'increment') {
                // Get current stock
                const { data: variant } = await supabase
                    .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                    .select('stock_quantity')
                    .eq('variant_id', variantId)
                    .single();
                
                updateData = { stock_quantity: (variant.stock_quantity || 0) + quantity };
            } else if (operation === 'decrement') {
                // Get current stock
                const { data: variant } = await supabase
                    .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                    .select('stock_quantity')
                    .eq('variant_id', variantId)
                    .single();
                
                const newStock = Math.max(0, (variant.stock_quantity || 0) - quantity);
                updateData = { stock_quantity: newStock };
            } else {
                updateData = { stock_quantity: quantity };
            }

            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                .update(updateData)
                .eq('variant_id', variantId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update stock error:', error);
            throw new Error(`Failed to update stock: ${error.message}`);
        }
    }
}

// Create a singleton instance for static-like access
const productModel = new Product();

// Export both the class and instance for flexibility
export default Product;
export { productModel };