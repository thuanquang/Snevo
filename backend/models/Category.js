// backend/models/Category.js

import createSupabaseConfig from "../../config/supabase.js";
import BaseModel from "../utils/BaseModel.js";
import constants from "../../config/constants.js";

const supabaseConfig = createSupabaseConfig();

class Category extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.CATEGORIES || "categories", "category_id");
    this.fillable = ["category_name", "description", "image_url", "is_active"];
    this.validationRules = {
      category_name: {
        required: true,
        type: "string",
        minLength: 2,
        maxLength: 100,
      },
      description: {
        required: false,
        type: "string",
        maxLength: 500,
      },
      image_url: {
        required: false,
        type: "string",
      },
      is_active: {
        required: false,
        type: "boolean",
      },
    };
  }

  /**
   * Get active categories
   */
  async findActive() {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select("*")
        .eq("is_active", true)
        .order("category_name", { ascending: true });

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
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select(
          `
                    *,
                    shoes (
                        shoe_id,
                        shoe_name,
                        base_price,
                        image_url,
                        is_active,
                        created_at
                    )
                `
        )
        .eq("category_id", categoryId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(
        `Failed to fetch category with products: ${error.message}`
      );
    }
  }

  /**
   * ⭐ FIXED: Get ALL categories with shoe count (no active filter)
   */
  async findWithProductCount() {
    try {
      console.log("🔍 Fetching categories with product count...");

      // Get all categories
      const { data: categories, error: catError } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select("*")
        .order("category_name", { ascending: true });

      if (catError) {
        console.error("❌ Error fetching categories:", catError);
        throw catError;
      }

      // Get all shoes grouped by category
      const { data: shoes, error: shoesError } = await supabaseConfig
        .getAdminClient()
        .from("shoes")
        .select("category_id");

      if (shoesError) {
        console.error("❌ Error fetching shoes:", shoesError);
        throw shoesError;
      }

      // Count shoes per category
      const shoeCountMap = {};
      (shoes || []).forEach((shoe) => {
        const catId = shoe.category_id;
        shoeCountMap[catId] = (shoeCountMap[catId] || 0) + 1;
      });

      console.log("📊 Shoe count by category:", shoeCountMap);

      // Add counts to categories
      const result = (categories || []).map((cat) => ({
        ...cat,
        product_count: shoeCountMap[cat.category_id] || 0,
      }));

      console.log(`✅ Processed ${result.length} categories with counts`);
      return result;
    } catch (error) {
      console.error("❌ Failed to fetch categories with count:", error);
      throw new Error(
        `Failed to fetch categories with count: ${error.message}`
      );
    }
  }

  // Get total count of categories (admin helper)
  async countAll() {
    try {
      const { count, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error("Error counting categories:", error);
        return 0;
      }
      return count || 0;
    } catch (err) {
      console.error("Error counting categories:", err);
      return 0;
    }
  }
  /**
   * Check if category has active shoes before soft delete
   * Returns count of active shoes in this category
   */
  async checkActiveShoesCount(categoryId) {
    try {
      const { count, error } = await supabaseConfig
        .getAdminClient()
        .from("shoes")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId)
        .eq("is_active", true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new Error(`Failed to check active shoes: ${error.message}`);
    }
  }

  /**
   * Validate category name uniqueness (excluding current category)
   */
  async validateUniqueName(categoryName, excludeCategoryId = null) {
    try {
      let query = supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select("category_id")
        .ilike("category_name", categoryName);

      if (excludeCategoryId) {
        query = query.neq("category_id", excludeCategoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data.length === 0; // true if unique
    } catch (error) {
      throw new Error(`Failed to validate category name: ${error.message}`);
    }
  }
}

export default Category;
