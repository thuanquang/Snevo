// 📋 Order Item Model - order_items table
// Handles order item data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';

const supabaseConfig = createSupabaseConfig();

class OrderItem extends BaseModel {
    constructor() {
        super('order_items');
    }

    // Get order items by order ID
    async findByOrderId(orderId) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });
        if (error) throw new Error(`Failed to fetch order items: ${error.message}`);
        return data || [];
    }

    // Get order items by variant ID
    async findByVariantId(variantId) {
        // TODO: Implement find by variant ID logic
        throw new Error('Find by variant ID method not implemented');
    }

    // Calculate subtotal
    async calculateSubtotal(orderItemId) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select('*')
            .eq('order_item_id', orderItemId)
            .single();
        if (error) throw new Error(`Failed to fetch order item: ${error.message}`);
        return Number(data.price_per_unit) * data.quantity;
    }

    async insertItems(orderId, items) {
        const rows = items.map(it => ({ order_id: orderId, variant_id: it.variant_id, quantity: it.quantity, price_per_unit: it.price_per_unit }));
        const { error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .insert(rows);
        if (error) throw new Error(`Failed to insert order items: ${error.message}`);
        return true;
    }
}

export default OrderItem;
