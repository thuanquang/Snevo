// frontend/assets/js/admin/AdminManager.js

/**
 * AdminManager - Main orchestrator
 * Combines all admin modules
 */
class AdminManager {
    constructor() {
        // Initialize core
        this.core = new AdminCore();
        
        // Initialize modules
        this.productRenderer = new AdminProductRenderer(this.core);
        this.variantRenderer = new AdminVariantRenderer(this.core, this.productRenderer);
        this.categoryManager = new AdminCategory(this.core, this.productRenderer);
        this.importManager = new AdminImport(this.core, this.productRenderer);
        this.importHistoryManager = new AdminImportHistory(this.core, this.productRenderer);
        this.variantGenerator = new AdminVariantGenerator(this.core, this.productRenderer);
        this.actions = new AdminActions(this.core);
        
        console.log("✅ AdminManager initialized");
    }
    
    /**
     * Initialize AdminManager
     */
    async init() {
        try {
            console.log("🔄 Initializing AdminManager...");
            
            // Wait for API
            if (!this.core.api) {
                await this.core.waitForAPI();
            }
            
            // Load all data in parallel
            await Promise.all([
                this.core.loadShoes(),
                this.core.loadCategories(),
                this.core.loadColors(),
                this.core.loadSizes(),
            ]);
            
            // Render initial data
            this.productRenderer.applySortByStock();
            this.categoryManager.renderCategoriesTable();
            this.core.updateStats();
            
            // Setup event listeners (ONLY ONCE)
            this.setupEventListeners();
            
            console.log("✅ AdminManager initialized successfully");
        } catch (error) {
            console.error("❌ Init error:", error);
            AdminUtils.showError("Failed to load admin data");
        }
    }
    setupEventListeners() {
        // ✅ Check if already setup
        if (this._listenersSetup) {
            console.log("⚠️ Event listeners already setup, skipping...");
            return;
        }
        
        // Setup utils
        AdminUtils.setupLogoutButton();
        this.importHistoryManager.setupImportHistoryTabListener();
        this.importManager.setupImportButtonListeners();
        this.variantGenerator.setupVariantGeneratorListeners();
        
        // Setup sort handler
        const sortSelect = document.getElementById("sortSelect");
        if (sortSelect) {
            sortSelect.addEventListener("change", () => this.productRenderer.handleSort());
        }
        
        // ✅ FIXED: Setup "Select All Variants" checkbox with flag check
        const selectAllCheckbox = document.getElementById("selectAllVariants");
        if (selectAllCheckbox) {
            // Remove old listener if exists
            selectAllCheckbox.removeEventListener("change", this._selectAllHandler);
            
            // Create new handler and store reference
            this._selectAllHandler = (e) => {
                this.toggleAllVariants(e.target.checked);
            };
            
            selectAllCheckbox.addEventListener("change", this._selectAllHandler);
        }
        
        // ✅ FIXED: Setup "Submit Import" button with flag check
        const submitBtn = document.getElementById("submitImportBtn");
        if (submitBtn) {
            // Remove old listener if exists
            submitBtn.removeEventListener("click", this._submitImportHandler);
            
            // Create new handler and store reference
            this._submitImportHandler = () => {
                this.submitBatchImport();
            };
            
            submitBtn.addEventListener("click", this._submitImportHandler);
        }
        
        // ✅ Mark as setup
        this._listenersSetup = true;
        console.log("✅ Event listeners setup complete");
    }
    
    // ==================== DELEGATE METHODS ====================
    
    // Product & Variant Display
    viewShoeDetails(shoeId) {
        return this.variantRenderer.viewShoeDetails(shoeId);
    }
    
    // Import Management
    handleImport(shoeId) {
        return this.importManager.handleImport(shoeId);
    }
    
    // ✅ ADDED: Delegate to importManager
    handleVariantCheckbox(variantId, checked) {
        return this.importManager.handleVariantCheckbox(variantId, checked);
    }
    
    // ✅ ADDED: Delegate to importManager
    toggleAllVariants(checked) {
        return this.importManager.toggleAllVariants(checked);
    }
    
    // ✅ ADDED: Delegate to importManager
    updateImportSummary() {
        return this.importManager.updateImportSummary();
    }
    
    // ✅ ADDED: Delegate to importManager
    submitBatchImport() {
        return this.importManager.submitBatchImport();
    }
    
    // ✅ ADDED: Delegate to variantGenerator
    updateGeneratorCounts() {
        return this.variantGenerator.updateGeneratorCounts();
    }
    
    // Legacy methods (kept for backward compatibility)
    toggleVariantSelection(variantId) {
        console.warn("⚠️ toggleVariantSelection is deprecated, use handleVariantCheckbox");
        const checkbox = document.querySelector(`[data-variant-id="${variantId}"]`);
        if (checkbox) {
            return this.handleVariantCheckbox(variantId, checkbox.checked);
        }
    }
    
    updateImportQuantity(variantId, quantity) {
        return this.updateImportSummary();
    }
    
    updateImportPrice(variantId, price) {
        return this.updateImportSummary();
    }
    
    submitImport() {
        console.warn("⚠️ submitImport is deprecated, use submitBatchImport");
        return this.submitBatchImport();
    }
    
    // CRUD Actions
    editShoe(shoeId) {
        return this.actions.editShoe(shoeId);
    }
    
    deleteShoe(shoeId) {
        return this.actions.deleteShoe(shoeId);
    }
    
    editVariant(variantId) {
        return this.actions.editVariant(variantId);
    }
    
    deleteVariant(variantId) {
        return this.actions.deleteVariant(variantId);
    }
    
    editCategory(categoryId) {
        return this.actions.editCategory(categoryId);
    }
    
    deleteCategory(categoryId) {
        return this.actions.deleteCategory(categoryId);
    }
    
    // Variant Generator (if needed in HTML)
    openVariantGenerator(shoe) {
        this.core.currentShoe = shoe;
        return this.variantGenerator.openVariantGenerator(shoe);
    }
    
    // ✅ ADDED: Toast notification delegate
    showToast(title, message, type = "info") {
        AdminUtils.showToast(title, message, type);
    }
    
    // Utility Methods
    showError(message) {
        AdminUtils.showError(message);
    }
    
    showSuccess(message) {
        AdminUtils.showSuccess(message);
    }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", async () => {
    window.adminManager = new AdminManager();
    await window.adminManager.init();
});
