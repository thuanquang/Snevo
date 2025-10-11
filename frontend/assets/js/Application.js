/**
 * Application - Main OOP application class
 * Orchestrates all components and manages the overall application state
 */

import authService from './services/AuthService.js';
import { authManager } from './AuthManager.js';
import { productManager } from './ProductManager.js';
import { navbarManager } from './NavbarManager.js';

class Application {
    constructor(options = {}) {
        this.options = {
            autoInit: true,
            enableAnimations: true,
            enableToasts: true,
            ...options
        };
        
        this.isInitialized = false;
        this.components = new Map();
        this.listeners = new Map();
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.handleDocumentReady = this.handleDocumentReady.bind(this);
        
        if (this.options.autoInit) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', this.handleDocumentReady);
            } else {
                this.handleDocumentReady();
            }
        }
    }

    /**
     * Handle document ready
     */
    handleDocumentReady() {
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🚀 Initializing Snevo E-commerce Application...');
            
            // Wait for AuthManager to be available
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const waitForAuthManager = () => {
                return new Promise((resolve) => {
                    const checkAuthManager = () => {
                        attempts++;
                        if (typeof authManager !== 'undefined' && authManager) {
                            console.log('🔐 AuthManager found, initializing...');
                            resolve();
                        } else if (attempts < maxAttempts) {
                            setTimeout(checkAuthManager, 100);
                        } else {
                            console.error('❌ AuthManager not found after waiting!');
                            resolve();
                        }
                    };
                    checkAuthManager();
                });
            };
            
            await waitForAuthManager();
            
            if (typeof authManager !== 'undefined') {
                console.log('🔐 AuthManager status:', authManager.debug());
                authManager.forceUpdateUI();
                
                // Check for existing authentication
                this.checkAuthenticationState();
            }
            
            // Initialize core managers
            await this.initializeCore();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Initialize UI components
            this.initializeUIComponents();
            
            // Setup animations if enabled
            if (this.options.enableAnimations) {
                this.initializeAnimations();
            }
            
            // Setup toasts if enabled
            if (this.options.enableToasts) {
                this.initializeToasts();
            }
            
            // Update UI based on current state
            this.updateUI();
            
            this.isInitialized = true;
            this.emit('initialized');
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.emit('initializationError', error);
            throw error;
        }
    }

    /**
     * Initialize core managers
     */
    async initializeCore() {
        // Initialize AuthService first
        console.log('🔐 Initializing AuthService...');
        await authService.initialize();
        
        // Auth manager should already be initialized (auto-init on)
        console.log('🔐 Ensuring AuthManager is initialized...');
        if (authManager && !authManager.authService.initialized) {
            await authManager.initialize();
        }
        
        // Navbar manager initialization
        console.log('🔄 Initializing NavbarManager from Application...');
        if (!navbarManager.isInitialized) {
            await navbarManager.initialize();
        } else {
            console.log('⚠️ NavbarManager already initialized');
        }
        
        // Product manager should already be initialized
        // Setup event listeners between managers
        this.setupManagerEventListeners();
    }

    /**
     * Setup event listeners between managers
     */
    setupManagerEventListeners() {
        // Auth events
        authManager.on('signedIn', (data) => {
            this.handleUserSignedIn(data);
            // Bridge to navbar manager
            if (navbarManager.isInitialized) {
                navbarManager.updateAuthState(data.user, true);
            }
            // Force auth UI update after a small delay to ensure navbar is loaded
            setTimeout(() => {
                console.log('🔄 Forcing auth UI update after signedIn event');
                authManager.updateAuthUI();
            }, 200);
        });
        
        authManager.on('signedOut', () => {
            this.handleUserSignedOut();
            // Bridge to navbar manager
            if (navbarManager.isInitialized) {
                navbarManager.updateAuthState(null, false);
            }
        });
        
        authManager.on('loginError', (data) => {
            this.showToast(data.error, 'error');
        });
        
        authManager.on('registerError', (data) => {
            this.showToast(data.error, 'error');
        });
        
        // Listen to role updates to refresh UI when role is fetched
        authManager.on('roleUpdated', (data) => {
            console.log('🔄 Role updated event received, updating UI:', data.role);
            authManager.updateAuthUI();
            // Also update navbar if needed
            if (navbarManager.isInitialized) {
                navbarManager.updateAuthState(data.user, true);
            }
        });

        // Product events
        productManager.on('cartUpdated', (data) => {
            this.updateCartUI(data);
            // Bridge to navbar manager
            if (navbarManager.isInitialized) {
                const cartCount = productManager.getCartItemCount();
                navbarManager.updateCartCount(cartCount);
            }
        });
        
        productManager.on('categoriesLoaded', (categories) => {
            this.renderCategories(categories);
            // Bridge to navbar manager
            if (navbarManager.isInitialized) {
                navbarManager.updateCategories(categories);
            }
        });
        
        productManager.on('featuredProductsLoaded', (products) => {
            this.renderFeaturedProducts(products);
        });
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Search functionality
        this.setupSearchListeners();
        
        // Navigation
        this.setupNavigationListeners();
        
        // Forms
        this.setupFormListeners();
        
        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
        
        // Window resize handler
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));
        
        // Scroll handler for animations
        if (this.options.enableAnimations) {
            window.addEventListener('scroll', this.throttle(() => {
                this.handleScroll();
            }, 16));
        }
    }

    /**
     * Setup search event listeners
     */
    setupSearchListeners() {
        const searchToggle = document.getElementById('searchToggle');
        const searchOverlay = document.getElementById('searchOverlay');
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (searchToggle) {
            searchToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSearch();
            });
        }
        
        if (searchOverlay) {
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    this.toggleSearch();
                }
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            
            // Auto-complete functionality
            searchInput.addEventListener('input', this.debounce(() => {
                this.handleSearchInput(searchInput.value);
            }, 300));
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', this.performSearch.bind(this));
        }
    }

    /**
     * Setup navigation event listeners
     */
    setupNavigationListeners() {
        // Mobile menu toggle
        const mobileMenuToggle = document.querySelector('.navbar-toggler');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
        
        // Dropdown menus
        const dropdowns = document.querySelectorAll('.dropdown-toggle');
        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('click', (e) => {
                this.handleDropdownClick(e);
            });
        });
    }

    /**
     * Setup form event listeners
     */
    setupFormListeners() {
        // Auth forms
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const googleLoginBtn = document.getElementById('googleLoginButton');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                authManager.handleAuthForm(loginForm, true);
            });
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                authManager.handleAuthForm(registerForm, false);
            });
        }
        
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const result = await authManager.loginWithGoogle();
                if (!result.success) {
                    this.showToast(result.error, 'error');
                }
            });
        }
        
        // Newsletter form
        const newsletterForm = document.getElementById('newsletterForm');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                this.handleNewsletterSubmit(e);
            });
        }
    }

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        // Initialize any custom components
        this.initializeModals();
        this.initializeLoginModal();
        this.initializeCarousels();
        this.initializeTooltips();
        this.initializePopovers();
    }

    /**
     * Initialize modals
     */
    initializeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            // Bootstrap modal initialization if needed
            if (window.bootstrap && bootstrap.Modal) {
                new bootstrap.Modal(modal);
            }
        });
    }

    /**
     * Create and wire the global login modal (Google-only)
     */
    initializeLoginModal() {
        // Avoid duplicate injection
        if (document.getElementById('globalLoginModal')) return;

        // Minimal styles (scoped)
        const style = document.createElement('style');
        style.id = 'globalLoginModalStyles';
        style.textContent = `
            .gl-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:1050}
            .gl-modal{background:#fff;border-radius:12px;max-width:420px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,.2)}
            .gl-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #eee}
            .gl-modal-title{font-size:18px;font-weight:600;margin:0}
            .gl-modal-close{background:none;border:0;font-size:22px;line-height:1;cursor:pointer}
            .gl-modal-body{padding:18px}
            .gl-btn{display:inline-flex;gap:10px;align-items:center;justify-content:center;width:100%;padding:12px 14px;border-radius:10px;border:1px solid #222;background:#fff;color:#222;font-weight:600;cursor:pointer}
            .gl-btn:hover{background:#f6f6f6}
            .gl-desc{font-size:13px;color:#666;margin-top:12px;text-align:center}
        `;
        document.head.appendChild(style);

        // Modal markup
        const overlay = document.createElement('div');
        overlay.id = 'globalLoginModal';
        overlay.className = 'gl-modal-overlay';
        overlay.innerHTML = `
            <div class="gl-modal" role="dialog" aria-modal="true" aria-labelledby="gl-modal-title">
                <div class="gl-modal-header">
                    <h3 id="gl-modal-title" class="gl-modal-title">Sign in</h3>
                    <button class="gl-modal-close" aria-label="Close">×</button>
                </div>
                <div class="gl-modal-body">
                    <button id="gl-google-btn" class="gl-btn">
                        <img alt="Google" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20"/>
                        Continue with Google
                    </button>
                    <div class="gl-desc">We use Google to sign you in. No passwords.</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close handlers
        const close = () => overlay.style.display = 'none';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.gl-modal-close').addEventListener('click', close);

        // Google button
        const googleBtn = overlay.querySelector('#gl-google-btn');
        googleBtn.addEventListener('click', async () => {
            try {
                const result = await authManager.loginWithGoogle();
                if (!result.success && window.showToast) {
                    window.showToast(result.error || 'Google login failed', 'error');
                }
            } catch (err) {
                if (window.showToast) window.showToast('Google login failed', 'error');
            }
        });

        // Expose global function
        window.showLoginModal = () => {
            overlay.style.display = 'flex';
        };

        // Intercept all login.html links to open modal
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href') || '';
            if (href.includes('login.html')) {
                e.preventDefault();
                window.showLoginModal();
            }
        });
    }

    /**
     * Initialize carousels
     */
    initializeCarousels() {
        const carousels = document.querySelectorAll('.carousel');
        carousels.forEach(carousel => {
            if (window.bootstrap && bootstrap.Carousel) {
                new bootstrap.Carousel(carousel);
            }
        });
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            if (window.bootstrap && bootstrap.Tooltip) {
                new bootstrap.Tooltip(tooltip);
            }
        });
    }

    /**
     * Initialize popovers
     */
    initializePopovers() {
        const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
        popovers.forEach(popover => {
            if (window.bootstrap && bootstrap.Popover) {
                new bootstrap.Popover(popover);
            }
        });
    }

    /**
     * Initialize animations
     */
    initializeAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        this.animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        const animateElements = document.querySelectorAll('.product-card, .category-card, .section-title, .animate-on-scroll');
        animateElements.forEach(el => {
            this.animationObserver.observe(el);
        });
    }

    /**
     * Initialize toast system
     */
    initializeToasts() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // Make showToast globally available
        window.showToast = this.showToast.bind(this);
    }

    /**
     * Handle user signed in
     */
    handleUserSignedIn(data) {
        console.log('User signed in:', data.user);
        this.updateUI();
        this.showToast(`Welcome back, ${data.user.username || data.user.full_name}!`, 'success');
    }

    /**
     * Handle user signed out
     */
    handleUserSignedOut() {
        console.log('User signed out');
        this.updateUI();
        this.showToast('You have been signed out', 'info');
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        this.updateCartUI();
        authManager.updateAuthUI();
    }

    /**
     * Update cart UI
     */
    updateCartUI(data = null) {
        const cartCount = document.getElementById('cartCount');
        const cart = productManager.getCart();
        
        if (cartCount) {
            const itemCount = productManager.getCartItemCount();
            cartCount.textContent = itemCount;
            cartCount.style.display = itemCount > 0 ? 'block' : 'none';
        }
        
        // Update cart dropdown if exists
        const cartDropdown = document.getElementById('cartDropdown');
        if (cartDropdown) {
            this.renderCartDropdown(cartDropdown, cart);
        }
    }

    /**
     * Render cart dropdown
     */
    renderCartDropdown(container, cart) {
        if (cart.length === 0) {
            container.innerHTML = '<div class="dropdown-item text-center">Your cart is empty</div>';
            return;
        }
        
        const cartHTML = cart.slice(0, 3).map(item => `
            <div class="dropdown-item d-flex align-items-center">
                <img src="${item.product_image}" alt="${item.product_name}" class="me-2" style="width: 40px; height: 40px; object-fit: cover;">
                <div class="flex-grow-1">
                    <div class="fw-bold">${item.product_name}</div>
                    <div class="text-muted small">${productManager.formatPrice(item.price)} x ${item.quantity}</div>
                </div>
            </div>
        `).join('');
        
        const total = productManager.getCartTotal();
        const moreItems = cart.length > 3 ? `<div class="dropdown-item text-center">+${cart.length - 3} more items</div>` : '';
        
        container.innerHTML = `
            ${cartHTML}
            ${moreItems}
            <div class="dropdown-divider"></div>
            <div class="dropdown-item d-flex justify-content-between">
                <strong>Total: ${productManager.formatPrice(total)}</strong>
            </div>
            <div class="dropdown-item">
                <a href="cart.html" class="btn btn-primary w-100">View Cart</a>
            </div>
        `;
    }

    /**
     * Render categories
     */
    renderCategories(categories) {
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (categoriesGrid) {
            productManager.renderCategories(categoriesGrid);
        }
        
        const categoriesDropdown = document.getElementById('categoriesDropdown');
        if (categoriesDropdown) {
            const dropdownHTML = categories.map(category => `
                <li><a class="dropdown-item" href="products.html?category=${category.category_id}">
                    ${category.category_name}
                </a></li>
            `).join('');
            categoriesDropdown.innerHTML = dropdownHTML;
        }
    }

    /**
     * Render featured products
     */
    renderFeaturedProducts(products) {
        const featuredContainer = document.getElementById('featuredProducts');
        if (featuredContainer) {
            productManager.renderProductsGrid(products, featuredContainer);
        }
    }

    /**
     * Toggle search overlay
     */
    toggleSearch() {
        const searchOverlay = document.getElementById('searchOverlay');
        const searchInput = document.getElementById('searchInput');
        
        if (searchOverlay) {
            searchOverlay.classList.toggle('d-none');
            
            if (!searchOverlay.classList.contains('d-none')) {
                setTimeout(() => {
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 100);
            }
        }
    }

    /**
     * Perform search
     */
    performSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            const query = searchInput.value.trim();
            window.location.href = `/products.html?search=${encodeURIComponent(query)}`;
        }
    }

    /**
     * Handle search input (for auto-complete)
     */
    async handleSearchInput(query) {
        if (query.length < 2) return;
        
        try {
            // Implement auto-complete functionality here
            // For now, just log the query
            console.log('Search query:', query);
        } catch (error) {
            console.error('Search input error:', error);
        }
    }

    /**
     * Handle newsletter form submission
     */
    handleNewsletterSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        
        // Simulate newsletter subscription
        setTimeout(() => {
            this.showToast('Thank you for subscribing!', 'success');
            form.reset();
        }, 500);
    }

    /**
     * Handle escape key
     */
    handleEscapeKey() {
        const searchOverlay = document.getElementById('searchOverlay');
        if (searchOverlay && !searchOverlay.classList.contains('d-none')) {
            this.toggleSearch();
        }
        
        // Close any open modals
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Handle responsive changes
        this.emit('windowResized', { width: window.innerWidth, height: window.innerHeight });
    }

    /**
     * Handle scroll
     */
    handleScroll() {
        // Handle scroll animations or lazy loading
        this.emit('scrolled', { scrollY: window.scrollY });
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            toastContainer.appendChild(toast);
            
            // Initialize and show toast
            if (window.bootstrap && bootstrap.Toast) {
                const bsToast = new bootstrap.Toast(toast, { delay: duration });
                bsToast.show();
                
                // Remove toast element after it's hidden
                toast.addEventListener('hidden.bs.toast', () => {
                    toast.remove();
                });
            }
        }
    }

    /**
     * Utility functions
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
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
                console.error(`Error in app event handler for ${eventName}:`, error);
            }
        });
    }

    /**
     * Check authentication state and handle redirects
     */
    checkAuthenticationState() {
        if (typeof authManager === 'undefined') {
            console.warn('AuthManager not available for auth state check');
            return;
        }

        console.log('🔍 Checking authentication state...');
        
        // Wait a bit for authentication to be fully validated
        setTimeout(() => {
            this.performAuthCheck();
        }, 1000);
    }

    /**
     * Perform the actual authentication check
     */
    performAuthCheck() {
        if (typeof authManager === 'undefined') {
            console.warn('AuthManager not available for auth check');
            return;
        }

        const isAuthenticated = authManager.isAuthenticated();
        const currentPath = window.location.pathname;
        
        console.log('🔍 Auth check results:', {
            isAuthenticated,
            currentPath,
            user: authManager.getCurrentUser()
        });
        
        if (isAuthenticated) {
            console.log('✅ User is authenticated:', authManager.getCurrentUser());
        } else {
            console.log('❌ User is not authenticated');
            
            // Check if we have a token but AuthManager hasn't validated it yet
            const hasToken = localStorage.getItem('auth_token');
            if (hasToken) {
                console.log('🔍 Token exists but not authenticated - waiting for validation...');
                // Don't redirect immediately, let AuthManager handle it
                return;
            }
            
            // If on protected pages, open login modal instead of redirect
            const protectedPages = ['/profile.html', '/orders.html', '/cart.html'];
            if (protectedPages.some(page => currentPath.includes(page))) {
                console.log('🔄 Opening login modal for protected page');
                if (window.showLoginModal) {
                    window.showLoginModal();
                }
            }
        }
    }
}

// Create global application instance
const app = new Application();

// Export for global use
window.Application = Application;
window.app = app;

export default Application;
export { app };

