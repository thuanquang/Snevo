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

    // Initialize dashboard and order management modules
    this.dashboard = new AdminDashboard(this.core, this);
    this.orderManagement = new AdminOrderManagement(this.core, this);

    this.actions.productManager = this.productManager; // Wire connection
    window.adminActions = this.actions; // Expose globally
    window.adminManager = this;
  }

  /**
   * Initialize AdminManager
   */
  async init() {
    try {
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
      ]);

      // Render initial data
      this.productRenderer.applySortByStock();
      this.categoryManager.renderCategoriesTable();
      this.core.updateStats();

      // ✅ Setup dashboard and order management
      this.dashboard.attachToSection("dashboardSection");
      this.orderManagement.init();

      // Setup event listeners (ONLY ONCE)
      this.setupEventListeners();

      this.setupLogoutButton();
    } catch (error) {
      console.error("❌ Init error:", error);
      AdminUtils.showError("Failed to load admin data");
    }
  }
  setupEventListeners() {
    // ✅ Check if already setup
    if (this._listenersSetup) {
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
  }
  /**
   * Setup logout button
   */
  setupLogoutButton() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) {
      return;
    }

    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleLogout();
    });
  }

  /**
   * Handle logout
   */
  async handleLogout() {
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
    try {
      // STEP 1: Supabase signout (with safety check)
      try {
        if (window.supabaseClient) {
          const { error } = await window.supabaseClient.auth.signOut();
          if (error) {
            console.error("⚠️ Supabase signOut error:", error);
          }
        }
      } catch (err) {
        console.error("⚠️ Supabase signOut failed:", err);
        // Continue anyway
      }

      // STEP 2: Clear localStorage
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
        }
      });

      // STEP 3: Clear Supabase keys
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      });

      // STEP 4: Clear sessionStorage
      sessionStorage.clear();

      // STEP 5: Clear cookies
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
        }
      });

      // STEP 6: Update AuthManager (if exists and has method)
      if (window.authManager) {
        if (typeof window.authManager.clearAuthData === "function") {
          window.authManager.clearAuthData();
        }
        if (typeof window.authManager.updateAuthUI === "function") {
          window.authManager.updateAuthUI();
        }
      }
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
  addCategory() {
    return this.actions.addCategory();
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
  }

  switchSection(sectionName) {

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
            this.historyManager.loadDeletedProducts();
            this.historyManager.loadGlobalImportHistory();
          }
          break;
        case "inventory":
          // Already loaded
          break;
        case "dashboard":
          // ✅ Load dashboard via new module
          if (this.dashboard) {
            this.dashboard.loadAndRender();
          }
          break;
        case "orders":
          // ✅ Load orders via new module
          if (this.orderManagement) {
            this.orderManagement.loadOrders(1);
          }
          break;
      }
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
      // Pass to AdminActions with buttonElement
      await this.actions.deleteVariant(variantId, buttonElement);
    } catch (error) {
      console.error("Delete variant failed in AdminManager:", error);
    }
  }

  // ==================== PAYMENT HELPERS (for Order Management) ====================

  /**
   * Confirm bank transfer payment
   */
  async confirmPayment(paymentId) {
    if (!confirm("Confirm this bank transfer payment?")) {
      return;
    }

    try {
      const response = await window.paymentsAPI.confirmPayment(paymentId);
      
      AdminUtils.showToast('Success', 'Payment confirmed successfully', 'success');
      
      // Reload orders to reflect changes
      if (this.orderManagement) {
        await this.orderManagement.loadOrders(
          this.orderManagement.currentState.currentPage
        );
      }
    } catch (err) {
      console.error("❌ Failed to confirm payment:", err);
      AdminUtils.showToast(
        "Error",
        "Failed to confirm payment: " + (err.message || "Unknown error"),
        "error"
      );
    }
  }

  /**
   * Approve COD order (not collected yet, just approved for delivery)
   */
  async approveCod(paymentId) {
    if (!confirm("Approve this Cash on Delivery order for delivery?")) {
      return;
    }

    try {
      const response = await window.paymentsAPI.approveCod(paymentId);
      
      AdminUtils.showToast('Success', 'COD order approved for delivery', 'success');
      
      // Reload orders to reflect changes
      if (this.orderManagement) {
        await this.orderManagement.loadOrders(
          this.orderManagement.currentState.currentPage
        );
      }
    } catch (err) {
      console.error("❌ Failed to approve COD:", err);
      AdminUtils.showToast(
        "Error",
        "Failed to approve COD order: " + (err.message || "Unknown error"),
        "error"
      );
    }
  }

  /**
   * Mark COD as collected (after delivery)
   */
  async collectCod(paymentId) {
    if (!confirm("Mark this Cash on Delivery payment as collected?")) {
      return;
    }

    try {
      const response = await window.paymentsAPI.collectCod(paymentId);
      
      AdminUtils.showToast('Success', 'COD payment marked as collected', 'success');
      
      // Reload orders to reflect changes
      if (this.orderManagement) {
        await this.orderManagement.loadOrders(
          this.orderManagement.currentState.currentPage
        );
      }
    } catch (err) {
      console.error("❌ Failed to collect COD:", err);
      AdminUtils.showToast(
        "Error",
        "Failed to mark payment as collected: " +
          (err.message || "Unknown error"),
        "error"
      );
    }
  }
} // Initialize on page load
window.addEventListener("DOMContentLoaded", async () => {
  window.adminManager = new AdminManager();
  await window.adminManager.init();
});
