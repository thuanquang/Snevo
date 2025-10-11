// backend/models/Category.js
// 📂 Category Model - categories table
// Handles shoe category data management

import createSupabaseConfig from '../../config/supabase.js';

import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';

const supabaseConfig = createSupabaseConfig();

class Category extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.CATEGORIES || 'categories', 'category_id');
    
    this.fillable = [
      'category_name',
      'description',
      'image_url',
      'is_active'
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
      }
    };
  }

  /**
   * Get active categories
   */
  async findActive() {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('category_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch active categories: ${error.message}`);
    }
  }

  /**
   * Get category with products
   */
  async findWithProducts(categoryId) {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          shoes (
            shoe_id,
            shoe_name,
            base_price,
            image_url,
            is_active,
            created_at
          )
        `)
        .eq('category_id', categoryId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch category with products: ${error.message}`);
    }
  }

  /**
   * Get category with product count
   */
  async findWithProductCount() {
    try {
      const { data: categories, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          shoes (count)
        `)
        .eq('is_active', true);

      if (error) throw error;

      return categories.map(cat => ({
        ...cat,
        product_count: cat.shoes?.[0]?.count || 0
      }));
    } catch (error) {
      throw new Error(`Failed to fetch categories with count: ${error.message}`);
    }
  }
}

// Export CLASS (not instance) - OOP standard
export default Category;
