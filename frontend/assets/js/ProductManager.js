/**
 * ProductManager - OOP Product management class
 * Handles product browsing, search, cart management, and product display
 */

import { productsAPI } from './ApiClient.js';

class ProductManager {
    constructor(options = {}) {
        this.options = {
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            autoLoadCategories: true,
            autoLoadFeatured: true,
            ...options
        };
        
        this.cache = new Map();
        this.categories = [];
        this.featuredProducts = [];
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.listeners = new Map();
        
        if (this.options.autoLoadCategories) {
            this.loadCategories();
        }
        
        if (this.options.autoLoadFeatured) {
            this.loadFeaturedProducts();
        }
    }

    /**
     * Load categories from API
     */
    async loadCategories() {
        try {
            const cacheKey = 'categories';
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                this.categories = cached;
                this.emit('categoriesLoaded', this.categories);
                return this.categories;
            }

            const response = await productsAPI.getCategories();
            if (response.success) {
                this.categories = response.data.categories;
                this.setCache(cacheKey, this.categories);
                this.emit('categoriesLoaded', this.categories);
                return this.categories;
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.emit('categoriesError', error);
            throw error;
        }
    }

    /**
     * Load featured products from API
     */
    async loadFeaturedProducts(limit = 8) {
        try {
            const cacheKey = `featured_${limit}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                this.featuredProducts = cached;
                this.emit('featuredProductsLoaded', this.featuredProducts);
                return this.featuredProducts;
            }

            const response = await productsAPI.getFeaturedProducts(limit);
            if (response.success) {
                this.featuredProducts = response.data.products;
                this.setCache(cacheKey, this.featuredProducts);
                this.emit('featuredProductsLoaded', this.featuredProducts);
                return this.featuredProducts;
            }
        } catch (error) {
            console.error('Failed to load featured products:', error);
            this.emit('featuredProductsError', error);
            throw error;
        }
    }

    /**
     * Get products with filtering and pagination
     */
    async getProducts(filters = {}, pagination = {}) {
        try {
            const cacheKey = `products_${JSON.stringify({ filters, pagination })}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                this.emit('productsLoaded', cached);
                return cached;
            }

            const response = await productsAPI.getProducts({
                ...filters,
                ...pagination
            });
            
            if (response.success) {
                this.setCache(cacheKey, response.data);
                this.emit('productsLoaded', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to load products:', error);
            this.emit('productsError', error);
            throw error;
        }
    }

    /**
     * Get product by ID
     */
    async getProduct(id) {
        try {
            const cacheKey = `product_${id}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                this.emit('productLoaded', cached);
                return cached;
            }

            const response = await productsAPI.getProduct(id);
            if (response.success) {
                this.setCache(cacheKey, response.data.product);
                this.emit('productLoaded', response.data.product);
                return response.data.product;
            }
        } catch (error) {
            console.error('Failed to load product:', error);
            this.emit('productError', error);
            throw error;
        }
    }

    /**
     * Search products
     */
    async searchProducts(query, filters = {}, pagination = {}) {
        try {
            if (!query || query.trim().length < 2) {
                throw new Error('Search query must be at least 2 characters long');
            }

            const cacheKey = `search_${JSON.stringify({ query, filters, pagination })}`;
            const cached = this.getFromCache(cacheKey, 2 * 60 * 1000); // 2 minutes for search
            
            if (cached) {
                this.emit('searchResults', cached);
                return cached;
            }

            const response = await productsAPI.searchProducts(query, {
                ...filters,
                ...pagination
            });
            
            if (response.success) {
                this.setCache(cacheKey, response.data);
                this.emit('searchResults', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to search products:', error);
            this.emit('searchError', error);
            throw error;
        }
    }

    /**
     * Get products by category
     */
    async getProductsByCategory(categoryId, pagination = {}) {
        try {
            const cacheKey = `category_${categoryId}_${JSON.stringify(pagination)}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                this.emit('categoryProductsLoaded', cached);
                return cached;
            }

            const response = await productsAPI.getProductsByCategory(categoryId, pagination);
            if (response.success) {
                this.setCache(cacheKey, response.data);
                this.emit('categoryProductsLoaded', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to load category products:', error);
            this.emit('categoryProductsError', error);
            throw error;
        }
    }

    /**
     * Get product reviews
     */
    async getProductReviews(productId, pagination = {}) {
        try {
            const response = await productsAPI.getProductReviews(productId, pagination);
            if (response.success) {
                this.emit('reviewsLoaded', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to load reviews:', error);
            this.emit('reviewsError', error);
            throw error;
        }
    }

    /**
     * Create product review
     */
    async createReview(productId, reviewData) {
        try {
            const response = await productsAPI.createProductReview(productId, reviewData);
            if (response.success) {
                // Clear cached reviews
                this.clearCacheByPattern(`reviews_${productId}`);
                this.emit('reviewCreated', response.data.review);
                return response.data.review;
            }
        } catch (error) {
            console.error('Failed to create review:', error);
            this.emit('reviewError', error);
            throw error;
        }
    }

    /**
     * Add product to cart
     */
    addToCart(product, variantId = null, quantity = 1) {
        try {
            const existingItem = this.cart.find(item => 
                item.product_id === product.shoe_id && item.variant_id === variantId
            );

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                this.cart.push({
                    product_id: product.shoe_id,
                    variant_id: variantId,
                    quantity: quantity,
                    product_name: product.shoe_name,
                    product_image: product.image_url,
                    price: product.min_price || product.base_price,
                    added_at: new Date().toISOString()
                });
            }

            this.saveCart();
            this.emit('cartUpdated', { cart: this.cart, action: 'add', product });
            
            if (window.showToast) {
                window.showToast('Product added to cart!', 'success');
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            this.emit('cartError', error);
            throw error;
        }
    }

    /**
     * Remove product from cart
     */
    removeFromCart(productId, variantId = null) {
        try {
            const index = this.cart.findIndex(item => 
                item.product_id === productId && item.variant_id === variantId
            );

            if (index > -1) {
                const removedItem = this.cart.splice(index, 1)[0];
                this.saveCart();
                this.emit('cartUpdated', { cart: this.cart, action: 'remove', product: removedItem });
                
                if (window.showToast) {
                    window.showToast('Product removed from cart', 'info');
                }
            }
        } catch (error) {
            console.error('Failed to remove from cart:', error);
            this.emit('cartError', error);
            throw error;
        }
    }

    /**
     * Update cart item quantity
     */
    updateCartQuantity(productId, variantId, quantity) {
        try {
            const item = this.cart.find(item => 
                item.product_id === productId && item.variant_id === variantId
            );

            if (item) {
                if (quantity <= 0) {
                    this.removeFromCart(productId, variantId);
                } else {
                    item.quantity = quantity;
                    this.saveCart();
                    this.emit('cartUpdated', { cart: this.cart, action: 'update', product: item });
                }
            }
        } catch (error) {
            console.error('Failed to update cart quantity:', error);
            this.emit('cartError', error);
            throw error;
        }
    }

    /**
     * Clear cart
     */
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.emit('cartUpdated', { cart: this.cart, action: 'clear' });
    }

    /**
     * Get cart items
     */
    getCart() {
        return [...this.cart];
    }

    /**
     * Get cart total
     */
    getCartTotal() {
        return this.cart.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    /**
     * Get cart item count
     */
    getCartItemCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    }

    /**
     * Save cart to localStorage
     */
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    /**
     * Cache management
     */
    setCache(key, data, ttl = null) {
        const cacheData = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.options.cacheTimeout
        };
        this.cache.set(key, cacheData);
    }

    getFromCache(key, ttl = null) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        const maxAge = ttl || cached.ttl;

        if (age > maxAge) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clearCache() {
        this.cache.clear();
    }

    clearCacheByPattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Render products grid
     */
    renderProductsGrid(products, container) {
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p>No products found</p></div>';
            return;
        }

        const productsHTML = products.map(product => this.renderProductCard(product)).join('');
        container.innerHTML = productsHTML;
    }

    /**
     * Render single product card
     */
    renderProductCard(product) {
        return `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div class="product-card" data-product-id="${product.shoe_id}">
                    <div class="product-image">
                        <img src="${product.image_url || '/assets/images/products/default.jpg'}" 
                             alt="${product.shoe_name}" 
                             loading="lazy">
                        <div class="product-overlay">
                            <div class="product-actions">
                                <button class="btn btn-light btn-sm" onclick="productManager.viewProduct(${product.shoe_id})">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="productManager.quickAddToCart(${product.shoe_id})">
                                    <i class="fas fa-cart-plus"></i> Add
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="product-info">
                        <h5 class="product-title">${product.shoe_name}</h5>
                        <div class="product-price">
                            ${this.formatPrice(product.min_price || product.base_price)}
                            ${product.max_price && product.max_price !== product.min_price ? 
                              ` - ${this.formatPrice(product.max_price)}` : ''}
                        </div>
                        <div class="product-rating">
                            <div class="rating-stars">
                                ${this.renderStars(4.5)} <!-- Placeholder rating -->
                            </div>
                            <span>(24 reviews)</span>
                        </div>
                        ${!product.in_stock ? '<div class="out-of-stock">Out of Stock</div>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render categories
     */
    renderCategories(container) {
        if (!container) return;

        if (this.categories.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p>No categories available</p></div>';
            return;
        }

        const categoriesHTML = this.categories.map(category => `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div class="category-card" onclick="productManager.goToCategory(${category.category_id})">
                    <img src="${category.image_url || '/assets/images/categories/default.jpg'}" 
                         alt="${category.category_name}" 
                         class="category-image">
                    <div class="category-overlay">
                        <h3 class="category-title">${category.category_name}</h3>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = categoriesHTML;
    }

    /**
     * Quick add to cart (for product cards)
     */
    async quickAddToCart(productId) {
        try {
            const product = await this.getProduct(productId);
            this.addToCart(product);
        } catch (error) {
            console.error('Quick add to cart failed:', error);
            if (window.showToast) {
                window.showToast('Failed to add product to cart', 'error');
            }
        }
    }

    /**
     * View product details
     */
    viewProduct(productId) {
        window.location.href = `/product-detail.html?id=${productId}`;
    }

    /**
     * Go to category page
     */
    goToCategory(categoryId) {
        window.location.href = `/products.html?category=${categoryId}`;
    }

    /**
     * Format price for display
     */
    formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    }

    /**
     * Render star rating
     */
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '';

        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }

        // Half star
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }

        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }

        return starsHTML;
    }

    /**
     * Event management
     */
    on(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(handler);
    }

    off(eventName, handler) {
        if (!this.listeners.has(eventName)) return;

        const handlers = this.listeners.get(eventName);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    emit(eventName, data = null) {
        if (!this.listeners.has(eventName)) return;

        const handlers = this.listeners.get(eventName);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in product event handler for ${eventName}:`, error);
            }
        });
    }
}

// Create global instance
const productManager = new ProductManager();

// Export for global use
window.ProductManager = ProductManager;
window.productManager = productManager;

export default ProductManager;
export { productManager };

