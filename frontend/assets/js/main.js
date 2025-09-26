/**
 * Main JavaScript for Snevo E-commerce Platform
 * Entry point for the OOP-based application
 */

// Import OOP modules
import { app } from './Application.js';
import { authManager } from './AuthManager.js';
import { productManager } from './ProductManager.js';

// Legacy global functions for backward compatibility
// These will be removed in future versions

/**
 * @deprecated Use productManager.goToCategory() instead
 */
function goToCategory(categoryId) {
    console.warn('goToCategory() is deprecated. Use productManager.goToCategory() instead.');
    productManager.goToCategory(categoryId);
}

/**
 * @deprecated Use productManager.viewProduct() instead
 */
function viewProduct(productId) {
    console.warn('viewProduct() is deprecated. Use productManager.viewProduct() instead.');
    productManager.viewProduct(productId);
}

/**
 * @deprecated Use productManager.quickAddToCart() instead
 */
async function addToCart(productId) {
    console.warn('addToCart() is deprecated. Use productManager.quickAddToCart() instead.');
    await productManager.quickAddToCart(productId);
}

/**
 * @deprecated Use app.showToast() instead
 */
function showToast(message, type = 'info') {
    console.warn('showToast() is deprecated. Use app.showToast() instead.');
    app.showToast(message, type);
}

/**
 * @deprecated Use authManager.getCurrentUser() instead
 */
function getCurrentUser() {
    console.warn('getCurrentUser() is deprecated. Use authManager.getCurrentUser() instead.');
    return authManager.getCurrentUser();
}

/**
 * @deprecated Use authManager.isAuthenticated() instead
 */
function isAuthenticated() {
    console.warn('isAuthenticated() is deprecated. Use authManager.isAuthenticated() instead.');
    return authManager.isAuthenticated();
}

/**
 * @deprecated Use authManager.logout() instead
 */
async function logout() {
    console.warn('logout() is deprecated. Use authManager.logout() instead.');
    await authManager.logout();
}

// Export legacy functions for global use (backward compatibility)
window.goToCategory = goToCategory;
window.viewProduct = viewProduct;
window.addToCart = addToCart;
window.showToast = showToast;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.logout = logout;

// Log initialization message
console.log('🚀 Snevo E-commerce Platform (OOP Architecture)');
console.log('📦 Available global objects:');
console.log('   - app: Main application instance');
console.log('   - authManager: Authentication manager');
console.log('   - productManager: Product manager');
console.log('   - apiClient: API client');
console.log('⚠️  Legacy functions available but deprecated');

// Application will auto-initialize when DOM is ready

