/**
 * AuthManager - Simplified authentication manager using AuthService
 * Handles UI updates and acts as a facade for AuthService
 */

import authService from './services/AuthService.js';

class AuthManager {
    constructor(options = {}) {
        this.authService = authService;
        this.options = {
            autoInit: true,
            redirectOnLogout: true,
            ...options
        };
        
        if (this.options.autoInit) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
            } else {
                this.initialize();
            }
        }
    }

    /**
     * Initialize authentication
     */
    async initialize() {
        console.log('🔐 Initializing AuthManager...');
        
        // Initialize AuthService
        await this.authService.initialize();
        
        // Subscribe to auth events
        this.authService.on('signedIn', (data) => this.handleSignedIn(data));
        this.authService.on('signedOut', () => this.handleSignedOut());
        this.authService.on('userUpdated', (data) => this.handleUserUpdated(data));
        this.authService.on('initialized', (data) => this.handleInitialized(data));
        
        // Update UI
        this.updateAuthUI();
        
        console.log('✅ AuthManager initialized');
    }

    /**
     * Handle signed in event
     */
    handleSignedIn(data) {
        console.log('✅ User signed in:', data.user?.email);
        this.updateAuthUI();
        
        // Handle OAuth redirect
        if (window.location.pathname.includes('login.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('return');
            const redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : 'index.html';
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
        }
    }

    /**
     * Handle signed out event
     */
    handleSignedOut() {
        console.log('👋 User signed out');
        this.updateAuthUI();
        
        if (this.options.redirectOnLogout && !window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Handle user updated event
     */
    handleUserUpdated(data) {
        console.log('🔄 User updated:', data.user?.email);
        this.updateAuthUI();
    }

    /**
     * Handle initialized event
     */
    handleInitialized(data) {
        console.log('🎯 Auth initialized with user:', data.user?.email, 'role:', data.role);
        this.updateAuthUI();
    }

    /**
     * Update authentication UI
     */
    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        
        if (!authButtons) {
            console.log('No authButtons element found');
            return;
        }

        const user = this.authService.currentUser;
        const role = this.authService.getUserRole();
        const isAuthenticated = this.authService.isAuthenticated();

        console.log('Updating auth UI:', { isAuthenticated, role, user: user?.email });

        if (isAuthenticated && user && role) {
            // User is logged in - show profile/admin link
            const userName = user.user_metadata?.username || 
                           user.user_metadata?.full_name || 
                           user.email?.split('@')[0] || 
                           'User';
            
            // Determine target page based on role
            const targetPage = role === 'seller' ? 'admin.html' : 'profile.html';
            const linkId = role === 'seller' ? 'adminLink' : 'profileLink';
            
            // Determine relative path
            const getRelativePath = (page) => {
                const currentPath = window.location.pathname;
                if (currentPath.includes('/pages/')) {
                    return page;
                } else {
                    return `pages/${page}`;
                }
            };

            authButtons.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link text-white px-4" href="${getRelativePath(targetPage)}" id="${linkId}">
                        ${userName}
                    </a>
                </li>
            `;
        } else {
            // User is not logged in - show login button
            authButtons.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link text-white px-4" href="#" id="globalLoginLink">Login</a>
                </li>
            `;

            // Wire up login button
            setTimeout(() => {
                const loginLink = document.getElementById('globalLoginLink');
                if (loginLink) {
                    loginLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (window.showLoginModal) {
                            window.showLoginModal();
                        } else {
                            this.loginWithGoogle();
                        }
                    });
                }
            }, 0);
        }
    }

    /**
     * Login with Google
     */
    async loginWithGoogle() {
        return await this.authService.loginWithGoogle();
    }

    /**
     * Login with email/password
     */
    async login(email, password) {
        return await this.authService.loginWithEmail(email, password);
    }

    /**
     * Register new user
     */
    async register(userData) {
        return await this.authService.register(
            userData.email,
            userData.password,
            {
                username: userData.username,
                full_name: userData.full_name
            }
        );
    }

    /**
     * Logout user
     */
    async logout() {
        const result = await this.authService.logout();
        // UI update happens via event listener
        return result;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.authService.isAuthenticated();
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.authService.currentUser;
    }

    /**
     * Get user role
     */
    getUserRole() {
        return this.authService.getUserRole();
    }

    /**
     * Check if user has specific role
     */
    hasRole(requiredRole) {
        const role = this.getUserRole();
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(role);
        }
        return role === requiredRole;
    }

    /**
     * Require authentication for protected pages
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `login.html?return=${returnUrl}`;
            return false;
        }
        return true;
    }

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        return await this.authService.updateProfile(updates);
    }

    /**
     * Password reset
     */
    async forgotPassword(email) {
        return await this.authService.resetPassword(email);
    }

    /**
     * Force update UI (for debugging)
     */
    forceUpdateUI() {
        console.log('Force updating UI - Current state:', {
            isAuthenticated: this.isAuthenticated(),
            user: this.getCurrentUser()?.email,
            role: this.getUserRole()
        });
        this.updateAuthUI();
    }

    /**
     * Debug authentication state
     */
    debug() {
        return {
            authenticated: this.isAuthenticated(),
            user: this.getCurrentUser(),
            role: this.getUserRole(),
            authService: this.authService
        };
    }

    /**
     * Add event listener
     */
    on(eventName, handler) {
        this.authService.on(eventName, handler);
    }

    /**
     * Remove event listener
     */
    off(eventName, handler) {
        this.authService.off(eventName, handler);
    }
}

// Create global instance
const authManager = new AuthManager();

// Export for global use
window.AuthManager = AuthManager;
window.authManager = authManager;

// Add global debugging functions
window.forceUpdateAuthUI = () => authManager.forceUpdateUI();
window.debugAuth = () => authManager.debug();

export default AuthManager;
export { authManager };
