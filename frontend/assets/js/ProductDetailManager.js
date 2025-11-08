// frontend/assets/js/ProductDetailManager.js

class ProductDetailManager {
  constructor() {
    this.api = window.productsAPI;

    this.productId = null;
    this.productData = null;
    this.variants = [];
    this.allColors = [];
    this.allSizes = [];

    this.selectedColor = null;
    this.selectedSize = null;
    this.currentVariant = null;

    // ⭐ Cache for purchase validation
    this.ordersCache = null;

    console.log("✅ ProductDetailManager initialized");
  }

  /**
   * Initialize product detail page
   */
  async init(productId) {
    try {
      this.productId = productId;
      console.log(`🔄 Loading product ${productId}...`);

      // ⭐ SHOW LOADING
      document.getElementById("loading").style.display = "flex";
      document.getElementById("productDetail").style.display = "none";

      // ⭐ Ensure API is available
      await this.waitForApi();
      this.api = window.productsAPI;

      // ⭐ FIX: Load product data FIRST, then get variants from it
      await this.loadProductData(); // Load product with variants

      // ⭐ Extract variants from productData
      this.variants = this.productData?.shoe_variants || [];
      console.log(`✅ Loaded ${this.variants.length} variants from product`);

      // Load other reference data

      this.extractColorsAndSizes();

      // Render UI
      this.renderProduct();
      this.renderColors();
      this.renderSizes();
      this.initSizeGuideModal();
      // Hide loading, show content
      document.getElementById("loading").style.display = "none";
      document.getElementById("productDetail").style.display = "block";

      console.log("✅ Product detail loaded successfully");

      // Initialize review manager
      await this.initReviewManager();
    } catch (error) {
      console.error("❌ Failed to load product:", error);

      // ⭐ FIX: GIỮ TRANG, CHỈ SHOW ERROR MESSAGE
      document.getElementById("loading").style.display = "none";

      // Show error UI on the page
      const productDetail = document.getElementById("productDetail");
      if (productDetail) {
        productDetail.style.display = "block";
        productDetail.innerHTML = `
                    <div class="container py-5">
                        <div class="alert alert-danger" role="alert">
                            <h4 class="alert-heading">⚠️ Không thể tải sản phẩm</h4>
                            <p><strong>Lỗi:</strong> ${
                              error.message || "Lỗi không xác định"
                            }</p>
                            <hr>
                            <p class="mb-0">
                                <strong>Thông tin gỡ lỗi:</strong><br>
                                Mã sản phẩm: ${this.productId}<br>
                                Kiểm tra console (F12) để biết thêm chi tiết.
                            </p>
                            <div class="mt-3">
                                <button class="btn btn-primary" onclick="location.reload()">
                                    🔄 Thử lại
                                </button>
                                <a href="products.html" class="btn btn-secondary">
                                    ← Quay lại danh sách
                                </a>
                            </div>
                        </div>
                        
                        <div class="card mt-3">
                            <div class="card-header bg-dark text-white">
                                <h5>🐛 Debug Information</h5>
                            </div>
                            <div class="card-body">
                                <pre class="mb-0" style="max-height: 400px; overflow-y: auto;"><code>${JSON.stringify(
                                  {
                                    productId: this.productId,
                                    error: error.message,
                                    stack: error.stack,
                                    api: typeof this.api,
                                    productsAPI: typeof window.productsAPI,
                                  },
                                  null,
                                  2
                                )}</code></pre>
                            </div>
                        </div>
                    </div>
                `;
      }
    }
  }

  /**
   * Wait until productsAPI is available
   */
  async waitForApi() {
    let attempts = 0;
    while (attempts < 100) {
      // up to ~5s
      if (
        window.productsAPI &&
        typeof window.productsAPI.getProduct === "function"
      ) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }
    throw new Error(
      "API client not initialized. Check if ApiClient.js is loaded correctly."
    );
  }

  /**
   * Load product data from API
   */
  async loadProductData() {
    try {
      console.log(`📡 API call: getProduct(${this.productId})`);

      // ⭐ DEBUG: Log API object
      console.log("API object:", this.api);
      console.log("window.productsAPI:", window.productsAPI);

      if (!this.api || !this.api.getProduct) {
        throw new Error(
          "API client not initialized. Check if ApiClient.js is loaded correctly."
        );
      }

      const response = await this.api.getProduct(this.productId);

      console.log("API response:", response);

      if (!response.success) {
        throw new Error(response.error || "Product not found");
      }

      this.productData = response.data;
      console.log("✅ Product data loaded:", this.productData);
    } catch (error) {
      console.error("❌ Error loading product:", error);
      throw new Error(`Failed to load product data: ${error.message}`);
    }
  }

  /**
   * Load all variants for this product
   */
  async loadVariants() {
    try {
      console.log(`📡 API call: getVariants({shoe_id: ${this.productId}})`);

      const response = await this.api.getVariants({ shoe_id: this.productId });

      console.log("Variants response:", response);

      this.variants = response.data || [];
      console.log(`✅ Loaded ${this.variants.length} variants`);
    } catch (error) {
      console.error("❌ Error loading variants:", error);
      // Don't throw - variants are optional
    }
  }
  /**
   * ⭐ NEW: Extract ALL unique colors and sizes from variants
   */
  extractColorsAndSizes() {
    const colorsMap = new Map();
    const sizesMap = new Map();

    this.variants.forEach((variant) => {
      if (variant.is_active) {
        if (variant.colors) {
          colorsMap.set(variant.colors.color_id, variant.colors);
        }
        if (variant.sizes) {
          sizesMap.set(variant.sizes.size_id, variant.sizes);
        }
      }
    });

    this.allColors = Array.from(colorsMap.values());
    this.allSizes = Array.from(sizesMap.values()).sort(
      (a, b) => parseFloat(a.size_value) - parseFloat(b.size_value)
    );

    console.log(
      `🎨 Extracted ${this.allColors.length} colors, 👟 ${this.allSizes.length} sizes`
    );
  }

  /**
   * Render product information
   */
  async renderProduct() {
    const product = this.productData;

    // Set title and subtitle
    document.getElementById("productTitle").textContent = product.shoe_name;
    document.getElementById("productSubtitle").textContent =
      product.category_name || "Giày Nam";

    // Fetch and display rating summary
    try {
      if (window.reviewsAPI) {
        const stats = await window.reviewsAPI.getProductReviewStats(
          product.shoe_id
        );
        const avgRating = stats.average_rating || 0;
        const totalReviews = stats.total_reviews || 0;

        const ratingSummaryHTML = `
          <div class="rating-summary d-flex align-items-center gap-2 mb-2">
            <div class="stars">
              ${this.generateStarHTML(avgRating)}
            </div>
            <span class="fw-bold">${avgRating.toFixed(1)}</span>
            <span class="text-muted">(${totalReviews} ${
          totalReviews === 1 ? "review" : "reviews"
        })</span>
          </div>
        `;

        // Insert after subtitle
        const subtitleEl = document.getElementById("productSubtitle");
        if (subtitleEl) {
          subtitleEl.insertAdjacentHTML("afterend", ratingSummaryHTML);
        }
      }
    } catch (error) {
      console.error("❌ Failed to load rating summary:", error);
    }

    // Set price
    const currentPrice = parseFloat(product.base_price);
    const originalPrice = currentPrice * 1.25; // Assume 20% discount
    const discount = 20;

    document.getElementById(
      "currentPrice"
    ).textContent = `₫${currentPrice.toLocaleString("vi-VN")}`;
    document.getElementById(
      "originalPrice"
    ).textContent = `₫${originalPrice.toLocaleString("vi-VN")}`;
    document.getElementById("originalPrice").style.display = "inline";
    document.getElementById("discount").textContent = `${discount}% off`;
    document.getElementById("discount").style.display = "inline";

    // Set description
    document.getElementById("productDescription").textContent =
      product.description ||
      "Giày chất lượng cao được thiết kế để đạt hiệu suất và phong cách tốt nhất";

    // Set main image
    const mainImage = document.querySelector("#mainImage img");
    mainImage.src = product.image_url || "/assets/images/placeholder-shoe.png";
    mainImage.alt = product.shoe_name;

    // Render thumbnails (use same image for demo)
    const thumbnailList = document.getElementById("thumbnailList");
    for (let i = 0; i < 4; i++) {
      const thumb = document.createElement("div");
      thumb.className = `thumbnail ${i === 0 ? "active" : ""}`;
      thumb.innerHTML = `<img src="${product.image_url}" alt="Thumbnail ${
        i + 1
      }">`;
      thumb.addEventListener("click", () => {
        document
          .querySelectorAll(".thumbnail")
          .forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
        mainImage.src = product.image_url;
      });
      thumbnailList.appendChild(thumb);
    }
  }

  /**
   * Generate star HTML for rating display
   */
  generateStarHTML(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        html += '<i class="fas fa-star text-warning"></i>';
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        html += '<i class="fas fa-star-half-alt text-warning"></i>';
      } else {
        html += '<i class="far fa-star text-warning"></i>';
      }
    }
    return html;
  }
  /**
   * ⭐ NEW: Update price when variant is selected
   * @param {number} variantPrice - Price from selected variant
   */
  updatePrice(variantPrice) {
    const currentPrice = parseFloat(variantPrice);
    const originalPrice = currentPrice * 1.25; // Keep same discount logic
    const discount = 20;

    // Update price display
    const currentPriceEl = document.getElementById("currentPrice");
    const originalPriceEl = document.getElementById("originalPrice");
    const discountBadgeEl = document.getElementById("discountBadge");

    if (currentPriceEl) {
      currentPriceEl.textContent = currentPrice.toLocaleString("vi-VN");
    }
    if (originalPriceEl) {
      originalPriceEl.textContent = originalPrice.toLocaleString("vi-VN");
    }
    if (discountBadgeEl) {
      discountBadgeEl.textContent = `-${discount}%`;
    }

    console.log("💰 Price updated to variant price:", currentPrice);
  }
  /**
   * ⭐ FIXED: Render ALL colors from variants
   */
  renderColors() {
    const colorOptions = document.getElementById("colorOptions");
    if (!colorOptions) return;

    if (!this.allColors || this.allColors.length === 0) {
      colorOptions.innerHTML = '<p class="text-muted">Không có màu sắc</p>';
      return;
    }

    colorOptions.innerHTML = this.allColors
      .map((color) => {
        const hasStock = this.variants.some(
          (v) =>
            v.is_active && v.color_id === color.color_id && v.stock_quantity > 0
        );

        return `
                <button 
                    class="color-option ${
                      this.selectedColor === color.color_id ? "selected" : ""
                    } ${!hasStock ? "unavailable" : ""}"
                    data-color-id="${color.color_id}"
                    data-color-name="${color.color_name}"
                    style="background-color: ${
                      color.hex_code || "#ccc"
                    }; border: 2px solid #ddd;"
                    title="${color.color_name}${
          !hasStock ? " (Out of stock)" : ""
        }"
                    ${!hasStock ? "disabled" : ""}
                    onclick="productDetailManager.selectColor(${
                      color.color_id
                    }, '${color.color_name}')">
                    ${
                      !hasStock ? '<span class="unavailable-mark">✕</span>' : ""
                    }
                </button>
            `;
      })
      .join("");

    console.log(`🎨 Rendered ${this.allColors.length} colors`);
  }

  /**
   * ⭐ FIXED: Render ALL sizes from variants
   */
  renderSizes() {
    const sizeOptions = document.getElementById("sizeOptions");
    if (!sizeOptions) return;

    if (!this.allSizes || this.allSizes.length === 0) {
      sizeOptions.innerHTML = '<p class="text-muted">Không có kích cỡ</p>';
      return;
    }

    sizeOptions.innerHTML = this.allSizes
      .map((size) => {
        let isAvailable = false;
        let stockQty = 0;
        let variantId = null;
        let isLowStock = false;

        if (this.selectedColor) {
          const variant = this.variants.find(
            (v) =>
              v.is_active &&
              v.color_id === this.selectedColor &&
              v.size_id === size.size_id
          );

          if (variant) {
            stockQty = variant.stock_quantity || 0;
            variantId = variant.variant_id;
            isAvailable = stockQty > 0;
            isLowStock = stockQty > 0 && stockQty < 5;
          }
        } else {
          isAvailable = this.variants.some(
            (v) =>
              v.is_active && v.size_id === size.size_id && v.stock_quantity > 0
          );
        }

        return `
                <button 
                    class="size-option 
                           ${
                             this.selectedSize === size.size_id
                               ? "selected"
                               : ""
                           } 
                           ${
                             !isAvailable && this.selectedColor
                               ? "unavailable"
                               : ""
                           } 
                           ${isLowStock ? "low-stock" : ""}"
                    data-size-id="${size.size_id}"
                    data-variant-id="${variantId || ""}"
                    data-stock="${stockQty}"
                    ${
                      !this.selectedColor ||
                      (!isAvailable && this.selectedColor)
                        ? "disabled"
                        : ""
                    }
                    onclick="${
                      isAvailable && this.selectedColor
                        ? `productDetailManager.selectSize(${size.size_id}, '${size.size_value}', ${variantId}, ${stockQty})`
                        : "void(0)"
                    }">
                    <span class="${
                      !isAvailable && this.selectedColor ? "strikethrough" : ""
                    }">
                        ${size.size_value}
                    </span>
                    ${
                      !this.selectedColor
                        ? '<small class="d-block text-muted" style="font-size: 9px;">Choose color</small>'
                        : ""
                    }
                    ${
                      isAvailable && this.selectedColor && isLowStock
                        ? '<span class="badge bg-warning text-dark ms-1">Only ' +
                          stockQty +
                          " left!</span>"
                        : ""
                    }
                    ${
                      !isAvailable && this.selectedColor
                        ? '<span class="unavailable-mark-size">✕</span>'
                        : ""
                    }
                </button>
            `;
      })
      .join("");

    console.log(`👟 Rendered ${this.allSizes.length} sizes`);
  }

  /**
   * ⭐ FIXED: Select color and re-render sizes with availability
   */
  selectColor(colorId, colorName) {
    this.selectedColor = colorId;
    this.selectedSize = null;
    this.currentVariant = null;

    console.log(`🎨 Selected color: ${colorName} (${colorId})`);

    // ✅ ADD: Reset price to base_price when changing color
    if (this.productData && this.productData.baseprice) {
      this.updatePrice(this.productData.baseprice);
      console.log("💰 Price reset to base_price (no size selected yet)");
    }

    // Re-render UI
    this.renderColors();
    this.renderSizes();

    // Update selected display
    const selectedColorEl = document.getElementById("selectedColor");
    if (selectedColorEl) {
      selectedColorEl.textContent = colorName;
      selectedColorEl.parentElement.style.display = "block";
    }

    // Clear size selection
    const selectedSizeEl = document.getElementById("selectedSize");
    if (selectedSizeEl) {
      selectedSizeEl.textContent = "";
      selectedSizeEl.parentElement.style.display = "none";
    }

    // Hide warning
    const warningEl = document.getElementById("stockWarning");
    if (warningEl) {
      warningEl.style.display = "none";
    }

    // Disable add to bag button
    const addToBagBtn = document.getElementById("addToBagBtn");
    if (addToBagBtn) {
      addToBagBtn.disabled = true;
    }
  }

  selectSize(sizeId, sizeValue, variantId, stock) {
    if (!this.selectedColor) {
      alert("Vui lòng chọn màu trước!");
      return;
    }

    if (stock <= 0) {
      alert("Size này đã hết hàng!");
      return;
    }

    this.selectedSize = sizeId;
    this.currentVariant = this.variants.find((v) => v.variant_id === variantId);

    console.log(`👟 Selected size: ${sizeValue} (${sizeId}), Stock: ${stock}`);
    console.log("🎯 Current variant:", this.currentVariant);

    // ✅ ADD: Update price to variant price
    if (this.currentVariant && this.currentVariant.variantprice) {
      this.updatePrice(this.currentVariant.variantprice);
      console.log(
        "💰 Price updated to variant price:",
        this.currentVariant.variantprice
      );
    } else if (this.currentVariant && this.currentVariant.variant_price) {
      // Handle both snake_case and camelCase
      this.updatePrice(this.currentVariant.variant_price);
      console.log(
        "💰 Price updated to variant_price:",
        this.currentVariant.variant_price
      );
    } else {
      console.warn("⚠️ No variant price found, keeping current price");
    }

    // Re-render sizes
    this.renderSizes();

    // Update selected display
    const selectedSizeEl = document.getElementById("selectedSize");
    if (selectedSizeEl) {
      selectedSizeEl.textContent = sizeValue;
      selectedSizeEl.parentElement.style.display = "block";
    }

    // Show stock warning if low
    if (stock > 0 && stock < 5) {
      this.showStockWarning(stock);
    } else {
      const warningEl = document.getElementById("stockWarning");
      if (warningEl) {
        warningEl.style.display = "none";
      }
    }

    // Enable add to bag button
    const addToBagBtn = document.getElementById("addToBagBtn");
    if (addToBagBtn) {
      addToBagBtn.disabled = false;
    }
  }

  /**
   * ⭐ Show stock warning with animation
   */
  showStockWarning(stock) {
    const warningEl = document.getElementById("stockWarning");
    if (warningEl) {
      warningEl.innerHTML = `
                <div class="alert alert-warning mt-2 py-2 px-3" role="alert">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    <strong>Nhanh tay!</strong> Chỉ còn <strong>${stock}</strong> sản phẩm!
                </div>
            `;
      warningEl.style.display = "block";
    }
  }

  /**
   * Update size availability based on selected color
   */
  updateSizeAvailability() {
    document.querySelectorAll(".size-option").forEach((sizeEl) => {
      const sizeId = parseInt(sizeEl.dataset.sizeId);

      // If no color selected, check if size has any stock in any color
      if (!this.selectedColor) {
        const hasStock = this.variants.some(
          (v) => v.size_id === sizeId && v.stock_quantity > 0
        );

        if (!hasStock) {
          sizeEl.classList.add("unavailable");
        } else {
          sizeEl.classList.remove("unavailable");
        }
      } else {
        // Check if this size + color combination has stock
        const variant = this.variants.find(
          (v) => v.color_id === this.selectedColor && v.size_id === sizeId
        );

        if (!variant || variant.stock_quantity === 0) {
          sizeEl.classList.add("unavailable");
        } else {
          sizeEl.classList.remove("unavailable");
        }
      }
    });
  }

  /**
   * Check if selected variant is available
   */
  checkVariantAvailability() {
    if (!this.selectedColor || !this.selectedSize) {
      document.getElementById("addToBagBtn").disabled = true;
      document.getElementById("stockInfo").style.display = "none";
      return;
    }

    // Find the variant
    const variant = this.variants.find(
      (v) =>
        v.color_id === this.selectedColor && v.size_id === this.selectedSize
    );

    if (!variant || variant.stock_quantity === 0) {
      this.showStockStatus("out", 0);
      document.getElementById("addToBagBtn").disabled = true;
      this.currentVariant = null;
    } else {
      this.showStockStatus("in", variant.stock_quantity);
      document.getElementById("addToBagBtn").disabled = false;
      this.currentVariant = variant;
    }
  }

  /**
   * Show stock status
   */
  showStockStatus(status, quantity) {
    const stockInfo = document.getElementById("stockInfo");
    const stockMessage = document.getElementById("stockMessage");

    stockInfo.style.display = "block";
    stockInfo.className = "stock-info";

    if (status === "out") {
      stockInfo.classList.add("out-of-stock");
      stockMessage.textContent = "Phiên bản này hiện đã hết hàng";
    } else if (quantity < 5) {
      stockInfo.classList.add("low-stock");
      stockMessage.textContent = `Chỉ còn ${quantity} sản phẩm trong kho`;
    } else {
      stockInfo.classList.add("in-stock");
      stockMessage.textContent = "Còn hàng - Sẵn sàng giao hàng";
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    document.getElementById("loading").style.display = "none";
    alert(message);
    window.location.href = "products.html";
  }

  /**
   * Show alert
   */
  showAlert(message, type = "info") {
    const alertContainer = document.getElementById("alertContainer");
    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show alert-custom`;
    alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    alertContainer.appendChild(alert);

    setTimeout(() => {
      alert.remove();
    }, 3000);
  }
  initSizeGuideModal() {
    const sizeGuideLink = document.getElementById("sizeGuideLink");
    const sizeGuideModal = document.getElementById("sizeGuideModal");
    const closeSizeGuideBtn = document.getElementById("closeSizeGuideBtn");
    const sizeGuideImg = document.getElementById("sizeGuideImg");

    if (!sizeGuideLink || !sizeGuideModal) {
      console.warn("⚠️ Size guide elements not found");
      return;
    }

    // Mở modal
    sizeGuideLink.addEventListener("click", (e) => {
      e.preventDefault();

      const imagePath = "../assets/images/us-size.jpeg";
      sizeGuideImg.src = imagePath;

      // ✅ FIX: Dùng display flex thay vì inline style
      sizeGuideModal.style.display = "flex";
      sizeGuideModal.style.flexDirection = "column";
      sizeGuideModal.style.alignItems = "center";
      sizeGuideModal.style.justifyContent = "center";

      console.log("✅ Size guide modal opened with image:", imagePath);
    });

    // Đóng modal
    closeSizeGuideBtn?.addEventListener("click", () => {
      sizeGuideModal.style.display = "none";
      console.log("✅ Size guide modal closed");
    });

    // Đóng khi click ngoài
    sizeGuideModal.addEventListener("click", (e) => {
      if (e.target === sizeGuideModal) {
        sizeGuideModal.style.display = "none";
      }
    });

    // Đóng khi nhấn ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sizeGuideModal.style.display === "flex") {
        sizeGuideModal.style.display = "none";
      }
    });
  }
}

// Add to Bag button functionality
document.addEventListener("DOMContentLoaded", () => {
  // Use event delegation to handle the add to bag button across re-renders
  document.addEventListener("click", async (e) => {
    if (e.target.id !== "addToBagBtn") return;

    try {
      if (e.target.disabled) return;

      // Require auth
      if (window.authManager && !window.authManager.isAuthenticated()) {
        if (window.showLoginModal) window.showLoginModal();
        return;
      }

      const mgr = window.productDetailManager;
      if (!mgr || !mgr.currentVariant) {
        alert("Vui lòng chọn màu sắc và kích cỡ");
        return;
      }

      const variantId = mgr.currentVariant.variant_id;
      const res = await window.cartAPI.addItem({
        variant_id: variantId,
        quantity: 1,
      });
      if (res && res.success !== false) {
        // Navigate to cart page
        window.location.href = "cart.html";
      } else {
        const msg = res?.error || "Không thể thêm vào giỏ hàng";
        if (window.showToast) window.showToast(msg, "error");
      }
    } catch (err) {
      if (window.showToast)
        window.showToast(err.message || "Không thể thêm vào giỏ hàng", "error");
    }
  });
});

/**
 * Initialize ReviewManager
 */
ProductDetailManager.prototype.initReviewManager = async function () {
  try {
    if (typeof ReviewManager === "undefined") {
      console.warn("⚠️ ReviewManager not loaded");
      return;
    }

    // Create and initialize review manager
    window.reviewManager = new ReviewManager(this.productId, {
      loadStats: true,
      loadReviews: true,
      checkUserReview: true,
      setupWriteButton: false, // Don't let ReviewManager setup write button, we'll do it manually
    });
    await window.reviewManager.init();

    // ⭐ Preload orders cache for instant validation
    await this.preloadOrdersCache();

    // ⭐ Setup write review button with purchase validation
    await this.setupReviewValidation();

    console.log("✅ ReviewManager initialized with purchase validation");
  } catch (error) {
    console.error("❌ Error initializing ReviewManager:", error);
  }
};

/**
 * Preload orders cache for instant purchase validation
 */
ProductDetailManager.prototype.preloadOrdersCache = async function () {
  try {
    // Only preload if user is authenticated
    if (!window.authService?.isAuthenticated()) {
      console.log("⏭️ Skipping orders cache preload (not authenticated)");
      return;
    }

    // Wait for ordersAPI to be available
    let attempts = 0;
    while (!window.ordersAPI && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.ordersAPI) {
      console.warn("⚠️ ordersAPI not available for cache preload");
      return;
    }

    // Fetch and cache all orders once
    const response = await window.ordersAPI.getOrders({ limit: 1000 });
    this.ordersCache = response.data?.orders || response.orders || [];
    console.log(
      "✅ Preloaded orders cache:",
      this.ordersCache.length,
      "orders"
    );
  } catch (error) {
    console.error("❌ Error preloading orders cache:", error);
    this.ordersCache = []; // Set empty array as fallback
  }
};

/**
 * Setup review validation - only allow reviews from users who purchased the product
 */
ProductDetailManager.prototype.setupReviewValidation = async function () {
  try {
    const writeReviewBtn = document.getElementById("writeReviewBtn");
    if (!writeReviewBtn) {
      console.warn("⚠️ Write review button not found");
      return;
    }

    // Add click handler with validation
    writeReviewBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Check authentication first
      if (!window.authService?.isAuthenticated()) {
        alert("Vui lòng đăng nhập để viết đánh giá");
        if (window.showLoginModal) {
          window.showLoginModal();
        }
        return;
      } // Validate purchase (uses cache for instant validation)
      const canReview = await this.validateUserPurchase();
      if (!canReview) {
        alert(
          "Bạn chỉ có thể đánh giá sản phẩm từ những đơn hàng đã hoàn thành (đã giao/thành công)."
        );
        return;
      }

      // If validation passed, open modal
      if (window.reviewManager) {
        window.reviewManager.openReviewModal();
      }
    });

    console.log("✅ Review purchase validation enabled for write button");
  } catch (error) {
    console.error("❌ Error setting up review validation:", error);
  }
};

/**
 * Validate if user has purchased this product from a completed order
 * Uses cached orders data for instant validation
 */
ProductDetailManager.prototype.validateUserPurchase = async function () {
  try {
    // ⭐ Use cached orders if available
    let orders = this.ordersCache;

    // Fallback: fetch if cache is empty (shouldn't happen if preload worked)
    if (!orders || orders.length === 0) {
      console.warn("⚠️ Orders cache empty, fetching...");

      // Wait for ordersAPI
      let attempts = 0;
      while (!window.ordersAPI && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.ordersAPI) {
        console.error("❌ ordersAPI not available");
        return false;
      }

      const response = await window.ordersAPI.getOrders({ limit: 1000 });
      orders = response.data?.orders || response.orders || [];
      this.ordersCache = orders; // Update cache
    }

    // Check if product exists in any completed order
    const hasCompletedOrder = orders.some((order) => {
      const isCompleted =
        order.status === "delivered" || order.status === "success";
      if (!isCompleted) return false;

      // Check if this product is in the order items
      return (order.order_items || []).some((item) => {
        return item.shoe_variants?.shoe_id === parseInt(this.productId);
      });
    });

    return hasCompletedOrder;
  } catch (error) {
    console.error("❌ Error validating user purchase:", error);
    return false;
  }
};

// Set up DOM initialization
ProductDetailManager.prototype.initializeDOMEvents = function () {
  // Debug: Check Bootstrap availability
  console.log("🔍 Bootstrap available:", typeof bootstrap !== "undefined");
  console.log(
    "🔍 Bootstrap.Modal available:",
    typeof bootstrap !== "undefined" && typeof bootstrap.Modal !== "undefined"
  );

  // Test modal close buttons
  setTimeout(() => {
    const modal = document.getElementById("reviewModal");
    const closeButtons = modal?.querySelectorAll('[data-bs-dismiss="modal"]');
    console.log("🔍 Modal found:", !!modal);
    console.log("🔍 Close buttons found:", closeButtons?.length);

    if (closeButtons) {
      closeButtons.forEach((btn, idx) => {
        console.log(`  Button ${idx}:`, btn.className);
      });
    }
  }, 500);

  // Initialize product detail
  const productId = new URLSearchParams(window.location.search).get("id");
  if (!productId) {
    this.showAlert("Không tìm thấy sản phẩm", "danger");
    setTimeout(() => {
      window.location.href = "products.html";
    }, 2000);
    return;
  }
  this.init(productId);
};

// Set up DOM content loaded event
document.addEventListener("DOMContentLoaded", () => {
  // Create product detail manager instance
  if (!window.productDetailManager) {
    window.productDetailManager = new ProductDetailManager();
  }
  window.productDetailManager.initializeDOMEvents();
});

// Make it globally accessible
window.ProductDetailManager = ProductDetailManager;
