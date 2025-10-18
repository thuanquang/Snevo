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
    /**
     * State for import workflow
     */
    this.importState = {
      shoeId: null,
      variants: [],
      selectedVariants: new Set(),
      importData: [],
    };
    console.log("✅ AdminManager initialized");
  }

  /**
   * Initialize AdminManager
   */
  async init() {
    try {
      console.log("🔄 Initializing AdminManager...");

      // Wait for API
      if (!this.api) {
        await this.waitForAPI();
      }
      // Load all data in parallel
      await Promise.all([
        this.loadShoes(),
        this.loadCategories(),
        this.loadColors(),
        this.loadSizes(),
      ]);
      // Auto-sort by stock_desc after loading
      this.applySortByStock();
      // Setup Logout button
      this.setupLogoutButton();
      //Import History Tab Listener
      this.setupImportHistoryTabListener();
      //Setup Import Button Listeners
      this.setupImportButtonListeners();
      // ⭐ Setup variant generator listeners
      this.setupVariantGeneratorListeners();

      console.log("✅ AdminManager initialized successfully");
    } catch (error) {
      console.error("❌ Init error:", error);
      this.showError("Failed to load admin data");
    }
  }
  setupImportButtonListeners() {
    // Event delegation - lắng nghe clicks trên container
    const container = document.getElementById("shoesTableContainer");
    if (container) {
      container.addEventListener("click", (e) => {
        // Check if clicked element is import button
        const importBtn = e.target.closest(".import-btn");
        if (importBtn) {
          const shoeId = parseInt(importBtn.dataset.shoeId);
          console.log("📦 Import button clicked for shoe:", shoeId);
          this.handleImport(shoeId);
        }
      });
    }
  }
  setupImportHistoryTabListener() {
    const historyTab = document.getElementById("import-history-tab");
    if (historyTab) {
      historyTab.addEventListener("shown.bs.tab", () => {
        this.loadImportHistory();
      });
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

  // ========================================
  // DATA LOADING METHODS
  // ========================================

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
        this.shoes = [...this.allShoes]; // Copy for sorting
        console.log(`✅ Loaded ${this.shoes.length} shoes`);
      } else {
        this.allShoes = [];
        this.shoes = [];
      }

      this.renderShoesTable();
      this.updateStats();
    } catch (error) {
      console.error("❌ Load shoes error:", error);
      this.allShoes = [];
      this.shoes = [];
      this.renderShoesTable();
    }
  }

  // Apply default sort after loading
  applySortByStock() {
    console.log("📊 Applying default sort: stock_desc");

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
    const sortValue = document.getElementById("sortSelect").value;
    console.log("📊 Sorting by:", sortValue);

    if (!sortValue) {
      // Reset to original order
      this.shoes = [...this.allShoes];
      this.renderShoesTable();
      return;
    }

    // Clone array for sorting
    this.shoes = [...this.allShoes];

    switch (sortValue) {
      case "stock_desc":
        this.shoes.sort((a, b) => {
          const stockA = a.stock_info?.total_stock || 0;
          const stockB = b.stock_info?.total_stock || 0;
          return stockB - stockA;
        });
        break;

      case "stock_asc":
        this.shoes.sort((a, b) => {
          const stockA = a.stock_info?.total_stock || 0;
          const stockB = b.stock_info?.total_stock || 0;
          return stockA - stockB;
        });
        break;

      case "name_asc":
        this.shoes.sort((a, b) => {
          const nameA = (a.shoe_name || "").toLowerCase();
          const nameB = (b.shoe_name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;

      case "name_desc":
        this.shoes.sort((a, b) => {
          const nameA = (a.shoe_name || "").toLowerCase();
          const nameB = (b.shoe_name || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
        break;

      case "price_asc":
        this.shoes.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
        break;

      case "price_desc":
        this.shoes.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
        break;
    }

    console.log("✅ Sorted:", this.shoes.length, "products");
    this.renderShoesTable();
  }
  updateStats() {
    const totalShoesEl = document.getElementById("totalShoes");
    const totalCategoriesEl = document.getElementById("totalCategories");
    const totalColorsEl = document.getElementById("totalColors");
    const totalSizesEl = document.getElementById("totalSizes");

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
      console.log("🔄 Loading categories...");

      // ⭐ FIX: Don't filter by active_only, let backend handle
      const response = await this.api.getCategories({
        // active_only: true // ❌ Remove this
      });

      if (response.success) {
        this.categories = response.data || [];
        console.log(`✅ Loaded ${this.categories.length} categories`);

        // DEBUG: Log all categories with counts
        this.categories.forEach((cat) => {
          console.log(
            `📊 ${cat.category_name}: ${cat.product_count || 0} products`
          );
        });
      } else {
        console.error("❌ Categories load failed:", response);
        this.categories = [];
      }

      this.renderCategoriesTable();
    } catch (error) {
      console.error("❌ Error loading categories:", error);
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

  // ========================================
  // RENDERING METHODS - SHOES TABLE
  // ========================================

  /**
   * Render Shoes Table with Total Stock
   */
  renderShoesTable() {
    const container = document.getElementById("shoesTableContainer");
    if (!container) return;

    if (!this.shoes || this.shoes.length === 0) {
      container.innerHTML = this.renderEmptyState(
        "No shoes found",
        "shoe-prints"
      );
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
                        ${this.shoes
                          .map((shoe) => this.renderShoeRow(shoe))
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  }

  renderShoeRow(shoe) {
    const category = this.categories.find(
      (c) => c.category_id === shoe.category_id
    );

    // ⭐ Handle shoes without variants
    const totalStock = shoe.stock_info?.total_stock || 0;
    const variantCount = shoe.stock_info?.variant_count || 0;

    let stockBadge = "";
    if (totalStock > 20) {
      stockBadge = `<span class="badge bg-success">${totalStock} units</span>`;
    } else if (totalStock > 0) {
      stockBadge = `<span class="badge bg-warning text-dark">${totalStock} units</span>`;
    } else {
      stockBadge = `<span class="badge bg-secondary">No variants yet</span>`;
    }

    let variantBadge = "";
    if (variantCount > 0) {
      variantBadge = `<span class="badge bg-info">${variantCount} variants</span>`;
    } else {
      variantBadge = `<span class="badge bg-warning text-dark">⚠️ 0 variants</span>`;
    }

    return `
            <tr onclick="adminManager.viewShoeDetail(${
              shoe.shoe_id
            })" style="cursor: pointer;">
                <td>
                    <img src="${shoe.image_url}"
                        alt="${shoe.shoe_name}"
                        class="product-img">
                </td>
                <td><strong>${shoe.shoe_name || "N/A"}</strong></td>
                <td>${category?.category_name || "N/A"}</td>
                <td><strong>${this.formatPrice(shoe.base_price)}</strong></td>
                <td>${stockBadge}</td>
                <td>${
                  shoe.is_active
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-secondary">Inactive</span>'
                }</td>
                
                <td onclick="event.stopPropagation()">
                    <!-- Edit Button -->
                    <button class="btn-action" 
                            onclick="adminManager.editShoe(${shoe.shoe_id})" 
                            title="Edit Shoe">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    <!-- ⭐ IMPORT BUTTON (Updated) -->
                    <button class="btn-action text-success import-btn" 
                            onclick="adminManager.handleImport(${
                              shoe.shoe_id
                            })" 
                            title="Import Stock">
                        <i class="fas fa-plus-circle"></i>
                    </button>               
                    <!-- Optional: Add Variant button (if you need separate "add new variant" feature) -->
                    <!-- <button class="btn-action text-primary" 
                            onclick="adminManager.addVariant(${shoe.shoe_id})" 
                            title="Add New Variant">
                        <i class="fas fa-plus-square"></i>
                    </button> -->
                </td>
            </tr>
        `;
  }
  /**
   * Calculate total stock for a shoe
   */
  calculateTotalStock(shoeId) {
    return this.variants
      .filter((v) => v.shoe_id === shoeId)
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

      this.currentShoe = this.shoes.find((s) => s.shoe_id === shoeId);
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
      console.error("❌ View detail error:", error);
      this.showError("Failed to load variants");
    }
  }

  /**
   * Show modal
   */
  showDetailModal() {
    // Create modal if not exists
    if (!document.getElementById("shoeDetailModal")) {
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
      document.body.insertAdjacentHTML("beforeend", modalHTML);
    }

    // Update title
    document.getElementById("modalTitle").innerHTML = `
            <i class="fas fa-shoe-prints"></i> ${this.currentShoe.shoe_name} - Variant Details
        `;

    // Show loading
    document.getElementById("variantDetailContent").innerHTML = `
            <div class="loading-container">
                <div class="spinner-border text-dark"></div>
            </div>
        `;

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("shoeDetailModal")
    );
    modal.show();
  }

  /**
   * Render variant details in modal
   */
  renderVariantDetails() {
    const container = document.getElementById("variantDetailContent");
    if (!container) return;

    const category = this.categories.find(
      (c) => c.category_id === this.currentShoe.category_id
    );
    const totalStock = this.currentVariants.reduce(
      (sum, v) => sum + (v.stock_quantity || 0),
      0
    );

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
                    <img src="${this.currentShoe.image_url}" 
                         class="img-fluid rounded" 
                         alt="${this.currentShoe.shoe_name}"
                         >
                </div>
                <div class="col-md-8">
                    <h3>${this.currentShoe.shoe_name}</h3>
                    <p class="text-muted">${
                      this.currentShoe.description || "No description"
                    }</p>
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <p><strong>Base Price:</strong> ${this.formatPrice(
                              this.currentShoe.base_price
                            )}</p>
                            <p><strong>Category:</strong> ${
                              category?.category_name || "N/A"
                            }</p>
                        </div>
                        <div class="col-md-6">
                            <p>
                                <strong>Total Stock:</strong> 
                                <span class="badge ${
                                  totalStock > 20
                                    ? "bg-success"
                                    : totalStock > 0
                                    ? "bg-warning"
                                    : "bg-danger"
                                } fs-5">
                                    ${totalStock} units
                                </span>
                            </p>
                            <p><strong>Variants:</strong> ${
                              this.currentVariants.length
                            }</p>
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
                        ${this.currentVariants
                          .map((v) => this.renderVariantDetailRow(v))
                          .join("")}
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

    let stockBadge = "";
    if (variant.stock_quantity > 10) {
      stockBadge = `<span class="badge bg-success fs-6">${variant.stock_quantity}</span>`;
    } else if (variant.stock_quantity > 0) {
      stockBadge = `<span class="badge bg-warning text-dark fs-6">${variant.stock_quantity}</span>`;
    } else {
      stockBadge = `<span class="badge bg-danger fs-6">0</span>`;
    }

    return `
            <tr>
                <td><code>${variant.sku || "N/A"}</code></td>
                <td>
                    ${
                      color.hex_code
                        ? `
                        <span class="d-inline-block" style="
                            width: 24px; 
                            height: 24px; 
                            background: ${color.hex_code}; 
                            border-radius: 50%; 
                            border: 2px solid #ddd; 
                            vertical-align: middle; 
                            margin-right: 8px;
                        "></span>
                    `
                        : ""
                    }
                    ${color.color_name || "N/A"}
                </td>
                <td><strong>${size.size_value || "N/A"}</strong></td>
                <td>${stockBadge}</td>
                <td><strong>${this.formatPrice(
                  variant.variant_price || 0
                )}</strong></td>
                <td>${
                  variant.is_active
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-secondary">Inactive</span>'
                }</td>
                <td>
                    <button class="btn-action" onclick="adminManager.editVariant(${
                      variant.variant_id
                    })" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action text-danger" onclick="adminManager.deleteVariant(${
                      variant.variant_id
                    })" title="Delete">
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
    const container = document.getElementById("categoriesTableContainer");
    if (!container) return;

    if (!this.categories || this.categories.length === 0) {
      container.innerHTML = this.renderEmptyState(
        "No categories found",
        "tags"
      );
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
                        ${this.categories
                          .map((category) => this.renderCategoryRow(category))
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  }

  renderCategoryRow(category) {
    // ⭐ FIX: Try multiple possible fields
    const productCount =
      category.product_count ||
      category.shoes_count ||
      category.shoe_count ||
      category.shoes?.length ||
      0;

    console.log("Category:", category.category_name, "Count:", productCount); // DEBUG

    return `
            <tr>
                <td>
                    <img src="${category.image_url}" 
                        alt="${category.category_name}" 
                        class="product-img"
                       >
                </td>
                <td><strong>${category.category_name || "N/A"}</strong></td>
                <td>${
                  category.description
                    ? category.description.substring(0, 60) + "..."
                    : "No description"
                }</td>
                <td><span class="badge bg-primary fs-6">${productCount} products</span></td>
                <td>${
                  category.is_active
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-secondary">Inactive</span>'
                }</td>
                <td>
                    <button class="btn-action" onclick="adminManager.editCategory(${
                      category.category_id
                    })">
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
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  }

  showError(message) {
    alert(`Error: ${message}`);
  }
  // UTILITY METHODS
  showError(message) {
    alert(`Error: ${message}`);
  }

  // ⭐ ADD THESE MISSING METHODS:

  /**
   * Show success notification
   */
  showSuccess(message) {
    // Use Bootstrap Toast for better UX
    this.showToast(message, "success");
  }

  /**
   * Show general notification
   */
  showNotification(message, type = "info") {
    this.showToast(message, type);
  }

  /**
   * Show Bootstrap Toast notification
   */
  showToast(message, type = "info") {
    // Create toast container if not exists
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className =
        "toast-container position-fixed top-0 end-0 p-3";
      toastContainer.style.zIndex = "9999";
      document.body.appendChild(toastContainer);
    }

    // Map type to Bootstrap class
    const typeClasses = {
      success: "bg-success text-white",
      error: "bg-danger text-white",
      warning: "bg-warning text-dark",
      info: "bg-info text-white",
    };

    const bgClass = typeClasses[type] || typeClasses["info"];

    // Create toast element
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
            <div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${
                          type === "success"
                            ? "check-circle"
                            : type === "error"
                            ? "exclamation-circle"
                            : "info-circle"
                        } me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

    toastContainer.insertAdjacentHTML("beforeend", toastHTML);

    // Show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
      animation: true,
      autohide: true,
      delay: 3000, // 3 seconds
    });

    toast.show();

    // Remove toast element after hidden
    toastElement.addEventListener("hidden.bs.toast", () => {
      if (toastElement && toastElement.parentNode) {
        toastElement.remove();
      }
    });
  }

  // ========================================
  // CRUD OPERATIONS (Placeholders)
  // ========================================

  addShoe() {
    alert("Add Shoe - Coming soon!");
  }

  editShoe(shoeId) {
    alert(`Edit Shoe ${shoeId} - Coming soon!`);
  }

  deleteShoe(shoeId) {
    if (confirm("Delete this shoe?")) {
      alert(`Delete Shoe ${shoeId} - Coming soon!`);
    }
  }

  addVariant() {
    alert("Add Variant - Coming soon!");
  }

  editVariant(variantId) {
    alert(`Edit Variant ${variantId} - Coming soon!`);
  }

  deleteVariant(variantId) {
    if (confirm("Delete this variant?")) {
      alert(`Delete Variant ${variantId} - Coming soon!`);
    }
  }

  addCategory() {
    alert("Add Category - Coming soon!");
  }

  editCategory(categoryId) {
    alert(`Edit Category ${categoryId} - Coming soon!`);
  }

  deleteCategory(categoryId) {
    if (confirm("Delete this category?")) {
      alert(`Delete Category ${categoryId} - Coming soon!`);
    }
  }
  // ========================================
  // ⭐⭐⭐ LOGOUT FUNCTIONALITY (COPIED FROM ProfileManager) ⭐⭐⭐
  // ========================================

  /**
   * Setup logout button event listener
   */
  setupLogoutButton() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) {
      console.warn("⚠️ Logout button not found in DOM");
      return;
    }

    console.log("🔧 Setting up logout button for admin");

    logoutBtn.addEventListener("click", () => {
      console.log("🚪 Admin logout button clicked");
      this.handleLogout();
    });
  }

  /**
   * Handle user logout
   */
  async handleLogout() {
    console.log("🚪 Starting admin logout process...");

    // Get logout button and show loading state
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Logging out...';
    }

    try {
      // ⭐ CRITICAL: Clear session data FIRST (before redirect)
      await this.clearAllSessionData();

      // Show success message
      this.showLogoutSuccessToast();

      // Small delay to let user see the message
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Redirect to home page
      console.log("✅ Admin logout complete - redirecting to home");
      window.location.href = "index.html";
    } catch (error) {
      console.error("❌ Admin logout error:", error);
      this.showError("Logout failed. Redirecting anyway...");

      // Force redirect even if logout fails
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    }
  }

  /**
   * Clear all session data (Supabase + localStorage + cookies)
   */
  async clearAllSessionData() {
    console.log("🧹 Clearing all session data for admin...");

    try {
      // ⭐⭐⭐ STEP 1: Sign out from Supabase (MOST IMPORTANT) ⭐⭐⭐
      if (window.authService && window.authService.supabase) {
        console.log("🔐 Signing out from Supabase...");
        const { error } = await window.authService.supabase.auth.signOut();

        if (error) {
          console.error("⚠️ Supabase signOut error:", error);
          // Continue with cleanup even if signOut fails
        } else {
          console.log("✅ Supabase signOut successful");
        }
      } else {
        console.warn("⚠️ AuthService/Supabase not available for signOut");
      }

      // STEP 2: Clear localStorage
      console.log("🧹 Clearing localStorage...");
      const keysToRemove = [
        "authtoken",
        "refreshtoken",
        "user",
        "supabase.auth.token",
        "supabase.auth.refreshToken",
        "supabase.auth.user",
      ];

      keysToRemove.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`  ✓ Removed: ${key}`);
        }
      });

      // STEP 3: Clear all Supabase keys (dynamic)
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          localStorage.removeItem(key);
          console.log(`  ✓ Removed Supabase key: ${key}`);
        }
      });

      // STEP 4: Clear sessionStorage
      console.log("🧹 Clearing sessionStorage...");
      sessionStorage.clear();

      // STEP 5: Clear cookies
      console.log("🧹 Clearing auth cookies...");
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name =
          eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

        if (
          name.includes("auth") ||
          name.includes("sb-") ||
          name.includes("supabase") ||
          name.includes("token")
        ) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          console.log(`  ✓ Cleared cookie: ${name}`);
        }
      });

      // STEP 6: Update AuthManager state
      if (window.authManager) {
        console.log("🔄 Updating AuthManager state...");
        window.authManager.clearAuthData();
        window.authManager.updateAuthUI();
        window.authManager.emit("logout");
      }

      console.log("✅ All session data cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing session data:", error);
      throw error;
    }
  }

  /**
   * Show logout success toast notification
   */
  showLogoutSuccessToast() {
    // Create toast element
    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-white bg-success border-0";
    toast.setAttribute("role", "alert");
    toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check-circle me-2"></i>Logout successful! Redirecting...
                </div>
            </div>
        `;

    // Position toast in center
    toast.style.position = "fixed";
    toast.style.top = "50%";
    toast.style.left = "50%";
    toast.style.transform = "translate(-50%, -50%)";
    toast.style.zIndex = "9999";
    toast.style.minWidth = "300px";

    document.body.appendChild(toast);

    // Show toast
    const bsToast = new bootstrap.Toast(toast, { delay: 2000 });
    bsToast.show();

    // Remove after hidden
    toast.addEventListener("hidden.bs.toast", () => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
  }
  // Add to AdminManager class

  // ======================================
  // IMPORT MANAGEMENT METHODS
  // ======================================

  /**
   * ⭐ Handle Import button click
   */
  async handleImport(shoeId) {
    try {
      console.log("📦 Starting import for shoe:", shoeId);

      // Find shoe
      this.currentShoe = this.shoes.find((s) => s.shoe_id === shoeId);
      if (!this.currentShoe) {
        this.showError("Shoe not found");
        return;
      }

      // Reset import state
      this.importState = {
        shoeId: shoeId,
        currentShoe: this.currentShoe, // ← ADD THIS LINE!
        variants: [],
        selectedVariants: new Set(),
        importData: [],
      };
      const response = await this.api.getProductVariants(shoeId);
      // Load variants
      if (response?.success && response.data) {
          this.importState.variants = response.data;
          console.log(`✅ Loaded ${response.data.length} variants for shoe ${shoeId}`);
      } else {
          this.importState.variants = [];  // Empty array for shoes without variants
          console.log(`ℹ️ No variants yet for shoe ${shoeId}`);
      }

      // Show modal
      this.showImportModal();
    } catch (error) {
      console.error("❌ Import init error:", error);
      this.showError("Failed to initialize import");
    }
  }

  /**
   * Show import modal with data
   */
  showImportModal() {
    // Update shoe info
    document.getElementById("importShoeName").textContent =
      this.currentShoe.shoe_name;
    document.getElementById("importShoeImage").src =
      this.currentShoe.image_url || "/assets/images/placeholder.png";
    document.getElementById("importCurrentStock").textContent =
      this.currentShoe.stock_info?.total_stock || 0;
    document.getElementById("importShoeInfo").textContent = `Product ID: ${
      this.currentShoe.shoe_id
    } | Category: ${this.getCategoryName(this.currentShoe.category_id)}`;

    // Render variants table
    this.renderImportVariantsTable();

    // Reset form
    document.getElementById("importNotes").value = "";
    document.getElementById("selectAllVariants").checked = false;
    this.updateImportSummary();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById("importModal"));
    modal.show();

    // Clear history tab (will load on demand)
    document.getElementById("importHistoryContainer").innerHTML = `
        <p class="text-muted text-center py-4">
            <i class="bi bi-clock-history fs-1 d-block mb-2"></i>
            Switch to this tab to view import history
        </p>
    `;
  }

  /**
   * Render variants table for import
   */
  renderImportVariantsTable() {
    const tbody = document.getElementById("importVariantsTable");

    if (!this.importState.variants || this.importState.variants.length === 0) {
      tbody.innerHTML = `
             <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state-sm">
                        <i class="fas fa-box-open text-muted mb-2" style="font-size: 2rem;"></i>
                        <p class="text-muted mb-3">No variants available yet</p>
                        <button class="btn btn-primary btn-sm" 
                                onclick="adminManager.openVariantGenerator(adminManager.currentShoe)">
                            <i class="fas fa-plus me-2"></i>Add First Variants
                        </button>
                    </div>
                </td>
            </tr>
        `;
      return;
    }

    const html = this.importState.variants
      .map((variant) => {
        const color = this.colors.find((c) => c.color_id === variant.color_id);
        const size = this.sizes.find((s) => s.size_id === variant.size_id);

        return `
            <tr>
                <td>
                    <input type="checkbox" class="form-check-input variant-checkbox" 
                           data-variant-id="${variant.variant_id}"
                           onchange="adminManager.handleVariantCheckbox(${
                             variant.variant_id
                           }, this.checked)">
                </td>
 
                <td>
                    <span class="d-inline-block rounded-circle me-2" 
                          style="width: 20px; height: 20px; background: ${
                            color?.hex_code || "#ccc"
                          }"></span>
                    ${color?.color_name || "N/A"}
                </td>
                <td>${size?.size_value || "N/A"} ${size?.size_type || ""}</td>
                <td><strong>${variant.stock_quantity || 0}</strong></td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           id="qty-${variant.variant_id}" 
                           min="1" value="10" step="1"
                           data-variant-id="${variant.variant_id}"
                           onchange="adminManager.updateImportSummary()">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           id="price-${variant.variant_id}" 
                           min="0" value="${
                             variant.variant_price ||
                             this.currentShoe.base_price ||
                             0
                           }" 
                           step="0.01"
                           data-variant-id="${variant.variant_id}"
                           onchange="adminManager.updateImportSummary()">
                </td>
             
            </tr>           
        `;
      })
      .join("");

    tbody.innerHTML = html;
  }

  /**
   * Handle variant checkbox change
   */
  handleVariantCheckbox(variantId, checked) {
    if (checked) {
      this.importState.selectedVariants.add(variantId);
    } else {
      this.importState.selectedVariants.delete(variantId);
    }
    this.updateImportSummary();
  }

  /**
   * Toggle all variants selection
   */
  toggleAllVariants(checked) {
    this.importState.selectedVariants.clear();

    document.querySelectorAll(".variant-checkbox").forEach((cb) => {
      cb.checked = checked;
      if (checked) {
        const variantId = parseInt(cb.dataset.variantId);
        this.importState.selectedVariants.add(variantId);
      }
    });

    this.updateImportSummary();
  }

  /**
   * Update import summary
   */
  updateImportSummary() {
    let totalQty = 0;
    let totalCost = 0;
    let selectedCount = 0;

    this.importState.selectedVariants.forEach((variantId) => {
      const qtyInput = document.getElementById(`qty-${variantId}`);
      const priceInput = document.getElementById(`price-${variantId}`);

      if (qtyInput && priceInput) {
        const qty = parseInt(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;

        totalQty += qty;
        totalCost += qty * price;
        selectedCount++;
      }
    });

    document.getElementById("summaryVariants").textContent = selectedCount;
    document.getElementById("summaryQuantity").textContent = totalQty;
    document.getElementById("summaryCost").textContent = totalCost.toFixed(2);
  }

  /**
   * ⭐ Submit batch import
   */
  async submitBatchImport() {
    try {
      // Validation
      if (this.importState.selectedVariants.size === 0) {
        this.showError("Please select at least one variant to import");
        return;
      }

      // Build import data
      const imports = [];
      this.importState.selectedVariants.forEach((variantId) => {
        const qtyInput = document.getElementById(`qty-${variantId}`);
        const priceInput = document.getElementById(`price-${variantId}`);

        const quantity = parseInt(qtyInput.value);
        const price = parseFloat(priceInput.value);

        if (quantity > 0 && price >= 0) {
          imports.push({
            variant_id: variantId,
            quantity_imported: quantity,
            import_price: price,
          });
        }
      });

      if (imports.length === 0) {
        this.showError("No valid imports to submit");
        return;
      }

      const notes = document.getElementById("importNotes").value.trim();

      // Confirm with user
      if (!confirm(`Import ${imports.length} variants?`)) {
        return;
      }

      // Show loading
      console.log("📤 Submitting batch import:", imports);

      // Call API
      const response = await window.importsAPI.createBatchImport({
        imports: imports,
        notes: notes || null,
      });

      if (response.success) {
        this.showSuccess(`Successfully imported ${imports.length} variants!`);

        // Close modal
        bootstrap.Modal.getInstance(
          document.getElementById("importModal")
        ).hide();

        // Reload shoes to show updated stock
        await this.loadShoes();
      } else {
        this.showError(response.message || "Import failed");
      }
    } catch (error) {
      console.error("❌ Submit import error:", error);
      this.showError("Failed to submit import: " + error.message);
    }
  }

  /**
   * Load import history (when tab is clicked)
   */
  /**
   * Load import history when tab is clicked
   */
  async loadImportHistory() {
    try {
      // ✅ Check if shoe ID exists
      if (!this.importState.shoeId) {
        console.error("No shoe ID in import state");
        return;
      }

      const container = document.getElementById("importHistoryContainer");

      // ✅ Show loading
      container.innerHTML = `<p class="text-center">Loading...</p>`;

      console.log(
        "📥 Loading import history for shoe:",
        this.importState.shoeId
      );

      // ✅ CHECK if API exists
      if (!window.importsAPI) {
        throw new Error("ImportsAPI not loaded");
      }

      // ✅ Call API - CORRECT!
      const response = await window.importsAPI.getImportsByShoe(
        this.importState.shoeId
      );

      console.log("📦 Import history response:", response);

      // ✅ Check response format
      if (!response.success || !response.data || response.data.length === 0) {
        container.innerHTML = `
                <p class="text-muted text-center py-4">
                    No import history for this shoe yet
                </p>
            `;
        document.getElementById("importHistoryCount").textContent = "0";
        return;
      }

      // ✅ Update badge count
      document.getElementById("importHistoryCount").textContent =
        response.data.length;

      // ⚠️ RENDER TABLE - CẦN FIX FORMAT!
      container.innerHTML = `
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Color</th>
                        <th>Size</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Cost</th>
                        <th>By</th>      <!-- ✅ TÊN NGƯỜI NHẬP -->
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${response.data
                      .map(
                        (imp) => `
                        <tr>
                            <td><small>${this.formatDate(
                              imp.import_date
                            )}</small></td>
                            <td>
                                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${
                                  imp.variant?.color?.hex_code || "#ccc"
                                }"></span>
                                ${imp.variant?.color?.color_name || "N/A"}
                            </td>
                            <td>${imp.variant?.size?.size_value || "N/A"}</td>
                            <td><strong>${imp.quantity_imported}</strong></td>
                            <td>${imp.import_price.toFixed(2)}</td>
                            <td>${(
                              imp.quantity_imported * imp.import_price
                            ).toFixed(2)}</td>
                            <td><small>${
                              imp.profiles?.username || "N/A"
                            }</small></td>  <!-- ✅ NGƯỜI NHẬP -->
                            <td><small>${imp.notes || "-"}</small></td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    } catch (error) {
      console.error("❌ Load import history error:", error);

      const container = document.getElementById("importHistoryContainer");
      container.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    }
  }

  /**
   * Format date helper
   */
  formatDate(dateString) {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  getCategoryName(categoryId) {
    const category = this.categories.find((c) => c.category_id === categoryId);
    return category?.category_name || "N/A";
  }
  /**
   * =====================================================
   * ⭐ VARIANT GENERATION METHODS
   * =====================================================
   */

  /**
   * ⭐ Open variant generator modal
   */
  async openVariantGenerator(shoe) {
    try {
      const targetShoe = shoe || this.importState?.currentShoe;

      if (!targetShoe) {
        console.error("No shoe data available");
        this.showToast("Error", "No shoe selected. Please try again.", "error");
        return;
      }

      this.currentShoe = targetShoe;

      // Set shoe info in modal
      document.getElementById("variantGen_ShoeName").textContent =
        targetShoe.shoe_name || "Unknown Shoe";
      document.getElementById("variantGen_Status").innerHTML =
        '<i class="fas fa-info-circle me-2"></i>Loading...';

      // ⭐ Set default price from shoe
      const priceInput = document.getElementById("variantGen_DefaultPrice");
      if (priceInput) {
        priceInput.value = targetShoe.base_price || 0;
      }

      // Show variant generator modal
      const modal = new bootstrap.Modal(
        document.getElementById("variantGeneratorModal")
      );
      modal.show();

      // Load data
      await this.loadVariantGeneratorData();
    } catch (error) {
      console.error("❌ Open variant generator error:", error);
      this.showToast(
        "Error",
        "Failed to open variant generator: " + error.message,
        "error"
      );
    }
  }
  /**
   * ⭐ Load variant generator data with duplicate detection
   */
  async loadVariantGeneratorData() {
    try {
      const shoeId = this.currentShoe.shoe_id;

      // ⭐ USE window.variantsAPI directly
      const response = await window.variantsAPI.getVariantsByShoe(shoeId);

      // ⭐ DEBUG - check structure
      console.log("📦 API Response:", response);

      // ⭐ Extract array from response
      const existingVariants = Array.isArray(response)
        ? response
        : response.data || [];

      console.log("📦 Existing variants array:", existingVariants);

      this.existingVariantMap = new Set(
        existingVariants.map((v) => `${v.color_id}-${v.size_id}`)
      );

      console.log("📦 Existing variant map:", this.existingVariantMap);

      // Render selection UI
      this.renderColorSelection();
      this.renderSizeSelection();

      // Update status
      document.getElementById(
        "variantGen_Status"
      ).innerHTML = `<strong>${existingVariants.length}</strong> variants already exist. Select new combinations to create.`;
    } catch (error) {
      console.error("❌ Load variant generator data error:", error);
      this.showToast("Error", "Failed to load variant data", "error");
    }
  }
  /**
   * ⭐ Render color selection with duplicate indicators
   */
  renderColorSelection() {
    const container = document.getElementById("variantGen_ColorsList");
    if (!this.colors || this.colors.length === 0) {
      container.innerHTML =
        '<div class="col-12 text-center text-muted">No colors available</div>';
      return;
    }

    container.innerHTML = this.colors
      .map((color) => {
        // Check if this color has ANY existing variants
        const hasExisting = Array.from(this.existingVariantMap).some((key) =>
          key.startsWith(`${color.color_id}-`)
        );

        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card variant-option-card" 
                     data-color-id="${color.color_id}"
                     onclick="window.adminManager.toggleColor(${
                       color.color_id
                     })">
                    <div class="card-body p-2 text-center position-relative">
                        <i class="fas fa-check-circle check-icon"></i>
                        <div class="color-preview mx-auto mb-2" 
                             style="background-color: ${color.hex_code}"></div>
                        <small class="d-block fw-bold">${
                          color.color_name
                        }</small>
                        ${
                          hasExisting
                            ? '<span class="badge bg-warning badge-sm mt-1">Has variants</span>'
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
      })
      .join("");
  }

  /**
   * ⭐ Render size selection with duplicate indicators
   */
  renderSizeSelection() {
    const container = document.getElementById("variantGen_SizesList");
    if (!this.sizes || this.sizes.length === 0) {
      container.innerHTML =
        '<div class="col-12 text-center text-muted">No sizes available</div>';
      return;
    }

    container.innerHTML = this.sizes
      .map((size) => {
        // Check if this size has ANY existing variants
        const hasExisting = Array.from(this.existingVariantMap).some((key) =>
          key.endsWith(`-${size.size_id}`)
        );

        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card variant-option-card" 
                     data-size-id="${size.size_id}"
                     onclick="window.adminManager.toggleSize(${size.size_id})">
                    <div class="card-body p-2 text-center position-relative">
                        <i class="fas fa-check-circle check-icon"></i>
                        <div class="fs-5 fw-bold text-primary mb-1">${
                          size.size_value
                        }</div>
                        <small class="text-muted">${
                          size.size_type || "US"
                        }</small>
                        ${
                          hasExisting
                            ? '<span class="badge bg-warning badge-sm mt-1">Has variants</span>'
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
      })
      .join("");
  }

  /**
   * ⭐ Toggle color selection
   */
  toggleColor(colorId) {
    const card = document.querySelector(`[data-color-id="${colorId}"]`);
    card.classList.toggle("selected");
    this.updateSelectionSummary();
  }

  /**
   * ⭐ Toggle size selection
   */
  toggleSize(sizeId) {
    const card = document.querySelector(`[data-size-id="${sizeId}"]`);
    card.classList.toggle("selected");
    this.updateSelectionSummary();
  }

  /**
   * ⭐ Select all colors
   */
  selectAllColors() {
    document.querySelectorAll("[data-color-id]").forEach((card) => {
      card.classList.add("selected");
    });
    this.updateSelectionSummary();
  }

  /**
   * ⭐ Select all sizes
   */
  selectAllSizes() {
    document.querySelectorAll("[data-size-id]").forEach((card) => {
      card.classList.add("selected");
    });
    this.updateSelectionSummary();
  }

  /**
   * ⭐ Update selection summary with duplicate warnings
   */
  updateSelectionSummary() {
    const selectedColors = Array.from(
      document.querySelectorAll("[data-color-id].selected")
    ).map((card) => parseInt(card.dataset.colorId));
    const selectedSizes = Array.from(
      document.querySelectorAll("[data-size-id].selected")
    ).map((card) => parseInt(card.dataset.sizeId));

    const totalCombinations = selectedColors.length * selectedSizes.length;

    // Calculate duplicates
    let duplicateCount = 0;
    for (const colorId of selectedColors) {
      for (const sizeId of selectedSizes) {
        if (this.existingVariantMap.has(`${colorId}-${sizeId}`)) {
          duplicateCount++;
        }
      }
    }

    const newCount = totalCombinations - duplicateCount;

    // Update UI
    document.getElementById(
      "variantGen_ColorCount"
    ).textContent = `${selectedColors.length} colors`;
    document.getElementById(
      "variantGen_SizeCount"
    ).textContent = `${selectedSizes.length} sizes`;
    document.getElementById(
      "variantGen_TotalCount"
    ).textContent = `${newCount} new variants`;

    // Show warning if duplicates exist
    if (duplicateCount > 0) {
      document.getElementById("variantGen_Status").innerHTML = `
            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
            <strong>${duplicateCount}</strong> variants already exist and will be skipped. 
            <strong>${newCount}</strong> new variants will be created.
        `;
      document.getElementById("variantGen_Status").className =
        "alert alert-warning d-flex align-items-center mb-4";
    } else if (newCount > 0) {
      document.getElementById("variantGen_Status").innerHTML = `
            <i class="fas fa-check-circle text-success me-2"></i>
            Ready to create <strong>${newCount}</strong> new variants.
        `;
      document.getElementById("variantGen_Status").className =
        "alert alert-success d-flex align-items-center mb-4";
    } else {
      document.getElementById("variantGen_Status").innerHTML = `
            <i class="fas fa-info-circle text-info me-2"></i>
            Select colors and sizes to generate variants.
        `;
      document.getElementById("variantGen_Status").className =
        "alert alert-info d-flex align-items-center mb-4";
    }
  }

  /**
   * ⭐ Generate selected variants with price
   */
  async generateSelectedVariants() {
    try {
      const selectedColors = Array.from(
        document.querySelectorAll("[data-color-id].selected")
      ).map((card) => parseInt(card.dataset.colorId));
      const selectedSizes = Array.from(
        document.querySelectorAll("[data-size-id].selected")
      ).map((card) => parseInt(card.dataset.sizeId));

      if (selectedColors.length === 0 || selectedSizes.length === 0) {
        this.showToast(
          "Warning",
          "Please select at least one color and one size",
          "warning"
        );
        return;
      }

      const defaultStock =
        parseInt(document.getElementById("variantGen_DefaultStock").value) || 0;

      // ⭐ ONLY CHANGE THIS PART - Read price (null if empty)
      const priceInput = document.getElementById("variantGen_DefaultPrice");
      const defaultPrice =
        priceInput && priceInput.value.trim() !== ""
          ? parseFloat(priceInput.value)
          : null; // null = backend uses shoe.base_price

      // Show loading
      this.showLoading("Generating variants...");

      // Call API
      const response = await window.variantsAPI.generateSpecificVariants(
        this.currentShoe.shoe_id,
        selectedColors,
        selectedSizes,
        defaultStock,
        defaultPrice // ⭐ Pass price (can be null)
      );

      this.hideLoading();

      console.log("✅ Generate variants response:", response);

      // Handle response... (keep existing code)
      if (response && response.success) {
        const data = response.data || response;
        const created = data.created || 0;
        const skipped = data.skipped || 0;

        if (created > 0) {
          let message = `Successfully created ${created} new variants!`;
          if (skipped > 0) {
            message += ` (${skipped} duplicates skipped)`;
          }
          this.showToast("Success", message, "success");

          bootstrap.Modal.getInstance(
            document.getElementById("variantGeneratorModal")
          ).hide();
          await this.loadShoes();
        } else if (skipped > 0) {
          this.showToast(
            "Info",
            `All ${skipped} selected variants already exist`,
            "info"
          );
        } else {
          this.showToast("Info", "No variants were created", "info");
        }
      } else {
        this.showToast(
          "Error",
          response.message || "Failed to generate variants",
          "error"
        );
      }
    } catch (error) {
      this.hideLoading();
      console.error("❌ Generate variants error:", error);
      this.showToast(
        "Error",
        error.message || "Failed to generate variants",
        "error"
      );
    }
  }

  /**
   * Render color checkboxes
   */
  renderColorCheckboxes() {
    const container = document.getElementById("colorCheckboxList");

    if (!this.colors || this.colors.length === 0) {
      container.innerHTML = '<p class="text-muted">No colors available</p>';
      return;
    }

    container.innerHTML = this.colors
      .map(
        (color) => `
        <div class="form-check mb-2">
            <input class="form-check-input color-checkbox" type="checkbox" 
                   value="${color.color_id}" id="color_${color.color_id}">
            <label class="form-check-label d-flex align-items-center" for="color_${color.color_id}">
                <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${color.hex_code};border:1px solid #ddd;margin-right:8px;"></span>
                ${color.color_name}
            </label>
        </div>
    `
      )
      .join("");

    // Add event listeners
    document.querySelectorAll(".color-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => this.updateSelectedCount());
    });
  }

  /**
   * Render size checkboxes
   */
  renderSizeCheckboxes() {
    const container = document.getElementById("sizeCheckboxList");

    if (!this.sizes || this.sizes.length === 0) {
      container.innerHTML = '<p class="text-muted">No sizes available</p>';
      return;
    }

    container.innerHTML = this.sizes
      .map(
        (size) => `
        <div class="form-check mb-2">
            <input class="form-check-input size-checkbox" type="checkbox" 
                   value="${size.size_id}" id="size_${size.size_id}">
            <label class="form-check-label" for="size_${size.size_id}">
                ${size.size_value} ${size.size_type || ""}
            </label>
        </div>
    `
      )
      .join("");

    // Add event listeners
    document.querySelectorAll(".size-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => this.updateSelectedCount());
    });
  }

  /**
   * Update selected count
   */
  updateSelectedCount() {
    const selectedColors = document.querySelectorAll(
      ".color-checkbox:checked"
    ).length;
    const selectedSizes = document.querySelectorAll(
      ".size-checkbox:checked"
    ).length;
    const total = selectedColors * selectedSizes;

    document.getElementById("selectedColors").textContent = selectedColors;
    document.getElementById("selectedSizes").textContent = selectedSizes;
    document.getElementById("selectedTotal").textContent = total;
  }

  /**
   * Generate all variants
   */
  async generateAllVariants() {
    try {
      const defaultStock =
        parseInt(document.getElementById("defaultStockAll").value) || 0;

      if (
        !confirm(
          `Generate ALL variants for "${this.currentShoe.shoe_name}"?\n\nThis will create all color × size combinations.`
        )
      ) {
        return;
      }

      // Show loading
      const btn = document.getElementById("btnGenerateAll");
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';

      // Call API
      const result = await window.variantsAPI.generateAllVariants(
        this.currentShoe.shoe_id,
        defaultStock
      );

      console.log("✅ Generate all result:", result);

      // Show success
      alert(
        `Success!\n\n` +
          `✅ Created: ${result.created} variants\n` +
          `⏭️ Skipped: ${result.skipped} (already exist)`
      );

      // Reload variants and close modal
      await this.loadVariants(this.currentShoe.shoe_id);
      this.renderVariants();

      bootstrap.Modal.getInstance(
        document.getElementById("variantGeneratorModal")
      ).hide();

      // Reset button
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    } catch (error) {
      console.error("❌ Generate all variants error:", error);
      alert("Failed to generate variants: " + error.message);

      // Reset button
      const btn = document.getElementById("btnGenerateAll");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate All Variants';
    }
  }

  /**
   * GENERATE SPECIFIC VARIANTS
   * Create variants for selected colors and sizes only
   */
  async generateSpecificVariants(shoeId, colorIds, sizeIds, options = {}) {
    try {
      console.log("🎯 Generating specific variants for shoe:", shoeId);
      console.log("Colors:", colorIds);
      console.log("Sizes:", sizeIds);
      console.log("Options:", options); // ⭐ ADD DEBUG

      // Validation
      if (!shoeId || isNaN(parseInt(shoeId))) {
        throw new ValidationError("Invalid shoe ID");
      }

      if (!Array.isArray(colorIds) || colorIds.length === 0) {
        throw new ValidationError("At least one color must be selected");
      }

      if (!Array.isArray(sizeIds) || sizeIds.length === 0) {
        throw new ValidationError("At least one size must be selected");
      }

      // ⭐ Get shoe info WITH BASE_PRICE
      const { data: shoe } = await supabaseConfig
        .getAdminClient()
        .from("shoes")
        .select("shoe_id, shoe_name, base_price")
        .eq("shoe_id", shoeId)
        .single();

      if (!shoe) {
        throw new NotFoundError(`Shoe with ID ${shoeId} not found`);
      }

      console.log(
        "📦 Shoe found:",
        shoe.shoe_name,
        "Base price:",
        shoe.base_price
      );

      // Get selected colors
      const { data: colors } = await supabaseConfig
        .getAdminClient()
        .from("colors")
        .select("color_id, color_name")
        .in("color_id", colorIds);

      // Get selected sizes
      const { data: sizes } = await supabaseConfig
        .getAdminClient()
        .from("sizes")
        .select("size_id, size_value")
        .in("size_id", sizeIds);

      // Get existing variants
      const { data: existingVariants } = await supabaseConfig
        .getAdminClient()
        .from("shoe_variants")
        .select("color_id, size_id")
        .eq("shoe_id", shoeId);

      const existingSet = new Set(
        existingVariants?.map((v) => `${v.color_id}-${v.size_id}`) || []
      );

      // ⭐ GET PRICE: Use user input OR fallback to shoe base_price
      const defaultPrice =
        options.defaultPrice !== undefined && options.defaultPrice !== null
          ? parseFloat(options.defaultPrice)
          : shoe.base_price;

      console.log("💰 Using price:", defaultPrice); // ⭐ DEBUG

      // Generate combinations
      const variantsToCreate = [];
      for (const color of colors) {
        for (const size of sizes) {
          const key = `${color.color_id}-${size.size_id}`;

          if (existingSet.has(key)) {
            continue;
          }

          const sku = this.generateSKU(
            shoe.shoe_name,
            color.color_name,
            size.size_value
          );

          variantsToCreate.push({
            shoe_id: shoeId,
            color_id: color.color_id,
            size_id: size.size_id,
            sku: sku,
            stock_quantity: options.defaultStock || 0,
            variant_price: defaultPrice, // ⭐ USE DYNAMIC PRICE
            created_at: new Date().toISOString(),
          });
        }
      }

      if (variantsToCreate.length === 0) {
        return {
          success: true,
          message: "All selected variants already exist",
          created: 0,
          skipped: existingSet.size,
        };
      }

      // Insert variants
      const { data: createdVariants, error } = await supabaseConfig
        .getAdminClient()
        .from("shoe_variants")
        .insert(variantsToCreate)
        .select();

      if (error) {
        throw error;
      }

      console.log(
        `✅ Created ${createdVariants.length} specific variants with price: ${defaultPrice}`
      );

      return {
        success: true,
        message: `Created ${createdVariants.length} variants`,
        created: createdVariants.length,
        skipped: existingSet.size,
        variants: createdVariants,
      };
    } catch (error) {
      console.error("❌ Generate specific variants error:", error);
      throw error;
    }
  }
  /**
   * Setup variant generator event listeners
   */
  setupVariantGeneratorListeners() {
    // Generate All button
    document.getElementById("btnGenerateAll")?.addEventListener("click", () => {
      this.generateAllVariants();
    });

    // Generate Specific button
    document
      .getElementById("btnGenerateSpecific")
      ?.addEventListener("click", () => {
        this.generateSpecificVariants();
      });

    // Select All Colors button
    document
      .getElementById("selectAllColors")
      ?.addEventListener("click", () => {
        document
          .querySelectorAll(".color-checkbox")
          .forEach((cb) => (cb.checked = true));
        this.updateSelectedCount();
      });

    // Select All Sizes button
    document.getElementById("selectAllSizes")?.addEventListener("click", () => {
      document
        .querySelectorAll(".size-checkbox")
        .forEach((cb) => (cb.checked = true));
      this.updateSelectedCount();
    });
  }
  /**
   * ⭐ Show toast notification
   */
  showToast(title, message, type = "success") {
    const toast = document.getElementById("notificationToast");
    const toastTitle = document.getElementById("toastTitle");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    // Set icon based on type
    const icons = {
      success: "fa-check-circle text-success",
      error: "fa-exclamation-circle text-danger",
      warning: "fa-exclamation-triangle text-warning",
      info: "fa-info-circle text-info",
    };

    toastIcon.className = `fas ${icons[type] || icons.success} me-2`;
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  }

  /**
   * ⭐ Show loading overlay
   */
  showLoading(message = "Processing...") {
    // Remove existing overlay if any
    this.hideLoading();

    const overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner mb-3"></div>
            <h5>${message}</h5>
        </div>
    `;
    document.body.appendChild(overlay);
  }

  /**
   * ⭐ Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      overlay.remove();
    }
  }
}

// Initialize global instance
window.adminManager = new AdminManager();
console.log("✅ AdminManager loaded");
