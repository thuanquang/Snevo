// backend/models/Shoe.js
// 👟 Shoe Model - shoes table with variant filtering support

import createSupabaseConfig from '../../config/supabase.js';
import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';
import { NotFoundError } from '../utils/ErrorClasses.js';

const supabaseConfig = createSupabaseConfig();

class Shoe extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.SHOES || 'shoes', 'shoe_id');
    this.fillable = [
      'category_id',
      'shoe_name',
      'description',
      'base_price',
      'image_url',
      'is_active'
    ];
    this.validationRules = {
      category_id: {
        required: true,
        type: 'integer'
      },
      shoe_name: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 100
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
   * ⭐ Find all shoes with advanced filtering (including variant filters)
   * Supports: category, price, search, color, size, stock availability
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
            include_no_variants = false  // ⭐ NEW: For admin page
        } = filters;

        const {
            page = 1,
            limit = 20
        } = pagination;

        const offset = (page - 1) * limit;
        const sortColumn = this._mapSortColumn(sortBy);

        // ⭐ FIXED: Use LEFT JOIN (no !) for admin to see ALL shoes
        // Use INNER JOIN (!inner) for customers to see only in-stock shoes
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

        // Apply base filters
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

        // ⭐ Color/Size filters ONLY if NOT include_no_variants
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
   * ⭐ Deduplicate shoes and aggregate variant data
   * Groups variants by shoe_id and calculates stock info
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
                image_url: shoe.image_url,
                is_active: shoe.is_active,
                created_at: shoe.created_at,
                updated_at: shoe.updated_at,
                categories: shoe.categories,
                shoe_variants: []
            });
        }

        const existingShoe = shoeMap.get(shoeId);
        
        // ⭐ FIXED: Check if shoe_variants exists and is not empty
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

        // Calculate stock info
        const totalStock = uniqueVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

        // Extract unique colors and sizes
        const availableColors = [
            ...new Map(
                uniqueVariants
                    .filter(v => v.colors)
                    .map(v => [v.colors.color_id, v.colors])
            ).values()
        ];

        const availableSizes = [
            ...new Map(
                uniqueVariants
                    .filter(v => v.sizes)
                    .map(v => [v.sizes.size_id, v.sizes])
            ).values()
        ].sort((a, b) => parseFloat(a.size_value) - parseFloat(b.size_value));

        return {
            ...shoe,
            shoe_variants: uniqueVariants,
            stock_info: {
                total_stock: totalStock,        // ⭐ 0 nếu chưa có variants
                has_stock: totalStock > 0,
                variant_count: uniqueVariants.length,  // ⭐ 0 nếu chưa có variants
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

  /**
   * Find by ID with full details
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
   */
  async search(searchTerm, filters = {}, pagination = {}) {
    return this.findAllWithFilters(
      { ...filters, search: searchTerm },
      pagination
    );
  }

  /**
   * Find by category
   */
  async findByCategory(categoryId, filters = {}, pagination = {}) {
    return this.findAllWithFilters(
      { ...filters, category_id: categoryId },
      pagination
    );
  }
}

export default Shoe;
