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
        // TODO: Implement find by user ID logic
        throw new Error('Find by user ID method not implemented');
    }

    // Get orders by status
    async findByStatus(status) {
        // TODO: Implement find by status logic
        throw new Error('Find by status method not implemented');
    }

    // Get order with items
    async findWithItems(orderId) {
        // TODO: Implement find with items logic
        throw new Error('Find with items method not implemented');
    }

    // Update order status
    async updateStatus(orderId, status) {
        // TODO: Implement update status logic
        throw new Error('Update status method not implemented');
    }

    // Calculate total amount
    async calculateTotal(orderId) {
        // TODO: Implement calculate total logic
        throw new Error('Calculate total method not implemented');
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