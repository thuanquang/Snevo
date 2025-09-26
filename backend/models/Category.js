/**
 * Category Model
 * Handles category data operations with Supabase using OOP principles
 */

import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import BaseModel from '../utils/BaseModel.js';
import { ValidationError, ConflictError } from '../utils/ErrorClasses.js';

class Category extends BaseModel {
    constructor() {
        super(constants.DATABASE_TABLES.CATEGORIES, 'category_id');
        
        this.fillable = [
            'category_name', 'description', 'image_url', 'is_active', 'sort_order'
        ];
        
        this.validationRules = {
            category_name: {
                required: true,
                type: 'string',
                minLength: 2,
                maxLength: 100
            },
            description: {
                required: false,
                type: 'string',
                maxLength: 500
            },
            image_url: {
                required: false,
                type: 'string'
            },
            is_active: {
                required: false,
                type: 'boolean'
            },
            sort_order: {
                required: false,
                type: 'integer',
                min: 0
            }
        };
    }

    /**
     * Override create to add unique validation
     */
    async create(categoryData) {
        // Check for existing category name
        if (categoryData.category_name && await this.nameExists(categoryData.category_name)) {
            throw new ConflictError('Category name already exists');
        }

        return super.create(categoryData);
    }

    /**
     * Override updateById to add unique validation
     */
    async updateById(categoryId, updates) {
        // Check for conflicts if updating category name
        if (updates.category_name && await this.nameExists(updates.category_name, categoryId)) {
            throw new ConflictError('Category name already exists');
        }

        return super.updateById(categoryId, updates);
    }

    /**
     * Find all active categories
     */
    async findActive(sortBy = 'sort_order') {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('is_active', true)
                .order(sortBy, { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Find active categories error:', error);
            throw new Error(`Failed to fetch active categories: ${error.message}`);
        }
    }

    /**
     * Find all categories (including inactive)
     */
    async findAll(sortBy = 'sort_order') {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .order(sortBy, { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Find all categories error:', error);
            throw new Error(`Failed to fetch categories: ${error.message}`);
        }
    }

    /**
     * Find category by name
     */
    async findByName(categoryName) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('category_name', categoryName)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Find category by name error:', error);
            throw new Error(`Failed to find category: ${error.message}`);
        }
    }

    /**
     * Get category with product count
     */
    async getCategoryWithProductCount(categoryId) {
        try {
            // Get category info
            const category = await this.findById(categoryId);
            if (!category) {
                return null;
            }

            // Get product count
            const { count, error } = await supabase
                .from(constants.DATABASE_TABLES.SHOES)
                .select('*', { count: 'exact', head: true })
                .eq('category_id', categoryId);

            if (error) throw error;

            return {
                ...category,
                product_count: count || 0
            };
        } catch (error) {
            console.error('Get category with product count error:', error);
            throw new Error(`Failed to get category with product count: ${error.message}`);
        }
    }

    /**
     * Get all categories with product counts
     */
    async getAllWithProductCounts() {
        try {
            const categories = await this.findAll();
            
            // Get product counts for all categories
            const categoriesWithCounts = await Promise.all(
                categories.map(async (category) => {
                    const { count, error } = await supabase
                        .from(constants.DATABASE_TABLES.SHOES)
                        .select('*', { count: 'exact', head: true })
                        .eq('category_id', category.category_id);

                    if (error) {
                        console.warn(`Failed to get product count for category ${category.category_id}:`, error);
                        return { ...category, product_count: 0 };
                    }

                    return { ...category, product_count: count || 0 };
                })
            );

            return categoriesWithCounts;
        } catch (error) {
            console.error('Get all categories with product counts error:', error);
            throw new Error(`Failed to get categories with product counts: ${error.message}`);
        }
    }

    /**
     * Update category sort order
     */
    async updateSortOrder(categoryId, sortOrder) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .update({ sort_order: sortOrder })
                .eq(this.primaryKey, categoryId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update category sort order error:', error);
            throw new Error(`Failed to update sort order: ${error.message}`);
        }
    }

    /**
     * Toggle category active status
     */
    async toggleActive(categoryId) {
        try {
            // Get current status
            const category = await this.findById(categoryId);
            if (!category) {
                throw new Error('Category not found');
            }

            const newStatus = !category.is_active;
            
            const { data, error } = await supabase
                .from(this.tableName)
                .update({ is_active: newStatus })
                .eq(this.primaryKey, categoryId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Toggle category active status error:', error);
            throw new Error(`Failed to toggle active status: ${error.message}`);
        }
    }

    /**
     * Get popular categories (by product count)
     */
    async getPopular(limit = 5) {
        try {
            const categoriesWithCounts = await this.getAllWithProductCounts();
            
            // Sort by product count descending and take top N
            return categoriesWithCounts
                .filter(category => category.is_active && category.product_count > 0)
                .sort((a, b) => b.product_count - a.product_count)
                .slice(0, limit);
        } catch (error) {
            console.error('Get popular categories error:', error);
            throw new Error(`Failed to get popular categories: ${error.message}`);
        }
    }

    /**
     * Search categories by name
     */
    async search(query, options = {}) {
        try {
            const { activeOnly = true, limit = 20 } = options;
            
            let queryBuilder = supabase
                .from(this.tableName)
                .select('*')
                .ilike('category_name', `%${query}%`);

            if (activeOnly) {
                queryBuilder = queryBuilder.eq('is_active', true);
            }

            queryBuilder = queryBuilder
                .order('sort_order', { ascending: true })
                .limit(limit);

            const { data, error } = await queryBuilder;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Search categories error:', error);
            throw new Error(`Failed to search categories: ${error.message}`);
        }
    }

    /**
     * Bulk update sort orders
     */
    async bulkUpdateSortOrders(updates) {
        try {
            const promises = updates.map(({ categoryId, sortOrder }) => 
                this.updateSortOrder(categoryId, sortOrder)
            );

            const results = await Promise.all(promises);
            return results;
        } catch (error) {
            console.error('Bulk update sort orders error:', error);
            throw new Error(`Failed to bulk update sort orders: ${error.message}`);
        }
    }

    /**
     * Check if category name exists
     */
    async nameExists(categoryName, excludeCategoryId = null) {
        try {
            let query = supabase
                .from(this.tableName)
                .select('category_id')
                .eq('category_name', categoryName);

            if (excludeCategoryId) {
                query = query.neq('category_id', excludeCategoryId);
            }

            const { data, error } = await query.single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return !!data;
        } catch (error) {
            console.error('Check category name exists error:', error);
            throw new Error(`Failed to check category name: ${error.message}`);
        }
    }

    /**
     * Get category hierarchy (if categories have parent-child relationships)
     * This is a placeholder for future hierarchical category support
     */
    async getHierarchy() {
        try {
            // For now, just return flat list
            // In the future, this could build a tree structure if parent_id is added
            const categories = await this.findActive();
            return categories;
        } catch (error) {
            console.error('Get category hierarchy error:', error);
            throw new Error(`Failed to get category hierarchy: ${error.message}`);
        }
    }

    /**
     * Get category statistics
     */
    async getStats() {
        try {
            const [totalCount, activeCount, inactiveCount] = await Promise.all([
                this.count(),
                this.count({ is_active: true }),
                this.count({ is_active: false })
            ]);

            return {
                total: totalCount,
                active: activeCount,
                inactive: inactiveCount
            };
        } catch (error) {
            console.error('Get category stats error:', error);
            throw new Error(`Failed to get category stats: ${error.message}`);
        }
    }
}

// Create a singleton instance for static-like access
const categoryModel = new Category();

// Export both the class and instance for flexibility
export default Category;
export { categoryModel };