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
