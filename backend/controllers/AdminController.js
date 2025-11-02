// 👑 Admin Controller - Dashboard overview
// Handles admin dashboard and management functions

class AdminController {
    constructor(models = {}) {
        this.models = models;
        
        // ⭐ Initialize in-memory cache for dashboard metrics
        this.cache = new Map();
        this.cacheTTL = 60000; // 60 seconds TTL for dashboard data
        
        console.log('✅ AdminController initialized with models and caching');
    }

    /**
     * ⭐ Cache helper - Get cached data or fetch fresh if expired
     */
    async getCachedOrFetch(cacheKey, fetchFunction) {
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            console.log(`💾 Cache HIT for ${cacheKey} (age: ${Date.now() - cached.timestamp}ms)`);
            return cached.data;
        }
        
        console.log(`🔄 Cache MISS for ${cacheKey}, fetching fresh data...`);
        const freshData = await fetchFunction();
        
        this.cache.set(cacheKey, {
            data: freshData,
            timestamp: Date.now()
        });
        
        return freshData;
    }

    /**
     * ⭐ Invalidate dashboard cache (call after data mutations)
     */
    invalidateDashboardCache() {
        const keysToInvalidate = ['dashboard_metrics', 'dashboard_30day'];
        keysToInvalidate.forEach(key => this.cache.delete(key));
        console.log('🗑️ Dashboard cache invalidated');
    }

    /**
     * ⭐ Get comprehensive dashboard metrics (ENHANCED with 30-day analytics)
     * Includes: Total counts, 30-day top-selling products with revenue metrics
     */
    async getDashboardMetrics(req, res) {
        try {
            console.log("📊 Getting comprehensive dashboard metrics...");

            // Use cache for better performance
            const metrics = await this.getCachedOrFetch('dashboard_metrics', async () => {
                // Calculate 90 days ago date (wider range for testing)
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                console.log('📅 Fetching top-selling products from:', ninetyDaysAgo.toISOString());

                // Fetch all metrics in parallel
                const [
                    totalShoes,
                    totalVariants,
                    totalOrders,
                    lowStockCount,
                    totalRevenue,
                    pendingOrders,
                    approvedOrders,
                    cancelledOrders,
                    topSelling30Days
                ] = await Promise.all([
                    this.models.Shoe?.countAll() || 0,
                    this.models.ShoeVariant?.countAll() || 0,
                    this.models.Order?.countAll() || 0,
                    this.models.ShoeVariant?.getLowStockCount(10) || 0,
                    this.models.Payment?.calculateTotalRevenue() || 0,
                    this.models.Order?.countPending() || 0,
                    this.models.Order?.countApproved() || 0,
                    this.models.Order?.countCancelled() || 0,
                    this.models.OrderItem?.getTopSellingProductsSince(ninetyDaysAgo, 5) || []
                ]);

                console.log('📊 Top-selling products fetched:', topSelling30Days.length, 'products');

                return {
                    totalMetrics: {
                        totalShoes,
                        totalVariants,
                        totalOrders,
                        lowStockItems: lowStockCount,
                        totalRevenue: Math.round(totalRevenue * 100) / 100,
                        pendingOrders,
                        approvedOrders,
                        cancelledOrders
                    },
                    topSelling: {
                        period: '90_days',
                        startDate: ninetyDaysAgo.toISOString(),
                        endDate: new Date().toISOString(),
                        products: topSelling30Days
                    }
                };
            });

            // Send response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: metrics,
                cached: this.cache.has('dashboard_metrics'),
                timestamp: new Date().toISOString()
            }));

        } catch (error) {
            console.error("❌ Dashboard metrics error:", error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    // Get dashboard overview (LEGACY - kept for backward compatibility)
    async getDashboard(req, res) {
        try {
            console.log("📊 Getting dashboard overview (legacy)...");

            // Collect data from models
            const totalProducts = this.models.Shoe ?
                await this.models.Shoe.countAll() : 0;
            const totalOrders = this.models.Order ?
                await this.models.Order.countAll() : 0;
            const lowStockVariants = this.models.ShoeVariant ?
                await this.models.ShoeVariant.getLowStockCount() : 0;
            const totalRevenue = this.models.Payment ?
                await this.models.Payment.calculateTotalRevenue() : 0;

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
                        await this.models.Category.countAll() : 0,
                    totalVariants: this.models.ShoeVariant ?
                        await this.models.ShoeVariant.countAll() : 0,
                    pendingOrders: this.models.Order ?
                        await this.models.Order.countPending() : 0
                },
                recentActivity: {
                    recentOrders: this.models.Order ?
                        await this.models.Order.getRecent(5) : [],
                    topSellingProducts: this.models.OrderItem ?
                        await this.models.OrderItem.getTopSellingProducts(5) : []
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
