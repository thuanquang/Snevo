/**
 * AuthManager - OOP Authentication management class
 * Handles user authentication, session management, and UI updates
 */

import { authAPI, apiClient } from './ApiClient.js';

class AuthManager {
    constructor(options = {}) {
        this.currentUser = null;
        this.supabaseClient = null;
        this.options = {
            autoInit: true,
            redirectOnLogout: true,
            ...options
        };
        this.listeners = new Map();
        
        if (this.options.autoInit) {
            this.initialize();
        }
    }

    /**
     * Initialize authentication system
     */
    async initialize() {
        try {
            this.initializeSupabase();
            
            // Check for existing session
            const token = this.getAuthToken();
            if (token) {
                await this.validateAndRefreshSession();
            }
            
            // Listen for auth state changes
            if (this.supabaseClient) {
                this.supabaseClient.auth.onAuthStateChange((event, session) => {
                    this.handleAuthStateChange(event, session);
                });
            }
            
            this.updateAuthUI();
            console.log('Authentication initialized');
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            throw error;
        }
    }

    /**
     * Initialize Supabase client
     */
    initializeSupabase() {
        // Supabase configuration - these should be set in your environment
        // For frontend, these are typically set in build process or loaded from a config file
        const SUPABASE_URL = window.SUPABASE_URL || 'https://your-project-id.supabase.co';
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'your-anon-key';
        
        if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
            try {
                this.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                });
                console.log('Supabase client initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Supabase client:', error);
            }
        } else {
            console.warn('Supabase configuration missing. Google OAuth will not be available.');
        }
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(event, session) {
        console.log('Auth state changed:', event, session);
        
        switch (event) {
            case 'SIGNED_IN':
                if (session) {
                    this.setAuthToken(session.access_token);
                    this.setRefreshToken(session.refresh_token);
                    this.currentUser = session.user;
                    this.updateAuthUI();
                    this.emit('signedIn', { user: this.currentUser, session });
                }
                break;
            case 'SIGNED_OUT':
                this.clearAuthData();
                this.updateAuthUI();
                this.emit('signedOut');
                break;
            case 'TOKEN_REFRESHED':
                if (session) {
                    this.setAuthToken(session.access_token);
                    this.setRefreshToken(session.refresh_token);
                    this.emit('tokenRefreshed', { session });
                }
                break;
        }
    }

    /**
     * Validate and refresh session if needed
     */
    async validateAndRefreshSession() {
        try {
            const response = await authAPI.getProfile();
            if (response.success) {
                this.currentUser = response.data.user;
                this.emit('sessionValidated', { user: this.currentUser });
                return true;
            } else {
                // Try to refresh token
                const refreshToken = this.getRefreshToken();
                if (refreshToken) {
                    const refreshResponse = await authAPI.refreshToken(refreshToken);
                    if (refreshResponse.success) {
                        this.setAuthToken(refreshResponse.data.session.access_token);
                        this.setRefreshToken(refreshResponse.data.session.refresh_token);
                        this.currentUser = refreshResponse.data.session.user;
                        this.emit('sessionRefreshed', { user: this.currentUser });
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Session validation failed:', error);
        }
        
        // Clear invalid session
        this.clearAuthData();
        return false;
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await authAPI.login(email, password);
            
            if (response.success) {
                const { user, session } = response.data;
                
                this.setAuthToken(session.access_token);
                this.setRefreshToken(session.refresh_token);
                this.currentUser = user;
                
                this.updateAuthUI();
                this.emit('loginSuccess', { user, session });
                
                return { success: true, user };
            } else {
                this.emit('loginError', { error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Login failed:', error);
            const errorMessage = error.message || 'Login failed';
            this.emit('loginError', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await authAPI.register(userData);
            
            if (response.success) {
                const { user, session } = response.data;
                
                if (session) {
                    this.setAuthToken(session.access_token);
                    this.setRefreshToken(session.refresh_token);
                    this.currentUser = user;
                    this.updateAuthUI();
                }
                
                this.emit('registerSuccess', { user, session });
                return { success: true, user };
            } else {
                this.emit('registerError', { error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Registration failed:', error);
            const errorMessage = error.message || 'Registration failed';
            this.emit('registerError', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Always clear local data
            this.clearAuthData();
            this.updateAuthUI();
            this.emit('logout');
            
            // Redirect to home page
            if (this.options.redirectOnLogout && window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
    }

    /**
     * Google OAuth login
     */
    async loginWithGoogle() {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }
            
            const { data, error } = await this.supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
            
            this.emit('googleLoginInitiated');
            return { success: true };
        } catch (error) {
            console.error('Google login failed:', error);
            const errorMessage = error.message || 'Google login failed';
            this.emit('googleLoginError', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        try {
            const response = await authAPI.updateProfile(updates);
            
            if (response.success) {
                this.currentUser = { ...this.currentUser, ...response.data.user };
                this.updateAuthUI();
                this.emit('profileUpdated', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                this.emit('profileUpdateError', { error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Profile update failed:', error);
            const errorMessage = error.message || 'Profile update failed';
            this.emit('profileUpdateError', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Request password reset
     */
    async forgotPassword(email) {
        try {
            const response = await authAPI.forgotPassword(email);
            
            if (response.success) {
                this.emit('passwordResetRequested', { email });
                return { success: true, message: response.message };
            } else {
                this.emit('passwordResetError', { error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Password reset request failed:', error);
            const errorMessage = error.message || 'Password reset request failed';
            this.emit('passwordResetError', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Update authentication UI
     */
    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        
        if (!authButtons) return;
        
        if (this.currentUser) {
            // User is logged in
            authButtons.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user-circle"></i> ${this.currentUser.username || this.currentUser.full_name || 'User'}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/profile.html">
                            <i class="fas fa-user"></i> Profile
                        </a></li>
                        <li><a class="dropdown-item" href="/orders.html">
                            <i class="fas fa-shopping-bag"></i> Orders
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="authManager.logout()">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a></li>
                    </ul>
                </li>
            `;
        } else {
            // User is not logged in
            authButtons.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="/login.html">Login</a>
                </li>
            `;
        }
    }

    /**
     * Clear authentication data
     */
    clearAuthData() {
        this.currentUser = null;
        this.setAuthToken(null);
        this.setRefreshToken(null);
        
        if (this.supabaseClient) {
            this.supabaseClient.auth.signOut();
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null && this.getAuthToken() !== null;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Require authentication for protected pages
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            // Redirect to login page with return URL
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `/login.html?return=${returnUrl}`;
            return false;
        }
        return true;
    }

    /**
     * Check if user has required role
     */
    hasRole(requiredRole) {
        if (!this.currentUser) return false;
        
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(this.currentUser.role);
        }
        
        return this.currentUser.role === requiredRole;
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        if (token) {
            localStorage.setItem('auth_token', token);
            apiClient.setAuthToken(token);
        } else {
            localStorage.removeItem('auth_token');
            apiClient.setAuthToken(null);
        }
    }

    /**
     * Get refresh token
     */
    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    }

    /**
     * Set refresh token
     */
    setRefreshToken(token) {
        if (token) {
            localStorage.setItem('refresh_token', token);
            apiClient.setRefreshToken(token);
        } else {
            localStorage.removeItem('refresh_token');
            apiClient.setRefreshToken(null);
        }
    }

    /**
     * Add event listener
     */
    on(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(handler);
    }

    /**
     * Remove event listener
     */
    off(eventName, handler) {
        if (!this.listeners.has(eventName)) return;
        
        const handlers = this.listeners.get(eventName);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Emit event
     */
    emit(eventName, data = null) {
        if (!this.listeners.has(eventName)) return;
        
        const handlers = this.listeners.get(eventName);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in auth event handler for ${eventName}:`, error);
            }
        });
    }

    /**
     * Handle form submission with authentication
     */
    async handleAuthForm(formElement, isLogin = true) {
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData);
        
        // Show loading state
        const submitButton = formElement.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Please wait...';
        submitButton.disabled = true;
        
        try {
            let result;
            
            if (isLogin) {
                result = await this.login(data.email, data.password);
            } else {
                result = await this.register(data);
            }
            
            if (result.success) {
                // Success - redirect or show success message
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('return');
                
                if (returnUrl) {
                    window.location.href = decodeURIComponent(returnUrl);
                } else {
                    window.location.href = '/';
                }
            } else {
                // Show error message
                this.showAuthError(result.error);
            }
        } catch (error) {
            this.showAuthError(error.message);
        } finally {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Show authentication error
     */
    showAuthError(message) {
        const errorContainer = document.getElementById('authError');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        } else {
            // Fallback to toast
            if (window.showToast) {
                window.showToast(message, 'error');
            } else {
                alert(message);
            }
        }
    }
}

// Create global instance
const authManager = new AuthManager();

// Export for global use
window.AuthManager = AuthManager;
window.authManager = authManager;

export default AuthManager;
export { authManager };

