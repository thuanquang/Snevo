/**
 * Navbar Overrides - Common presets for page-specific navbar customizations
 * Provides predefined override configurations for different page types
 */

// Common navbar override presets
const NAVBAR_OVERRIDES = {
    // Checkout page overrides
    checkout: {
        hideCart: true,
        showProgressBar: true,
        customActions: ['save-progress', 'back-to-cart'],
        class: 'checkout-navbar'
    },
    
    // Admin page overrides
    admin: {
        showAdminMenu: true,
        hideUserProfile: false,
        customActions: ['admin-dashboard', 'logout'],
        class: 'admin-navbar'
    },
    
    // Product detail page overrides
    productDetail: {
        showBreadcrumb: true,
        showFilters: ['size', 'color', 'price'],
        customActions: ['add-to-wishlist', 'share'],
        class: 'product-detail-navbar'
    },
    
    // Cart page overrides
    cart: {
        hideCart: true,
        showCheckoutButton: true,
        customActions: ['continue-shopping'],
        class: 'cart-navbar'
    },
    
    // Profile page overrides
    profile: {
        showUserMenu: true,
        customActions: ['edit-profile', 'logout'],
        class: 'profile-navbar'
    },
    
    // Orders page overrides
    orders: {
        showOrderFilters: true,
        customActions: ['order-history', 'track-order'],
        class: 'orders-navbar'
    }
};

/**
 * Apply navbar overrides for a specific page type
 * @param {string} pageType - The page type (checkout, admin, etc.)
 * @param {Object} customOverrides - Additional custom overrides
 */
function applyNavbarOverrides(pageType, customOverrides = {}) {
    const preset = NAVBAR_OVERRIDES[pageType] || {};
    const overrides = { ...preset, ...customOverrides };
    
    // Set window.NAVBAR_OVERRIDES for NavbarManager to pick up
    window.NAVBAR_OVERRIDES = overrides;
    
    console.log(`🔧 Applied navbar overrides for ${pageType}:`, overrides);
    return overrides;
}

/**
 * Get navbar overrides for a specific page type
 * @param {string} pageType - The page type
 * @returns {Object} The override configuration
 */
function getNavbarOverrides(pageType) {
    return NAVBAR_OVERRIDES[pageType] || {};
}

/**
 * Create custom navbar action
 * @param {string} actionType - The action type
 * @param {Object} options - Action options
 * @returns {Object} Action configuration
 */
function createNavbarAction(actionType, options = {}) {
    const actions = {
        'admin-dashboard': {
            text: 'Admin',
            icon: 'fas fa-tachometer-alt',
            href: 'admin.html',
            class: 'admin-link'
        },
        'logout': {
            text: 'Logout',
            icon: 'fas fa-sign-out-alt',
            action: 'logout',
            class: 'logout-link'
        },
        'save-progress': {
            text: 'Save Progress',
            icon: 'fas fa-save',
            action: 'save-progress',
            class: 'save-link'
        },
        'back-to-cart': {
            text: 'Back to Cart',
            icon: 'fas fa-arrow-left',
            href: 'cart.html',
            class: 'back-link'
        },
        'continue-shopping': {
            text: 'Continue Shopping',
            icon: 'fas fa-shopping-bag',
            href: 'products.html',
            class: 'continue-link'
        },
        'edit-profile': {
            text: 'Edit Profile',
            icon: 'fas fa-edit',
            href: 'profile.html',
            class: 'edit-link'
        },
        'order-history': {
            text: 'Order History',
            icon: 'fas fa-history',
            href: 'orders.html',
            class: 'history-link'
        },
        'track-order': {
            text: 'Track Order',
            icon: 'fas fa-truck',
            action: 'track-order',
            class: 'track-link'
        }
    };
    
    return actions[actionType] || { text: actionType, class: 'custom-action' };
}

// Export for global use
window.NAVBAR_OVERRIDES_PRESETS = NAVBAR_OVERRIDES;
window.applyNavbarOverrides = applyNavbarOverrides;
window.getNavbarOverrides = getNavbarOverrides;
window.createNavbarAction = createNavbarAction;

export { NAVBAR_OVERRIDES, applyNavbarOverrides, getNavbarOverrides, createNavbarAction };
