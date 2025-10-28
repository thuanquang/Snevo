// backend/models/Cart.js
// 🛒 Cart Model - carts table

import createSupabaseConfig from '../../config/supabase.js';
import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';

const supabaseConfig = createSupabaseConfig();

class Cart extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.CARTS || 'carts', 'cart_id');

    this.fillable = [
      'user_id',
      'variant_id',
      'quantity',
      'price_at_add'
    ];

    this.validationRules = {
      user_id: { required: true, type: 'string' }, // UUID
      variant_id: { required: true, type: 'integer', min: 1 },
      quantity: { required: true, type: 'integer', min: 1, max: 99 },
      price_at_add: { required: true, type: 'number', min: 0 }
    };
  }

  async listByUser(userId) {
    const { data, error } = await supabaseConfig.getAdminClient()
      .from(this.tableName)
      .select(`
        cart_id, user_id, variant_id, quantity, price_at_add, added_at, updated_at,
        shoe_variants (
          variant_id, shoe_id, color_id, size_id, stock_quantity, variant_price, sku, is_active,
          shoes ( shoe_id, shoe_name, image_url, base_price ),
          colors ( color_id, color_name, hex_code ),
          sizes ( size_id, size_value, size_type )
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cart: ${error.message}`);
    }

    return data || [];
  }

  async findByUserAndVariant(userId, variantId) {
    const { data, error } = await supabaseConfig.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('variant_id', variantId)
      .maybeSingle();

    if (error) throw new Error(`Failed to query cart item: ${error.message}`);
    return data || null;
  }

  async addOrUpdate(userId, variantId, quantity, priceAtAdd) {
    // If exists, increase quantity up to 99; otherwise insert
    const existing = await this.findByUserAndVariant(userId, variantId);
    if (existing) {
      const newQty = Math.min(99, (existing.quantity || 0) + quantity);
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .update({ quantity: newQty })
        .eq('cart_id', existing.cart_id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update cart item: ${error.message}`);
      return data;
    }

    const insertData = {
      user_id: userId,
      variant_id: variantId,
      quantity: quantity,
      price_at_add: priceAtAdd
    };

    const { data, error } = await supabaseConfig.getAdminClient()
      .from(this.tableName)
      .insert([insertData])
      .select()
      .single();

    if (error) throw new Error(`Failed to add to cart: ${error.message}`);
    return data;
  }

  async updateItem(cartId, { quantity, variant_id, price_at_add }) {
    const updates = {};
    if (typeof quantity === 'number') {
      updates.quantity = Math.max(1, Math.min(99, quantity));
    }
    if (typeof variant_id === 'number') {
      updates.variant_id = variant_id;
    }
    if (typeof price_at_add === 'number') {
      updates.price_at_add = price_at_add;
    }

    const { data, error } = await supabaseConfig.getAdminClient()
      .from(this.tableName)
      .update(updates)
      .eq('cart_id', cartId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update cart item: ${error.message}`);
    return data;
  }

  async removeItem(cartId) {
    const { error } = await supabaseConfig.getAdminClient()
      .from(this.tableName)
      .delete()
      .eq('cart_id', cartId);
    if (error) throw new Error(`Failed to remove cart item: ${error.message}`);
    return true;
  }

  async clearUserCart(userId) {
    const { error } = await supabaseConfig.getAdminClient()
      .from(this.tableName)
      .delete()
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to clear cart: ${error.message}`);
    return true;
  }

  async summary(userId) {
    const items = await this.listByUser(userId);
    const subtotal = items.reduce((sum, item) => sum + Number(item.price_at_add) * item.quantity, 0);
    const shipping_cost = 0;
    const tax_amount = 0;
    const total_amount = subtotal + shipping_cost + tax_amount;
    return { subtotal, shipping_cost, tax_amount, total_amount, item_count: items.length };
  }
}

export default Cart;


