/**
 * AdminAPI - Admin Dashboard API Wrapper
 * Handles all /api/admin/* requests with authentication
 */
class AdminAPI {
    constructor(apiClient) {
        this.client = apiClient;
        console.log("✅ AdminAPI initialized");
    }

    /**
     * Get authentication token from Supabase session
     */
    async getAuthToken() {
        try {
            if (!window.authService || !window.authService.supabase) {
                console.warn("⚠️ AuthService not available");
                return null;
            }

            const { data } = await window.authService.supabase.auth.getSession();
            const token = data?.session?.access_token;

            if (!token) {
                console.warn("⚠️ No auth token available");
                return null;
            }

            console.log("🔑 Auth token obtained");
            return token;
        } catch (error) {
            console.error("❌ Error getting auth token:", error);
            return null;
        }
    }

    /**
     * Get headers with auth token
     */
    async getAuthHeaders() {
        const token = await this.getAuthToken();
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Get dashboard overview (LEGACY)
     * Returns: { summary, stats, recentActivity }
     */
    async getDashboard() {
        try {
            console.log("📊 Fetching dashboard data...");

            const headers = await this.getAuthHeaders();
            const response = await this.client.get("/api/admin", {}, { headers });

            console.log("📊 Dashboard response:", response);

            // ApiClient returns { data, status, statusText, headers, config }
            const dashboardData = response?.data;

            if (dashboardData?.success) {
                console.log("✅ Dashboard data:", dashboardData.data);
                return dashboardData.data;
            } else {
                console.error("❌ Dashboard fetch failed:", dashboardData?.error || "Unknown error");
                return this.getDefaultDashboard();
            }
        } catch (error) {
            console.error("❌ Dashboard API error:", error);
            return this.getDefaultDashboard();
        }
    }

    /**
     * ⭐ Get enhanced dashboard metrics with 30-day analytics
     * Returns: { totalMetrics, topSelling: { period, startDate, endDate, products } }
     */
    async getDashboardMetrics() {
        try {
            console.log("📊 Fetching enhanced dashboard metrics...");

            const headers = await this.getAuthHeaders();
            const response = await this.client.get("/api/admin/metrics", {}, { headers });

            console.log("📊 Dashboard metrics response:", response);

            const metricsData = response?.data;

            if (metricsData?.success) {
                console.log("✅ Dashboard metrics:", metricsData.data);
                return metricsData.data;
            } else {
                console.error("❌ Metrics fetch failed:", metricsData?.error || "Unknown error");
                return this.getDefaultMetrics();
            }
        } catch (error) {
            console.error("❌ Dashboard metrics API error:", error);
            return this.getDefaultMetrics();
        }
    }

    /**
     * ⭐ Get default metrics structure (fallback)
     */
    getDefaultMetrics() {
        return {
            totalMetrics: {
                totalShoes: 0,
                totalVariants: 0,
                totalOrders: 0,
                lowStockItems: 0,
                totalRevenue: 0,
                pendingOrders: 0,
                approvedOrders: 0,
                cancelledOrders: 0
            },
            topSelling: {
                period: '30_days',
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString(),
                products: []
            }
        };
    }

    /**
     * Get detailed statistics
     */
    async getStatistics() {
        try {
            console.log("📈 Fetching statistics...");

            const headers = await this.getAuthHeaders();
            const response = await this.client.get("/api/admin/statistics", {}, { headers });

            const statsData = response?.data;
            return statsData?.success ? statsData.data : {};
        } catch (error) {
            console.error("❌ Statistics API error:", error);
            return {};
        }
    }

    /**
     * Get user management data
     */
    async getUserManagement() {
        try {
            console.log("👥 Fetching user management data...");

            const headers = await this.getAuthHeaders();
            const response = await this.client.get("/api/admin/users", {}, { headers });

            const userData = response?.data;
            return userData?.success ? userData.data : {};
        } catch (error) {
            console.error("❌ User management API error:", error);
            return {};
        }
    }

    /**
     * Get inventory management data
     */
    async getInventoryManagement() {
        try {
            console.log("📦 Fetching inventory management data...");

            const headers = await this.getAuthHeaders();
            const response = await this.client.get("/api/admin/inventory", {}, { headers });

            const invData = response?.data;
            return invData?.success ? invData.data : {};
        } catch (error) {
            console.error("❌ Inventory management API error:", error);
            return {};
        }
    }

    /**
     * Get order management data
     */
    async getOrderManagement() {
        try {
            console.log("📋 Fetching order management data...");

            const headers = await this.getAuthHeaders();
            const response = await this.client.get("/api/admin/orders", {}, { headers });

            const orderData = response?.data;
            return orderData?.success ? orderData.data : {};
        } catch (error) {
            console.error("❌ Order management API error:", error);
            return {};
        }
    }

    /**
     * Default dashboard data when API fails
     */
    getDefaultDashboard() {
        return {
            summary: {
                totalProducts: 0,
                totalOrders: 0,
                lowStockItems: 0,
                totalRevenue: "0.00"
            },
            stats: {
                activeCategories: 0,
                totalVariants: 0,
                pendingOrders: 0
            },
            recentActivity: {
                recentOrders: [],
                topSellingProducts: []
            }
        };
    }
}

// Make available globally
window.AdminAPI = AdminAPI;
