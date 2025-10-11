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
        
        console.log('✅ ProductDetailManager initialized');
    }

    /**
     * Initialize product detail page
     */
    async init(productId) {
    try {
        this.productId = productId;
        console.log(`🔄 Loading product ${productId}...`);

        // ⭐ SHOW LOADING
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('productDetail').style.display = 'none';

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

        // Hide loading, show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('productDetail').style.display = 'block';

        console.log('✅ Product detail loaded successfully');


        } catch (error) {
            console.error('❌ Failed to load product:', error);
            
            // ⭐ FIX: GIỮ TRANG, CHỈ SHOW ERROR MESSAGE
            document.getElementById('loading').style.display = 'none';
            
            // Show error UI on the page
            const productDetail = document.getElementById('productDetail');
            if (productDetail) {
                productDetail.style.display = 'block';
                productDetail.innerHTML = `
                    <div class="container py-5">
                        <div class="alert alert-danger" role="alert">
                            <h4 class="alert-heading">⚠️ Failed to Load Product</h4>
                            <p><strong>Error:</strong> ${error.message || 'Unknown error'}</p>
                            <hr>
                            <p class="mb-0">
                                <strong>Debug Info:</strong><br>
                                Product ID: ${this.productId}<br>
                                Check console (F12) for more details.
                            </p>
                            <div class="mt-3">
                                <button class="btn btn-primary" onclick="location.reload()">
                                    🔄 Retry
                                </button>
                                <a href="products.html" class="btn btn-secondary">
                                    ← Back to Products
                                </a>
                            </div>
                        </div>
                        
                        <div class="card mt-3">
                            <div class="card-header bg-dark text-white">
                                <h5>🐛 Debug Information</h5>
                            </div>
                            <div class="card-body">
                                <pre class="mb-0" style="max-height: 400px; overflow-y: auto;"><code>${JSON.stringify({
                                    productId: this.productId,
                                    error: error.message,
                                    stack: error.stack,
                                    api: typeof this.api,
                                    productsAPI: typeof window.productsAPI
                                }, null, 2)}</code></pre>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Load product data from API
     */
    async loadProductData() {
        try {
            console.log(`📡 API call: getProduct(${this.productId})`);
            
            // ⭐ DEBUG: Log API object
            console.log('API object:', this.api);
            console.log('window.productsAPI:', window.productsAPI);
            
            if (!this.api || !this.api.getProduct) {
                throw new Error('API client not initialized. Check if ApiClient.js is loaded correctly.');
            }
            
            const response = await this.api.getProduct(this.productId);
            
            console.log('API response:', response);
            
            if (!response.success) {
                throw new Error(response.error || 'Product not found');
            }
            
            this.productData = response.data;
            console.log('✅ Product data loaded:', this.productData);
            
        } catch (error) {
            console.error('❌ Error loading product:', error);
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
            
            console.log('Variants response:', response);
            
            this.variants = response.data || [];
            console.log(`✅ Loaded ${this.variants.length} variants`);
            
        } catch (error) {
            console.error('❌ Error loading variants:', error);
            // Don't throw - variants are optional
        }
    }
    /**
     * ⭐ NEW: Extract ALL unique colors and sizes from variants
     */
    extractColorsAndSizes() {
        const colorsMap = new Map();
        const sizesMap = new Map();

        this.variants.forEach(variant => {
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
        this.allSizes = Array.from(sizesMap.values())
            .sort((a, b) => parseFloat(a.size_value) - parseFloat(b.size_value));

        console.log(`🎨 Extracted ${this.allColors.length} colors, 👟 ${this.allSizes.length} sizes`);
    }

    /**
     * Render product information
     */
    renderProduct() {
        const product = this.productData;

        // Set title and subtitle
        document.getElementById('productTitle').textContent = product.shoe_name;
        document.getElementById('productSubtitle').textContent = product.category_name || 'Men\'s Shoes';

        // Set price
        const currentPrice = parseFloat(product.base_price);
        const originalPrice = currentPrice * 1.25; // Assume 20% discount
        const discount = 20;

        document.getElementById('currentPrice').textContent = `₫${currentPrice.toLocaleString('vi-VN')}`;
        document.getElementById('originalPrice').textContent = `₫${originalPrice.toLocaleString('vi-VN')}`;
        document.getElementById('originalPrice').style.display = 'inline';
        document.getElementById('discount').textContent = `${discount}% off`;
        document.getElementById('discount').style.display = 'inline';

        // Set description
        document.getElementById('productDescription').textContent = product.description || 'Premium quality shoes designed for performance and style.';

        // Set main image
        const mainImage = document.querySelector('#mainImage img');
        mainImage.src = product.image_url || '/assets/images/placeholder-shoe.png';
        mainImage.alt = product.shoe_name;

        // Render thumbnails (use same image for demo)
        const thumbnailList = document.getElementById('thumbnailList');
        for (let i = 0; i < 4; i++) {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${i === 0 ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${product.image_url}" alt="Thumbnail ${i + 1}">`;
            thumb.addEventListener('click', () => {
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainImage.src = product.image_url;
            });
            thumbnailList.appendChild(thumb);
        }
    }

/**
 * ⭐ FIXED: Render ALL colors from variants
 */
renderColors() {
    const colorOptions = document.getElementById('colorOptions');
    if (!colorOptions) return;

    if (!this.allColors || this.allColors.length === 0) {
        colorOptions.innerHTML = '<p class="text-muted">No colors available</p>';
        return;
    }

    colorOptions.innerHTML = this.allColors
        .map(color => {
            const hasStock = this.variants.some(v =>
                v.is_active &&
                v.color_id === color.color_id &&
                v.stock_quantity > 0
            );

            return `
                <button 
                    class="color-option ${this.selectedColor === color.color_id ? 'selected' : ''} ${!hasStock ? 'unavailable' : ''}"
                    data-color-id="${color.color_id}"
                    data-color-name="${color.color_name}"
                    style="background-color: ${color.hex_code || '#ccc'}; border: 2px solid #ddd;"
                    title="${color.color_name}${!hasStock ? ' (Out of stock)' : ''}"
                    ${!hasStock ? 'disabled' : ''}
                    onclick="productDetailManager.selectColor(${color.color_id}, '${color.color_name}')">
                    ${!hasStock ? '<span class="unavailable-mark">✕</span>' : ''}
                </button>
            `;
        })
        .join('');

    console.log(`🎨 Rendered ${this.allColors.length} colors`);
}

/**
 * ⭐ FIXED: Render ALL sizes from variants
 */
renderSizes() {
    const sizeOptions = document.getElementById('sizeOptions');
    if (!sizeOptions) return;

    if (!this.allSizes || this.allSizes.length === 0) {
        sizeOptions.innerHTML = '<p class="text-muted">No sizes available</p>';
        return;
    }

    sizeOptions.innerHTML = this.allSizes
        .map(size => {
            let isAvailable = false;
            let stockQty = 0;
            let variantId = null;
            let isLowStock = false;

            if (this.selectedColor) {
                const variant = this.variants.find(v =>
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
                isAvailable = this.variants.some(v =>
                    v.is_active &&
                    v.size_id === size.size_id &&
                    v.stock_quantity > 0
                );
            }

            return `
                <button 
                    class="size-option 
                           ${this.selectedSize === size.size_id ? 'selected' : ''} 
                           ${!isAvailable && this.selectedColor ? 'unavailable' : ''} 
                           ${isLowStock ? 'low-stock' : ''}"
                    data-size-id="${size.size_id}"
                    data-variant-id="${variantId || ''}"
                    data-stock="${stockQty}"
                    ${!this.selectedColor || (!isAvailable && this.selectedColor) ? 'disabled' : ''}
                    onclick="${isAvailable && this.selectedColor ? `productDetailManager.selectSize(${size.size_id}, '${size.size_value}', ${variantId}, ${stockQty})` : 'void(0)'}">
                    <span class="${!isAvailable && this.selectedColor ? 'strikethrough' : ''}">
                        ${size.size_value}
                    </span>
                    ${!this.selectedColor ? '<small class="d-block text-muted" style="font-size: 9px;">Choose color</small>' : ''}
                    ${isAvailable && this.selectedColor && isLowStock ? '<span class="badge bg-warning text-dark ms-1">Only ' + stockQty + ' left!</span>' : ''}
                    ${!isAvailable && this.selectedColor ? '<span class="unavailable-mark-size">✕</span>' : ''}
                </button>
            `;
        })
        .join('');

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

        this.renderColors();
        this.renderSizes();

        const selectedColorEl = document.getElementById('selectedColor');
        if (selectedColorEl) {
            selectedColorEl.textContent = colorName;
            selectedColorEl.parentElement.style.display = 'block';
        }

        const selectedSizeEl = document.getElementById('selectedSize');
        if (selectedSizeEl) {
            selectedSizeEl.textContent = '';
            selectedSizeEl.parentElement.style.display = 'none';
        }

        const warningEl = document.getElementById('stockWarning');
        if (warningEl) {
            warningEl.style.display = 'none';
        }

        const addToCartBtn = document.getElementById('addToCartBtn');
        if (addToCartBtn) {
            addToCartBtn.disabled = true;
        }
    }


    /**
     * ⭐ FIXED: Select size with stock validation
     */
    selectSize(sizeId, sizeValue, variantId, stock) {
        if (!this.selectedColor) {
            alert('Vui lòng chọn màu trước!');
            return;
        }

        if (stock <= 0) {
            alert('Size này đã hết hàng!');
            return;
        }

        this.selectedSize = sizeId;
        this.currentVariant = this.variants.find(v => v.variant_id === variantId);

        console.log(`👟 Selected size: ${sizeValue} (${sizeId}), Stock: ${stock}`);

        this.renderSizes();

        const selectedSizeEl = document.getElementById('selectedSize');
        if (selectedSizeEl) {
            selectedSizeEl.textContent = sizeValue;
            selectedSizeEl.parentElement.style.display = 'block';
        }

        if (stock > 0 && stock < 5) {
            this.showStockWarning(stock);
        } else {
            const warningEl = document.getElementById('stockWarning');
            if (warningEl) {
                warningEl.style.display = 'none';
            }
        }

        const addToCartBtn = document.getElementById('addToCartBtn');
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
        }
    }

    /**
     * ⭐ Show stock warning with animation
     */
     showStockWarning(stock) {
        const warningEl = document.getElementById('stockWarning');
        if (warningEl) {
            warningEl.innerHTML = `
                <div class="alert alert-warning mt-2 py-2 px-3" role="alert">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    <strong>Nhanh tay!</strong> Chỉ còn <strong>${stock}</strong> sản phẩm!
                </div>
            `;
            warningEl.style.display = 'block';
        }
    }


    /**
     * Update size availability based on selected color
     */
    updateSizeAvailability() {
        document.querySelectorAll('.size-option').forEach(sizeEl => {
            const sizeId = parseInt(sizeEl.dataset.sizeId);

            // If no color selected, check if size has any stock in any color
            if (!this.selectedColor) {
                const hasStock = this.variants.some(v => 
                    v.size_id === sizeId && v.stock_quantity > 0
                );
                
                if (!hasStock) {
                    sizeEl.classList.add('unavailable');
                } else {
                    sizeEl.classList.remove('unavailable');
                }
            } else {
                // Check if this size + color combination has stock
                const variant = this.variants.find(v => 
                    v.color_id === this.selectedColor && 
                    v.size_id === sizeId
                );

                if (!variant || variant.stock_quantity === 0) {
                    sizeEl.classList.add('unavailable');
                } else {
                    sizeEl.classList.remove('unavailable');
                }
            }
        });
    }

    /**
     * Check if selected variant is available
     */
    checkVariantAvailability() {
        if (!this.selectedColor || !this.selectedSize) {
            document.getElementById('addToBagBtn').disabled = true;
            document.getElementById('stockInfo').style.display = 'none';
            return;
        }

        // Find the variant
        const variant = this.variants.find(v => 
            v.color_id === this.selectedColor && 
            v.size_id === this.selectedSize
        );

        if (!variant || variant.stock_quantity === 0) {
            this.showStockStatus('out', 0);
            document.getElementById('addToBagBtn').disabled = true;
            this.currentVariant = null;
        } else {
            this.showStockStatus('in', variant.stock_quantity);
            document.getElementById('addToBagBtn').disabled = false;
            this.currentVariant = variant;
        }
    }

    /**
     * Show stock status
     */
    showStockStatus(status, quantity) {
        const stockInfo = document.getElementById('stockInfo');
        const stockMessage = document.getElementById('stockMessage');

        stockInfo.style.display = 'block';
        stockInfo.className = 'stock-info';

        if (status === 'out') {
            stockInfo.classList.add('out-of-stock');
            stockMessage.textContent = 'This combination is currently out of stock';
        } else if (quantity < 5) {
            stockInfo.classList.add('low-stock');
            stockMessage.textContent = `Only ${quantity} left in stock`;
        } else {
            stockInfo.classList.add('in-stock');
            stockMessage.textContent = 'In stock and ready to ship';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        document.getElementById('loading').style.display = 'none';
        alert(message);
        window.location.href = 'products.html';
    }

    /**
     * Show alert
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
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
}

// Add to Bag button functionality
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addToBagBtn')?.addEventListener('click', function() {
        if (!this.disabled) {
            showAlert('Product added to bag!', 'success');
        }
    });
});

// Make it globally accessible
window.ProductDetailManager = ProductDetailManager;
