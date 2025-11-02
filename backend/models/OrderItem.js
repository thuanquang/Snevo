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

    // Get top-selling products by joining with shoes (admin helper)
    async getTopSellingProducts(limit = 5) {
        try {
            // Query order_items and join with shoes to get product info
            const { data, error } = await supabaseConfig
                .getAdminClient()
                .from(this.tableName)
                .select(`
                    quantity,
                    shoe_variants!inner (
                        variant_id,
                        shoes!inner (
                            shoe_id,
                            shoe_name,
                            image_url
                        )
                    )
                `)
                .order('quantity', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching top products:', error);
                return [];
            }

            // Transform and aggregate data
            const productMap = new Map();

            (data || []).forEach(item => {
                const shoe = item.shoe_variants?.shoes;
                if (shoe) {
                    const key = shoe.shoe_id;
                    if (productMap.has(key)) {
                        const existing = productMap.get(key);
                        existing.salesCount += item.quantity;
                    } else {
                        productMap.set(key, {
                            shoe_id: shoe.shoe_id,
                            shoe_name: shoe.shoe_name,
                            image_url: shoe.image_url,
                            salesCount: item.quantity
                        });
                    }
                }
            });

            // Convert to array and sort by sales count
            return Array.from(productMap.values())
                .sort((a, b) => b.salesCount - a.salesCount)
                .slice(0, limit);

        } catch (err) {
            console.error("Error fetching top selling products:", err);
            return [];
        }
    }

    /**
     * ⭐ Get top-selling products within a date range with revenue metrics
     * Returns: Top N products with units sold, revenue, and percentage of total
     * @param {Date|string} startDate - Filter orders from this date (e.g., last 30 days)
     * @param {number} limit - Number of top products to return
     * @returns {Promise<Array>} Array of products with metrics
     */
    async getTopSellingProductsSince(startDate, limit = 5) {
        try {
            console.log('📊 Fetching top selling products since:', startDate);

            // Convert startDate to ISO string if needed
            const dateFilter = startDate instanceof Date 
                ? startDate.toISOString() 
                : new Date(startDate).toISOString();

            console.log('📅 Date filter (ISO):', dateFilter);

            // ⭐ SIMPLIFIED QUERY: Get ALL order_items first, then filter in memory
            const { data: allItems, error: itemsError } = await supabaseConfig
                .getAdminClient()
                .from(this.tableName)
                .select(`
                    order_item_id,
                    order_id,
                    variant_id,
                    quantity,
                    price_per_unit
                `);

            if (itemsError) {
                console.error('❌ Error fetching order items:', itemsError);
                return [];
            }

            console.log(`✅ Found ${allItems?.length || 0} total order items`);

            if (!allItems || allItems.length === 0) {
                return [];
            }

            // Get all unique order IDs
            const orderIds = [...new Set(allItems.map(item => item.order_id))];
            console.log(`📦 Found ${orderIds.length} unique orders`);

            // Fetch orders with status and date filter
            const { data: orders, error: ordersError } = await supabaseConfig
                .getAdminClient()
                .from('orders')
                .select('order_id, status, created_at')
                .in('order_id', orderIds)
                .gte('created_at', dateFilter)
                .in('status', ['processing', 'shipped', 'delivered']);

            if (ordersError) {
                console.error('❌ Error fetching orders:', ordersError);
                return [];
            }

            console.log(`✅ Found ${orders?.length || 0} orders matching date and status filter`);

            if (!orders || orders.length === 0) {
                console.log('⚠️ No orders found with status processing/shipped/delivered in date range');
                return [];
            }

            // Create order ID set for filtering
            const validOrderIds = new Set(orders.map(o => o.order_id));
            
            // Filter order items
            const filteredItems = allItems.filter(item => validOrderIds.has(item.order_id));
            console.log(`✅ Filtered to ${filteredItems.length} order items from valid orders`);

            if (filteredItems.length === 0) {
                return [];
            }

            // Get unique variant IDs
            const variantIds = [...new Set(filteredItems.map(item => item.variant_id))];
            console.log(`👟 Found ${variantIds.length} unique variants`);

            // Fetch variant and shoe details
            const { data: variants, error: variantsError } = await supabaseConfig
                .getAdminClient()
                .from('shoe_variants')
                .select(`
                    variant_id,
                    shoe_id,
                    shoes (
                        shoe_id,
                        shoe_name,
                        image_url
                    )
                `)
                .in('variant_id', variantIds);

            if (variantsError) {
                console.error('❌ Error fetching variants:', variantsError);
                return [];
            }

            console.log(`✅ Found ${variants?.length || 0} variants with shoe details`);

            // Create variant map
            const variantMap = new Map();
            (variants || []).forEach(v => {
                variantMap.set(v.variant_id, v);
            });

            // Aggregate by shoe
            const productMap = new Map();
            let totalRevenue = 0;

            filteredItems.forEach(item => {
                const variant = variantMap.get(item.variant_id);
                if (!variant || !variant.shoes) {
                    console.warn('⚠️ Variant or shoe not found for item:', item.order_item_id);
                    return;
                }

                const shoe = variant.shoes;
                const revenue = item.quantity * Number(item.price_per_unit);
                totalRevenue += revenue;

                const key = shoe.shoe_id;
                if (productMap.has(key)) {
                    const existing = productMap.get(key);
                    existing.units_sold += item.quantity;
                    existing.revenue += revenue;
                } else {
                    productMap.set(key, {
                        shoe_id: shoe.shoe_id,
                        shoe_name: shoe.shoe_name,
                        image_url: shoe.image_url,
                        units_sold: item.quantity,
                        revenue: revenue
                    });
                }
            });

            console.log(`💰 Total revenue in period: ₫${totalRevenue.toLocaleString('vi-VN')}`);
            console.log(`🏆 Aggregated ${productMap.size} unique products`);

            // Convert to array, calculate percentages, and sort
            const products = Array.from(productMap.values())
                .map(product => ({
                    ...product,
                    revenue: Math.round(product.revenue * 100) / 100,
                    percentage_of_revenue: totalRevenue > 0 
                        ? Math.round((product.revenue / totalRevenue) * 10000) / 100 
                        : 0
                }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, limit);

            console.log(`🏆 Top ${products.length} products:`, products.map(p => ({
                name: p.shoe_name,
                units: p.units_sold,
                revenue: `₫${p.revenue.toLocaleString('vi-VN')}`,
                percentage: p.percentage_of_revenue + '%'
            })));

            return products;

        } catch (err) {
            console.error("❌ Error fetching top selling products with date filter:", err);
            return [];
        }
    }
}

export default OrderItem;
