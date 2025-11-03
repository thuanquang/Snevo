// frontend/assets/js/admin/AdminCore.js
/**
 * AdminCore - Core functionality for admin manager
 * Handles initialization, API waiting, and data loading
 */
class AdminCore {
    constructor() {
        this.api = window.productsAPI;
        
        // ⭐ Initialize AdminAPI early (will work after AdminAPI is loaded)
        this.adminAPI = null;
        
        // Data State
        this.shoes = [];
        this.allShoes = [];
        this.variants = [];
        this.categories = [];
        this.colors = [];
        this.sizes = [];
        
        // UI State
        this.currentShoe = null;
        this.currentVariants = [];
        
        // Import State
        this.importState = {
            shoeId: null,
            variants: [],
            selectedVariants: new Set(),
            importData: [],
        };
        
        console.log("✅ AdminCore initialized");
    }
    
    /**
     * ⭐ Initialize AdminAPI (lazy initialization)
     */
    ensureAdminAPI() {
        if (!this.adminAPI && window.AdminAPI && this.api?.client) {
            this.adminAPI = new window.AdminAPI(this.api.client);
            console.log("✅ AdminAPI initialized");
        }
        return this.adminAPI;
    }
    
    /**
     * Wait for productsAPI to be available
     */
    async waitForAPI() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.productsAPI) {
                    this.api = window.productsAPI;
                    clearInterval(check);
                    console.log("✅ API loaded");
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 5000);
        });
    }
    
    /**
     * Load all shoes
     */
    async loadShoes() {
        try {
            console.log("🔄 Loading ALL shoes...");
            const response = await this.api.getProducts({
                include_no_variants: "true",
                limit: 100,
                page: 1,
            });
            
            if (response?.success) {
                this.allShoes = response.data || [];
                this.shoes = [...this.allShoes];
                console.log(`✅ Loaded ${this.shoes.length} shoes`);
            } else {
                this.allShoes = [];
                this.shoes = [];
            }
        } catch (error) {
            console.error("❌ Load shoes error:", error);
            this.allShoes = [];
            this.shoes = [];
        }
    }
    
    /**
     * Load all categories
     */
    async loadCategories() {
        try {
            console.log("🔄 Loading categories...");
            const response = await this.api.getCategories({});
            
            if (response.success) {
                this.categories = response.data || [];
                console.log(`✅ Loaded ${this.categories.length} categories`);
                
                this.categories.forEach((cat) => {
                    console.log(
                        `📊 ${cat.category_name}: ${cat.product_count || 0} products`
                    );
                });
            } else {
                console.error("❌ Categories load failed:", response);
                this.categories = [];
            }
        } catch (error) {
            console.error("❌ Error loading categories:", error);
            this.categories = [];
        }
    }
    
    /**
     * Load colors (for variant display)
     */
    async loadColors() {
        try {
            const response = await this.api.getColors();
            if (response?.success) {
                this.colors = response.data || [];
            }
        } catch (error) {
            console.error("❌ Load colors error:", error);
        }
    }
    
    /**
     * Load sizes (for variant display)
     */
    async loadSizes() {
        try {
            const response = await this.api.getSizes();
            if (response?.success) {
                this.sizes = response.data || [];
            }
        } catch (error) {
            console.error("❌ Load sizes error:", error);
        }
    }
    
    /**
     * Load dashboard data from admin API
     */
    async loadDashboardData() {
        try {
            console.log("📊 Loading dashboard data...");

            // ⭐ Ensure AdminAPI is initialized
            if (!this.ensureAdminAPI()) {
                console.warn("⚠️ AdminAPI not available yet");
                return null;
            }

            // Fetch dashboard data
            const dashboardData = await this.adminAPI.getDashboard();

            console.log("✅ Dashboard data loaded:", dashboardData);
            return dashboardData;

        } catch (error) {
            console.error("❌ Error loading dashboard:", error);
            return null;
        }
    }

    /**
     * Store dashboard data in state
     */
    updateDashboardState(data) {
        this.dashboardData = data;
        console.log("✅ Dashboard state updated");
    }
    
    /**
     * Update statistics display
     */
    updateStats() {
        console.log("📊 Stats:", {
            shoes: this.shoes.length,
            categories: this.categories.length,
            colors: this.colors.length,
            sizes: this.sizes.length
        });
    }
}
