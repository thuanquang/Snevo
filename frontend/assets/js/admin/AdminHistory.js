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
}
