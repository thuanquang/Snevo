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
        
        // Listen to role updates
        this.authService.on('roleUpdated', (data) => {
            console.log('🔄 Role updated, refreshing UI:', data.role);
            this.updateAuthUI();
        });
        
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
        
        // Force UI updates at intervals to ensure profile is loaded
        // This handles the race condition where profile data arrives after initial sign-in
        const updateIntervals = [300, 800, 1500];
        updateIntervals.forEach(delay => {
            setTimeout(() => {
                console.log(`🔄 Scheduled UI update after ${delay}ms`);
                this.updateAuthUI();
            }, delay);
        });
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
            console.log('No authButtons element found, retrying in 100ms...');
            // Retry after a short delay
            setTimeout(() => this.updateAuthUI(), 100);
            return;
        }

        const user = this.authService.currentUser;
        const role = this.authService.getUserRole();
        const isAuthenticated = this.authService.isAuthenticated();

        console.log('Updating auth UI:', { isAuthenticated, role, user: user?.email });

        // Modified: Don't require role to be truthy, just authenticated and user
        if (isAuthenticated && user) {
            // Better fallback chain for display name
            const userName = user.username || 
                           user.user_metadata?.username || 
                           user.user_metadata?.full_name ||
                           user.user_metadata?.name ||
                           user.full_name ||
                           user.email?.split('@')[0] || 
                           'User';
            
            // Determine target page based on role (default to customer)
            const userRole = role || 'customer';
            const targetPage = userRole === 'seller' ? 'admin.html' : 'profile.html';
            const linkId = userRole === 'seller' ? 'adminLink' : 'profileLink';
            
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
        try {
            console.log('🔐 AuthManager: Starting logout process...');
            
            // Call AuthService logout
            const result = await this.authService.logout();
            
            // Check for errors in the result
            if (result && result.error) {
                console.error('❌ AuthService logout failed:', result.error);
                throw new Error(result.error.message || 'Logout failed');
            }
            
            // Clear local auth data
            this.clearAuthData();
            
            // Update UI immediately
            this.updateAuthUI();
            
            // Emit logout event
            this.emit('logout');
            
            console.log('✅ AuthManager: Logout completed successfully');
            return { success: true };
            
        } catch (error) {
            console.error('❌ AuthManager logout error:', error);
            
            // Even if logout fails, try to clear local data
            try {
                this.clearAuthData();
                this.updateAuthUI();
            } catch (clearError) {
                console.error('❌ Failed to clear auth data:', clearError);
            }
            
            // Re-throw the error for the calling code to handle
            throw error;
        }
    }

    /**
     * Clear authentication data
     */
    clearAuthData() {
        console.log('🧹 AuthManager: Clearing authentication data...');
        
        // Clear local storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        localStorage.removeItem('supabase.auth.user');
        
        // Clear session storage
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
        }
        
        // Clear any cookies related to auth
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('auth') || name.includes('session') || name.includes('token') ||
                name.includes('supabase') || name.includes('user')) {
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
            }
        });
        
        console.log('✅ AuthManager: Authentication data cleared');
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
            // Show login modal instead of redirecting
            if (window.showLoginModal) {
                window.showLoginModal();
            }
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
