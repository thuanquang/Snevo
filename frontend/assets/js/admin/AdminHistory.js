// frontend/assets/js/admin/AdminHistory.js

/**
 * AdminHistory - Manage History & Recovery section
 * Handles deleted products, variants, and history views
 */
class AdminHistory {
  constructor(core, productRenderer) {
    this.core = core;
    this.productRenderer = productRenderer;
    this.deletedProducts = [];
    this.allDeletedProducts = []; // Store unfiltered list
    this.productsAPI = window.productsAPI;
    this.searchDebounceTimer = null;
  }

  /**
   * 🔄 Load deleted products (including products without variants)
   */
  async loadDeletedProducts() {
    try {
      console.log("🔄 Loading deleted products...");

      // Fetch products with is_active = false AND include products without variants
      const response = await this.productsAPI.getProducts({
        is_active: "false",
        include_no_variants: "true",
        limit: 100,
        page: 1,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load deleted products");
      }

      this.deletedProducts = response.data || [];
      this.allDeletedProducts = [...this.deletedProducts]; // Store copy for filtering

      console.log(
        `✅ Loaded ${this.deletedProducts.length} deleted products:`,
        this.deletedProducts
      );

      // Update badge counts
      const count = this.deletedProducts.length;
      document.getElementById("deletedProductsCount").textContent = count;
      document.getElementById("deletedCount").textContent = count;

      // Populate category filter
      this.populateCategoryFilter();

      // Render table
      this.renderDeletedProductsTable();
    } catch (error) {
      console.error("❌ Load deleted products error:", error);
      AdminUtils.showError("Failed to load deleted products");
    }
  }

  /**
   * 📋 Render deleted products table
   */
  renderDeletedProductsTable() {
    const tbody = document.getElementById("deletedProductsTableBody");
    const emptyState = document.getElementById("deletedProductsEmpty");

    if (!tbody) {
      console.error("❌ deletedProductsTableBody not found");
      return;
    }

    if (this.deletedProducts.length === 0) {
      tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    tbody.innerHTML = this.deletedProducts
      .map((shoe) => {
        // ✅ Handle deleted_at - use updated_at as fallback
        const deletedDate = shoe.deleted_at
          ? AdminUtils.formatDate(shoe.deleted_at)
          : shoe.updated_at
          ? AdminUtils.formatDate(shoe.updated_at)
          : "N/A";

        // ✅ Calculate variant count from shoe_variants array
        const variantCount = shoe.shoe_variants?.length || 0;

        // Handle missing category name
        const categoryName =
          shoe.categories?.category_name ||
          this.getCategoryName(shoe.category_id) ||
          "Unknown";

        return `
      <tr>
        <td>
          <input type="checkbox" class="form-check-input deleted-product-check" 
                 value="${shoe.shoe_id}">
        </td>
        <td>
          ${
            shoe.image_url
              ? `<img src="${shoe.image_url}" alt="${shoe.shoe_name}" 
                   class="img-thumbnail" style="width: 60px; height: 60px; object-fit: cover;">`
              : '<div class="bg-secondary text-white d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;"><i class="bi bi-image"></i></div>'
          }
        </td>
        <td>
          <strong>${shoe.shoe_name}</strong>
          <br>
          <small class="text-muted">ID: ${shoe.shoe_id}</small>
        </td>
        <td>
          <span class="badge bg-secondary">${categoryName}</span>
        </td>
        <td>
          <strong>${AdminUtils.formatCurrency(shoe.base_price)}</strong>
        </td>
        <td>
          <small class="text-muted">
            <i class="bi bi-calendar-x me-1"></i>${deletedDate}
          </small>
        </td>
        <td>
          <span class="badge ${variantCount > 0 ? "bg-info" : "bg-secondary"}">
            ${variantCount} variants
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-success" 
                  onclick="adminActions.restoreShoe(${shoe.shoe_id})"
                  title="Restore">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Restore
          </button>
        </td>
      </tr>
    `;
      })
      .join("");

    // Setup select all checkbox
    this.setupSelectAllCheckbox();
  }

  /**
   * 🏷️ Get category name by ID from core.categories
   */
  getCategoryName(categoryId) {
    if (!categoryId) return null;
    const category = this.core.categories.find(
      (cat) => cat.category_id === categoryId
    );
    return category ? category.category_name : null;
  }

  /**
   * 🎯 Populate category filter dropdown
   */
  populateCategoryFilter() {
    const filterSelect = document.getElementById("deletedCategoryFilter");
    if (!filterSelect) return;

    // Get unique categories from deleted products
    const categoryIds = [
      ...new Set(
        this.allDeletedProducts.map((p) => p.category_id).filter(Boolean)
      ),
    ];

    // Build options
    const options = categoryIds
      .map((categoryId) => {
        const categoryName = this.getCategoryName(categoryId) || "Unknown";
        return `<option value="${categoryId}">${categoryName}</option>`;
      })
      .join("");

    filterSelect.innerHTML = `
      <option value="">All Categories</option>
      ${options}
    `;
  }

  /**
   * ✅ Setup select all checkbox
   */
  setupSelectAllCheckbox() {
    const selectAll = document.getElementById("selectAllDeleted");
    const checkboxes = document.querySelectorAll(".deleted-product-check");
    const bulkRestoreBtn = document.getElementById("bulkRestoreBtn");

    if (!selectAll) return;

    // Remove old listeners
    const newSelectAll = selectAll.cloneNode(true);
    selectAll.parentNode.replaceChild(newSelectAll, selectAll);

    newSelectAll.addEventListener("change", (e) => {
      checkboxes.forEach((cb) => (cb.checked = e.target.checked));
      this.updateBulkRestoreButton();
    });

    checkboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        this.updateBulkRestoreButton();
      });
    });
  }

  /**
   * 🔄 Update bulk restore button state
   */
  updateBulkRestoreButton() {
    const checked = document.querySelectorAll(".deleted-product-check:checked");
    const bulkRestoreBtn = document.getElementById("bulkRestoreBtn");

    if (!bulkRestoreBtn) return;

    if (checked.length > 0) {
      bulkRestoreBtn.disabled = false;
      bulkRestoreBtn.innerHTML = `
        <i class="bi bi-arrow-counterclockwise me-1"></i>
        Restore Selected (${checked.length})
      `;
    } else {
      bulkRestoreBtn.disabled = true;
      bulkRestoreBtn.innerHTML = `
        <i class="bi bi-arrow-counterclockwise me-1"></i>Bulk Restore
      `;
    }
  }

  /**
   * 🔄 Refresh deleted products
   */
  async refreshDeletedProducts() {
    await this.loadDeletedProducts();
    AdminUtils.showSuccess("Deleted products refreshed");
  }

  /**
   * 🔍 Filter deleted products (client-side)
   */
  filterDeletedProducts(searchTerm = "") {
    const categoryFilter =
      document.getElementById("deletedCategoryFilter")?.value || "";
    const dateFilter =
      document.getElementById("deletedDateFilter")?.value || "";
    const searchInput =
      searchTerm || document.getElementById("deletedSearchInput")?.value || "";

    console.log("🔍 Filtering with:", {
      searchInput,
      categoryFilter,
      dateFilter,
    });

    // Start with all products
    let filtered = [...this.allDeletedProducts];

    // ✅ 1. Apply SEARCH filter (by name or ID)
    if (searchInput && searchInput.trim()) {
      const search = searchInput.toLowerCase().trim();
      filtered = filtered.filter((shoe) => {
        const shoeName = shoe.shoe_name?.toLowerCase() || "";
        const shoeId = shoe.shoe_id?.toString() || "";
        const categoryName = (
          shoe.categories?.category_name ||
          this.getCategoryName(shoe.category_id) ||
          ""
        ).toLowerCase();

        return (
          shoeName.includes(search) ||
          shoeId.includes(search) ||
          categoryName.includes(search)
        );
      });
    }

    // ✅ 2. Apply CATEGORY filter
    if (categoryFilter) {
      filtered = filtered.filter((shoe) => {
        return shoe.category_id?.toString() === categoryFilter;
      });
    }

    // ✅ 3. Apply DATE filter (by updated_at as proxy for deleted_at)
    if (dateFilter) {
      const now = new Date();

      filtered = filtered.filter((shoe) => {
        // Use updated_at as fallback for deleted_at
        const dateToCompare = shoe.deleted_at || shoe.updated_at;

        if (!dateToCompare) return false;

        const deletedDate = new Date(dateToCompare);
        const diffMs = now - deletedDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case "today":
            return diffDays === 0;
          case "week":
            return diffDays <= 7;
          case "month":
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // Update display
    this.deletedProducts = filtered;
    this.renderDeletedProductsTable();

    // Update count display
    const resultCount = filtered.length;
    const totalCount = this.allDeletedProducts.length;

    console.log(`✅ Filter results: ${resultCount} / ${totalCount} products`);

    // Show filter result message
    if (searchInput || categoryFilter || dateFilter) {
      this.showFilterResultMessage(resultCount, totalCount);
    }
  }
  handleSearchInput(searchTerm) {
    // Clear previous timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new timer - only filter after 500ms of no typing
    this.searchDebounceTimer = setTimeout(() => {
      this.filterDeletedProducts(searchTerm);
    }, 500); // Wait 500ms after last keystroke
  }
  /**
   * 📊 Show filter result message
   */
  showFilterResultMessage(resultCount, totalCount) {
    const container = document.getElementById("deletedProductsTableContainer");
    if (!container) return;

    // Remove existing message
    const existingMsg = container.querySelector(".filter-result-message");
    if (existingMsg) existingMsg.remove();

    // Add new message if filtered
    if (resultCount < totalCount) {
      const message = document.createElement("div");
      message.className = "alert alert-info filter-result-message mb-3";
      message.innerHTML = `
      <i class="bi bi-funnel me-2"></i>
      Showing <strong>${resultCount}</strong> of <strong>${totalCount}</strong> deleted products
      <button class="btn btn-sm btn-outline-secondary ms-3" onclick="adminManager.historyManager.clearFilters()">
        <i class="bi bi-x-circle me-1"></i>Clear Filters
      </button>
    `;
      container.insertBefore(message, container.firstChild);
    }
  }
  /**
   * 🔄 Clear all filters
   */
  clearFilters() {
    // Reset form inputs
    const searchInput = document.getElementById("deletedSearchInput");
    const categoryFilter = document.getElementById("deletedCategoryFilter");
    const dateFilter = document.getElementById("deletedDateFilter");

    if (searchInput) searchInput.value = "";
    if (categoryFilter) categoryFilter.value = "";
    if (dateFilter) dateFilter.value = "";

    // Reset to all products
    this.deletedProducts = [...this.allDeletedProducts];
    this.renderDeletedProductsTable();

    // Remove filter message
    const message = document.querySelector(".filter-result-message");
    if (message) message.remove();

    console.log("✅ Filters cleared");
  }

  /**
   * ♻️ Restore single product
   */
  async restoreProduct(shoeId) {
    try {
      console.log("♻️ Restoring product:", shoeId);

      // Call API
      const response = await this.productsAPI.restoreProduct(shoeId);

      if (response.success) {
        AdminUtils.showSuccess("Product restored successfully!");
        console.log("✅ Product restored:", response);

        // Reload both deleted and active products
        await this.loadDeletedProducts();
        await this.core.loadShoes();
        if (this.productRenderer) {
          this.productRenderer.applySortByStock();
        }

        return response;
      } else {
        throw new Error(response.message || "Failed to restore product");
      }
    } catch (error) {
      console.error("❌ Restore error:", error);
      AdminUtils.showError(error.message || "Failed to restore product");
      throw error;
    }
  }

  /**
   * ♻️ Bulk restore products
   */
  async bulkRestoreProducts() {
    const checked = document.querySelectorAll(".deleted-product-check:checked");
    const ids = Array.from(checked).map((cb) => parseInt(cb.value));

    if (ids.length === 0) {
      AdminUtils.showError("No products selected");
      return;
    }

    const confirmed = confirm(`Restore ${ids.length} selected product(s)?`);
    if (!confirmed) return;

    try {
      console.log(`♻️ Bulk restoring ${ids.length} products...`);

      // Restore each product
      let successCount = 0;
      for (const id of ids) {
        try {
          await this.productsAPI.restoreProduct(id);
          successCount++;
        } catch (error) {
          console.error(`Failed to restore product ${id}:`, error);
        }
      }

      AdminUtils.showSuccess(
        `Successfully restored ${successCount} / ${ids.length} product(s)`
      );

      // Reload data
      await this.loadDeletedProducts();
      await this.core.loadShoes();
      if (this.productRenderer) {
        this.productRenderer.applySortByStock();
      }
    } catch (error) {
      console.error("Bulk restore error:", error);
      AdminUtils.showError("Failed to restore some products");
    }
  }
}
