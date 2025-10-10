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
    this.colors = [];          // ← NEW: Available colors
    this.sizes = [];           // ← NEW: Available sizes
    this.currentFilters = {
      categories: [],
      minPrice: null,
      maxPrice: null,
      sizes: [],              // ← NEW: Selected size IDs
      colors: [],             // ← NEW: Selected color IDs
      search: null
    };
    this.currentSort = 'featured';
    this.currentPage = 1;
    this.productsPerPage = 12;
    this.totalProducts = 0;
    this.totalPages = 0;
    this.isLoading = false;

    console.log('✅ ProductManager initialized with variant filtering');
  }

  /**
   * Initialize ProductManager
   */
  async init() {
    try {
      console.log('🔄 Initializing ProductManager...');
      
      this.parseUrlParameters();
      this.setupEventListeners();
      
      // Load reference data
      await Promise.all([
        this.loadCategories(),
        this.loadColors(),      // ← NEW
        this.loadSizes()        // ← NEW
      ]);
      
      // Load products
      await this.loadProducts();
      
      this.updateFiltersUI();
      
      console.log('✅ ProductManager ready');
    } catch (error) {
      console.error('❌ Failed to initialize ProductManager:', error);
      this.showError('Failed to load products. Please refresh the page.');
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
        console.log(`✅ Loaded ${this.colors.length} colors`);
      }
    } catch (error) {
      console.error('❌ Error loading colors:', error);
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
        console.log(`✅ Loaded ${this.sizes.length} sizes`);
      }
    } catch (error) {
      console.error('❌ Error loading sizes:', error);
    }
  }
  /**
   * Parse URL parameters
   */
  parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Search query
    if (urlParams.has('search')) {
      this.currentFilters.search = urlParams.get('search');
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = this.currentFilters.search;
    }
    
    // Category filter
    if (urlParams.has('category')) {
      const categoryId = urlParams.get('category');
      this.currentFilters.categories = [categoryId];
    }
    
    // Sort
    if (urlParams.has('sort')) {
      this.currentSort = urlParams.get('sort');
      const sortSelect = document.getElementById('sortSelect');
      if (sortSelect) sortSelect.value = this.currentSort;
    }
    
    // Page
    if (urlParams.has('page')) {
      this.currentPage = parseInt(urlParams.get('page')) || 1;
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
        console.log(`✅ Loaded ${this.categories.length} categories`);
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
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
        is_active: true
      };

      // Category filter
      if (this.currentFilters.categories.length > 0) {
        params.category_id = this.currentFilters.categories[0];
      }

      // Price filters
      if (this.currentFilters.minPrice) {
        params.min_price = this.currentFilters.minPrice;
      }
      if (this.currentFilters.maxPrice) {
        params.max_price = this.currentFilters.maxPrice;
      }

      // Search
      if (this.currentFilters.search) {
        params.search = this.currentFilters.search;
      }

      // ⭐ NEW: Color filter (send as comma-separated IDs)
      if (this.currentFilters.colors.length > 0) {
        params.color_ids = this.currentFilters.colors.join(',');
      }

      // ⭐ NEW: Size filter (send as comma-separated IDs)
      if (this.currentFilters.sizes.length > 0) {
        params.size_ids = this.currentFilters.sizes.join(',');
      }

      // Sorting
      const sortConfig = this.getSortConfig(this.currentSort);
      params.sort_by = sortConfig.by;
      params.sort_order = sortConfig.order;

      console.log('🔄 Loading products with params:', params);

      const response = await this.api.getProducts(params);

      if (response.success) {
        this.products = response.data || [];
        
        if (response.pagination) {
          this.totalProducts = response.pagination.total || 0;
          this.totalPages = response.pagination.totalPages || 0;
          this.currentPage = response.pagination.page || 1;
        }
        
        console.log(`✅ Loaded ${this.products.length} products (Total: ${this.totalProducts})`);
        
        this.renderProducts(this.products);
        this.renderPagination(this.totalPages);
        this.updateResultsCount(this.totalProducts);
        
      } else {
        throw new Error(response.message || 'Failed to load products');
      }

    } catch (error) {
      console.error('❌ Error loading products:', error);
      this.showNoResults();
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }
/**
   * ⭐ NEW: Render color filters
   */
  renderColorFilters() {
    const container = document.getElementById('colorFilters');
    if (!container) return;

    const html = this.colors.map(color => `
      <div class="color-option" 
           data-color-id="${color.color_id}"
           style="background-color: ${color.hex_code || '#ccc'}; border: 2px solid #ddd; cursor: pointer;"
           title="${color.color_name}"
           onclick="productManager.toggleColorFilter(${color.color_id})">
      </div>
    `).join('');

    container.innerHTML = html;
  }

  /**
   * ⭐ NEW: Render size filters
   */
  renderSizeFilters() {
    const container = document.getElementById('sizeFilters');
    if (!container) return;
    
    const html = this.sizes.map(size => `
        <button type="button" 
                class="size-option" 
                data-size-id="${size.size_id}"
                aria-label="Size ${size.size_value}">
            ${size.size_value}
        </button>
    `).join('');
    
    container.innerHTML = html;
    
    console.log(`✅ Rendered ${this.sizes.length} size filters`);
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
      colorOption.classList.toggle('selected');
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

    console.log('🔄 Size filter changed:', this.currentFilters.sizes);
    
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
      'featured': { by: 'created_at', order: 'desc' },
      'price_low': { by: 'base_price', order: 'asc' },
      'price_high': { by: 'base_price', order: 'desc' },
      'name_asc': { by: 'shoe_name', order: 'asc' },
      'name_desc': { by: 'shoe_name', order: 'desc' },
      'newest': { by: 'created_at', order: 'desc' }
    };
    
    return sortMap[sortValue] || sortMap['featured'];
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Filter change listeners
    document.querySelectorAll('#categoryFilters input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.handleFilterChange());
    });

    document.querySelectorAll('#brandFilters input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.handleFilterChange());
    });

    document.querySelectorAll('.size-btn input').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.handleFilterChange());
    });

    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', (e) => this.handleColorFilter(e));
    });

    // Price range
    const priceRange = document.getElementById('priceRange');
    if (priceRange) {
      priceRange.addEventListener('input', (e) => this.handlePriceRangeChange(e));
    }

    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    if (minPrice) minPrice.addEventListener('change', () => this.handlePriceInputChange());
    if (maxPrice) maxPrice.addEventListener('change', () => this.handlePriceInputChange());

    // Sort change
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => this.handleSortChange(e));
    }

    // View toggle
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    if (gridView) gridView.addEventListener('click', () => this.setView('grid'));
    if (listView) listView.addEventListener('click', () => this.setView('list'));

    // Clear filters
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => this.clearAllFilters());
    }

    // Search
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    
    if (searchButton) {
      searchButton.addEventListener('click', () => this.handleSearch());
    }
    
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleSearch();
      });
    }
    // Size filter event delegation
    const sizeFiltersContainer = document.getElementById('sizeFilters');
    if (sizeFiltersContainer) {
        sizeFiltersContainer.addEventListener('click', (e) => {
            const sizeBtn = e.target.closest('.size-option');
            if (sizeBtn) {
                const sizeId = parseInt(sizeBtn.dataset.sizeId);
                this.toggleSizeFilter(sizeId);
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
    
    colorOption.classList.toggle('selected');
    
    if (colorOption.classList.contains('selected')) {
      if (!this.currentFilters.colors.includes(color)) {
        this.currentFilters.colors.push(color);
      }
    } else {
      this.currentFilters.colors = this.currentFilters.colors.filter(c => c !== color);
    }
    
    this.currentPage = 1;
    await this.loadProducts();
  }

  /**
   * Handle price range change
   */
  async handlePriceRangeChange(e) {
    const value = parseInt(e.target.value);
    this.currentFilters.maxPrice = value < 500 ? value : null;
    
    const maxPriceInput = document.getElementById('maxPrice');
    if (maxPriceInput) {
      maxPriceInput.value = this.currentFilters.maxPrice || '';
    }
    
    this.currentPage = 1;
    await this.loadProducts();
  }

  /**
   * Handle price input change
   */
  async handlePriceInputChange() {
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    const minPrice = minPriceInput ? minPriceInput.value : '';
    const maxPrice = maxPriceInput ? maxPriceInput.value : '';
    
    this.currentFilters.minPrice = minPrice ? parseInt(minPrice) : null;
    this.currentFilters.maxPrice = maxPrice ? parseInt(maxPrice) : null;
    
    // Update range slider
    const priceRange = document.getElementById('priceRange');
    if (priceRange && this.currentFilters.maxPrice) {
      priceRange.value = this.currentFilters.maxPrice;
    }
    
    this.currentPage = 1;
    await this.loadProducts();
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
   * Handle search
   */
  async handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      this.currentFilters.search = searchInput.value.trim();
      this.currentPage = 1;
      await this.loadProducts();
      this.updateUrl();
    }
  }

  /**
   * Update filters from UI
   */
  updateFiltersFromUI() {
    // Categories
    this.currentFilters.categories = Array.from(
      document.querySelectorAll('#categoryFilters input:checked')
    ).map(cb => cb.value);

    // Brands
    this.currentFilters.brands = Array.from(
      document.querySelectorAll('#brandFilters input:checked')
    ).map(cb => cb.value);

    // Sizes
    this.currentFilters.sizes = Array.from(
      document.querySelectorAll('.size-btn input:checked')
    ).map(cb => cb.value);
  }

  /**
   * Update filters UI
   */
  updateFiltersUI() {
    // Update category checkboxes
    this.currentFilters.categories.forEach(categoryId => {
      const checkbox = document.getElementById(`category${categoryId}`);
      if (checkbox) checkbox.checked = true;
    });

    // Update color selections
    this.currentFilters.colors.forEach(color => {
      const colorOption = document.querySelector(`[data-color="${color}"]`);
      if (colorOption) colorOption.classList.add('selected');
    });
  }

  /**
   * Render category filters (replace hardcoded HTML)
   */
  renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    const html = this.categories.map((cat, index) => `
      <div class="form-check">
        <input class="form-check-input" 
               type="checkbox" 
               value="${cat.category_id}" 
               id="category${cat.category_id}">
        <label class="form-check-label" for="category${cat.category_id}">
          ${cat.category_name}
        </label>
      </div>
    `).join('');

    container.innerHTML = html;

    // Re-attach event listeners
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.handleFilterChange());
    });
  }

  /**
   * Render products (replace mock data rendering)
   */
  renderProducts(products) {
    const container = document.getElementById('productsGrid');
    
    if (!container) {
      console.error('❌ Products grid container not found');
      return;
    }

    if (products.length === 0) {
      this.showNoResults();
      return;
    }

    const productsHTML = products.map(product => {
      const hasStock = product.stock_info?.has_stock ?? true;
      const categoryName = product.categories?.category_name || 'Shoes';
      const imageUrl = product.image_url && product.image_url.trim() !== '' 
        ? product.image_url 
        : '/assets/images/ui/thian.jpg';

      return `
        <div class="col-lg-4 col-md-6 mb-4">
          <div class="card product-card h-100" onclick="productManager.viewProduct(${product.shoe_id})">
            <div class="product-image">
              <img src="${imageUrl}" 
                   alt="${product.shoe_name}" 
                   class="card-img-top"
                   onerror="this.src='../assets/images/ui/shoes1.svg'"
                   loading="lazy">
              <div class="product-overlay">
                <div class="product-actions">
                  <button class="btn btn-sm btn-light" 
                          onclick="event.stopPropagation(); productManager.quickView(${product.shoe_id})">
                    <i class="fas fa-eye"></i> Quick View
                  </button>
                </div>
              </div>
            </div>
            <div class="card-body">
              <h5 class="product-title">${product.shoe_name}</h5>
              <div class="product-price">
                ${this.formatPrice(product.base_price)}
              </div>
              <div class="product-category text-muted small">${categoryName}</div>
              ${hasStock ? '<span class="badge bg-success">In Stock</span>' : '<span class="badge bg-danger">Out of Stock</span>'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = productsHTML;
    container.style.display = 'flex';
  }

  /**
   * Render pagination
   */
  renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let paginationHTML = '';

    // Previous button
    if (this.currentPage > 1) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="event.preventDefault(); productManager.goToPage(${this.currentPage - 1})">
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
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
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
          <a class="page-link" href="#" onclick="event.preventDefault(); productManager.goToPage(${this.currentPage + 1})">
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
    const resultsCount = document.getElementById('resultsCount');
    if (!resultsCount) return;

    const startIndex = (this.currentPage - 1) * this.productsPerPage + 1;
    const endIndex = Math.min(this.currentPage * this.productsPerPage, total);
    
    resultsCount.textContent = `Showing ${startIndex}-${endIndex} of ${total} products`;
  }
    /**
   * ⭐ NEW: Update size filters UI
   */
  updateSizeFiltersUI() {
    const sizeButtons = document.querySelectorAll('.size-option');
    sizeButtons.forEach(btn => {
      const sizeId = parseInt(btn.dataset.sizeId);
      if (this.currentFilters.sizes.includes(sizeId)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  /**
   * Show loading state
   */
  showLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    const productsGrid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    
    if (loadingContainer) loadingContainer.style.display = 'block';
    if (productsGrid) productsGrid.style.display = 'none';
    if (noResults) noResults.style.display = 'none';
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) loadingContainer.style.display = 'none';
  }

  /**
   * Show no results
   */
  showNoResults() {
    const loadingContainer = document.getElementById('loadingContainer');
    const productsGrid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (productsGrid) productsGrid.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      search: null
    };

    // Reset UI
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const searchInput = document.getElementById('searchInput');
    
    if (minPriceInput) minPriceInput.value = '';
    if (maxPriceInput) maxPriceInput.value = '';
    if (searchInput) searchInput.value = '';

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
    console.log('Quick view product:', productId);
    // TODO: Implement quick view modal
  }

  /**
   * Set view mode
   */
  setView(viewType) {
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    const container = document.getElementById('productsGrid');

    if (viewType === 'grid') {
      if (gridBtn) gridBtn.classList.add('active');
      if (listBtn) listBtn.classList.remove('active');
      if (container) container.classList.remove('list-view');
    } else {
      if (listBtn) listBtn.classList.add('active');
      if (gridBtn) gridBtn.classList.remove('active');
      if (container) container.classList.add('list-view');
    }
  }

  /**
   * Update URL with current filters
   */
  updateUrl() {
    const params = new URLSearchParams();

    if (this.currentFilters.search) {
      params.set('search', this.currentFilters.search);
    }

    if (this.currentFilters.categories.length > 0) {
      params.set('category', this.currentFilters.categories[0]);
    }

    if (this.currentSort !== 'featured') {
      params.set('sort', this.currentSort);
    }

    if (this.currentPage > 1) {
      params.set('page', this.currentPage);
    }

    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params}` 
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Format price to VND
   */
  formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }
}

// Create global instance
const productManager = new ProductManager();

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  await productManager.init();
  
  // Update auth UI if AuthManager exists
  if (window.authManager) {
    window.authManager.updateAuthUI();
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductManager;
}
