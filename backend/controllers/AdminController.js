// 👑 Admin Controller - Dashboard overview
// Handles admin dashboard and management functions

class AdminController {
    constructor(models = {}) {
        this.models = models;
        console.log('✅ AdminController initialized with models');
    }

    // Get dashboard overview
    async getDashboard(req, res) {
        try {
            console.log("📊 Getting dashboard overview...");

            // Collect data from models
            const totalProducts = this.models.Shoe ?
                await this.countActiveProducts() : 0;
            const totalOrders = this.models.Order ?
                await this.countOrders() : 0;
            const lowStockVariants = this.models.ShoeVariant ?
                await this.getLowStockCount() : 0;
            const totalRevenue = this.models.Payment ?
                await this.calculateRevenue() : 0;

            // Prepare response data
            const dashboardData = {
                summary: {
                    totalProducts,
                    totalOrders,
                    lowStockItems: lowStockVariants,
                    totalRevenue: totalRevenue.toFixed(2)
                },
                stats: {
                    activeCategories: this.models.Category ?
                        await this.countCategories() : 0,
                    totalVariants: this.models.ShoeVariant ?
                        await this.countVariants() : 0,
                    pendingOrders: await this.countPendingOrders()
                },
                recentActivity: {
                    recentOrders: await this.getRecentOrders(5),
                    topSellingProducts: await this.getTopSellingProducts(5)
                }
            };

            // Send response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: dashboardData,
                timestamp: new Date().toISOString()
            }));

        } catch (error) {
            console.error("❌ Dashboard error:", error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    async countActiveProducts() {
        try {
            if (!this.models.Shoe) return 0;
            const { count, error } = await this.models.Shoe.supabase
                .from('shoes')
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

    async countOrders() {
        try {
            if (!this.models.Order) return 0;
            const { count, error } = await this.models.Order.supabase
                .from('orders')
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

    async getLowStockCount() {
        try {
            if (!this.models.ShoeVariant) return 0;
            const { count, error } = await this.models.ShoeVariant.supabase
                .from('shoe_variants')
                .select('*', { count: 'exact', head: true })
                .lt('stock_quantity', 10);

            if (error) {
                console.error("Error counting low stock:", error);
                return 0;
            }
            return count || 0;
        } catch (err) {
            console.error("Error counting low stock:", err);
            return 0;
        }
    }

    async calculateRevenue() {
        try {
            if (!this.models.Payment) return 0;
            const { data, error } = await this.models.Payment.supabase
                .from('payments')
                .select('amount')
                .eq('payment_status', 'completed');

            if (error) {
                console.error("Error calculating revenue:", error);
                return 0;
            }
            return (data || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        } catch (err) {
            console.error("Error calculating revenue:", err);
            return 0;
        }
    }

    async countCategories() {
        try {
            if (!this.models.Category) return 0;
            const { count, error } = await this.models.Category.supabase
                .from('categories')
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error("Error counting categories:", error);
                return 0;
            }
            return count || 0;
        } catch (err) {
            console.error("Error counting categories:", err);
            return 0;
        }
    }

    async countVariants() {
        try {
            if (!this.models.ShoeVariant) return 0;
            const { count, error } = await this.models.ShoeVariant.supabase
                .from('shoe_variants')
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error("Error counting variants:", error);
                return 0;
            }
            return count || 0;
        } catch (err) {
            console.error("Error counting variants:", err);
            return 0;
        }
    }

    async countPendingOrders() {
        try {
            if (!this.models.Order) return 0;
            const { count, error } = await this.models.Order.supabase
                .from('orders')
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

    // Get recent orders WITH user info (username, avatar)
    async getRecentOrders(limit = 5) {
        try {
            if (!this.models.Order) return [];

            // Query orders and join with profiles to get username and avatar
            const { data, error } = await this.models.Order.supabase
                .from('orders')
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

    // Get top-selling products by joining order_items with shoes
    async getTopSellingProducts(limit = 5) {
        try {
            if (!this.models.OrderItem) return [];

            // Query order_items and join with shoes to get product info
            const { data, error } = await this.models.OrderItem.supabase
                .from('order_items')
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

    // Get system statistics
    async getStatistics(req, res) {
        try {
            console.log("📈 Getting statistics...");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    message: 'Statistics coming soon'
                }
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    // Get user management
    async getUserManagement(req, res) {
        try {
            console.log("👥 Getting user management...");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    message: 'User management coming soon'
                }
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    // Get inventory management
    async getInventoryManagement(req, res) {
        try {
            console.log("📦 Getting inventory management...");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    message: 'Inventory management coming soon'
                }
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    // Get order management
    async getOrderManagement(req, res) {
        try {
            console.log("📋 Getting order management...");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    message: 'Order management coming soon'
                }
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }
}

export default AdminController;
