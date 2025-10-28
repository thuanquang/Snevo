// backend/models/Shoe.js
// 👟 Complete Shoe Model - Merged from Product.js + Shoe.js
// Handles ALL shoe operations: filtering, CRUD, soft delete/restore, reviews

import createSupabaseConfig from '../../config/supabase.js';
import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';
import { ValidationError, NotFoundError } from '../utils/ErrorClasses.js';

const supabaseConfig = createSupabaseConfig();

class Shoe extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.SHOES || 'shoes', 'shoe_id');
    
    // ⭐ MERGED fillable - từ cả Shoe.js và Product.js
    this.fillable = [
      'category_id',
      'shoe_name',
      'description',
      'base_price',
      'brand',            // ← từ Product.js
      'image_url',
      'images',           // ← từ Product.js
      'specifications',   // ← từ Product.js
      'is_featured',      // ← từ Product.js
      'is_active'
    ];
    
    // ⭐ MERGED validationRules
    this.validationRules = {
      category_id: {
        required: true,
        type: 'integer'
      },
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
      brand: {
        required: false,
        type: 'string',
        maxLength: 100
      },
      image_url: {
        required: false,
        type: 'string'
      },
      images: {
        required: false,
        type: 'array'
      },
      specifications: {
        required: false,
        type: 'object'
      },
      is_featured: {
        required: false,
        type: 'boolean'
      },
      is_active: {
        required: false,
        type: 'boolean'
      }
    };
  }

  // ============================================
  // 🔍 SECTION 1: ADVANCED FILTERING (from Shoe.js)
  // ============================================

  /**
   * ⭐ Find all shoes with advanced filtering
   * Supports: category, price, search, color, size, stock availability
   * Used by: ProductController.getProducts()
   */
  async findAllWithFilters(filters = {}, pagination = {}, sortBy = 'created_at', sortOrder = 'desc') {
    try {
      const {
        category_id,
        min_price,
        max_price,
        search,
        color_ids,
        size_ids,
        is_active = true,
        include_no_variants = false // For admin page
      } = filters;

      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;
      const sortColumn = this._mapSortColumn(sortBy);

      // Use LEFT JOIN for admin, INNER JOIN for customers
      const joinType = include_no_variants ? '' : '!inner';
      
      let query = supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          categories (
            category_id,
            category_name,
            description,
            image_url
          ),
          shoe_variants${joinType} (
            variant_id,
            color_id,
            size_id,
            stock_quantity,
            variant_price,
            sku,
            is_active,
            colors (
              color_id,
              color_name,
              hex_code
            ),
            sizes (
              size_id,
              size_value,
              size_type
            )
          )
        `, { count: 'exact' });

      // Apply filters
      if (is_active !== undefined) {
        query = query.eq('is_active', is_active);
      }

      if (category_id) {
        query = query.eq('category_id', category_id);
      }

      if (min_price) {
        query = query.gte('base_price', min_price);
      }

      if (max_price) {
        query = query.lte('base_price', max_price);
      }

      if (search) {
        query = query.or(`shoe_name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Color/Size filters ONLY if NOT include_no_variants
      if (!include_no_variants) {
        if (color_ids && Array.isArray(color_ids) && color_ids.length > 0) {
          query = query.in('shoe_variants.color_id', color_ids);
        }

        if (size_ids && Array.isArray(size_ids) && size_ids.length > 0) {
          query = query.in('shoe_variants.size_id', size_ids);
        }

        // Only show in-stock variants for customers
        query = query.gt('shoe_variants.stock_quantity', 0);
        query = query.eq('shoe_variants.is_active', true);
      }

      // Apply sorting
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Execute query
      const { data, error, count } = await query;
      if (error) {
        throw new Error(`Database query error: ${error.message}`);
      }

      console.log(`🔍 Raw query returned ${data?.length || 0} rows`);

      // Deduplicate shoes
      const uniqueShoes = this._deduplicateShoes(data || []);
      console.log(`✅ After deduplication: ${uniqueShoes.length} unique shoes`);

      // Apply pagination AFTER deduplication
      const paginatedShoes = uniqueShoes.slice(offset, offset + limit);

      return {
        data: paginatedShoes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: uniqueShoes.length,
          totalPages: Math.ceil(uniqueShoes.length / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error in findAllWithFilters:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Deduplicate shoes and aggregate variant data
   */
_deduplicateShoes(shoes) {
    const shoeMap = new Map();
    
    shoes.forEach(shoe => {
        const shoeId = shoe.shoe_id;
        if (!shoeMap.has(shoeId)) {
            shoeMap.set(shoeId, {
                shoe_id: shoe.shoe_id,
                category_id: shoe.category_id,
                shoe_name: shoe.shoe_name,
                description: shoe.description,
                base_price: shoe.base_price,
                brand: shoe.brand,
                image_url: shoe.image_url,
                images: shoe.images,
                specifications: shoe.specifications,
                is_featured: shoe.is_featured,
                is_active: shoe.is_active,
                created_at: shoe.created_at,
                updated_at: shoe.updated_at,
                deleted_at: shoe.deleted_at,
                categories: shoe.categories,
                shoe_variants: []
            });
        }

        const existingShoe = shoeMap.get(shoeId);
        if (shoe.shoe_variants && Array.isArray(shoe.shoe_variants) && shoe.shoe_variants.length > 0) {
            existingShoe.shoe_variants.push(...shoe.shoe_variants);
        }
    });

    return Array.from(shoeMap.values()).map(shoe => {
        const variants = shoe.shoe_variants || [];
        
        // Remove duplicate variants
        const uniqueVariants = Array.from(
            new Map(variants.map(v => [v.variant_id, v])).values()
        );

        // ✅ FIX: Only count ACTIVE variants
        const activeVariants = uniqueVariants.filter(v => v.is_active === true);
        
        // ✅ FIX: Calculate stock from ACTIVE variants only
        const totalStock = activeVariants.reduce(
            (sum, v) => sum + (v.stock_quantity || 0), 
            0
        );

        // ✅ FIX: Extract colors/sizes from ACTIVE variants only
        const availableColors = [
            ...new Map(
                activeVariants
                    .filter(v => v.colors)
                    .map(v => [v.colors.color_id, v.colors])
            ).values()
        ];

        const availableSizes = [
            ...new Map(
                activeVariants
                    .filter(v => v.sizes)
                    .map(v => [v.sizes.size_id, v.sizes])
            ).values()
        ].sort((a, b) => parseFloat(a.size_value) - parseFloat(b.size_value));

        return {
            ...shoe,
            shoe_variants: uniqueVariants,  // Keep all variants (for admin view)
            stock_info: {
                total_stock: totalStock,  // ✅ FIXED: Only active variants
                has_stock: totalStock > 0,
                variant_count: activeVariants.length,  // ✅ FIXED: Only active variants
                available_colors: availableColors,
                available_sizes: availableSizes
            }
        };
    });
}

  /**
   * Map frontend sort field to database column
   */
  _mapSortColumn(sortBy) {
    const sortMap = {
      'name': 'shoe_name',
      'price': 'base_price',
      'created': 'created_at',
      'updated': 'updated_at'
    };
    return sortMap[sortBy] || sortBy;
  }

  // ============================================
  // 📖 SECTION 2: READ OPERATIONS
  // ============================================

  /**
   * Find by ID with full details
   * Used by: ProductController.getProduct()
   */
  async findByIdWithDetails(shoeId) {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          categories (*),
          shoe_variants (
            *,
            colors (*),
            sizes (*)
          )
        `)
        .eq(this.primaryKey, shoeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(`Shoe with ID ${shoeId} not found`);
        }
        throw error;
      }

      // Calculate stock info
      if (data) {
        const variants = data.shoe_variants || [];
        const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
        data.stock_info = {
          total_stock: totalStock,
          has_stock: totalStock > 0,
          variant_count: variants.length
        };
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch shoe details: ${error.message}`);
    }
  }

  /**
   * Find active shoes only
   */
  async findActive(pagination = {}) {
    return this.findAllWithFilters({ is_active: true }, pagination);
  }

  /**
   * Search shoes by name or description
   * Used by: ProductController.searchProducts()
   */
  async search(searchTerm, filters = {}, pagination = {}) {
    return this.findAllWithFilters(
      { ...filters, search: searchTerm },
      pagination
    );
  }

  /**
   * Find by category
   * Used by: ProductController.getProductsByCategory()
   */
  async findByCategory(categoryId, filters = {}, pagination = {}) {
    return this.findAllWithFilters(
      { ...filters, category_id: categoryId },
      pagination
    );
  }

  /**
   * Get featured products
   * Used by: ProductController.getFeaturedProducts()
   */
  async getFeatured(limit = 10) {
    const result = await this.findAllWithFilters(
      { is_featured: true, is_active: true },
      { page: 1, limit },
      'created_at',
      'desc'
    );
    return result.data;
  }

  /**
   * Get total count of active products
   */
  async countAll() {
    try {
      const { count, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error("Error counting products:", error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error("Error counting products:", err);
      return 0;
    }
  }

  // ============================================
  // 🗑️ SECTION 3: SOFT DELETE & RESTORE (from Product.js)
  // ============================================

  /**
   * Soft delete with cascade counting and verification
   * Used by: ProductController.deleteProduct()
   */
  async softDelete(shoeId) {
    try {
      console.log(`🗑️ Starting soft delete for shoe ${shoeId}...`);

      // Count active variants BEFORE delete
      const { count: activeVariantsCount, error: countError } = await supabaseConfig
        .getAdminClient()
        .from('shoe_variants')
        .select('*', { count: 'exact', head: true })
        .eq('shoe_id', shoeId)
        .eq('is_active', true);

      if (countError) throw countError;

      console.log(`📊 Found ${activeVariantsCount} active variants before delete`);

      // Perform soft delete (triggers will cascade to variants)
      const product = await super.softDelete(shoeId);

      // Verify cascade worked
      const { count: remainingActiveVariants, error: verifyError } = await supabaseConfig
        .getAdminClient()
        .from('shoe_variants')
        .select('*', { count: 'exact', head: true })
        .eq('shoe_id', shoeId)
        .eq('is_active', true);

      if (verifyError) throw verifyError;

      const cascadedVariants = activeVariantsCount - remainingActiveVariants;

      console.log(`✅ Soft delete completed. ${cascadedVariants} variants auto-deleted by trigger`);

      return {
        ...product,
        variants_cascade_deleted: cascadedVariants,
        total_variants_before: activeVariantsCount,
        remaining_active_variants: remainingActiveVariants
      };
    } catch (error) {
      console.error('Error in softDelete:', error);
      throw new Error(`Failed to soft delete shoe: ${error.message}`);
    }
  }

  /**
   * Restore with preview and skip logic
   * Used by: ProductController.restoreProduct()
   */
  async restore(shoeId) {
    try {
      console.log(`♻️ Starting restore for shoe ${shoeId}...`);

      // Get restore preview first
      const preview = await this.getRestorePreview(shoeId);

      if (!preview.can_restore) {
        throw new ValidationError('Cannot restore shoe: ' + preview.reason);
      }

      // Perform restore
      const product = await super.restore(shoeId);

      // Get variants that will be restored
      const { will_restore, will_skip } = preview;

      console.log(`✅ Restore completed. ${will_restore.length} variants restored, ${will_skip.length} skipped`);

      return {
        ...product,
        variants_restored: will_restore.length,
        variants_skipped: will_skip.length,
        skipped_reasons: will_skip.map(v => ({
          variant_id: v.variant_id,
          sku: v.sku,
          reason: v.skip_reason
        }))
      };
    } catch (error) {
      console.error('Error in restore:', error);
      throw new Error(`Failed to restore shoe: ${error.message}`);
    }
  }

  /**
   * Get restore preview - check what will be restored/skipped
   */
  async getRestorePreview(shoeId) {
    try {
      // Get shoe details
      const { data: shoe, error: shoeError } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select('*')
        .eq('shoe_id', shoeId)
        .single();

      if (shoeError) throw shoeError;
      if (!shoe) throw new NotFoundError(`Shoe ${shoeId} not found`);

      // Check if shoe is already active
      if (shoe.is_active) {
        return {
          can_restore: false,
          reason: 'Shoe is already active',
          will_restore: [],
          will_skip: []
        };
      }

      // Get all deleted variants for this shoe
      const { data: deletedVariants, error: variantsError } = await supabaseConfig
        .getAdminClient()
        .from('shoe_variants')
        .select(`
          *,
          colors (color_id, color_name, hex_code),
          sizes (size_id, size_value, size_type)
        `)
        .eq('shoe_id', shoeId)
        .eq('is_active', false)
        .not('deleted_at', 'is', null);

      if (variantsError) throw variantsError;

      // Categorize variants
      const will_restore = [];
      const will_skip = [];

      (deletedVariants || []).forEach(variant => {
        // Skip if deleted BEFORE shoe deletion (independent deletion)
        if (shoe.deleted_at && variant.deleted_at < shoe.deleted_at) {
          will_skip.push({
            ...variant,
            skip_reason: 'Deleted independently before shoe deletion'
          });
        } else {
          will_restore.push(variant);
        }
      });

      return {
        can_restore: true,
        shoe,
        will_restore,
        will_skip,
        summary: {
          total_deleted_variants: deletedVariants.length,
          will_restore_count: will_restore.length,
          will_skip_count: will_skip.length
        }
      };
    } catch (error) {
      throw new Error(`Failed to get restore preview: ${error.message}`);
    }
  }

  // ============================================
  // 🛍️ SECTION 4: VARIANTS & STOCK (from Product.js)
  // ============================================

  /**
   * Get product variants
   */
  async getVariants(productId) {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from('shoe_variants')
        .select(`
          *,
          colors (color_id, color_name, hex_code),
          sizes (size_id, size_value, size_type)
        `)
        .eq('shoe_id', productId)
        .eq('is_active', true)
        .order('color_id')
        .order('size_id');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to get variants: ${error.message}`);
    }
  }

  /**
   * Update product stock
   */
  async updateStock(variantId, quantity, operation = 'set') {
    try {
      let updateData;

      if (operation === 'increment' || operation === 'decrement') {
        const { data: variant } = await supabaseConfig
          .getAdminClient()
          .from('shoe_variants')
          .select('stock_quantity')
          .eq('variant_id', variantId)
          .single();

        const currentStock = variant.stock_quantity || 0;
        const newStock = operation === 'increment' 
          ? currentStock + quantity 
          : Math.max(0, currentStock - quantity);
        
        updateData = { stock_quantity: newStock };
      } else {
        updateData = { stock_quantity: quantity };
      }

      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from('shoe_variants')
        .update(updateData)
        .eq('variant_id', variantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }
  }

  // ============================================
  // ⭐ SECTION 5: REVIEWS & RATINGS (from Product.js)
  // ============================================

  /**
   * Get product reviews
   */
  async getReviews(productId, pagination = {}) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseConfig
        .getAdminClient()
        .from('reviews')
        .select('*, profiles(full_name, avatar_url)', { count: 'exact' })
        .eq('shoe_id', productId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get reviews: ${error.message}`);
    }
  }

  /**
   * Get rating summary
   */
  async getRatingSummary(productId) {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from('reviews')
        .select('rating')
        .eq('shoe_id', productId);

      if (error) throw error;

      const ratings = data || [];
      const totalReviews = ratings.length;
      
      if (totalReviews === 0) {
        return {
          average_rating: 0,
          total_reviews: 0,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      const average = sum / totalReviews;

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(r => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      });

      return {
        average_rating: Math.round(average * 10) / 10,
        total_reviews: totalReviews,
        rating_distribution: distribution
      };
    } catch (error) {
      throw new Error(`Failed to get rating summary: ${error.message}`);
    }
  }

  /**
   * Create product review
   */
  async createReview(reviewData) {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from('reviews')
        .insert([reviewData])
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }

  /**
   * Get related products
   */
  async getRelatedProducts(productId, limit = 4) {
    try {
      const { data: product } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select('category_id, base_price')
        .eq('shoe_id', productId)
        .single();

      if (!product) return [];

      const result = await this.findAllWithFilters(
        {
          category_id: product.category_id,
          is_active: true
        },
        { page: 1, limit: limit + 1 }
      );

      return result.data.filter(p => p.shoe_id !== productId).slice(0, limit);
    } catch (error) {
      console.error('Error getting related products:', error);
      return [];
    }
  }
}

export default Shoe;
