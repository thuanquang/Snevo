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
    this.variantRenderer = new AdminVariantRenderer(
      this.core,
      this.productRenderer
    );
    this.categoryManager = new AdminCategory(this.core, this.productRenderer);
    this.importManager = new AdminImport(this.core, this.productRenderer);
    this.importHistoryManager = new AdminImportHistory(
      this.core,
      this.productRenderer
    );
    this.variantGenerator = new AdminVariantGenerator(
      this.core,
      this.productRenderer
    );
    this.productManager = new AdminProduct(this.core, this.productRenderer);
    this.historyManager = new AdminHistory(this.core, this.productRenderer);
    window.adminHistory = this.historyManager;
    this.actions = new AdminActions(this.core);

    this.actions.productManager = this.productManager; // Wire connection
    window.adminActions = this.actions; // Expose globally
    window.adminManager = this;
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
      //  Initialize section switching
      this.initSectionSwitching();
      // Load all data in parallel
      await Promise.all([
        this.core.loadShoes(),
        this.core.loadCategories(),
        this.core.loadColors(),
        this.core.loadSizes(),
        // Dashboard data is now loaded via window.loadDashboardStats() when switching to dashboard section
        // this.loadDashboard()
      ]);

      // Render initial data
      this.productRenderer.applySortByStock();
      this.categoryManager.renderCategoriesTable();
      this.core.updateStats();

      // Setup event listeners (ONLY ONCE)
      this.setupEventListeners();

      console.log("✅ AdminManager initialized successfully");
      this.setupLogoutButton();
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
    this.productManager.setupProductFormListeners();
    this.historyManager.setupGlobalImportHistoryListener();
    this.historyManager.setupHistoryTabListeners();

    // Setup sort handler
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", () =>
        this.productRenderer.handleSort()
      );
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
  /**
   * Setup logout button
   */
  setupLogoutButton() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) {
      console.warn("⚠️ Logout button not found");
      return;
    }

    console.log("🔐 Setting up logout button");
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("👋 Logout clicked");
      this.handleLogout();
    });
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    console.log("🚪 Starting logout...");

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Logging out...';
    }

    try {
      // Clear session data
      await this.clearAllSessionData();

      // Show success
      this.showLogoutSuccessToast();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Redirect
      console.log("✅ Logout complete - redirecting");
      window.location.href = "index.html";
    } catch (error) {
      console.error("❌ Logout error:", error);
      AdminUtils.showToast("Error", "Logout failed. Redirecting...", "error");

      // Force redirect
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    }
  }

  /**
   * Clear all session data
   */
  async clearAllSessionData() {
    console.log("🧹 Clearing session data...");

    try {
      // STEP 1: Supabase signout (with safety check)
      try {
        if (window.supabaseClient) {
          console.log("🔑 Signing out from Supabase...");
          const { error } = await window.supabaseClient.auth.signOut();
          if (error) {
            console.error("⚠️ Supabase signOut error:", error);
          } else {
            console.log("✅ Supabase signOut successful");
          }
        } else {
          console.warn("⚠️ Supabase client not available");
        }
      } catch (err) {
        console.error("⚠️ Supabase signOut failed:", err);
        // Continue anyway
      }

      // STEP 2: Clear localStorage
      console.log("🗑️ Clearing localStorage...");
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
          console.log(`  ✓ Removed ${key}`);
        }
      });

      // STEP 3: Clear Supabase keys
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          localStorage.removeItem(key);
          console.log(`  ✓ Removed: ${key}`);
        }
      });

      // STEP 4: Clear sessionStorage
      console.log("🗑️ Clearing sessionStorage...");
      sessionStorage.clear();

      // STEP 5: Clear cookies
      console.log("🍪 Clearing cookies...");
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
          console.log(`  ✓ Cleared: ${name}`);
        }
      });

      // STEP 6: Update AuthManager (if exists and has method)
      if (window.authManager) {
        console.log("🔄 Updating AuthManager...");
        if (typeof window.authManager.clearAuthData === "function") {
          window.authManager.clearAuthData();
        }
        if (typeof window.authManager.updateAuthUI === "function") {
          window.authManager.updateAuthUI();
        }
        // Skip emit() - không có trong authManager
      }

      console.log("✅ All session data cleared");
    } catch (error) {
      console.error("❌ Error clearing session:", error);
      throw error;
    }
  }

  /**
   * Show logout success toast
   */
  showLogoutSuccessToast() {
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

    toast.style.position = "fixed";
    toast.style.top = "50%";
    toast.style.left = "50%";
    toast.style.transform = "translate(-50%, -50%)";
    toast.style.zIndex = "9999";
    toast.style.minWidth = "300px";
    document.body.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, { delay: 2000 });
    bsToast.show();

    toast.addEventListener("hidden.bs.toast", () => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
  }

  // ==================== DELEGATE METHODS ====================
  // Product Management
  addShoe() {
    return this.productManager.openProductForm();
  }
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
    console.warn(
      "⚠️ toggleVariantSelection is deprecated, use handleVariantCheckbox"
    );
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
    return this.productManager.openProductForm(shoeId);
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
  /**
   * 🔄 Initialize section switching
   */
  initSectionSwitching() {
    const sidebarLinks = document.querySelectorAll("[data-section]");

    sidebarLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const sectionName = link.dataset.section;
        this.switchSection(sectionName);
      });
    });

    console.log("✅ Section switching initialized");
  }

  switchSection(sectionName) {
    console.log("🔄 Switching to section:", sectionName);

    // Hide all sections
    document.querySelectorAll(".content-section").forEach((section) => {
      section.style.display = "none";
    });

    // Show target section
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
      targetSection.style.display = "block";

      // Load data based on section
      switch (sectionName) {
        case "history":
          if (this.historyManager) {
            this.historyManager.loadDeletedProducts(); // ✅ Load deleted products
            this.historyManager.loadGlobalImportHistory(); // ✅ Load global imports
          }
          break;
        case "inventory":
          // Already loaded
          break;
        case "dashboard":
          // ✅ Load dashboard stats
          if (window.loadDashboardStats) {
            window.loadDashboardStats();
          }
          break;
        case "orders":
          // ✅ Load orders when section is switched to
          if (window.adminLoadOrders) {
            window.adminLoadOrders();
          }
          break;
      }
    } else {
      console.error("❌ Section not found:", `${sectionName}Section`);
    }

    // Update active link
    document.querySelectorAll(".sidebar-menu-link").forEach((l) => {
      l.classList.remove("active");
    });
    const activeLink = document.querySelector(
      `[data-section="${sectionName}"]`
    );
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }
    /**
     * Delete variant wrapper - called from HTML onclick
     */
    async deleteVariant(variantId, buttonElement) {
    try {
        console.log('🗑️ Delete variant called:', variantId);     
        // Pass to AdminActions with buttonElement
        await this.actions.deleteVariant(variantId, buttonElement);
    } catch (error) {
        console.error('Delete variant failed in AdminManager:', error);
    }
    }

  /**
   * Load and display dashboard section
   */
  async loadDashboard() {
    try {
      console.log("🔄 Loading dashboard...");

      // Show loading state
      const dashboardSection = document.getElementById('dashboardSection');
      if (dashboardSection) {
        const emptyState = dashboardSection.querySelector('.empty-state');
        if (emptyState) {
          emptyState.innerHTML = `
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p>Loading dashboard...</p>
          `;
        }
      }

      // Fetch dashboard data
      const data = await this.core.loadDashboardData();

      if (!data) {
        throw new Error('No dashboard data returned');
      }

      // Update dashboard display
      this.renderDashboard(data);

      console.log("✅ Dashboard loaded successfully");

    } catch (error) {
      console.error("❌ Dashboard load error:", error);
      AdminUtils.showError('Failed to load dashboard');
    }
  }

  /**
   * Render dashboard data in HTML
   */
  renderDashboard(data) {
    console.log("🎨 Rendering dashboard...", data);

    if (!data) {
      console.warn("⚠️ No data to render");
      return;
    }

    // Get dashboard section
    const dashboardSection = document.getElementById('dashboardSection');
    if (!dashboardSection) {
      console.error("❌ Dashboard section not found");
      return;
    }

    // Extract data
    const { summary = {}, stats = {}, recentActivity = {} } = data;

    // Create dashboard HTML
    const dashboardHTML = `
      <div class="admin-header">
        <h1>Dashboard</h1>
        <p>Overview of store statistics and metrics</p>
      </div>

      <!-- Summary Cards -->
      <div class="row mb-4">
        <div class="col-md-6 col-lg-3 mb-3">
          <div class="card bg-primary text-white">
            <div class="card-body">
              <h6 class="card-title">Total Products</h6>
              <h2>${summary.totalProducts || 0}</h2>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
          <div class="card bg-success text-white">
            <div class="card-body">
              <h6 class="card-title">Total Orders</h6>
              <h2>${summary.totalOrders || 0}</h2>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
          <div class="card bg-warning text-white">
            <div class="card-body">
              <h6 class="card-title">Low Stock Items (<10)</h6>
              <h2>${summary.lowStockItems || 0}</h2>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
          <div class="card bg-info text-white">
            <div class="card-body">
              <h6 class="card-title">Total Revenue</h6>
              <h2>$${summary.totalRevenue || '0.00'}</h2>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics & Recent Orders Row -->
      <div class="row mb-4">
        <div class="col-lg-4">
          <h3>Statistics</h3>
          <ul class="list-group">
            <li class="list-group-item">
              <strong>Active Categories:</strong>
              <span class="badge bg-primary float-end">${stats.activeCategories || 0}</span>
            </li>
            <li class="list-group-item">
              <strong>Total Variants:</strong>
              <span class="badge bg-secondary float-end">${stats.totalVariants || 0}</span>
            </li>
            <li class="list-group-item">
              <strong>Pending Orders:</strong>
              <span class="badge bg-warning float-end">${stats.pendingOrders || 0}</span>
            </li>
          </ul>
        </div>

        <!-- Recent Orders -->
        <div class="col-lg-8">
          <h3>Recent Orders</h3>
          ${this.renderRecentOrders(recentActivity.recentOrders || [])}
        </div>
      </div>

      <!-- Top Selling Products -->
      <div class="row">
        <div class="col-12">
          <h3>Top Selling Products</h3>
          ${this.renderTopSellingProducts(recentActivity.topSellingProducts || [])}
        </div>
      </div>
    `;

    // Update dashboard section
    dashboardSection.innerHTML = dashboardHTML;
    console.log("✅ Dashboard rendered");
  }

  /**
   * Render recent orders table with user info
   */
  renderRecentOrders(orders) {
    if (!orders || orders.length === 0) {
      return `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          No recent orders found
        </div>
      `;
    }

    const rows = orders.map(order => {
      const canCancel = order.order_status === 'pending' || order.order_status === 'processing';
      return `
        <tr>
          <td>
            ${order.avatar_url ? `<img src="${order.avatar_url}" alt="${order.username}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 8px;">` : '<i class="fas fa-user-circle" style="margin-right: 8px;"></i>'}
            <strong>${order.username}</strong>
          </td>
          <td>#${order.order_id}</td>
          <td>₫${new Intl.NumberFormat('vi-VN').format(Math.round(order.total_amount || 0))}</td>
          <td>
            <span class="badge ${this.getStatusBadgeClass(order.order_status)}">
              ${this.getStatusLabel(order.order_status)}
            </span>
          </td>
          <td>${new Date(order.created_at).toLocaleDateString()}</td>
          <td>
            ${canCancel ? `
              <button class="btn btn-sm btn-outline-danger" onclick="window.adminCancelOrder(${order.order_id})">
                <i class="fas fa-times"></i> Cancel
              </button>
            ` : '-'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table class="table table-sm table-hover">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Order ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  /**
   * Render top selling products
   */
  renderTopSellingProducts(products) {
    if (!products || products.length === 0) {
      return `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          No sales data available yet
        </div>
      `;
    }

    const cards = products.map(product => `
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card h-100">
          ${product.image_url ? `
            <img src="${product.image_url}" class="card-img-top" alt="${product.shoe_name}" style="height: 200px; object-fit: cover;">
          ` : `
            <div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
              <i class="fas fa-shoe-prints fa-3x text-muted"></i>
            </div>
          `}
          <div class="card-body">
            <h5 class="card-title">${product.shoe_name}</h5>
            <p class="card-text">
              <strong>Sales: </strong><span class="badge bg-success">${product.salesCount}</span>
            </p>
          </div>
        </div>
      </div>
    `).join('');

    return `<div class="row">${cards}</div>`;
  }

  /**
   * Get Bootstrap badge class based on order status
   */
  getStatusBadgeClass(status) {
    const statusMap = {
      'pending': 'bg-warning',
      'processing': 'bg-success',  // Approved/Success state
      'cancelled': 'bg-danger',
      'refunded': 'bg-secondary'
    };
    return statusMap[status?.toLowerCase()] || 'bg-secondary';
  }
  
  /**
   * Get display label for order status
   */
  getStatusLabel(status) {
    const labelMap = {
      'pending': 'Pending',
      'processing': 'Approved',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    return labelMap[status?.toLowerCase()] || status;
  }

  /**
   * Get payment status badge HTML
   */
  getPaymentStatusBadge(status) {
    const statusMap = {
      'pending': '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Pending</span>',
      'completed': '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Completed</span>',
      'failed': '<span class="badge bg-danger"><i class="fas fa-times-circle me-1"></i>Failed</span>',
      'refunded': '<span class="badge bg-secondary"><i class="fas fa-undo me-1"></i>Refunded</span>'
    };
    return statusMap[status?.toLowerCase()] || `<span class="badge bg-secondary">${status}</span>`;
  }

  /**
   * Get payment method icon and label
   */
  getPaymentMethodDisplay(method) {
    const methodMap = {
      'cash': '<i class="fas fa-money-bill-wave me-1"></i>Cash on Delivery',
      'credit_card': '<i class="fas fa-credit-card me-1"></i>Credit Card',
      'bank_transfer': '<i class="fas fa-university me-1"></i>Bank Transfer',
      'stripe': '<i class="fab fa-stripe me-1"></i>Stripe'
    };
    return methodMap[method?.toLowerCase()] || `<i class="fas fa-question-circle me-1"></i>${method}`;
  }

  /**
   * Render parsed payment details
   */
  renderPaymentDetails(payment) {
    if (!payment || !payment.details) {
      return '<p class="text-muted">No payment details available</p>';
    }

    const details = payment.details;
    let html = '';

    // Card payment (expanded from compact format: t='card')
    if (details.type === 'card' && details.card_number) {
      html = `
        <p class="mb-1"><strong>Card Number:</strong> ${details.card_number}</p>
        ${details.processed_at ? `<p class="mb-0 text-muted"><small>Processed: ${details.processed_at}</small></p>` : ''}
      `;
    }
    // Bank transfer (expanded from compact format: t='bank')
    else if (details.type === 'bank' && details.bank_code) {
      html = `
        <p class="mb-1"><strong>Bank:</strong> ${details.bank_code}</p>
        <p class="mb-1"><strong>Account:</strong> ${details.account_number}</p>
        ${details.submitted_at ? `<p class="mb-1 text-muted"><small>Submitted: ${details.submitted_at}</small></p>` : ''}
        ${details.verified_by ? `<p class="mb-0 text-success"><small><i class="fas fa-check-circle"></i> Verified by Admin #${details.verified_by} on ${details.verified_at}</small></p>` : ''}
      `;
    }
    // Stripe (expanded from compact format: t='stripe')
    else if (details.type === 'stripe' && details.stripe_payment_intent_id) {
      html = `
        <p class="mb-1"><strong>Payment Intent:</strong> <code>${details.stripe_payment_intent_id}</code></p>
        ${details.processed_at ? `<p class="mb-0 text-muted"><small>Processed: ${details.processed_at}</small></p>` : ''}
      `;
    }
    // Cash on Delivery (expanded from compact format: t='cash')
    else if (details.type === 'cash') {
      const collectionStatus = details.collection_status || 'pending';
      html = `
        <p class="mb-1"><strong>Collection Status:</strong> 
          ${collectionStatus === 'collected' 
            ? '<span class="badge bg-success"><i class="fas fa-check"></i> Collected</span>' 
            : '<span class="badge bg-warning text-dark"><i class="fas fa-clock"></i> Pending</span>'}
        </p>
        ${details.collected_by ? `<p class="mb-0 text-success"><small><i class="fas fa-user-check"></i> Collected by ${details.collected_by} on ${details.collected_at}</small></p>` : ''}
      `;
    }
    // Legacy format
    else if (details.type === 'legacy') {
      html = `<p class="mb-0 text-muted"><small>Transaction ID: ${details.transaction_id}</small></p>`;
    }
    // Fallback
    else {
      html = '<p class="text-muted">Payment details not available</p>';
    }

    return html;
  }

  /**
   * Confirm bank transfer payment
   */
  async confirmPayment(paymentId) {
    if (!confirm('Confirm this bank transfer payment?')) {
      return;
    }

    try {
      console.log('💳 Confirming payment:', paymentId);
      const response = await window.paymentsAPI.confirmPayment(paymentId);
      console.log('✅ Payment confirmed:', response);
      
      AdminUtils.showToast('Success', 'Payment confirmed successfully', 'success');
      
      // Reload orders to reflect changes
      if (window.adminLoadOrders) {
        await window.adminLoadOrders();
      }
    } catch (err) {
      console.error('❌ Failed to confirm payment:', err);
      AdminUtils.showToast('Error', 'Failed to confirm payment: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  /**
   * Approve COD order (not collected yet, just approved for delivery)
   */
  async approveCod(paymentId) {
    if (!confirm('Approve this Cash on Delivery order for delivery?')) {
      return;
    }

    try {
      console.log('✅ Approving COD order:', paymentId);
      const response = await window.paymentsAPI.approveCod(paymentId);
      console.log('✅ COD order approved:', response);
      
      AdminUtils.showToast('Success', 'COD order approved for delivery', 'success');
      
      // Reload orders to reflect changes
      if (window.adminLoadOrders) {
        await window.adminLoadOrders();
      }
    } catch (err) {
      console.error('❌ Failed to approve COD:', err);
      AdminUtils.showToast('Error', 'Failed to approve COD order: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  /**
   * Mark COD as collected (after delivery)
   */
  async collectCod(paymentId) {
    if (!confirm('Mark this Cash on Delivery payment as collected?')) {
      return;
    }

    try {
      console.log('💵 Collecting COD payment:', paymentId);
      const response = await window.paymentsAPI.collectCod(paymentId);
      console.log('✅ COD collected:', response);
      
      AdminUtils.showToast('Success', 'COD payment marked as collected', 'success');
      
      // Reload orders to reflect changes
      if (window.adminLoadOrders) {
        await window.adminLoadOrders();
      }
    } catch (err) {
      console.error('❌ Failed to collect COD:', err);
      AdminUtils.showToast('Error', 'Failed to mark payment as collected: ' + (err.message || 'Unknown error'), 'error');
    }
  }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", async () => {
  window.adminManager = new AdminManager();
  await window.adminManager.init();
});
