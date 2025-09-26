/**
 * Category Model
 * Handles product category operations with Supabase
 */

import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';

class Category {
    /**
     * Get all categories
     */
    static async findAll() {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .select('*')
                .order('category_name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Find all categories error:', error);
            throw new Error(`Failed to fetch categories: ${error.message}`);
        }
    }

    /**
     * Find category by ID
     */
    static async findById(categoryId) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .select('*')
                .eq('category_id', categoryId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Find category by ID error:', error);
            throw new Error(`Failed to fetch category: ${error.message}`);
        }
    }

    /**
     * Create new category
     */
    static async create(categoryData) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .insert([categoryData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Create category error:', error);
            throw new Error(`Failed to create category: ${error.message}`);
        }
    }

    /**
     * Update category
     */
    static async update(categoryId, updates) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .update(updates)
                .eq('category_id', categoryId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update category error:', error);
            throw new Error(`Failed to update category: ${error.message}`);
        }
    }

    /**
     * Delete category
     */
    static async delete(categoryId) {
        try {
            const { error } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .delete()
                .eq('category_id', categoryId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete category error:', error);
            throw new Error(`Failed to delete category: ${error.message}`);
        }
    }

    /**
     * Get category with product count
     */
    static async findWithProductCount() {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.CATEGORIES)
                .select(`
                    *,
                    shoes:${constants.DATABASE_TABLES.SHOES}(count)
                `)
                .order('category_name');

            if (error) throw error;
            
            // Process the data to include product count
            const categoriesWithCount = (data || []).map(category => ({
                ...category,
                product_count: category.shoes?.[0]?.count || 0
            }));

            return categoriesWithCount;
        } catch (error) {
            console.error('Find categories with product count error:', error);
            throw new Error(`Failed to fetch categories with product count: ${error.message}`);
        }
    }
}

export default Category;

