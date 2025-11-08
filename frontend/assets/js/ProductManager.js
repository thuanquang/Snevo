// frontend/assets/js/ProductManager.js
/**
 * ProductManager - Manages product listing page
 * Connects to backend API via ApiClient
 * Only loads SHOES data (no variants here - variants are for detail page)
 */

class ProductManager {
  constructor() {
    this.api = window.productsAPI;

    // State
    this.products = [];
    this.categories = [];
    this.colors = []; // ← NEW: Available colors
    this.sizes = []; // ← NEW: Available sizes
    this.currentFilters = {
      categories: [],
      minPrice: null,
      maxPrice: null,
      sizes: [], // ← NEW: Selected size IDs
      colors: [], // ← NEW: Selected color IDs
      search: null,
    };

    // NEW: Dynamic price range
    this.priceRange = {
      min: 0,
      max: 10000000, // Default, sẽ được cập nhật từ API
    };

    this.currentSort = "featured";
    this.currentPage = 1;
    this.productsPerPage = 12;
    this.totalProducts = 0;
    this.totalPages = 0;
    this.isLoading = false;
    this.priceDebounceTimer = null;
  }

  /**
   * ⭐ NEW: Load max price từ products
   */
  async loadPriceRange() {
    try {
      const response = await this.api.getProducts({
        is_active: true,
        limit: 1,
        sort_by: "base_price",
        sort_order: "desc",
      });

      if (response.success && response.data && response.data.length > 0) {
        const maxProduct = response.data[0];
        this.priceRange.max =
          Math.ceil(maxProduct.base_price / 100000) * 100000; // Làm tròn lên
      }
    } catch (error) {
      console.error("❌ Error loading price range:", error);
    }
  }

  /**
   * Initialize ProductManager
   */
  async init() {
    try {
      this.parseUrlParameters();
      this.setupEventListeners();
      // Load reference data
      await Promise.all([
        this.loadCategories(),
        this.loadColors(), // ← NEW
        this.loadSizes(), // ← NEW
        this.loadPriceRange(), // ⭐ NEW: Load price range
      ]);

      // Load products
      await this.loadProducts();

      this.updateFiltersUI();
    } catch (error) {
      console.error("❌ Failed to initialize ProductManager:", error);
      this.showError("Failed to load products. Please refresh the page.");
    }
  }
  /**
   * ⭐ NEW: Load available colors
   */
  async loadColors() {
    try {
      const response = await this.api.getColors();

      if (response.success) {
        this.colors = response.data || [];
        this.renderColorFilters();
      }
    } catch (error) {
      console.error("❌ Error loading colors:", error);
    }
  }

  /**
   * ⭐ NEW: Load available sizes
   */
  async loadSizes() {
    try {
      const response = await this.api.getSizes();

      if (response.success) {
        this.sizes = response.data || [];
        this.renderSizeFilters();
      }
    } catch (error) {
      console.error("❌ Error loading sizes:", error);
    }
  }

  /**
   * Sync navbar search input with current search filter
   */
  syncNavbarSearch() {
    const navbarSearchInput = document.getElementById("navbarSearchInput");

    if (navbarSearchInput && this.currentFilters.search) {
      navbarSearchInput.value = this.currentFilters.search;
      document.getElementById("searchNavItem")?.classList.add("active");
    }
  }

  parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Search query
    if (urlParams.has("search")) {
      this.currentFilters.search = urlParams.get("search");

      // ✅ Sync navbar search
      this.syncNavbarSearch();
    }
  }

  /**
   * Parse URL parameters
   */
  parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Search query
    if (urlParams.has("search")) {
      this.currentFilters.search = urlParams.get("search");
      const searchInput = document.getElementById("searchInput");
      if (searchInput) searchInput.value = this.currentFilters.search;
    }

    // Category filter
    if (urlParams.has("category")) {
      const categoryId = urlParams.get("category");
      this.currentFilters.categories = [categoryId];
    }

    // Sort
    if (urlParams.has("sort")) {
      this.currentSort = urlParams.get("sort");
      const sortSelect = document.getElementById("sortSelect");
      if (sortSelect) sortSelect.value = this.currentSort;
    }

    // Page
    if (urlParams.has("page")) {
      this.currentPage = parseInt(urlParams.get("page")) || 1;
    }
  }

  /**
   * Load categories from backend API
   */
  async loadCategories() {
    try {
      const response = await this.api.getCategories({ active_only: true });

      if (response.success) {
        this.categories = response.data || [];
        this.renderCategoryFilters();
      }
    } catch (error) {
      console.error("❌ Error loading categories:", error);
    }
  }
  /**
   * Load products from backend API
   */
  async loadProducts() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const params = {
        page: this.currentPage,
        limit: this.productsPerPage,
        is_active: true,
      };

      // Category filter
      if (this.currentFilters.categories.length > 0) {
        params.category_id = this.currentFilters.categories[0];
      }

      // ⭐ Price filters - chỉ gửi khi có giá trị
      if (this.currentFilters.minPrice !== null) {
        params.min_price = this.currentFilters.minPrice;
      }
      if (this.currentFilters.maxPrice !== null) {
        params.max_price = this.currentFilters.maxPrice;
      }

      // Search
      if (this.currentFilters.search) {
        params.search = this.currentFilters.search;
      }

      // ⭐ NEW: Color filter (send as comma-separated IDs)
      if (this.currentFilters.colors.length > 0) {
        params.color_ids = this.currentFilters.colors.join(",");
      }

      // ⭐ NEW: Size filter (send as comma-separated IDs)
      if (this.currentFilters.sizes.length > 0) {
        params.size_ids = this.currentFilters.sizes.join(",");
      }

      // Sorting
      const sortConfig = this.getSortConfig(this.currentSort);
      params.sort_by = sortConfig.by;
      params.sort_order = sortConfig.order;

      const response = await this.api.getProducts(params);

      if (response.success) {
        this.products = response.data || [];

        // ⭐ Fetch review stats for each product
        await this.enrichProductsWithReviews(this.products);

        if (response.pagination) {
          this.totalProducts = response.pagination.total || 0;
          this.totalPages = response.pagination.totalPages || 0;
          this.currentPage = response.pagination.page || 1;
        }

        this.renderProducts(this.products);
        this.renderPagination(this.totalPages);
        this.updateResultsCount(this.totalProducts);
      } else {
        throw new Error(response.message || "Failed to load products");
      }
    } catch (error) {
      console.error("❌ Error loading products:", error);
      this.showNoResults();
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  /**
   * ⭐ Enrich products with review statistics
   * Fetches review stats for each product and adds to product object
   */
  async enrichProductsWithReviews(products) {
    if (!products || products.length === 0) return;

    try {
      // Fetch review stats for all products in parallel
      const statsPromises = products.map((product) =>
        window.reviewsAPI
          .getProductReviewStats(product.shoe_id)
          .catch((error) => {
            console.warn(
              `Failed to fetch stats for product ${product.shoe_id}:`,
              error
            );
            return { average_rating: 0, total_reviews: 0 };
          })
      );

      const allStats = await Promise.all(statsPromises);

      // Add stats to each product
      products.forEach((product, index) => {
        product.average_rating = allStats[index]?.average_rating || 0;
        product.total_reviews = allStats[index]?.total_reviews || 0;
      });
    } catch (error) {
      console.error("❌ Error enriching products with reviews:", error);
    }
  }

  /**
   * ⭐ Render color filters - Display only color circles (no names)
   */
  renderColorFilters() {
    const container = document.getElementById("colorFilters");
    if (!container) return;

    const html = this.colors
      .map(
        (color) => `
        <div class="color-option ${
          this.currentFilters.colors.includes(color.color_id) ? "active" : ""
        }" 
            data-color-id="${color.color_id}"
            title="${color.color_name}">
          <span class="color-circle" style="background: ${
            color.hex_code
          };"></span>
        </div>
      `
      )
      .join("");

    container.innerHTML = html;
  }

  /**
   * ⭐ NEW: Render size filters
   */
  renderSizeFilters() {
    const container = document.getElementById("sizeFilters");
    if (!container) return;

    const html = this.sizes
      .map(
        (size) => `
        <button type="button" 
                class="size-option" 
                data-size-id="${size.size_id}"
                aria-label="Size ${size.size_value}">
            ${size.size_value}
        </button>
    `
      )
      .join("");

    container.innerHTML = html;
  }

  /**
   * ⭐ NEW: Toggle color filter
   */
  async toggleColorFilter(colorId) {
    const index = this.currentFilters.colors.indexOf(colorId);

    if (index > -1) {
      // Remove color
      this.currentFilters.colors.splice(index, 1);
    } else {
      // Add color
      this.currentFilters.colors.push(colorId);
    }

    // Update UI
    const colorOption = document.querySelector(`[data-color-id="${colorId}"]`);
    if (colorOption) {
      colorOption.classList.toggle("selected");
    }

    this.currentPage = 1;
    await this.loadProducts();
  }

  /**
   * ⭐ NEW: Toggle size filter
   */
  async toggleSizeFilter(sizeId) {
    const index = this.currentFilters.sizes.indexOf(sizeId);

    if (index > -1) {
      // Remove size
      this.currentFilters.sizes.splice(index, 1);
    } else {
      // Add size
      this.currentFilters.sizes.push(sizeId);
    }

    // Update UI
    this.updateSizeFiltersUI();

    // Reload products
    this.currentPage = 1;
    await this.loadProducts();
  }
  /**
   * Get sort configuration for API
   */
  getSortConfig(sortValue) {
    const sortMap = {
      featured: { by: "created_at", order: "desc" },
      price_low: { by: "base_price", order: "asc" },
      price_high: { by: "base_price", order: "desc" },
      name_asc: { by: "shoe_name", order: "asc" },
      name_desc: { by: "shoe_name", order: "desc" },
      newest: { by: "created_at", order: "desc" },
    };

    return sortMap[sortValue] || sortMap["featured"];
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // COLOR FILTER - Event Delegation
    const colorContainer = document.getElementById("colorFilters");
    if (colorContainer) {
      colorContainer.addEventListener("click", (e) => {
        const colorOption = e.target.closest(".color-option");
        if (colorOption) {
          const colorId = parseInt(colorOption.dataset.colorId);
          if (!isNaN(colorId)) {
            this.toggleColorFilter(colorId);
          }
        }
      });
    }

    document
      .querySelectorAll('#categoryFilters input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => this.handleFilterChange());
      });

    document
      .querySelectorAll('#brandFilters input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => this.handleFilterChange());
      });

    document.querySelectorAll(".size-btn input").forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.handleFilterChange());
    });

    document.querySelectorAll(".color-option").forEach((option) => {
      option.addEventListener("click", (e) => this.handleColorFilter(e));
    });

    // Price range
    const minRange = document.getElementById("minPriceRange");
    const maxRange = document.getElementById("maxPriceRange");

    if (minRange && maxRange) {
      const handler = this.handlePriceRangeChange.bind(this);
      minRange.addEventListener("input", handler);
      maxRange.addEventListener("input", handler);
    }

    // Sort change
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => this.handleSortChange(e));
    }

    // View toggle
    const gridView = document.getElementById("gridView");
    const listView = document.getElementById("listView");
    if (gridView)
      gridView.addEventListener("click", () => this.setView("grid"));
    if (listView)
      listView.addEventListener("click", () => this.setView("list"));

    // Clear filters
    const clearFilters = document.getElementById("clearFilters");
    if (clearFilters) {
      clearFilters.addEventListener("click", () => this.clearAllFilters());
    }

    // Size filter event delegation
    const sizeFiltersContainer = document.getElementById("sizeFilters");
    if (sizeFiltersContainer) {
      sizeFiltersContainer.addEventListener("click", (e) => {
        const sizeBtn = e.target.closest(".size-option");
        if (sizeBtn) {
          const sizeId = parseInt(sizeBtn.dataset.sizeId);
          this.toggleSizeFilter(sizeId);
        }
      });
    }
    // ⭐ Product card click handler
    const productsGrid = document.getElementById("productsGrid");
    if (productsGrid) {
      productsGrid.addEventListener("click", (e) => {
        const productCard = e.target.closest(".product-card");
        if (productCard) {
          const productId = productCard.dataset.productId;
          if (productId) {
            window.location.href = `product-detail.html?id=${productId}`;
          }
        }
      });
    }
  }

  /**
   * Handle filter change
   */
  async handleFilterChange() {
    this.updateFiltersFromUI();
    this.currentPage = 1;
    await this.loadProducts();
    this.updateUrl();
  }

  /**
   * Handle color filter
   */
  async handleColorFilter(e) {
    const colorOption = e.target;
    const color = colorOption.dataset.color;

    colorOption.classList.toggle("selected");

    if (colorOption.classList.contains("selected")) {
      if (!this.currentFilters.colors.includes(color)) {
        this.currentFilters.colors.push(color);
      }
    } else {
      this.currentFilters.colors = this.currentFilters.colors.filter(
        (c) => c !== color
      );
    }

    this.currentPage = 1;
    await this.loadProducts();
  }

  /**
   * ⭐ Initialize Price Range UI với giá trị động
   */
  initializePriceRangeUI() {
    const minRange = document.getElementById("minPriceRange");
    const maxRange = document.getElementById("maxPriceRange");
    const minDisplay = document.getElementById("minPriceDisplay");
    const maxDisplay = document.getElementById("maxPriceDisplay");

    if (!minRange || !maxRange || !minDisplay || !maxDisplay) {
      console.warn("⚠️ Price range elements not found");
      return;
    }

    // Set max values
    minRange.max = this.priceRange.max;
    maxRange.max = this.priceRange.max;

    // ⭐ Set initial values (không filter)
    minRange.value = this.priceRange.min;
    maxRange.value = this.priceRange.max;

    // Set initial display
    minDisplay.textContent = this.formatPrice(this.priceRange.min);
    maxDisplay.textContent = this.formatPrice(this.priceRange.max);

    // ⭐ IMPORTANT: Không set filters ban đầu
    this.currentFilters.minPrice = null;
    this.currentFilters.maxPrice = null;

    // Initialize slider track position
    this.updateSliderTrack();
  }

  /**
   * Update slider track position based on thumb values
   */
  updateSliderTrack() {
    const minRange = document.getElementById("minPriceRange");
    const maxRange = document.getElementById("maxPriceRange");
    const sliderTrack = document.getElementById("sliderTrack");

    if (!minRange || !maxRange || !sliderTrack) return;

    const min = parseInt(minRange.value);
    const max = parseInt(maxRange.value);
    const rangeMin = parseInt(minRange.min);
    const rangeMax = parseInt(minRange.max);

    const percentMin = ((min - rangeMin) / (rangeMax - rangeMin)) * 100;
    const percentMax = ((max - rangeMin) / (rangeMax - rangeMin)) * 100;

    sliderTrack.style.left = percentMin + "%";
    sliderTrack.style.width = percentMax - percentMin + "%";
  }

  /**
   * ⭐ Unified price range handler với logic fixed
   */
  handlePriceRangeChange() {
    const minRange = document.getElementById("minPriceRange");
    const maxRange = document.getElementById("maxPriceRange");
    const minDisplay = document.getElementById("minPriceDisplay");
    const maxDisplay = document.getElementById("maxPriceDisplay");

    if (!minRange || !maxRange) return;

    let minVal = parseInt(minRange.value);
    let maxVal = parseInt(maxRange.value);

    // Ensure min < max với gap tối thiểu
    const minGap = 100000;
    if (minVal > maxVal - minGap) {
      minVal = maxVal - minGap;
      minRange.value = minVal;
    }

    // Update display
    if (minDisplay) minDisplay.textContent = this.formatPrice(minVal);
    if (maxDisplay) maxDisplay.textContent = this.formatPrice(maxVal);

    // Update slider track visual
    this.updateSliderTrack();

    // ⭐ FIX: Chỉ set filter nếu khác giá trị mặc định
    this.currentFilters.minPrice = minVal > this.priceRange.min ? minVal : null;
    this.currentFilters.maxPrice = maxVal < this.priceRange.max ? maxVal : null;

    // Debounce API call
    if (this.priceDebounceTimer) {
      clearTimeout(this.priceDebounceTimer);
    }

    this.priceDebounceTimer = setTimeout(async () => {
      this.currentPage = 1;
      await this.loadProducts();
    }, 500);
  }

  /**
   * Handle sort change
   */
  async handleSortChange(e) {
    this.currentSort = e.target.value;
    this.currentPage = 1;
    await this.loadProducts();
    this.updateUrl();
  }

  /**
   * Update filters from UI
   */
  updateFiltersFromUI() {
    // Categories
    this.currentFilters.categories = Array.from(
      document.querySelectorAll("#categoryFilters input:checked")
    ).map((cb) => cb.value);

    // Brands
    this.currentFilters.brands = Array.from(
      document.querySelectorAll("#brandFilters input:checked")
    ).map((cb) => cb.value);

    // Sizes
    this.currentFilters.sizes = Array.from(
      document.querySelectorAll(".size-btn input:checked")
    ).map((cb) => cb.value);
  }

  /**
   * Update filters UI
   */
  updateFiltersUI() {
    // Update category checkboxes
    this.currentFilters.categories.forEach((categoryId) => {
      const checkbox = document.getElementById(`category${categoryId}`);
      if (checkbox) checkbox.checked = true;
    });

    // Update color selections
    this.currentFilters.colors.forEach((color) => {
      const colorOption = document.querySelector(`[data-color="${color}"]`);
      if (colorOption) colorOption.classList.add("selected");
    });
  }

  /**
   * Render category filters (replace hardcoded HTML)
   */
  renderCategoryFilters() {
    const container = document.getElementById("categoryFilters");
    if (!container) return;

    const html = this.categories
      .map(
        (cat, index) => `
      <div class="form-check">
        <input class="form-check-input" 
               type="checkbox" 
               value="${cat.category_id}" 
               id="category${cat.category_id}">
        <label class="form-check-label" for="category${cat.category_id}">
          ${cat.category_name}
        </label>
      </div>
    `
      )
      .join("");

    container.innerHTML = html;

    // Re-attach event listeners
    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.handleFilterChange());
    });
  }

  renderProducts(products) {
    const container = document.getElementById("productsGrid");

    if (!container) {
      console.error("❌ Products grid container not found");
      return;
    }
    container.innerHTML = "";
    if (!products || products.length === 0) {
      this.showNoResults();
      container.style.display = "none";
      return;
    }

    const productsHTML = products
      .map((product) => {
        const hasStock = product.stock_info?.has_stock ?? true;
        const categoryName = product.categories?.category_name || "Shoes";
        const imageUrl =
          product.image_url && product.image_url.trim() !== ""
            ? product.image_url
            : "/assets/images/ui/thian.jpg";

        // Generate star rating HTML
        const avgRating = product.average_rating || 0;
        const totalReviews = product.total_reviews || 0;
        const starHTML = this.generateStarRating(avgRating);

        return `
            <div class="card product-card" style="cursor: pointer;" onclick="window.location.href='product-detail.html?id=${
              product.shoe_id
            }'">
                <div class="product-image">
                <img src="${imageUrl}" 
                    alt="${product.shoe_name}" 
                    class="card-img-top"
                    onerror="this.src='../assets/images/ui/shoes1.svg'"
                    loading="lazy">
                </div>
                <div class="card-body">
                <h5 class="product-title">${product.shoe_name}</h5>
                <div class="product-category text-muted small">${categoryName}</div>
                ${
                  totalReviews > 0
                    ? `
                <div class="product-rating mb-2">
                    ${starHTML}
                    <span class="rating-text text-muted ms-1" style="font-size: 0.85rem;">
                        ${avgRating.toFixed(1)} (${totalReviews})
                    </span>
                </div>
                `
                    : ""
                }
                <div class="product-price">
                  ${this.formatPrice(product.base_price)}
                </div>
            </div>
            </div>
        `;
      })
      .join("");

    container.innerHTML = productsHTML;
    container.style.display = "flex";
  }

  /**
   * Generate star rating HTML
   * @param {number} rating - Rating value (0-5)
   * @returns {string} HTML string with stars
   */
  generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = "";

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars += '<i class="fas fa-star text-warning"></i>';
    }

    // Half star
    if (hasHalfStar) {
      stars += '<i class="fas fa-star-half-alt text-warning"></i>';
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars += '<i class="far fa-star text-warning"></i>';
    }

    return stars;
  }
  /**
   * Render pagination
   */
  renderPagination(totalPages) {
    const container = document.getElementById("pagination");

    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = "";
      return;
    }

    let paginationHTML = "";

    // Previous button
    if (this.currentPage > 1) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="event.preventDefault(); productManager.goToPage(${
            this.currentPage - 1
          })">
            Previous
          </a>
        </li>
      `;
    }

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="event.preventDefault(); productManager.goToPage(1)">1</a>
        </li>
      `;
      if (startPage > 2) {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <li class="page-item ${i === this.currentPage ? "active" : ""}">
          <a class="page-link" href="#" onclick="event.preventDefault(); productManager.goToPage(${i})">${i}</a>
        </li>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="event.preventDefault(); productManager.goToPage(${totalPages})">${totalPages}</a>
        </li>
      `;
    }

    // Next button
    if (this.currentPage < totalPages) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="event.preventDefault(); productManager.goToPage(${
            this.currentPage + 1
          })">
            Next
          </a>
        </li>
      `;
    }

    container.innerHTML = paginationHTML;
  }

  /**
   * Update results count
   */
  updateResultsCount(total) {
    const resultsCount = document.getElementById("resultsCount");
    if (!resultsCount) return;

    const startIndex = (this.currentPage - 1) * this.productsPerPage + 1;
    const endIndex = Math.min(this.currentPage * this.productsPerPage, total);

    resultsCount.textContent = `Hiện ${startIndex}-${endIndex} trong số ${total} sản phẩm`;
  }
  /**
   * ⭐ NEW: Update size filters UI
   */
  updateSizeFiltersUI() {
    const sizeButtons = document.querySelectorAll(".size-option");
    sizeButtons.forEach((btn) => {
      const sizeId = parseInt(btn.dataset.sizeId);
      if (this.currentFilters.sizes.includes(sizeId)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
  /**
   * Show loading state
   */
  showLoading() {
    const loadingContainer = document.getElementById("loadingContainer");
    const productsGrid = document.getElementById("productsGrid");
    const noResults = document.getElementById("noResults");

    if (loadingContainer) loadingContainer.style.display = "block";
    if (productsGrid) productsGrid.style.display = "none";
    if (noResults) noResults.style.display = "none";
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loadingContainer = document.getElementById("loadingContainer");
    if (loadingContainer) loadingContainer.style.display = "none";
  }

  /**
   * Show no results
   */
  showNoResults() {
    const loadingContainer = document.getElementById("loadingContainer");
    const productsGrid = document.getElementById("productsGrid");
    const noResults = document.getElementById("noResults");

    if (loadingContainer) loadingContainer.style.display = "none";
    if (productsGrid) productsGrid.style.display = "none";
    if (noResults) noResults.style.display = "block";
  }

  /**
   * Show error
   */
  showError(message) {
    alert(message);
    this.showNoResults();
  }

  /**
   * Go to page
   */
  async goToPage(page) {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    await this.loadProducts();
    this.updateUrl();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Clear all filters
   */
  async clearAllFilters() {
    // Reset filters
    this.currentFilters = {
      categories: [],
      minPrice: null,
      maxPrice: null,
      sizes: [],
      colors: [],
      search: null,
    };

    // Reset UI
    document
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
    document
      .querySelectorAll(".color-option")
      .forEach((opt) => opt.classList.remove("selected"));

    const minPriceInput = document.getElementById("minPrice");
    const maxPriceInput = document.getElementById("maxPrice");
    const searchInput = document.getElementById("searchInput");

    if (minPriceInput) minPriceInput.value = "";
    if (maxPriceInput) maxPriceInput.value = "";
    if (searchInput) searchInput.value = "";

    this.currentPage = 1;
    await this.loadProducts();
  }

  /**
   * View product details
   */
  viewProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
  }

  /**
   * Quick view (modal)
   */
  quickView(productId) {
    // TODO: Implement quick view modal
  }

  /**
   * Set view mode
   */
  setView(viewType) {
    const gridBtn = document.getElementById("gridView");
    const listBtn = document.getElementById("listView");
    const container = document.getElementById("productsGrid");

    if (viewType === "grid") {
      if (gridBtn) gridBtn.classList.add("active");
      if (listBtn) listBtn.classList.remove("active");
      if (container) container.classList.remove("list-view");
    } else {
      if (listBtn) listBtn.classList.add("active");
      if (gridBtn) gridBtn.classList.remove("active");
      if (container) container.classList.add("list-view");
    }
  }

  /**
   * Update URL with current filters
   */
  updateUrl() {
    const params = new URLSearchParams();

    if (this.currentFilters.search) {
      params.set("search", this.currentFilters.search);
    }

    if (this.currentFilters.categories.length > 0) {
      params.set("category", this.currentFilters.categories[0]);
    }

    if (this.currentSort !== "featured") {
      params.set("sort", this.currentSort);
    }

    if (this.currentPage > 1) {
      params.set("page", this.currentPage);
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params}`
      : window.location.pathname;

    window.history.replaceState({}, "", newUrl);
  }

  /**
   * Format price to VND
   */
  formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  }
}

// Create global instance
const productManager = new ProductManager();

// Initialize when DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  await productManager.init();

  // Update auth UI if AuthManager exists
  if (window.authManager) {
    window.authManager.updateAuthUI();
  }

  // Sync cart count from API and update navbar
  if (
    window.authManager &&
    window.authManager.isAuthenticated() &&
    window.cartAPI &&
    window.navbarManager
  ) {
    try {
      const cartRes = await window.cartAPI.getCart();
      const cartItems = Array.isArray(cartRes?.data)
        ? cartRes.data
        : Array.isArray(cartRes)
        ? cartRes
        : [];
      const cartCount = cartItems.length;
      window.navbarManager.updateCartCount(cartCount);
    } catch (err) {
      console.error("Failed to sync cart count:", err);
    }
  }
});

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ProductManager;
}

// ES6 exports
export default ProductManager;
export { productManager };
