// backend/models/ShoeVariant.js
// ⭐ Shoe Variant Model - shoe_variants table (CORE)

import createSupabaseConfig from '../../config/supabase.js';
import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';

const supabaseConfig = createSupabaseConfig();

class ShoeVariant extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.SHOE_VARIANTS || 'shoe_variants', 'variant_id');
    
    this.fillable = [
      'shoe_id',
      'color_id',
      'size_id',
      'stock_quantity',
      'sku',
      'variant_price',
      'is_active'
    ];

    this.validationRules = {
      shoe_id: {
        required: true,
        type: 'integer'
      },
      color_id: {
        required: true,
        type: 'integer'
      },
      size_id: {
        required: true,
        type: 'integer'
      },
      stock_quantity: {
        required: false,
        type: 'integer',
        min: 0
      },
      sku: {
        required: true,
        type: 'string',
        maxLength: 50
      },
      variant_price: {
        required: false,
        type: 'number',
        min: 0
      },
      is_active: {
        required: false,
        type: 'boolean'
      }
    };
  }

  async findByShoeId(shoeId) {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          shoes (shoe_id, shoe_name, base_price, image_url),
          colors (color_id, color_name, hex_code),
          sizes (size_id, size_value, size_type)
        `)
        .eq('shoe_id', shoeId)
        .eq('is_active', true)
        .order('color_id')
        .order('size_id');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch variants by shoe ID: ${error.message}`);
    }
  }

  async findBySku(sku) {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          shoes (shoe_name, base_price),
          colors (color_name, hex_code),
          sizes (size_value, size_type)
        `)
        .eq('sku', sku)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch variant by SKU: ${error.message}`);
    }
  }

  async findByComposite(shoeId, colorId, sizeId) {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          shoes (shoe_name, image_url),
          colors (color_name, hex_code),
          sizes (size_value)
        `)
        .eq('shoe_id', shoeId)
        .eq('color_id', colorId)
        .eq('size_id', sizeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to find variant by composite: ${error.message}`);
    }
  }

  async updateStock(variantId, quantity, operation = 'set') {
    try {
      let newQuantity;

      if (operation === 'set') {
        newQuantity = quantity;
      } else {
        const variant = await this.findById(variantId);
        if (!variant) throw new Error('Variant not found');

        if (operation === 'add') {
          newQuantity = (variant.stock_quantity || 0) + quantity;
        } else if (operation === 'subtract') {
          newQuantity = Math.max(0, (variant.stock_quantity || 0) - quantity);
        } else {
          throw new Error('Invalid operation');
        }
      }

      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .update({ 
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('variant_id', variantId)
        .select()
        .single();

      if (error) throw error;

      await this._checkLowStockAlert(variantId, newQuantity);
      return data;
    } catch (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }
  }

  async checkStock(variantId, requestedQuantity) {
    try {
      const variant = await this.findById(variantId);
      if (!variant) throw new Error('Variant not found');

      const available = variant.stock_quantity >= requestedQuantity;

      return {
        available,
        current_stock: variant.stock_quantity,
        requested_quantity: requestedQuantity,
        shortfall: available ? 0 : requestedQuantity - variant.stock_quantity
      };
    } catch (error) {
      throw new Error(`Failed to check stock: ${error.message}`);
    }
  }

  async findLowStock(threshold = 10) {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select(`
          *,
          shoes (shoe_name, image_url),
          colors (color_name),
          sizes (size_value)
        `)
        .lte('stock_quantity', threshold)
        .eq('is_active', true)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch low stock variants: ${error.message}`);
    }
  }

  async bulkCreate(variantsData) {
    try {
      for (const variant of variantsData) {
        this.validate(variant);

        const existing = await this.findByComposite(
          variant.shoe_id,
          variant.color_id,
          variant.size_id
        );

        if (existing) {
          throw new Error(
            `Variant already exists: Shoe ${variant.shoe_id}, Color ${variant.color_id}, Size ${variant.size_id}`
          );
        }
      }

      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .insert(variantsData)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to bulk create variants: ${error.message}`);
    }
  }

  async _checkLowStockAlert(variantId, currentStock) {
    const LOW_STOCK_THRESHOLD = 10;
    if (currentStock <= LOW_STOCK_THRESHOLD) {
      console.warn(`⚠️ LOW STOCK ALERT: Variant ${variantId} has only ${currentStock} units remaining`);
    }
  }
}

// Export CLASS - OOP standard
export default ShoeVariant;
