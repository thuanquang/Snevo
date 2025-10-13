/**
 * Cart Page JavaScript
 * Handles cart functionality and authentication for cart page
 */

import { authManager } from './AuthManager.js';

class CartPage {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initialize cart page
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🛒 Initializing cart page...');
        
        // Wait for AuthManager to be available
        await this.waitForAuthManager();
        
        // Check authentication state
        this.checkAuthentication();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Cart page initialized');
    }

    /**
     * Wait for AuthManager to be available
     */
    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        return new Promise((resolve) => {
            const checkAuthManager = () => {
                attempts++;
                if (typeof authManager !== 'undefined' && authManager) {
                    console.log('🔐 AuthManager found for cart page');
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkAuthManager, 100);
                } else {
                    console.warn('⚠️ AuthManager not found for cart page');
                    resolve();
                }
            };
            checkAuthManager();
        });
    }

    /**
     * Check authentication state
     */
    checkAuthentication() {
        if (typeof authManager === 'undefined') {
            console.warn('AuthManager not available for cart authentication check');
            return;
        }

        console.log('🔍 Checking cart authentication...');
        
        // Wait a bit for authentication to be fully validated
        setTimeout(() => {
            this.performAuthCheck();
        }, 1500);
    }

    /**
     * Perform authentication check
     */
    performAuthCheck() {
        if (typeof authManager === 'undefined') {
            console.warn('AuthManager not available for cart auth check');
            return;
        }

        const isAuthenticated = authManager.isAuthenticated();
        const hasToken = localStorage.getItem('auth_token');
        const user = authManager.getCurrentUser();
        
        console.log('🛒 Cart auth check:', {
            isAuthenticated,
            hasToken,
            user: user ? user.email || user.username : null
        });
        
        if (isAuthenticated) {
            console.log('✅ User is authenticated for cart access');
            // User is authenticated, allow access to cart
            this.showCartContent();
        } else if (hasToken) {
            console.log('🔍 Token exists but not authenticated - waiting for validation...');
            // Token exists but not yet validated, wait a bit more
            setTimeout(() => {
                this.performAuthCheck();
            }, 1000);
        } else {
            console.log('❌ User not authenticated for cart access');
            // No token, redirect to login
            this.redirectToLogin();
        }
    }

    /**
     * Show cart content
     */
    showCartContent() {
        console.log('🛒 Showing cart content');
        // Cart content is already visible in HTML
        // This method can be used to load cart data or show user-specific content
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        console.log('🔄 Redirecting to login for cart access');
        const returnUrl = encodeURIComponent(window.location.href);
        if (window.showLoginModal) {
            window.showLoginModal();
        } else {
            console.error('Login modal not available');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for authentication state changes
        if (typeof authManager !== 'undefined') {
            authManager.on('signedIn', (data) => {
                console.log('✅ User signed in - cart access granted');
                this.showCartContent();
            });
            
            authManager.on('signedOut', () => {
                console.log('❌ User signed out - redirecting to login');
                this.redirectToLogin();
            });
            
            authManager.on('loginSuccess', (data) => {
                console.log('🎉 Login success - cart access granted');
                this.showCartContent();
            });
        }
    }

    /**
     * Debug cart authentication
     */
    debug() {
        console.log('🔍 === CART AUTH DEBUG ===');
        
        if (typeof authManager !== 'undefined') {
            console.log('AuthManager state:', authManager.debug());
        } else {
            console.log('AuthManager not available');
        }
        
        const authToken = localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        console.log('Tokens:', {
            authToken: authToken ? `${authToken.substring(0, 20)}...` : 'None',
            refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'None'
        });
        
        console.log('Current path:', window.location.pathname);
        console.log('🔍 === END CART DEBUG ===');
    }
}

// Initialize cart page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const cartPage = new CartPage();
    
    // Make it globally available for debugging
    window.cartPage = cartPage;
    window.debugCart = () => cartPage.debug();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartPage;
}

export default CartPage;
