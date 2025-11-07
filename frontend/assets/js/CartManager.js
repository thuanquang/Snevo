// Cart Manager
class CartManager {
    constructor() {
        this.api = window.cartAPI;
        this.items = [];
        this.loading = false;
        console.log('🛒 CartManager initialized, API:', this.api);
        // Don't call init() here - wait for auth to be ready
    }

    async waitForAuthAndApi() {
        console.log('⏳ Waiting for AuthManager and CartAPI to be ready...');
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds max (reduced from 100)
        
        return new Promise((resolve) => {
            const check = () => {
                attempts++;
                
                // Check if authService is initialized (which means authManager is ready)
                const authReady = window.authService && window.authService.initialized;
                const apiReady = window.cartAPI;
                
                console.log(`⏳ Attempt ${attempts}: authService=${!!authReady}, cartAPI=${!!apiReady}`);
                
                if (authReady && apiReady) {
                    console.log('✅ AuthService and CartAPI ready!');
                    this.api = window.cartAPI;
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(check, 100);
                } else {
                    console.warn('⚠️ Timeout waiting for dependencies, proceeding anyway');
                    this.api = window.cartAPI || this.api;
                    resolve();
                }
            };
            check();
        });
    }

    async init() {
        try {
            console.log('🛒 CartManager.init() started');
            
            // Wait for dependencies
            await this.waitForAuthAndApi();
            
            console.log('🔍 Checking authentication...');
            if (!window.authManager) {
                console.warn('⚠️ authManager not available');
                return;
            }
            
            if (!window.authManager.isAuthenticated()) {
                console.warn('⚠️ User not authenticated');
                if (window.showLoginModal) window.showLoginModal();
                return;
            }
            
            console.log('✅ User authenticated, loading cart');
            await this.loadCart();
        } catch (err) {
            console.error('❌ Cart init error:', err);
        }
    }

    async loadCart() {
        this.loading = true;
        try {
            console.log('🔄 Loading cart from API...');
            const res = await this.api.getCart();
            console.log('📦 API response:', res);
            this.items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            console.log('✅ Parsed items:', this.items);
            await this.render();
            await this.updateTotals();
            // Update navbar cart count
            this.updateNavbarCartCount();
        } catch (err) {
            console.error('❌ Cart load error:', err);
        } finally {
            this.loading = false;
        }
    }

    async updateTotals() {
        try {
            console.log('🔄 Updating totals from API...');
            const res = await this.api.getSummary();
            console.log('📊 Summary response:', res);
            const data = res?.data || res;
            const subtotal = data?.subtotal ?? 0;
            const el = document.getElementById('cartSubtotal');
            if (el) el.textContent = this.formatPrice(subtotal);
            console.log('✅ Subtotal updated:', subtotal);
        } catch (e) {
            console.error('❌ Error updating totals:', e);
        }
    }

    updateNavbarCartCount() {
        const count = this.items?.length || 0;
        console.log('🛒 Updating navbar cart count:', count);
        if (window.navbarManager && typeof window.navbarManager.updateCartCount === 'function') {
            window.navbarManager.updateCartCount(count);
        }
    }

    async changeQuantity(cartId, qty) {
        console.log('🔄 Changing quantity for cart', cartId, 'to', qty);
        await this.api.updateItem(cartId, { quantity: qty });
        await this.loadCart();
    }

    async removeItem(cartId) {
        console.log('🔄 Removing cart item', cartId);
        await this.api.removeItem(cartId);
        await this.loadCart();
    }

    formatPrice(v) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));
    }

    async render() {
        const container = document.getElementById('cartItems');
        if (!container) {
            console.warn('⚠️ cartItems container not found');
            return;
        }

        console.log('🎨 Rendering cart with', this.items.length, 'items');

        if (!this.items || this.items.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-5">Giỏ hàng của bạn đang trống</div>';
            console.log('📭 Cart is empty');
            return;
        }

        container.innerHTML = this.items.map(it => {
            // Handle both nested structure (from CartAPI.getCart) and flattened structure (from previewOrder)
            let title, img, variantText, price;
            
            if (it.shoe_name) {
                // Flattened structure (from previewOrder)
                title = it.shoe_name || 'Product';
                img = it.image_url || '../assets/images/ui/hero_image.svg';
                variantText = `${it.color_name || ''} / ${it.size_label || ''}`.trim();
            } else {
                // Nested structure (from CartAPI.getCart)
                const v = it.shoe_variants || {};
                const shoe = v.shoes || {};
                const color = v.colors || {};
                const size = v.sizes || {};
                title = shoe.shoe_name || 'Product';
                img = shoe.image_url || '../assets/images/ui/hero_image.svg';
                variantText = `${color.color_name || ''} / ${size.size_value || ''}`.trim();
            }
            
            price = this.formatPrice(it.price_at_add);
            const lineTotal = this.formatPrice((Number(it.price_at_add) || 0) * it.quantity);

            console.log('📋 Rendering item:', { title, variantText, price, quantity: it.quantity });

            return `
              <div class="list-group-item d-flex align-items-center" data-cart-id="${it.cart_id}">
                <img src="${img}" alt="${title}" style="width:64px;height:64px;object-fit:cover" class="me-3 rounded">
                <div class="flex-grow-1">
                  <div class="fw-semibold">${title}</div>
                  <div class="text-muted small">${variantText}</div>
                  <div class="text-muted small quantity-controls">${price} x 
                    <button class="btn btn-sm btn-light px-2 ms-1" data-action="dec">-</button>
                    <span class="mx-2">${it.quantity}</span>
                    <button class="btn btn-sm btn-light px-2" data-action="inc">+</button>
                  </div>
                </div>
                <div class="text-end">
                  <div class="fw-semibold">${lineTotal}</div>
                  <button class="btn btn-sm remove-btn mt-2" data-action="remove">Xóa</button>
                </div>
              </div>
            `;
        }).join('');

        // Bind actions
        container.querySelectorAll('.list-group-item').forEach(row => {
            const id = parseInt(row.getAttribute('data-cart-id'));
            row.querySelector('[data-action="inc"]').addEventListener('click', async () => {
                const item = this.items.find(x => x.cart_id === id);
                await this.changeQuantity(id, Math.min(99, (item?.quantity || 1) + 1));
            });
            row.querySelector('[data-action="dec"]').addEventListener('click', async () => {
                const item = this.items.find(x => x.cart_id === id);
                await this.changeQuantity(id, Math.max(1, (item?.quantity || 1) - 1));
            });
            row.querySelector('[data-action="remove"]').addEventListener('click', async () => {
                await this.removeItem(id);
            });
        });
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready, initializing CartManager');
    window.cartManager = new CartManager();
    // Call init after DOM is ready and dependencies have time to load
    setTimeout(() => {
        window.cartManager.init();
    }, 100);
});
