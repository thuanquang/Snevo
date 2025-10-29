// 🛒 Order Model - orders table
// Handles order data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';

const supabaseConfig = createSupabaseConfig();

class Order extends BaseModel {
    constructor() {
        super('orders', 'order_id');
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

    // Get total count of orders (admin helper)
    async countAll() {
        try {
            const { count, error } = await supabaseConfig
                .getAdminClient()
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error("Error counting orders:", error);
                return 0;
            }
            return count || 0;
        } catch (err) {
            console.error("Error counting orders:", err);
            return 0;
        }
    }

    // Get count of pending/processing orders (admin helper)
    async countPending() {
        try {
            const { count, error } = await supabaseConfig
                .getAdminClient()
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .in('order_status', ['pending', 'processing']);

            if (error) {
                console.error("Error counting pending orders:", error);
                return 0;
            }
            return count || 0;
        } catch (err) {
            console.error("Error counting pending orders:", err);
            return 0;
        }
    }

    // Get recent orders with user info (admin helper)
    async getRecent(limit = 5) {
        try {
            const { data, error } = await supabaseConfig
                .getAdminClient()
                .from(this.tableName)
                .select(`
                    order_id,
                    user_id,
                    total_amount,
                    order_status,
                    created_at,
                    profiles:user_id (
                        username,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching recent orders:', error);
                return [];
            }

            // Transform data to flatten profile info
            return (data || []).map(order => ({
                order_id: order.order_id,
                user_id: order.user_id,
                total_amount: order.total_amount,
                order_status: order.order_status,
                created_at: order.created_at,
                username: order.profiles?.username || 'Unknown',
                avatar_url: order.profiles?.avatar_url || null
            }));

        } catch (err) {
            console.error("Error fetching recent orders:", err);
            return [];
        }
    }
}

export default Order;