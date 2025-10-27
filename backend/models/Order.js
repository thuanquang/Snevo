// 🛒 Order Model - orders table
// Handles order data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';

const supabaseConfig = createSupabaseConfig();

class Order extends BaseModel {
    constructor() {
        super('orders');
    }

    // Get orders by user ID
    async findByUserId(userId) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
        return data || [];
    }

    // Get orders by status
    async findByStatus(status) {
        // TODO: Implement find by status logic
        throw new Error('Find by status method not implemented');
    }

    // Get order with items
    async findWithItems(orderId) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select(`
                *,
                order_items (*),
                addresses (* )
            `)
            .eq(this.primaryKey, orderId)
            .single();
        if (error) throw new Error(`Failed to fetch order: ${error.message}`);
        return data;
    }

    // Update order status
    async updateStatus(orderId, status) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .update({ status, updated_at: new Date().toISOString() })
            .eq(this.primaryKey, orderId)
            .select()
            .single();
        if (error) throw new Error(`Failed to update order: ${error.message}`);
        return data;
    }

    // Calculate total amount
    async calculateTotal(orderId) {
        const order = await this.findWithItems(orderId);
        const subtotal = (order.order_items || []).reduce((s, it) => s + Number(it.price_per_unit) * it.quantity, 0);
        return subtotal + Number(order.shipping_cost || 0) + Number(order.tax_amount || 0);
    }

    // Create order with required fields
    async createOrder({ user_id, address_id, total_amount, shipping_cost = 0, tax_amount = 0, notes = null }) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .insert([{ user_id, address_id, total_amount, shipping_cost, tax_amount, notes }])
            .select()
            .single();
        if (error) throw new Error(`Failed to create order: ${error.message}`);
        return data;
    }
}

export default Order;