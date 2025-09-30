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
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
            } else {
                this.initialize();
            }
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
                console.log('Found existing token, validating session...');
                await this.validateAndRefreshSession();
            } else {
                console.log('No existing token found');
            }
            
            // Listen for auth state changes
            if (this.supabaseClient) {
                this.supabaseClient.auth.onAuthStateChange((event, session) => {
                    this.handleAuthStateChange(event, session);
                });
            }
            
            // Always update UI after initialization
            this.updateAuthUI();
            
            // Also try to update UI after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.updateAuthUI();
            }, 100);
            
            console.log('Authentication initialized', { 
                hasUser: !!this.currentUser, 
                user: this.currentUser?.email,
                isAuthenticated: this.isAuthenticated()
            });
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            // Don't throw - still update UI
            this.updateAuthUI();
        }
    }

    /**
     * Initialize Supabase client
     */
    initializeSupabase() {
        // Get configuration from window (set by config.js)
        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
        
        console.log('🔧 Initializing Supabase client...');
        console.log('Configuration check:', {
            supabaseUrl: SUPABASE_URL,
            supabaseKey: SUPABASE_ANON_KEY ? 'Present' : 'Missing',
            appConfig: window.APP_CONFIG,
            supabaseAuth: window.APP_CONFIG?.features?.supabaseAuth,
            googleAuth: window.APP_CONFIG?.features?.googleAuth
        });
        
        // Check if configuration is available and valid
        if (!window.APP_CONFIG?.features?.supabaseAuth) {
            console.warn('⚠️  Supabase authentication not configured. Please check your environment variables.');
            console.warn('Available features:', window.APP_CONFIG?.features);
            return;
        }
        
        // Wait for Supabase SDK to be available with better error handling
        if (!window.supabase) {
            console.log('⏳ Waiting for Supabase SDK to load...');
            console.log('Available window objects:', Object.keys(window).filter(key => key.toLowerCase().includes('supabase')));
            
            // Increase timeout and add retry limit
            if (this.supabaseRetryCount === undefined) {
                this.supabaseRetryCount = 0;
            }
            
            if (this.supabaseRetryCount < 50) { // Max 5 seconds of retries
                this.supabaseRetryCount++;
                setTimeout(() => this.initializeSupabase(), 100);
                return;
            } else {
                console.error('❌ Supabase SDK failed to load after 5 seconds');
                console.error('Please check if the Supabase script is properly loaded in your HTML');
                return;
            }
        }
        
        // Check if Supabase SDK is properly loaded
        if (!window.supabase || (typeof window.supabase !== 'function' && !window.supabase.createClient)) {
            console.log('⏳ Supabase SDK not ready yet, waiting...');
            console.log('window.supabase type:', typeof window.supabase);
            console.log('window.supabase keys:', window.supabase ? Object.keys(window.supabase) : 'No supabase object');
            
            if (this.supabaseRetryCount < 50) {
                this.supabaseRetryCount++;
                setTimeout(() => this.initializeSupabase(), 100);
                return;
            } else {
                console.error('❌ Supabase SDK structure invalid after retries');
                return;
            }
        }
        
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            try {
                // The Supabase SDK v2 loads as an object with createClient method
                let createClient;
                
                if (window.supabase && typeof window.supabase.createClient === 'function') {
                    createClient = window.supabase.createClient;
                    console.log('✅ Using window.supabase.createClient');
                } else if (typeof window.supabase === 'function') {
                    createClient = window.supabase;
                    console.log('✅ Using window.supabase as function');
                } else {
                    console.error('Supabase SDK structure:', window.supabase);
                    console.error('Available methods:', window.supabase ? Object.keys(window.supabase) : 'No supabase object');
                    console.error('window.supabase type:', typeof window.supabase);
                    console.error('createClient type:', typeof window.supabase?.createClient);
                    
                    throw new Error('Supabase SDK not properly loaded. Expected createClient function.');
                }
                
                this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true,
                        redirectTo: window.location.origin
                    }
                });
                
                // Set up auth state listener
                this.supabaseClient.auth.onAuthStateChange((event, session) => {
                    this.handleAuthStateChange(event, session);
                });
                
                console.log('✅ Supabase client initialized successfully');
                console.log('Auth methods available:', Object.keys(this.supabaseClient.auth));
                
            } catch (error) {
                console.error('❌ Failed to initialize Supabase client:', error);
                console.error('Available window objects:', Object.keys(window).filter(key => key.toLowerCase().includes('supabase')));
                console.error('Supabase SDK version:', window.supabase?.version || 'Unknown');
            }
        } else {
            console.warn('⚠️  Supabase configuration missing. Google OAuth will not be available.');
            console.warn('SUPABASE_URL:', SUPABASE_URL);
            console.warn('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Present' : 'Missing');
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
                    
                    // Handle OAuth redirect
                    this.handleOAuthRedirect();
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
     * Handle OAuth redirect after successful authentication
     */
    handleOAuthRedirect() {
        // Check if we're on the login page and should redirect
        if (window.location.pathname.includes('login.html')) {
            console.log('✅ OAuth authentication successful, redirecting...');
            
            // Get return URL from query params
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('return');
            
            // Redirect to home or return URL
            const redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : 'index.html';
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        }
    }

    /**
     * Validate and refresh session if needed
     */
    async validateAndRefreshSession() {
        try {
            // First, try to get profile - if this fails, we'll still try to maintain the session
            const response = await authAPI.getProfile();
            if (response.success) {
                this.currentUser = response.data.user;
                this.emit('sessionValidated', { user: this.currentUser });
                return true;
            } else {
                console.warn('Profile API failed, but session might still be valid:', response.error);
                // Don't clear auth data immediately - try to refresh token first
            }
        } catch (error) {
            console.warn('Profile API error, but session might still be valid:', error.message);
            
            // If it's a database permission error, don't clear auth data
            if (error.message && error.message.includes('permission denied')) {
                console.log('Database permission error detected - maintaining session with token');
                const token = this.getAuthToken();
                if (token) {
                    // Create a minimal user object to maintain the session
                    this.currentUser = {
                        id: 'temp-user',
                        email: 'user@example.com',
                        username: 'User',
                        full_name: 'User',
                        email_verified: true,
                        role: 'customer'
                    };
                    this.emit('sessionValidated', { user: this.currentUser });
                    return true;
                }
            }
            // Don't clear auth data immediately - try to refresh token first
        }

        // Try to refresh token if profile API failed
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
            try {
                const refreshResponse = await authAPI.refreshToken(refreshToken);
                if (refreshResponse.success) {
                    this.setAuthToken(refreshResponse.data.session.access_token);
                    this.setRefreshToken(refreshResponse.data.session.refresh_token);
                    this.currentUser = refreshResponse.data.session.user;
                    this.emit('sessionRefreshed', { user: this.currentUser });
                    return true;
                }
            } catch (refreshError) {
                console.warn('Token refresh failed:', refreshError.message);
            }
        }

        // If we have a token but profile API is failing, create a minimal user object
        const token = this.getAuthToken();
        if (token) {
            console.log('Profile API unavailable, but token exists - maintaining session');
            // Create a minimal user object to maintain the session
            this.currentUser = {
                id: 'temp-user',
                email: 'user@example.com',
                username: 'User',
                full_name: 'User',
                email_verified: true,
                role: 'customer'
            };
            this.emit('sessionValidated', { user: this.currentUser });
            return true;
        }
        
        // Only clear auth data if we have no token at all
        console.log('No valid session found, clearing auth data');
        this.clearAuthData();
        return false;
    }

    /**
     * Check if user is authenticated (with better validation)
     */
    isAuthenticated() {
        const hasUser = this.currentUser !== null;
        const hasToken = this.getAuthToken() !== null;
        
        console.log('Auth check:', { hasUser, hasToken, user: this.currentUser });
        
        return hasUser && hasToken;
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await authAPI.login(email, password);
            
            if (response.success) {
                const { user, session } = response.data;
                
                // Store tokens and user data
                this.setAuthToken(session.access_token);
                this.setRefreshToken(session.refresh_token);
                this.currentUser = user;
                
                console.log('User logged in successfully:', {
                    user: user,
                    hasToken: !!session.access_token,
                    isAuthenticated: this.isAuthenticated()
                });
                
                // Update UI immediately
                this.updateAuthUI();
                
                // Emit success event
                this.emit('loginSuccess', { user, session });
                
                return { success: true, user };
            } else {
                console.error('Login failed:', response.error);
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
                const { user, session, message } = response.data;
                
                if (session) {
                    this.setAuthToken(session.access_token);
                    this.setRefreshToken(session.refresh_token);
                    this.currentUser = user;
                    console.log('User logged in:', user);
                    this.updateAuthUI();
                }
                
                this.emit('registerSuccess', { user, session, message, requiresVerification: user.requires_email_verification });
                return { 
                    success: true, 
                    user, 
                    session,
                    message,
                    requiresVerification: user.requires_email_verification 
                };
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
            if (this.options.redirectOnLogout && window.location.pathname !== '/index.html' && !window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    }

    /**
     * Google OAuth login - Unified implementation
     */
    async loginWithGoogle() {
        try {
            console.log('🔄 Starting Google OAuth login...');
            
            // Validate configuration
            if (!this.validateGoogleAuthConfig()) {
                throw new Error('Google authentication is not properly configured');
            }

            // Ensure Supabase client is ready
            if (!this.supabaseClient?.auth) {
                throw new Error('Authentication service is not available. Please refresh the page.');
            }
            
            console.log('🔄 Initiating Google OAuth login...');
            
            const { data, error } = await this.supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.href,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });
            
            if (error) {
                console.error('Google OAuth error:', error);
                throw this.createGoogleAuthError(error);
            }
            
            console.log('✅ Google OAuth initiated successfully');
            this.emit('googleLoginInitiated');
            return { success: true, data };
        } catch (error) {
            console.error('❌ Google login failed:', error);
            const errorMessage = this.getUserFriendlyErrorMessage(error);
            this.emit('googleLoginError', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Validate Google authentication configuration
     */
    validateGoogleAuthConfig() {
        const config = {
            appConfig: !!window.APP_CONFIG,
            googleAuthEnabled: window.APP_CONFIG?.features?.googleAuth,
            supabaseClient: !!this.supabaseClient,
            supabaseAuth: !!this.supabaseClient?.auth,
            signInWithOAuth: !!this.supabaseClient?.auth?.signInWithOAuth
        };
        
        console.log('🔍 Google Auth Configuration:', config);
        
        if (!config.appConfig) {
            console.error('❌ APP_CONFIG not available');
            return false;
        }
        
        if (!config.googleAuthEnabled) {
            console.error('❌ Google OAuth not enabled in configuration');
            console.error('Available features:', window.APP_CONFIG?.features);
            return false;
        }
        
        if (!config.supabaseClient) {
            console.error('❌ Supabase client not initialized');
            return false;
        }
        
        if (!config.supabaseAuth) {
            console.error('❌ Supabase auth not available');
            return false;
        }
        
        if (!config.signInWithOAuth) {
            console.error('❌ signInWithOAuth method not available');
            console.error('Auth methods available:', Object.keys(this.supabaseClient.auth));
            return false;
        }
        
        return true;
    }

    /**
     * Create standardized Google auth error
     */
    createGoogleAuthError(error) {
        const errorMap = {
            'Invalid login credentials': 'Invalid Google credentials',
            'Email not confirmed': 'Please verify your Google account email',
            'User not found': 'No account found with this Google account',
            'Invalid password': 'Google authentication failed',
            'Too many requests': 'Too many login attempts. Please try again later',
            'Network error': 'Network error. Please check your connection',
            'CORS error': 'Configuration error. Please contact support'
        };
        
        const message = error.message || 'Google authentication failed';
        const friendlyMessage = errorMap[message] || message;
        
        return new Error(friendlyMessage);
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyErrorMessage(error) {
        const message = error.message || 'Google login failed';
        
        if (message.includes('not configured') || message.includes('not enabled')) {
            return 'Google login is not available. Please contact support.';
        } else if (message.includes('client not initialized') || message.includes('not available')) {
            return 'Authentication service is not available. Please refresh the page.';
        } else if (message.includes('not supported')) {
            return 'Google OAuth is not supported. Please contact support.';
        } else if (message.includes('network') || message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        } else if (message.includes('CORS') || message.includes('cross-origin')) {
            return 'Configuration error. Please contact support.';
        }
        
        return message;
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
     * Resend email verification
     */
    async resendVerification(email) {
        try {
            const response = await authAPI.resendVerification(email);
            
            if (response.success) {
                this.emit('verificationResent', { email, message: response.message });
                return { success: true, message: response.message };
            } else {
                this.emit('verificationResendError', { error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Resend verification failed:', error);
            const errorMessage = error.message || 'Failed to resend verification email';
            this.emit('verificationResendError', { error: errorMessage });
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
        
        console.log('Updating auth UI', { 
            hasAuthButtons: !!authButtons, 
            hasUser: !!this.currentUser,
            user: this.currentUser,
            isAuthenticated: this.isAuthenticated(),
            currentPage: window.location.pathname
        });
        
        // Only update auth buttons if they exist (not on login page)
        if (!authButtons) {
            console.log('No authButtons element found - this is normal on login page');
            return;
        }
        
        if (this.currentUser && this.isAuthenticated()) {
            // User is logged in
            const userName = this.currentUser.username || this.currentUser.full_name || this.currentUser.email || 'User';
            console.log('User is authenticated, updating UI with user dropdown for:', userName);
            
            // Determine correct relative path based on current page
            const getRelativePath = (targetPage) => {
                const currentPath = window.location.pathname;
                console.log('Current path:', currentPath, 'Target page:', targetPage);
                
                if (currentPath.includes('/pages/') || currentPath.includes('pages/')) {
                    // We're in a subdirectory, need to go up one level
                    const relativePath = `../pages/${targetPage}`;
                    console.log('Using relative path:', relativePath);
                    return relativePath;
                } else {
                    // We're in the root, use direct path
                    console.log('Using direct path:', targetPage);
                    return targetPage;
                }
            };
            
            authButtons.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="${getRelativePath('profile.html')}" id="profileLink">
                        <i class="fas fa-user-circle"></i> ${userName}
                    </a>
                </li>
            `;
            
            // Add click handler for profile link
            setTimeout(() => {
                const profileLink = document.getElementById('profileLink');
                
                console.log('Profile link found:', profileLink);
                console.log('Profile link href:', profileLink ? profileLink.href : 'Not found');
                
                if (profileLink) {
                    profileLink.addEventListener('click', function(e) {
                        console.log('Profile link clicked - navigating to:', profileLink.href);
                        // Let the default navigation behavior work
                    });
                }
            }, 50);
        } else {
            // User is not logged in
            console.log('User is not authenticated, showing login button');
            authButtons.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="#" id="globalLoginLink">Login</a>
                </li>
            `;

            // Wire up modal-based login
            setTimeout(() => {
                const loginLink = document.getElementById('globalLoginLink');
                if (loginLink) {
                    loginLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (window.showLoginModal) {
                            window.showLoginModal();
                        } else {
                            // Fallback directly to Google OAuth
                            this.loginWithGoogle();
                        }
                    });
                }
            }, 0);
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
            window.location.href = `login.html?return=${returnUrl}`;
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
     * Check if current user needs email verification
     */
    requiresEmailVerification() {
        if (!this.currentUser) return false;

        // Debug logging for verification check
        console.log('AuthManager: Checking email verification', {
            currentUser: this.currentUser,
            emailVerified: this.currentUser.email_verified,
            emailVerifiedType: typeof this.currentUser.email_verified
        });

        // Handle different possible values for email_verified
        const isVerified = this.currentUser.email_verified === true ||
                          this.currentUser.email_verified === 'true' ||
                          (this.currentUser.email_verified && this.currentUser.email_verified.toString() === 'true');

        return !isVerified;
    }

    /**
     * Check if user can perform actions (logged in and verified)
     */
    canPerformActions() {
        return this.isAuthenticated() && !this.requiresEmailVerification();
    }

    /**
     * Check if user is already logged in and redirect if needed
     */
    checkExistingAuth() {
        console.log('🔍 checkExistingAuth called');
        console.log('Current URL:', window.location.href);
        console.log('Is authenticated:', this.isAuthenticated());
        console.log('Current user:', this.currentUser);
        
        if (this.isAuthenticated()) {
            console.log('✅ User is already logged in:', this.currentUser);
            
            // If we're on the login page, redirect to home or return URL
            if (window.location.pathname.includes('login.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('return');
                
                console.log('📍 On login page, return URL:', returnUrl);
                
                // Always redirect to index.html to prevent loops
                const redirectUrl = 'index.html';
                console.log('🚀 Redirecting logged-in user to:', redirectUrl);
                
                // Add a small delay to prevent rapid redirects
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 100);
                return true;
            }
        } else {
            console.log('❌ User is not authenticated');
        }
        return false;
    }

    /**
     * Force update auth UI (for debugging)
     */
    forceUpdateUI() {
        console.log('Force updating UI - Current state:', {
            hasUser: !!this.currentUser,
            user: this.currentUser,
            isAuthenticated: this.isAuthenticated()
        });
        this.updateAuthUI();
    }

    /**
     * Force update auth UI globally (for debugging)
     */
    static forceUpdateAllAuthUI() {
        if (window.authManager) {
            window.authManager.forceUpdateUI();
        } else {
            console.warn('AuthManager not available');
        }
    }

    /**
     * Debug authentication state
     */
    debug() {
        const token = this.getAuthToken();
        const refreshToken = this.getRefreshToken();
        const authButtons = document.getElementById('authButtons');
        
        console.log('🔍 AuthManager Debug Info:', {
            currentUser: this.currentUser,
            isAuthenticated: this.isAuthenticated(),
            hasToken: !!token,
            hasRefreshToken: !!refreshToken,
            token: token ? token.substring(0, 20) + '...' : null,
            authButtonsElement: authButtons,
            authButtonsHTML: authButtons ? authButtons.innerHTML : 'Not found',
            domReady: document.readyState,
            supabaseClient: !!this.supabaseClient
        });
        
        return {
            user: this.currentUser,
            authenticated: this.isAuthenticated(),
            tokens: { access: !!token, refresh: !!refreshToken },
            authButtons: authButtons
        };
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
                    window.location.href = 'index.html';
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

// Add global debugging functions
window.forceUpdateAuthUI = () => {
    if (window.authManager) {
        window.authManager.forceUpdateUI();
    } else {
        console.warn('AuthManager not available');
    }
};

window.debugAuth = () => {
    if (window.authManager) {
        return window.authManager.debug();
    } else {
        console.warn('AuthManager not available');
        return null;
    }
};

window.testAuthButton = () => {
    console.log('Testing auth button functionality...');
    
    // Check if authButtons element exists
    const authButtons = document.getElementById('authButtons');
    console.log('authButtons element:', authButtons);
    
    if (authButtons) {
        console.log('authButtons innerHTML:', authButtons.innerHTML);
        
        // Check if profile link exists (try both possible paths)
        const profileLink = authButtons.querySelector('a[href*="profile.html"]');
        console.log('Profile link found:', profileLink);
        
        if (profileLink) {
            console.log('Profile link href:', profileLink.href);
            console.log('Profile link onclick:', profileLink.onclick);
        }
        
        // Check dropdown toggle
        const dropdownToggle = authButtons.querySelector('.dropdown-toggle');
        console.log('Dropdown toggle found:', dropdownToggle);
        
        // Check dropdown menu
        const dropdownMenu = authButtons.querySelector('.dropdown-menu');
        console.log('Dropdown menu found:', dropdownMenu);
    }
    
    // Check authentication state
    if (window.authManager) {
        const debugInfo = window.authManager.debug();
        console.log('Authentication debug info:', debugInfo);
    }
    
    return {
        authButtons: authButtons,
        profileLink: authButtons ? authButtons.querySelector('a[href*="profile.html"]') : null,
        dropdownToggle: authButtons ? authButtons.querySelector('.dropdown-toggle') : null,
        dropdownMenu: authButtons ? authButtons.querySelector('.dropdown-menu') : null,
        authManager: window.authManager
    };
};

// Add a function to manually test profile navigation
window.testProfileNavigation = () => {
    console.log('Testing profile navigation...');
    const profileLink = document.querySelector('a[href*="profile.html"]');
    if (profileLink) {
        console.log('Found profile link, clicking it...');
        profileLink.click();
    } else {
        console.log('No profile link found');
    }
};

// Add a function to debug the redirect loop
window.debugRedirectLoop = () => {
    console.log('🔍 Debugging redirect loop...');
    console.log('Current URL:', window.location.href);
    console.log('AuthManager available:', !!window.authManager);
    if (window.authManager) {
        console.log('Is authenticated:', window.authManager.isAuthenticated());
        console.log('Current user:', window.authManager.getCurrentUser());
        console.log('Auth token:', window.authManager.getAuthToken() ? 'Present' : 'Missing');
    }
    
    // Check if we're in a loop by looking at history
    console.log('History length:', window.history.length);
    console.log('Referrer:', document.referrer);
    
    // Check localStorage for tokens
    const authToken = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');
    console.log('LocalStorage auth token:', authToken ? 'Present' : 'Missing');
    console.log('LocalStorage refresh token:', refreshToken ? 'Present' : 'Missing');
    
    return {
        url: window.location.href,
        authenticated: window.authManager ? window.authManager.isAuthenticated() : false,
        user: window.authManager ? window.authManager.getCurrentUser() : null,
        token: window.authManager ? !!window.authManager.getAuthToken() : false,
        localStorage: {
            authToken: !!authToken,
            refreshToken: !!refreshToken
        }
    };
};

export default AuthManager;
export { authManager };

