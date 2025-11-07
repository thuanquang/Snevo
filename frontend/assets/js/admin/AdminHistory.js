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
    this.deletedVariants = [];
    this.filteredVariants = [];
    this.groupedByShoe = {};
    this.colors = [];
    this.sizes = [];
    this.variantFilters = {
      search: "",
      color: "",
      size: "",
      status: "",
      shoeStatus: "",
    };
    // ✅ Add global import history data
    this.allGlobalImports = [];
    this.filteredGlobalImports = [];
  }
  /**
   * ⭐ Setup listener for Import History tab
   * Called by AdminManager during initialization
   */
  setupGlobalImportHistoryListener() {
    // ✅ Find tab button for OLD HTML (data-bs-target="#import-history-main")
    const importHistoryTab = document.querySelector(
      '[data-bs-target="#import-history-main"]'
    );

    if (!importHistoryTab) {
      console.warn("⚠️ Import History tab button not found");
      return;
    }

    // Remove existing listeners to prevent duplicates
    const newTab = importHistoryTab.cloneNode(true);
    importHistoryTab.parentNode.replaceChild(newTab, importHistoryTab);

    // Add new listener for Bootstrap tab shown event
    newTab.addEventListener("shown.bs.tab", async () => {
      console.log("📦 Import History tab activated");

      try {
        await this.loadGlobalImportHistory();
      } catch (error) {
        console.error("❌ Error loading import history on tab show:", error);
        AdminUtils.showError("Failed to load import history");
      }
    });

    console.log("✅ Import History tab listener setup complete");
  }
  /**
   * Setup tab listeners for History section
   */
  setupHistoryTabListeners() {
    console.log("🔄 Setting up History tab listeners...");

    // Deleted Products Tab
    const deletedProductsTab = document.querySelector(
      '[data-bs-target="#deleted-products"]'
    );
    if (deletedProductsTab) {
      deletedProductsTab.addEventListener("shown.bs.tab", async () => {
        console.log("🗑️ Deleted Products tab activated");
        await this.loadDeletedProducts();
      });
      console.log("✅ Deleted Products tab listener setup");
    }

    // Deleted Variants Tab
    const deletedVariantsTab = document.querySelector(
      '[data-bs-target="#deleted-variants"]'
    );
    if (deletedVariantsTab) {
      deletedVariantsTab.addEventListener("shown.bs.tab", async () => {
        console.log("📦 Deleted Variants tab activated");
        await this.loadDeletedVariants();
      });
      console.log("✅ Deleted Variants tab listener setup");
    } else {
      console.warn("⚠️ Deleted Variants tab button not found!");
    }

    console.log("✅ History tab listeners setup complete");
  }

  /**
   * 🔄 Load deleted products (including products without variants)
   */
  async loadDeletedProducts() {
    try {
      console.log("🔄 Loading deleted products...");

      // Fetch products with is_active = false
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
      this.allDeletedProducts = [...this.deletedProducts];

      console.log(
        `✅ Loaded ${this.deletedProducts.length} deleted products:`,
        this.deletedProducts
      );

      // ⭐ Update badge counts with NULL CHECK
      const count = this.deletedProducts.length;

      const deletedProductsCountEl = document.getElementById(
        "deletedProductsCount"
      );
      if (deletedProductsCountEl) {
        deletedProductsCountEl.textContent = count;
      } else {
        console.warn("⚠️ deletedProductsCount element not found");
      }

      const deletedCountEl = document.getElementById("deletedCount");
      if (deletedCountEl) {
        deletedCountEl.textContent = count;
      } else {
        console.warn("⚠️ deletedCount element not found");
      }

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
  /**
   * 📦 Load global import history (grouped by shoes)
   * Shows list of shoes with import counts, expandable to see details
   */
  async loadGlobalImportHistory() {
    try {
      console.log("📦 Loading global import history (grouped by shoes)...");

      // Show loading
      const container = document.getElementById("importHistoryContainerMain");
      if (container) {
        container.innerHTML = `
        <div class="loading-container text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Loading import history...</p>
        </div>
      `;
      }

      // ✅ Fetch ALL import history
      const response = await window.importsAPI.getAllImportHistory(
        {},
        { limit: 10000 }
      );

      console.log("Import history response:", response);

      if (response.success && response.data) {
        this.allGlobalImports = response.data.map((imp) => ({
          import_id: imp.import_id,
          shoe_id: imp.variant?.shoe?.shoe_id,
          shoe_name: imp.variant?.shoe?.shoe_name || "Unknown Product",
          shoe_image: imp.variant?.shoe?.image_url,
          variant_id: imp.variant_id,
          color_name: imp.variant?.color?.color_name || "N/A",
          size_value: imp.variant?.size?.size_value || "N/A",
          sku: imp.variant?.sku || "N/A",
          import_quantity: imp.quantity_imported || 0,
          import_price: imp.import_price || 0,
          import_date: imp.import_date || imp.created_at,
          imported_by_id: imp.user_id,
          imported_by_name:
            imp.user?.full_name || imp.user?.username || "System",
          notes: imp.notes || "",
          created_at: imp.created_at,
        }));

        // Sort by date (newest first)
        this.allGlobalImports.sort(
          (a, b) => new Date(b.import_date) - new Date(a.import_date)
        );

        this.filteredGlobalImports = [...this.allGlobalImports];

        // ✅ Group imports by shoe
        this.groupImportsByShoe();

        // Render UI
        this.renderImportShoeList();
        this.updateGlobalImportStats();
        this.populateGlobalUserFilter();

        console.log(
          `✅ Loaded ${this.allGlobalImports.length} imports from ${this.shoeImportGroups.length} shoes`
        );
      } else {
        throw new Error(response.message || "Failed to load import history");
      }
    } catch (error) {
      console.error("❌ Load global import history error:", error);

      const container = document.getElementById("importHistoryContainerMain");
      if (container) {
        container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Error loading import history:</strong> ${AdminUtils.escapeHtml(
            error.message
          )}
        </div>
      `;
      }

      AdminUtils.showError("Failed to load import history");
    }
  }

  /**
   * 📦 Group imports by shoe
   */
  groupImportsByShoe() {
    const shoeMap = {};

    this.filteredGlobalImports.forEach((imp) => {
      if (!shoeMap[imp.shoe_id]) {
        shoeMap[imp.shoe_id] = {
          shoe_id: imp.shoe_id,
          shoe_name: imp.shoe_name,
          shoe_image: imp.shoe_image,
          total_imports: 0,
          total_quantity: 0,
          total_cost: 0,
          latest_import_date: imp.import_date,
          imports: [],
        };
      }

      shoeMap[imp.shoe_id].total_imports++;
      shoeMap[imp.shoe_id].total_quantity += imp.import_quantity;
      shoeMap[imp.shoe_id].total_cost += imp.import_price * imp.import_quantity;
      shoeMap[imp.shoe_id].imports.push(imp);

      // Track latest import
      if (
        new Date(imp.import_date) >
        new Date(shoeMap[imp.shoe_id].latest_import_date)
      ) {
        shoeMap[imp.shoe_id].latest_import_date = imp.import_date;
      }
    });

    // Convert to array and sort by latest import date
    this.shoeImportGroups = Object.values(shoeMap).sort(
      (a, b) => new Date(b.latest_import_date) - new Date(a.latest_import_date)
    );

    console.log("📦 Grouped into", this.shoeImportGroups.length, "shoes");
  }

  /**
   * 🎨 Render shoe list (accordion style)
   */
  renderImportShoeList() {
    const container = document.getElementById("importHistoryContainerMain");
    if (!container) return;

    if (this.shoeImportGroups.length === 0) {
      container.innerHTML = `
      <div class="empty-state text-center py-5">
        <i class="bi bi-inbox display-1 text-muted"></i>
        <h5 class="mt-3">No Import History Found</h5>
        <p class="text-muted">No imports match your current filters.</p>
      </div>
    `;
      return;
    }

    const html = `
    <div class="accordion" id="importAccordion">
      ${this.shoeImportGroups
        .map((group, index) => this.renderShoeAccordionItem(group, index))
        .join("")}
    </div>
  `;

    container.innerHTML = html;

    // Hide empty state
    const emptyState = document.getElementById("globalImportHistoryEmpty");
    if (emptyState) emptyState.style.display = "none";
  }

  /**
   * 🎨 Render single shoe accordion item
   */
  renderShoeAccordionItem(group, index) {
    const isFirstItem = index === 0;

    return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button 
          class="accordion-button ${isFirstItem ? "" : "collapsed"}" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#collapse-${group.shoe_id}"
          aria-expanded="${isFirstItem}"
          aria-controls="collapse-${group.shoe_id}"
        >
          <div class="d-flex align-items-center w-100">
            ${
              group.shoe_image
                ? `
              <img 
                src="${AdminUtils.escapeHtml(group.shoe_image)}" 
                alt="${AdminUtils.escapeHtml(group.shoe_name)}"
                class="me-3"
                style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
              >
            `
                : `
              <div class="bg-secondary me-3 d-flex align-items-center justify-content-center" 
                   style="width: 50px; height: 50px; border-radius: 4px;">
                <i class="bi bi-image text-white"></i>
              </div>
            `
            }
            
            <div class="flex-grow-1">
              <div class="fw-semibold">${AdminUtils.escapeHtml(
                group.shoe_name
              )}</div>
              <div class="small text-muted">
                ${group.total_imports} imports • 
                ${group.total_quantity} units • 
                ${AdminUtils.formatCurrency(group.total_cost)} total cost
              </div>
            </div>
            
            <div class="text-end me-3">
              <span class="badge bg-primary">${
                group.total_imports
              } imports</span>
              <div class="small text-muted mt-1">
                Latest: ${AdminUtils.formatDate(group.latest_import_date)}
              </div>
            </div>
          </div>
        </button>
      </h2>
      <div 
        id="collapse-${group.shoe_id}" 
        class="accordion-collapse collapse ${isFirstItem ? "show" : ""}" 
        data-bs-parent="#importAccordion"
      >
        <div class="accordion-body">
          ${this.renderShoeImportDetails(group)}
        </div>
      </div>
    </div>
  `;
  }

  /**
   * 🎨 Render import details table for a shoe
   */
  renderShoeImportDetails(group) {
    return `
    <div class="table-responsive">
      <table class="table table-sm table-hover">
        <thead>
          <tr>
            <th>Date</th>
            <th>Variant</th>
            <th>SKU</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total Cost</th>
            <th>Imported By</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${group.imports
            .map(
              (imp) => `
            <tr>
              <td>
                <small>${AdminUtils.formatDate(imp.import_date)}</small>
              </td>
              <td>
                <span class="badge bg-light text-dark border">
                  ${AdminUtils.escapeHtml(
                    imp.color_name
                  )} / ${AdminUtils.escapeHtml(imp.size_value)}
                </span>
              </td>
              <td>
                <code class="small">${AdminUtils.escapeHtml(imp.sku)}</code>
              </td>
              <td class="text-center">
                <span class="badge bg-info">${imp.import_quantity}</span>
              </td>
              <td class="text-end">
                ${AdminUtils.formatCurrency(imp.import_price)}
              </td>
              <td class="text-end fw-semibold">
                ${AdminUtils.formatCurrency(
                  imp.import_price * imp.import_quantity
                )}
              </td>
              <td>
                <small>${AdminUtils.escapeHtml(imp.imported_by_name)}</small>
              </td>
              <td>
                <small class="text-muted">
                  ${imp.notes ? AdminUtils.escapeHtml(imp.notes) : "-"}
                </small>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr class="table-light fw-semibold">
            <td colspan="3" class="text-end">Subtotal:</td>
            <td class="text-center">${group.total_quantity} units</td>
            <td></td>
            <td class="text-end">${AdminUtils.formatCurrency(
              group.total_cost
            )}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  }

  /**
   * 🔍 Handle global import filters - OLD HTML VERSION
   */
  filterGlobalImportHistory() {
    // ✅ OLD HTML IDs
    const searchInput = document.getElementById("globalImportSearchInput");
    const userFilter = document.getElementById("globalImportUserFilter");
    const startDate = document.getElementById("globalImportStartDate");
    const endDate = document.getElementById("globalImportEndDate");

    const searchTerm = searchInput?.value.toLowerCase() || "";
    const selectedUser = userFilter?.value || "";
    const dateStart = startDate?.value || "";
    const dateEnd = endDate?.value || "";

    console.log("🔍 Filtering imports:", {
      searchTerm,
      selectedUser,
      dateStart,
      dateEnd,
    });

    this.filteredGlobalImports = this.allGlobalImports.filter((imp) => {
      // ✅ Search shoe name, color, size
      const matchesSearch =
        !searchTerm ||
        imp.shoe_name.toLowerCase().includes(searchTerm) ||
        imp.color_name.toLowerCase().includes(searchTerm) ||
        imp.size_value.toLowerCase().includes(searchTerm);

      // ✅ Filter by user
      const matchesUser = !selectedUser || imp.imported_by_id === selectedUser;

      // ✅ Filter by date range
      const importDate = new Date(imp.import_date);
      const matchesStartDate = !dateStart || importDate >= new Date(dateStart);
      const matchesEndDate =
        !dateEnd || importDate <= new Date(dateEnd + " 23:59:59");

      return matchesSearch && matchesUser && matchesStartDate && matchesEndDate;
    });

    // Re-group and render
    this.groupImportsByShoe();
    this.renderImportShoeList();
    this.updateGlobalImportStats();

    console.log(
      `✅ Filtered to ${this.filteredGlobalImports.length} imports in ${this.shoeImportGroups.length} shoes`
    );
  }

  /**
   * 📊 Update stats
   */
  updateGlobalImportStats() {
    const totalImports = this.filteredGlobalImports.length;
    const totalQuantity = this.filteredGlobalImports.reduce(
      (sum, imp) => sum + imp.import_quantity,
      0
    );
    const totalCost = this.filteredGlobalImports.reduce(
      (sum, imp) => sum + imp.import_price * imp.import_quantity,
      0
    );
    const totalShoes = this.shoeImportGroups.length;

    // ✅ Update stat cards with OLD HTML IDs
    const totalImportsEl = document.getElementById("globalTotalImportsCount");
    const totalQtyEl = document.getElementById("globalTotalImportQty");
    const totalValueEl = document.getElementById("globalTotalImportValue");
    const totalShoesEl = document.getElementById("globalUniqueProductsCount");

    if (totalImportsEl) totalImportsEl.textContent = totalImports;
    if (totalQtyEl) totalQtyEl.textContent = totalQuantity;
    if (totalValueEl)
      totalValueEl.textContent = AdminUtils.formatCurrency(totalCost);
    if (totalShoesEl) totalShoesEl.textContent = totalShoes;
  }

  /**
   * 🔍 Populate user filter dropdown
   */
  populateGlobalUserFilter() {
    // ✅ OLD HTML ID
    const select = document.getElementById("globalImportUserFilter");
    if (!select) return;

    // Get unique users
    const users = [
      ...new Map(
        this.allGlobalImports.map((imp) => [
          imp.imported_by_id,
          {
            id: imp.imported_by_id,
            name: imp.imported_by_name,
          },
        ])
      ).values(),
    ];

    select.innerHTML = `
    <option value="">All Users</option>
    ${users
      .map(
        (user) => `
      <option value="${user.id}">${AdminUtils.escapeHtml(user.name)}</option>
    `
      )
      .join("")}
  `;
  }
  /**
   * 🧹 Clear all filters - OLD HTML IDs
   */
  clearGlobalImportFilters() {
    // ✅ Clear all inputs with OLD HTML IDs
    const searchInput = document.getElementById("globalImportSearchInput");
    const userFilter = document.getElementById("globalImportUserFilter");
    const startDate = document.getElementById("globalImportStartDate");
    const endDate = document.getElementById("globalImportEndDate");

    if (searchInput) searchInput.value = "";
    if (userFilter) userFilter.value = "";
    if (startDate) startDate.value = "";
    if (endDate) endDate.value = "";

    // Reset to all data
    this.filteredGlobalImports = [...this.allGlobalImports];
    this.groupImportsByShoe();
    this.renderImportShoeList();
    this.updateGlobalImportStats();

    console.log("✅ Filters cleared");
  }

  /**
   * 📤 Export import history to CSV
   */
  exportImportHistory() {
    if (this.filteredGlobalImports.length === 0) {
      AdminUtils.showError("No data to export");
      return;
    }

    // CSV headers
    const headers = [
      "Date",
      "Shoe Name",
      "Color",
      "Size",
      "SKU",
      "Quantity",
      "Unit Price",
      "Total Cost",
      "Imported By",
      "Notes",
    ];

    // CSV rows
    const rows = this.filteredGlobalImports.map((imp) => [
      AdminUtils.formatDate(imp.import_date),
      imp.shoe_name,
      imp.color_name,
      imp.size_value,
      imp.sku,
      imp.import_quantity,
      imp.import_price,
      imp.import_price * imp.import_quantity,
      imp.imported_by_name,
      imp.notes || "",
    ]);

    // Generate CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `import-history-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();

    AdminUtils.showSuccess("Import history exported successfully");
  }
  /**
   * 📅 Check if date matches filter
   */
  matchesDateFilter(dateString, filter) {
    if (filter === "all") return true;

    const date = new Date(dateString);
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    switch (filter) {
      case "today":
        return date.toDateString() === now.toDateString();
      case "week":
        return now - date <= 7 * dayMs;
      case "month":
        return now - date <= 30 * dayMs;
      case "quarter":
        return now - date <= 90 * dayMs;
      default:
        return true;
    }
  }
  /**
   * ========================================
   * DELETED VARIANTS MANAGEMENT (NEW)
   * ========================================
   */

  /**
   * Load deleted variants grouped by shoe
   */
  async loadDeletedVariants() {
    try {
      console.log("🔄 Loading deleted variants...");

      const loadingEl = document.getElementById("deleted-variants-loading");
      const listEl = document.getElementById("deleted-variants-list");
      const emptyEl = document.getElementById("deleted-variants-empty");

      if (!listEl) {
        console.error("❌ deleted-variants-list not found");
        return;
      }

      // ✅ SHOW LOADING - Hide everything else
      if (loadingEl) loadingEl.classList.remove("d-none");
      if (emptyEl) emptyEl.classList.add("d-none");
      listEl.innerHTML = "";

      // Check API availability
      if (!window.variantsAPI) {
        console.error("❌ variantsAPI not available");
        if (loadingEl) loadingEl.classList.add("d-none");
        AdminUtils.showError("API not initialized");
        return;
      }

      // Fetch data
      const response = await window.variantsAPI.getAllDeletedVariants();
      console.log("✅ Response:", response);

      const shoesData = response.data.shoes || [];
      const stats = response.data.statistics || {};

      // Group by shoe
      this.groupedByShoe = shoesData.reduce((acc, item) => {
        acc[item.shoe.shoe_id] = {
          shoe: item.shoe,
          variants: item.deleted_variants,
        };
        return acc;
      }, {});

      // Flatten for filtering
      this.deletedVariants = shoesData.flatMap((item) =>
        item.deleted_variants.map((v) => ({
          ...v,
          shoe: item.shoe,
        }))
      );

      this.filteredVariants = [...this.deletedVariants];

      console.log(
        `✅ Loaded ${this.deletedVariants.length} deleted variants from ${shoesData.length} shoes`
      );

      // Load filters
      await this.loadVariantFilterOptions();
      this.setupVariantFilterListeners();

      // ✅ HIDE LOADING
      if (loadingEl) loadingEl.classList.add("d-none");

      // ✅ CHECK IF EMPTY
      if (this.deletedVariants.length === 0) {
        // Show empty state
        if (emptyEl) emptyEl.classList.remove("d-none");
        listEl.innerHTML = "";
      } else {
        // Show data
        if (emptyEl) emptyEl.classList.add("d-none");
        this.renderDeletedVariants();
      }

      this.updateVariantStats();
    } catch (error) {
      console.error("❌ Failed to load deleted variants:", error);

      // ✅ HIDE LOADING on error
      const loadingEl = document.getElementById("deleted-variants-loading");
      if (loadingEl) loadingEl.classList.add("d-none");

      AdminUtils.showError("Failed to load deleted variants: " + error.message);
    }
  }

  /**
   * Load colors and sizes for filters
   */
  async loadVariantFilterOptions() {
    try {
      const [colorsRes, sizesRes] = await Promise.all([
        window.productsAPI.getColors(),
        window.productsAPI.getSizes(),
      ]);

      this.colors = colorsRes.data || [];
      this.sizes = sizesRes.data || [];

      // Populate dropdowns
      const colorSelect = document.getElementById("deleted-color-filter");
      if (colorSelect) {
        colorSelect.innerHTML =
          '<option value="">All Colors</option>' +
          this.colors
            .map(
              (c) => `<option value="${c.color_id}">${c.color_name}</option>`
            )
            .join("");
      }

      const sizeSelect = document.getElementById("deleted-size-filter");
      if (sizeSelect) {
        sizeSelect.innerHTML =
          '<option value="">All Sizes</option>' +
          this.sizes
            .map((s) => `<option value="${s.size_id}">${s.size_value}</option>`)
            .join("");
      }
    } catch (error) {
      console.error("Failed to load filter options:", error);
    }
  }

  /**
   * Setup filter event listeners
   */
  setupVariantFilterListeners() {
    document
      .getElementById("deleted-search-input")
      ?.addEventListener("input", (e) => {
        this.variantFilters.search = e.target.value;
        this.applyVariantFilters();
      });

    document
      .getElementById("deleted-color-filter")
      ?.addEventListener("change", (e) => {
        this.variantFilters.color = e.target.value;
        this.applyVariantFilters();
      });

    document
      .getElementById("deleted-size-filter")
      ?.addEventListener("change", (e) => {
        this.variantFilters.size = e.target.value;
        this.applyVariantFilters();
      });

    document
      .getElementById("deleted-status-filter")
      ?.addEventListener("change", (e) => {
        this.variantFilters.status = e.target.value;
        this.applyVariantFilters();
      });

    document
      .getElementById("deleted-shoe-status-filter")
      ?.addEventListener("change", (e) => {
        this.variantFilters.shoeStatus = e.target.value;
        this.applyVariantFilters();
      });
  }

  /**
   * Apply filters
   */
  applyVariantFilters() {
    this.filteredVariants = this.deletedVariants.filter((variant) => {
      // Search
      if (this.variantFilters.search) {
        const search = this.variantFilters.search.toLowerCase();
        const matchShoe = variant.shoe.shoe_name
          ?.toLowerCase()
          .includes(search);
        const matchSku = variant.sku?.toLowerCase().includes(search);
        if (!matchShoe && !matchSku) return false;
      }

      // Color
      if (
        this.variantFilters.color &&
        variant.color_id != this.variantFilters.color
      ) {
        return false;
      }

      // Size
      if (
        this.variantFilters.size &&
        variant.size_id != this.variantFilters.size
      ) {
        return false;
      }

      // Status
      if (this.variantFilters.status) {
        const canRestore = variant.shoe.is_active;
        if (this.variantFilters.status === "restorable" && !canRestore)
          return false;
        if (this.variantFilters.status === "blocked" && canRestore)
          return false;
      }

      // Shoe Status
      if (this.variantFilters.shoeStatus) {
        if (
          this.variantFilters.shoeStatus === "active" &&
          !variant.shoe.is_active
        )
          return false;
        if (
          this.variantFilters.shoeStatus === "deleted" &&
          variant.shoe.is_active
        )
          return false;
      }

      return true;
    });

    this.renderDeletedVariants();
    this.renderVariantActiveFilters();
    this.updateVariantStats();
  }

  /**
   * Render active filters
   */
  renderVariantActiveFilters() {
    const container = document.getElementById("deleted-active-filters");
    if (!container) return;

    const badges = [];

    if (this.variantFilters.search) {
      badges.push({
        key: "search",
        label: `Search: "${this.variantFilters.search}"`,
      });
    }
    if (this.variantFilters.color) {
      const color = this.colors.find(
        (c) => c.color_id == this.variantFilters.color
      );
      badges.push({ key: "color", label: `Color: ${color?.color_name}` });
    }
    if (this.variantFilters.size) {
      const size = this.sizes.find(
        (s) => s.size_id == this.variantFilters.size
      );
      badges.push({ key: "size", label: `Size: ${size?.size_value}` });
    }
    if (this.variantFilters.status) {
      const label =
        this.variantFilters.status === "restorable"
          ? "✅ Restorable"
          : "❌ Blocked";
      badges.push({ key: "status", label });
    }
    if (this.variantFilters.shoeStatus) {
      const label =
        this.variantFilters.shoeStatus === "active"
          ? "Active Shoes"
          : "Deleted Shoes";
      badges.push({ key: "shoeStatus", label });
    }

    if (badges.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <small class="text-muted">Active Filters:</small>
      ${badges
        .map(
          (b) => `
        <span class="badge bg-primary">
          ${b.label}
          <button 
            type="button" 
            class="btn-close btn-close-white btn-sm ms-1" 
            style="font-size: 0.6rem;"
            onclick="window.adminHistory.clearVariantFilter('${b.key}')"
          ></button>
        </span>
      `
        )
        .join("")}
      <button 
        class="btn btn-sm btn-outline-secondary"
        onclick="window.adminHistory.clearAllVariantFilters()"
      >
        Clear All
      </button>
    </div>
  `;
  }

  /**
   * Clear specific filter
   */
  clearVariantFilter(key) {
    this.variantFilters[key] = "";

    const elementMap = {
      search: "deleted-search-input",
      color: "deleted-color-filter",
      size: "deleted-size-filter",
      status: "deleted-status-filter",
      shoeStatus: "deleted-shoe-status-filter",
    };

    const el = document.getElementById(elementMap[key]);
    if (el) el.value = "";

    this.applyVariantFilters();
  }

  /**
   * Clear all filters
   */
  clearAllVariantFilters() {
    this.variantFilters = {
      search: "",
      color: "",
      size: "",
      status: "",
      shoeStatus: "",
    };

    document.getElementById("deleted-search-input").value = "";
    document.getElementById("deleted-color-filter").value = "";
    document.getElementById("deleted-size-filter").value = "";
    document.getElementById("deleted-status-filter").value = "";
    document.getElementById("deleted-shoe-status-filter").value = "";

    this.applyVariantFilters();
  }

  /**
   * Update statistics
   */
  updateVariantStats() {
    const total = this.filteredVariants.length;
    const restorable = this.filteredVariants.filter(
      (v) => v.shoe.is_active
    ).length;
    const blocked = total - restorable;

    document.getElementById("deleted-total-count").textContent = total;
    document.getElementById("deleted-restorable-count").textContent =
      restorable;
    document.getElementById("deleted-blocked-count").textContent = blocked;
  }

  /**
   * Render variants grouped by shoe
   */
  renderDeletedVariants() {
    const container = document.getElementById("deleted-variants-list");
    const emptyState = document.getElementById("deleted-variants-empty");

    if (!container) return;

    // Group filtered variants
    const grouped = this.filteredVariants.reduce((acc, v) => {
      const shoeId = v.shoe.shoe_id;
      if (!acc[shoeId]) {
        acc[shoeId] = { shoe: v.shoe, variants: [] };
      }
      acc[shoeId].variants.push(v);
      return acc;
    }, {});

    // ✅ CHECK IF EMPTY after filtering
    if (Object.keys(grouped).length === 0) {
      container.innerHTML = "";
      if (emptyState) emptyState.classList.remove("d-none");
      return;
    }

    // ✅ SHOW DATA - Hide empty state
    if (emptyState) emptyState.classList.add("d-none");

    // Render groups
    container.innerHTML = Object.values(grouped)
      .map((group) => this.renderVariantShoeGroup(group))
      .join("");
  }

  /**
   * Render shoe group
   */
  renderVariantShoeGroup(group) {
    const { shoe, variants } = group;
    const restorableCount = variants.filter((v) => shoe.is_active).length;
    const blockedCount = variants.length - restorableCount;

    return `
    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-header bg-white border-bottom">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <img 
              src="${shoe.image_url}" 
              alt="${shoe.shoe_name}"
              class="rounded"
              style="width: 60px; height: 60px; object-fit: cover;"
              
            />
            <div>
              <h5 class="mb-1">
                ${shoe.shoe_name}
                ${
                  shoe.is_active
                    ? '<span class="badge bg-success ms-2">Active</span>'
                    : '<span class="badge bg-danger ms-2">Deleted</span>'
                }
              </h5>
              <div class="text-muted small">
                <span class="me-3"><i class="bi bi-hash"></i> ${
                  shoe.shoe_id
                }</span>
                <span class="me-3"><i class="bi bi-box"></i> ${
                  variants.length
                } deleted</span>
                ${
                  restorableCount > 0
                    ? `<span class="text-success me-3"><i class="bi bi-check-circle"></i> ${restorableCount} restorable</span>`
                    : ""
                }
                ${
                  blockedCount > 0
                    ? `<span class="text-warning"><i class="bi bi-exclamation-circle"></i> ${blockedCount} blocked</span>`
                    : ""
                }
              </div>
            </div>
          </div>
          ${
            !shoe.is_active
              ? `
            <button 
              class="btn btn-sm btn-outline-primary"
              onclick="window.adminHistory.restoreShoe(${shoe.shoe_id})"
            >
              <i class="bi bi-arrow-counterclockwise me-1"></i>
              Restore Shoe First
            </button>
          `
              : ""
          }
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>SKU</th>
                <th>Color</th>
                <th>Size</th>
                <th>Stock</th>
                <th>Deleted At</th>
                <th>Status</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              ${variants.map((v) => this.renderVariantRow(v, shoe)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  }

  /**
   * Render variant row
   */
  renderVariantRow(variant, shoe) {
    const canRestore = shoe.is_active;
    const tooltipMsg = !shoe.is_active
      ? "⚠️ Cannot restore: Parent shoe is deleted. Restore the shoe first."
      : "✅ Ready to restore";

    return `
    <tr>
      <td><code class="text-dark">${variant.sku}</code></td>
      <td>
        <span class="d-flex align-items-center gap-2">
          <span 
            class="rounded-circle" 
            style="width: 16px; height: 16px; background-color: ${
              variant.colors?.hex_code || "#ccc"
            }; display: inline-block;"
          ></span>
          ${variant.colors?.color_name || "N/A"}
        </span>
      </td>
      <td><span class="badge bg-secondary">${
        variant.sizes?.size_value || "N/A"
      }</span></td>
      <td><span class="text-muted">${
        variant.stock_quantity || 0
      } units</span></td>
      <td>
        <small class="text-muted">
          ${new Date(variant.deleted_at).toLocaleDateString()}
        </small>
      </td>
      <td>
        ${
          canRestore
            ? '<span class="badge bg-success">✅ Restorable</span>'
            : '<span class="badge bg-warning">❌ Blocked</span>'
        }
      </td>
      <td class="text-center">
        ${
          canRestore
            ? `
          <button 
            class="btn btn-sm btn-success"
            onclick="window.adminHistory.restoreVariant(${variant.variant_id})"
          >
            <i class="bi bi-arrow-counterclockwise"></i> Restore
          </button>
        `
            : `
          <button 
            class="btn btn-sm btn-secondary"
            disabled
            title="${tooltipMsg}"
          >
            <i class="bi bi-lock"></i> Locked
          </button>
        `
        }
      </td>
    </tr>
  `;
  }

  /**
   * Restore shoe
   */
  async restoreShoe(shoeId) {
    if (
      !confirm(
        "Restore this shoe? This will also restore variants deleted with it."
      )
    ) {
      return;
    }

    try {
      // ✅ FIX: Use productsAPI
      await window.productsAPI.restoreProduct(shoeId);
      AdminUtils.showToast("Success", "Shoe restored successfully!", "success");

      // Reload data after 1.5s
      setTimeout(() => this.loadDeletedVariants(), 1500);
    } catch (error) {
      console.error("Failed to restore shoe:", error);
      AdminUtils.showError(error.message || "Failed to restore shoe");
    }
  }

  /**
   * Restore variant
   */
  async restoreVariant(variantId) {
    if (!confirm("Restore this variant?")) {
      return;
    }

    try {
      // ✅ FIX: Use variantsAPI
      await window.variantsAPI.restoreVariant(variantId);
      AdminUtils.showToast(
        "Success",
        "Variant restored successfully!",
        "success"
      );

      // Reload data after 1.5s
      setTimeout(() => this.loadDeletedVariants(), 1500);
    } catch (error) {
      console.error("Failed to restore variant:", error);
      AdminUtils.showError(error.message || "Failed to restore variant");
    }
  }
}
