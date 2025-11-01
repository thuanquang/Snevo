// 🛒 Order Model - orders table
// Handles order data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';
import { parsePaymentDetails } from '../utils/orderUtils.js';

const supabaseConfig = createSupabaseConfig();

class Order extends BaseModel {
    constructor() {
        super('orders', 'order_id');
    }

    // Get orders by user ID with optional status filter and pagination
    async findByUserId(userId, status = null, page = 1, limit = 10) {
        let query = supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select(`
                *,
                order_items (order_item_id, quantity)
            `, { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        // Filter by status if provided
        if (status) {
            query = query.eq('status', status);
        }
        
        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);
        
        const { data, error, count } = await query;
        if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
        
        return {
            orders: data || [],
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil((count || 0) / parseInt(limit))
        };
    }

    // Get orders by status
    async findByStatus(status) {
        // TODO: Implement find by status logic
        throw new Error('Find by status method not implemented');
    }

    // Get ALL orders (for admin) with user profile info and pagination
    async getAllOrders(status = null, page = 1, limit = 10, search = '') {
        console.log('📊 getAllOrders called with:', { status, page, limit, search });
        
        let query = supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select(`
                order_id,
                user_id,
                address_id,
                total_amount,
                shipping_cost,
                tax_amount,
                status,
                notes,
                created_at,
                updated_at,
                order_items (order_item_id)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });
        
        // Filter by status if provided
        if (status) {
            console.log('🔍 Filtering by status:', status);
            query = query.eq('status', status);
        }
        
        // Search by order_id if provided
        if (search) {
            console.log('🔍 Searching by order_id:', search);
            query = query.ilike('order_id', `%${search}%`);
        }
        
        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);
        
        const { data, error, count } = await query;
        
        console.log('📊 Query result - error:', error, 'count:', count, 'data length:', data?.length);
        
        if (error) {
            console.error('❌ Query error:', error.message);
            throw new Error(`Failed to fetch admin orders: ${error.message}`);
        }
        
        // Fetch user profiles separately to avoid relationship issues
        let ordersWithProfiles = data || [];
        console.log('📊 Orders fetched:', ordersWithProfiles.length);
        
        if (ordersWithProfiles.length > 0) {
            const userIds = [...new Set(ordersWithProfiles.map(o => o.user_id).filter(Boolean))];
            console.log('👥 User IDs:', userIds);
            
            if (userIds.length > 0) {
                const { data: profiles, error: profileError } = await supabaseConfig.getAdminClient()
                    .from('profiles')
                    .select('user_id, username, email')
                    .in('user_id', userIds);
                
                console.log('👥 Profiles fetched:', profiles?.length, 'error:', profileError);
                
                if (!profileError && profiles) {
                    const profileMap = {};
                    profiles.forEach(p => {
                        profileMap[p.user_id] = p;
                    });
                    
                    ordersWithProfiles = ordersWithProfiles.map(order => ({
                        ...order,
                        profiles: profileMap[order.user_id] || null
                    }));
                }
            }
        }
        
        console.log('✅ Returning orders with profiles:', ordersWithProfiles.length);
        
        return {
            orders: ordersWithProfiles,
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil((count || 0) / parseInt(limit))
        };
    }

    // Get order with items, variants, payments, and addresses
    async findWithItems(orderId) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select(`
                *,
                order_items (
                    order_item_id,
                    variant_id,
                    quantity,
                    price_per_unit,
                    shoe_variants (
                        shoe_id,
                        shoes (
                            shoe_name,
                            image_url
                        ),
                        colors (
                            color_id,
                            color_name
                        ),
                        sizes (
                            size_id,
                            size_value
                        )
                    )
                ),
                payments (
                    payment_id,
                    payment_method,
                    payment_amount,
                    status,
                    transaction_id,
                    payment_date
                )
            `)
            .eq(this.primaryKey, orderId)
            .single();
        if (error) throw new Error(`Failed to fetch order: ${error.message}`);
        
        // Fetch address separately to avoid join alias issues
        if (data && data.address_id) {
            const { data: address, error: addrError } = await supabaseConfig.getAdminClient()
                .from('addresses')
                .select('*')
                .eq('address_id', data.address_id)
                .single();
            if (!addrError && address) {
                data.address = address;
            }
        }
        
        // Parse payment details
        if (data && data.payments && data.payments.length > 0) {
            data.payments = data.payments.map(payment => ({
                ...payment,
                details: parsePaymentDetails(payment.transaction_id)
            }));
            
            // Attach latest payment to order for convenience
            data.payment = data.payments[0];
        }
        
        return data;
    }

    // Get order with payment summary (lighter version)
    async getWithPayment(orderId) {
        const order = await this.findById(orderId);
        if (!order) return null;
        
        // Fetch latest payment
        const { data: payment, error } = await supabaseConfig.getAdminClient()
            .from('payments')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (!error && payment) {
            order.payment = {
                ...payment,
                details: parsePaymentDetails(payment.transaction_id)
            };
        }
        
        return order;
    }

    // Set order status with validation
    async setStatus(orderId, status) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .update({ 
                status, 
                updated_at: new Date().toISOString() 
            })
            .eq(this.primaryKey, orderId)
            .select()
            .single();
            
        if (error) throw new Error(`Failed to update order status: ${error.message}`);
        
        console.log(`📦 Order ${orderId} status updated to: ${status}`);
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