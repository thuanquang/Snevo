// frontend/assets/js/admin/AdminProductRenderer.js
/**
 * AdminProductRenderer - Handles product table rendering and sorting
 */
class AdminProductRenderer {
  constructor(core) {
    this.core = core;
    this.currentFilters = {
      search: "",
      category: "",
      sort: "stock_desc",
    };
  }

  /**
   * 🔍 Unified filter + sort method (combines all filters)
   */
  applyFiltersAndSort() {
    console.log("📊 Applying filters and sort:", this.currentFilters);

    // Start with all products
    let filtered = [...this.core.allShoes];

    // ✅ 1. Apply SEARCH filter
    if (this.currentFilters.search && this.currentFilters.search.trim()) {
      const search = this.currentFilters.search.toLowerCase().trim();
      filtered = filtered.filter((shoe) => {
        const shoeName = shoe.shoe_name?.toLowerCase() || "";
        const shoeId = shoe.shoe_id?.toString() || "";
        return shoeName.includes(search) || shoeId.includes(search);
      });
    }

    // ✅ 2. Apply CATEGORY filter
    if (this.currentFilters.category) {
      filtered = filtered.filter((shoe) => {
        return shoe.category_id?.toString() === this.currentFilters.category;
      });
    }

    // ✅ 3. Apply SORT
    const sortValue = this.currentFilters.sort;

    switch (sortValue) {
      case "stock_desc":
        filtered.sort((a, b) => {
          const stockA = a.stock_info?.total_stock || 0;
          const stockB = b.stock_info?.total_stock || 0;
          return stockB - stockA;
        });
        break;

      case "stock_asc":
        filtered.sort((a, b) => {
          const stockA = a.stock_info?.total_stock || 0;
          const stockB = b.stock_info?.total_stock || 0;
          return stockA - stockB;
        });
        break;

      case "name_asc":
        filtered.sort((a, b) =>
          (a.shoe_name || "").localeCompare(b.shoe_name || "")
        );
        break;

      case "name_desc":
        filtered.sort((a, b) =>
          (b.shoe_name || "").localeCompare(a.shoe_name || "")
        );
        break;

      case "price_asc":
        filtered.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
        break;

      case "price_desc":
        filtered.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
        break;
    }

    // Update display
    this.core.shoes = filtered;
    this.renderShoesTable();

    // Show filter result message
    const resultCount = filtered.length;
    const totalCount = this.core.allShoes.length;

    console.log(
      `✅ Results: ${resultCount} / ${totalCount} products (sorted by ${sortValue})`
    );

    // Show/hide filter message
    if (this.currentFilters.search || this.currentFilters.category) {
      this.showFilterResultMessage(resultCount, totalCount);
    } else {
      this.removeFilterResultMessage();
    }
  }

  /**
   * 🔍 Update search filter
   */
  updateSearchFilter() {
    const searchInput = document.getElementById("inventorySearchInput");
    this.currentFilters.search = searchInput?.value || "";
    this.applyFiltersAndSort();
  }

  /**
   * 🏷️ Update category filter
   */
  updateCategoryFilter() {
    const categorySelect = document.getElementById("inventoryCategoryFilter");
    this.currentFilters.category = categorySelect?.value || "";
    this.applyFiltersAndSort();
  }

  /**
   * 📊 Update sort
   */
  updateSort() {
    const sortSelect = document.getElementById("sortSelect");
    this.currentFilters.sort = sortSelect?.value || "stock_desc";
    this.applyFiltersAndSort();
  }

  /**
   * 📊 Show filter result message
   */
  showFilterResultMessage(resultCount, totalCount) {
    const container = document.getElementById("shoesTableContainer");
    if (!container) return;

    // Remove existing message
    this.removeFilterResultMessage();

    // Add new message if filtered
    if (resultCount < totalCount) {
      const message = document.createElement("div");
      message.className = "alert alert-info filter-result-message mb-3";
      message.id = "inventoryFilterMessage";
      message.innerHTML = `
        <i class="bi bi-funnel me-2"></i>
        Showing <strong>${resultCount}</strong> of <strong>${totalCount}</strong> products
        <button class="btn btn-sm btn-outline-secondary ms-3" 
                onclick="adminManager.productRenderer.clearFilters()">
          <i class="bi bi-x-circle me-1"></i>Clear Filters
        </button>
      `;
      container.insertBefore(message, container.firstChild);
    }
  }

  /**
   * 🗑️ Remove filter result message
   */
  removeFilterResultMessage() {
    const message = document.getElementById("inventoryFilterMessage");
    if (message) message.remove();
  }

  /**
   * 🔄 Clear all filters
   */
  clearFilters() {
    // Reset filter state
    this.currentFilters = {
      search: "",
      category: "",
      sort: "stock_desc",
    };

    // Reset form inputs
    const searchInput = document.getElementById("inventorySearchInput");
    const categorySelect = document.getElementById("inventoryCategoryFilter");
    const sortSelect = document.getElementById("sortSelect");

    if (searchInput) searchInput.value = "";
    if (categorySelect) categorySelect.value = "";
    if (sortSelect) sortSelect.value = "stock_desc";

    // Apply default state
    this.applyFiltersAndSort();

    // Remove filter message
    this.removeFilterResultMessage();

    console.log("✅ Filters cleared");
  }

  /**
   * 🏷️ Populate category filter dropdown
   */
  populateCategoryFilter() {
    const filterSelect = document.getElementById("inventoryCategoryFilter");
    if (!filterSelect || !this.core.categories) return;

    // Build options from categories
    const options = this.core.categories
      .map((cat) => {
        return `<option value="${cat.category_id}">${cat.category_name}</option>`;
      })
      .join("");

    filterSelect.innerHTML = `
      <option value="">All Categories</option>
      ${options}
    `;

    // ✅ Restore selected category after re-populate
    if (this.currentFilters.category) {
      filterSelect.value = this.currentFilters.category;
    }

    console.log(
      "✅ Category filter populated with",
      this.core.categories.length,
      "categories"
    );
  }

  /**
   * 📊 Apply default sort after loading
   */
  applySortByStock() {
    console.log("📊 Applying default sort: stock_desc");
    this.currentFilters.sort = "stock_desc";
    this.applyFiltersAndSort();
  }

  /**
   * Render Shoes Table with Total Stock
   */
  renderShoesTable() {
    const container = document.getElementById("shoesTableContainer");
    if (!container) return;

    if (this.core.categories && this.core.categories.length > 0) {
      this.populateCategoryFilter();
    }

    if (!this.core.shoes || this.core.shoes.length === 0) {
      container.innerHTML = this.renderEmptyState(
        "No shoes found",
        "shoe-prints"
      );
      return;
    }

    container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 80px">Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Total Stock</th>
                            <th>Status</th>
                            <th style="width: 250px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.core.shoes
                          .map((shoe) => this.renderShoeRow(shoe))
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  }

  /**
   * Render a single shoe row
   */
  renderShoeRow(shoe) {
    const totalStock = shoe.stock_info?.total_stock || 0;
    const variantCount = shoe.stock_info?.variant_count || 0;
    const category = this.core.categories.find(
      (c) => c.category_id === shoe.category_id
    );
    const statusClass = totalStock > 0 ? "success" : "danger";
    const statusText = totalStock > 0 ? "In Stock" : "Out of Stock";

    return `
            <tr style="cursor: pointer;" 
                onclick="adminManager.viewShoeDetails(${shoe.shoe_id})"
                title="Click to view details">
                <td>
                    <img src="${
                      shoe.image_url || "/assets/images/placeholder.png"
                    }" 
                         alt="${shoe.shoe_name}" 
                         class="img-thumbnail"
                         style="width: 60px; height: 60px; object-fit: cover">
                </td>
                <td>
                    <strong>${shoe.shoe_name}</strong>
                    <br>
                    <small class="text-muted">ID: ${shoe.shoe_id}</small>
                </td>
                <td>${category?.category_name || "N/A"}</td>
                <td>${this.formatPrice(shoe.base_price)}</td>
                <td>
                    <span class="badge ${
                      totalStock > 10
                        ? "bg-success"
                        : totalStock > 0
                        ? "bg-warning text-dark"
                        : "bg-danger"
                    } fs-6">
                        ${totalStock}
                    </span>
                    ${
                      variantCount > 0
                        ? `<br><small class="text-muted">${variantCount} variants</small>`
                        : ""
                    }
                </td>
                <td>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </td>
                <td onclick="event.stopPropagation()">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-primary" 
                                onclick="event.stopPropagation(); adminManager.handleImport(${
                                  shoe.shoe_id
                                });"
                                title="Import Stock">
                            <i class="bi bi-box-arrow-in-down"></i>
                        </button>
                        <button class="btn btn-warning" 
                                onclick="event.stopPropagation(); adminManager.editShoe(${
                                  shoe.shoe_id
                                });"
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" 
                                onclick="event.stopPropagation(); adminManager.deleteShoe(${
                                  shoe.shoe_id
                                });"
                                title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
  }

  /**
   * Render empty state
   */
  renderEmptyState(message, icon) {
    return `
            <div class="text-center py-5">
                <i class="bi bi-${icon} display-1 text-muted"></i>
                <p class="text-muted mt-3">${message}</p>
            </div>
        `;
  }

  /**
   * Format price
   */
  formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  }
}
