// frontend/assets/js/AdminManager.js

/**
 * AdminManager - Admin Inventory Management
 * Responsibilities:
 * - Load and display shoes with total stock
 * - Load and display categories
 * - Handle modal popup for variant details
 * - Calculate stock from variants
 * - CRUD operations (placeholders)
 */
class AdminManager {
    constructor() {
        this.api = window.productsAPI;
        
        // Data State
        this.shoes = [];
        this.allShoes = []; // ⭐ Store original unsorted data
        this.variants = [];
        this.categories = [];
        this.colors = [];
        this.sizes = [];
        
        // UI State
        this.currentShoe = null;
        this.currentVariants = [];
        
       
        console.log('✅ AdminManager initialized');
    }

    /**
     * Initialize AdminManager
     */
    async init() {
        try {
            console.log('🔄 Initializing AdminManager...');
            
            // Wait for API
            if (!this.api) {
                await this.waitForAPI();
            }           
            // Load all data in parallel
            await Promise.all([
                this.loadShoes(),               
                this.loadCategories(),
                this.loadColors(),
                this.loadSizes()
            ]);
            // Auto-sort by stock_desc after loading
            this.applySortByStock();
            console.log('✅ AdminManager initialized successfully');
        } catch (error) {
            console.error('❌ Init error:', error);
            this.showError('Failed to load admin data');
        }
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
                    console.log('✅ API loaded');
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 5000);
        });
    }

    // ========================================
    // DATA LOADING METHODS
    // ========================================

    /**
     * Load all shoes
     */
    async loadShoes() {
        try {
            console.log('🔄 Loading ALL shoes...');
            
            const response = await this.api.getProducts({
                include_no_variants: 'true',
                limit: 100,
                page: 1
            });
            
            if (response?.success) {
                this.allShoes = response.data || [];
                this.shoes = [...this.allShoes]; // Copy for sorting
                console.log(`✅ Loaded ${this.shoes.length} shoes`);
            } else {
                this.allShoes = [];
                this.shoes = [];
            }
            
            this.renderShoesTable();
            this.updateStats();
        } catch (error) {
            console.error('❌ Load shoes error:', error);
            this.allShoes = [];
            this.shoes = [];
            this.renderShoesTable();
        }
    }

    // Apply default sort after loading
    applySortByStock() {
        console.log('📊 Applying default sort: stock_desc');
        
        this.shoes = [...this.allShoes];
        this.shoes.sort((a, b) => {
            const stockA = a.stock_info?.total_stock || 0;
            const stockB = b.stock_info?.total_stock || 0;
            return stockB - stockA; // High to Low
        });
        
        this.renderShoesTable();
    }
    //Sort handler
    handleSort() {
        const sortValue = document.getElementById('sortSelect').value;
        console.log('📊 Sorting by:', sortValue);
        
        if (!sortValue) {
            // Reset to original order
            this.shoes = [...this.allShoes];
            this.renderShoesTable();
            return;
        }
        
        // Clone array for sorting
        this.shoes = [...this.allShoes];
        
        switch(sortValue) {
            case 'stock_desc':
                this.shoes.sort((a, b) => {
                    const stockA = a.stock_info?.total_stock || 0;
                    const stockB = b.stock_info?.total_stock || 0;
                    return stockB - stockA;
                });
                break;
                
            case 'stock_asc':
                this.shoes.sort((a, b) => {
                    const stockA = a.stock_info?.total_stock || 0;
                    const stockB = b.stock_info?.total_stock || 0;
                    return stockA - stockB;
                });
                break;
                
            case 'name_asc':
                this.shoes.sort((a, b) => {
                    const nameA = (a.shoe_name || '').toLowerCase();
                    const nameB = (b.shoe_name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                break;
                
            case 'name_desc':
                this.shoes.sort((a, b) => {
                    const nameA = (a.shoe_name || '').toLowerCase();
                    const nameB = (b.shoe_name || '').toLowerCase();
                    return nameB.localeCompare(nameA);
                });
                break;
                
            case 'price_asc':
                this.shoes.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
                break;
                
            case 'price_desc':
                this.shoes.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
                break;
        }
        
        console.log('✅ Sorted:', this.shoes.length, 'products');
        this.renderShoesTable();
    }
    updateStats() {
        const totalShoesEl = document.getElementById('totalShoes');
        const totalCategoriesEl = document.getElementById('totalCategories');
        const totalColorsEl = document.getElementById('totalColors');
        const totalSizesEl = document.getElementById('totalSizes');
        
        if (totalShoesEl) {
            totalShoesEl.textContent = this.shoes.length;
        }
        
        if (totalCategoriesEl) {
            totalCategoriesEl.textContent = this.categories.length;
        }
        
        if (totalColorsEl) {
            totalColorsEl.textContent = this.colors.length;
        }
        
        if (totalSizesEl) {
            totalSizesEl.textContent = this.sizes.length;
        }
    }
    /**
     * Load all categories
     */
    async loadCategories() {
        try {
        console.log('🔄 Loading categories...');
        
        // ⭐ FIX: Don't filter by active_only, let backend handle
        const response = await this.api.getCategories({ 
            // active_only: true // ❌ Remove this
        });
        
        if (response.success) {
            this.categories = response.data || [];
            console.log(`✅ Loaded ${this.categories.length} categories`);
            
            // DEBUG: Log all categories with counts
            this.categories.forEach(cat => {
                console.log(`📊 ${cat.category_name}: ${cat.product_count || 0} products`);
            });
        } else {
            console.error('❌ Categories load failed:', response);
            this.categories = [];
        }
        
        this.renderCategoriesTable();
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        this.categories = [];
        this.renderCategoriesTable();
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
            console.error('❌ Load colors error:', error);
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
            console.error('❌ Load sizes error:', error);
        }
    }

    // ========================================
    // RENDERING METHODS - SHOES TABLE
    // ========================================

    /**
     * Render Shoes Table with Total Stock
     */
    renderShoesTable() {
        const container = document.getElementById('shoesTableContainer');
        if (!container) return;

        if (!this.shoes || this.shoes.length === 0) {
            container.innerHTML = this.renderEmptyState('No shoes found', 'shoe-prints');
            return;
        }

        container.innerHTML = `
            <div class="data-table">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Total Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.shoes.map(shoe => this.renderShoeRow(shoe)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Render single shoe row - CLICKABLE
     */
    renderShoeRow(shoe) {
        const category = this.categories.find(c => c.category_id === shoe.category_id);
        
        // ⭐ Handle shoes without variants
        const totalStock = shoe.stock_info?.total_stock || 0;
        const variantCount = shoe.stock_info?.variant_count || 0;
        
        let stockBadge = '';
        if (totalStock > 20) {
            stockBadge = `<span class="badge bg-success">${totalStock} units</span>`;
        } else if (totalStock > 0) {
            stockBadge = `<span class="badge bg-warning text-dark">${totalStock} units</span>`;
        } else {
            // ⭐ Shoes WITHOUT variants
            stockBadge = `<span class="badge bg-secondary">No variants yet</span>`;
        }

        let variantBadge = '';
        if (variantCount > 0) {
            variantBadge = `<span class="badge bg-info">${variantCount} variants</span>`;
        } else {
            // ⭐ Warning for shoes without variants
            variantBadge = `<span class="badge bg-warning text-dark">⚠️ 0 variants</span>`;
        }

        return `
            <tr onclick="adminManager.viewShoeDetail(${shoe.shoe_id})" style="cursor: pointer;">
                <td>
                    <img src="${shoe.image_url}" 
                        alt="${shoe.shoe_name}" 
                        class="product-img"
                        >
                </td>
                <td><strong>${shoe.shoe_name || 'N/A'}</strong></td>
                <td>${category?.category_name || 'N/A'}</td>
                <td><strong>${this.formatPrice(shoe.base_price)}</strong></td>
                <td>${stockBadge}</td>
                
                <td>${shoe.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
                <td onclick="event.stopPropagation()">
                    <button class="btn-action" onclick="adminManager.editShoe(${shoe.shoe_id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action text-success" onclick="adminManager.addVariant(${shoe.shoe_id})" title="Add Variant">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Calculate total stock for a shoe
     */
    calculateTotalStock(shoeId) {
        return this.variants
            .filter(v => v.shoe_id === shoeId)
            .reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
    }

    // ========================================
    // MODAL - VARIANT DETAILS VIEW
    // ========================================

    /**
     * View shoe detail in modal
     */
    async viewShoeDetail(shoeId) {
        try {
            console.log(`🔍 Viewing shoe: ${shoeId}`);
            
            this.currentShoe = this.shoes.find(s => s.shoe_id === shoeId);
            if (!this.currentShoe) return;
            
            // Show modal with loading
            this.showDetailModal();
            
            // Load variants for this shoe
            const response = await this.api.getProductVariants(shoeId);
            
            if (response?.success) {
                this.currentVariants = response.data || [];
                console.log(`✅ Loaded ${this.currentVariants.length} variants`);
            } else {
                this.currentVariants = [];
            }
            
            this.renderVariantDetails();
        } catch (error) {
            console.error('❌ View detail error:', error);
            this.showError('Failed to load variants');
        }
    }

    /**
     * Show modal
     */
    showDetailModal() {
        // Create modal if not exists
        if (!document.getElementById('shoeDetailModal')) {
            const modalHTML = `
                <div class="modal fade" id="shoeDetailModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="fas fa-shoe-prints"></i> Loading...
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="variantDetailContent">
                                <div class="loading-container">
                                    <div class="spinner-border text-dark"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        
        // Update title
        document.getElementById('modalTitle').innerHTML = `
            <i class="fas fa-shoe-prints"></i> ${this.currentShoe.shoe_name} - Variant Details
        `;
        
        // Show loading
        document.getElementById('variantDetailContent').innerHTML = `
            <div class="loading-container">
                <div class="spinner-border text-dark"></div>
            </div>
        `;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('shoeDetailModal'));
        modal.show();
    }

    /**
     * Render variant details in modal
     */
    renderVariantDetails() {
        const container = document.getElementById('variantDetailContent');
        if (!container) return;
        
        const category = this.categories.find(c => c.category_id === this.currentShoe.category_id);
        const totalStock = this.currentVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
        
        if (!this.currentVariants || this.currentVariants.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No Variants Found</h3>
                    <p>This shoe has no variants yet.</p>
                    <button class="btn btn-primary-custom" onclick="adminManager.addVariant()">
                        <i class="fas fa-plus"></i> Add First Variant
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <!-- Shoe Info -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <img src="${this.currentShoe.image_url }" 
                         class="img-fluid rounded" 
                         alt="${this.currentShoe.shoe_name}"
                         >
                </div>
                <div class="col-md-8">
                    <h3>${this.currentShoe.shoe_name}</h3>
                    <p class="text-muted">${this.currentShoe.description || 'No description'}</p>
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <p><strong>Base Price:</strong> ${this.formatPrice(this.currentShoe.base_price)}</p>
                            <p><strong>Category:</strong> ${category?.category_name || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <p>
                                <strong>Total Stock:</strong> 
                                <span class="badge ${totalStock > 20 ? 'bg-success' : totalStock > 0 ? 'bg-warning' : 'bg-danger'} fs-5">
                                    ${totalStock} units
                                </span>
                            </p>
                            <p><strong>Variants:</strong> ${this.currentVariants.length}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <hr>
            
            <!-- Variants Table -->
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4><i class="fas fa-palette"></i> Available Variants</h4>
                <button class="btn btn-primary-custom" onclick="adminManager.addVariant()">
                    <i class="fas fa-plus"></i> Add Variant
                </button>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Color</th>
                            <th>Size</th>
                            <th>Stock</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentVariants.map(v => this.renderVariantDetailRow(v)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Render single variant row in modal
     */
    renderVariantDetailRow(variant) {
        const color = variant.colors || {};
        const size = variant.sizes || {};
        
        let stockBadge = '';
        if (variant.stock_quantity > 10) {
            stockBadge = `<span class="badge bg-success fs-6">${variant.stock_quantity}</span>`;
        } else if (variant.stock_quantity > 0) {
            stockBadge = `<span class="badge bg-warning text-dark fs-6">${variant.stock_quantity}</span>`;
        } else {
            stockBadge = `<span class="badge bg-danger fs-6">0</span>`;
        }
        
        return `
            <tr>
                <td><code>${variant.sku || 'N/A'}</code></td>
                <td>
                    ${color.hex_code ? `
                        <span class="d-inline-block" style="
                            width: 24px; 
                            height: 24px; 
                            background: ${color.hex_code}; 
                            border-radius: 50%; 
                            border: 2px solid #ddd; 
                            vertical-align: middle; 
                            margin-right: 8px;
                        "></span>
                    ` : ''}
                    ${color.color_name || 'N/A'}
                </td>
                <td><strong>${size.size_value || 'N/A'}</strong></td>
                <td>${stockBadge}</td>
                <td><strong>${this.formatPrice(variant.variant_price || 0)}</strong></td>
                <td>${variant.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
                <td>
                    <button class="btn-action" onclick="adminManager.editVariant(${variant.variant_id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action text-danger" onclick="adminManager.deleteVariant(${variant.variant_id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    // ========================================
    // RENDERING METHODS - CATEGORIES TABLE
    // ========================================

    /**
     * Render Categories Table
     */
    renderCategoriesTable() {
        const container = document.getElementById('categoriesTableContainer');
        if (!container) return;

        if (!this.categories || this.categories.length === 0) {
            container.innerHTML = this.renderEmptyState('No categories found', 'tags');
            return;
        }

        container.innerHTML = `
            <div class="data-table">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Category Name</th>
                            <th>Description</th>
                            <th>Products</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.categories.map(category => this.renderCategoryRow(category)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

   renderCategoryRow(category) {
        // ⭐ FIX: Try multiple possible fields
        const productCount = category.product_count 
            || category.shoes_count 
            || category.shoe_count 
            || (category.shoes?.length) 
            || 0;
        
        console.log('Category:', category.category_name, 'Count:', productCount); // DEBUG
        
        return `
            <tr>
                <td>
                    <img src="${category.image_url }" 
                        alt="${category.category_name}" 
                        class="product-img"
                       >
                </td>
                <td><strong>${category.category_name || 'N/A'}</strong></td>
                <td>${category.description ? category.description.substring(0, 60) + '...' : 'No description'}</td>
                <td><span class="badge bg-primary fs-6">${productCount} products</span></td>
                <td>${category.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
                <td>
                    <button class="btn-action" onclick="adminManager.editCategory(${category.category_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    // ========================================
    // UTILITY METHODS
    // ========================================

    renderEmptyState(message, icon) {
        return `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <h3>${message}</h3>
                <p>Click "Add" button to create new item</p>
            </div>
        `;
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price || 0);
    }

    showError(message) {
        alert(`Error: ${message}`);
    }

    // ========================================
    // CRUD OPERATIONS (Placeholders)
    // ========================================

    addShoe() {
        alert('Add Shoe - Coming soon!');
    }

    editShoe(shoeId) {
        alert(`Edit Shoe ${shoeId} - Coming soon!`);
    }

    deleteShoe(shoeId) {
        if (confirm('Delete this shoe?')) {
            alert(`Delete Shoe ${shoeId} - Coming soon!`);
        }
    }

    addVariant() {
        alert('Add Variant - Coming soon!');
    }

    editVariant(variantId) {
        alert(`Edit Variant ${variantId} - Coming soon!`);
    }

    deleteVariant(variantId) {
        if (confirm('Delete this variant?')) {
            alert(`Delete Variant ${variantId} - Coming soon!`);
        }
    }

    addCategory() {
        alert('Add Category - Coming soon!');
    }

    editCategory(categoryId) {
        alert(`Edit Category ${categoryId} - Coming soon!`);
    }

    deleteCategory(categoryId) {
        if (confirm('Delete this category?')) {
            alert(`Delete Category ${categoryId} - Coming soon!`);
        }
    }
}

// Initialize global instance
window.adminManager = new AdminManager();
console.log('✅ AdminManager loaded');
