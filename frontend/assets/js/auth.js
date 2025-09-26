/**
 * Authentication Module
 * Handles user authentication, session management, and UI updates
 */

// Global authentication state
let currentUser = null;
let supabaseClient = null;

/**
 * Initialize Supabase client
 */
function initializeSupabase() {
    // Supabase configuration - these should match your backend config
    const SUPABASE_URL = 'https://your-project-id.supabase.co'; // Replace with your URL
    const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with your key
    
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}

/**
 * Initialize authentication system
 */
async function initializeAuth() {
    try {
        initializeSupabase();
        
        // Check for existing session
        const token = getAuthToken();
        if (token) {
            await validateAndRefreshSession();
        }
        
        // Listen for auth state changes
        if (supabaseClient) {
            supabaseClient.auth.onAuthStateChange((event, session) => {
                handleAuthStateChange(event, session);
            });
        }
        
        console.log('Authentication initialized');
    } catch (error) {
        console.error('Failed to initialize auth:', error);
    }
}

/**
 * Handle authentication state changes
 */
function handleAuthStateChange(event, session) {
    console.log('Auth state changed:', event, session);
    
    switch (event) {
        case 'SIGNED_IN':
            if (session) {
                setAuthToken(session.access_token);
                setRefreshToken(session.refresh_token);
                currentUser = session.user;
                updateAuthUI();
            }
            break;
        case 'SIGNED_OUT':
            clearAuthData();
            updateAuthUI();
            break;
        case 'TOKEN_REFRESHED':
            if (session) {
                setAuthToken(session.access_token);
                setRefreshToken(session.refresh_token);
            }
            break;
    }
}

/**
 * Validate and refresh session if needed
 */
async function validateAndRefreshSession() {
    try {
        const response = await authAPI.getProfile();
        if (response.success) {
            currentUser = response.data.user;
            return true;
        } else {
            // Try to refresh token
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                const refreshResponse = await authAPI.refreshToken(refreshToken);
                if (refreshResponse.success) {
                    setAuthToken(refreshResponse.data.session.access_token);
                    setRefreshToken(refreshResponse.data.session.refresh_token);
                    currentUser = refreshResponse.data.session.user;
                    return true;
                }
            }
        }
    } catch (error) {
        console.error('Session validation failed:', error);
    }
    
    // Clear invalid session
    clearAuthData();
    return false;
}

/**
 * Login user
 */
async function login(email, password) {
    try {
        const response = await authAPI.login(email, password);
        
        if (response.success) {
            const { user, session } = response.data;
            
            setAuthToken(session.access_token);
            setRefreshToken(session.refresh_token);
            currentUser = user;
            
            updateAuthUI();
            
            return { success: true, user };
        } else {
            return { success: false, error: response.error };
        }
    } catch (error) {
        console.error('Login failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Register new user
 */
async function register(userData) {
    try {
        const response = await authAPI.register(userData);
        
        if (response.success) {
            const { user, session } = response.data;
            
            if (session) {
                setAuthToken(session.access_token);
                setRefreshToken(session.refresh_token);
                currentUser = user;
                updateAuthUI();
            }
            
            return { success: true, user };
        } else {
            return { success: false, error: response.error };
        }
    } catch (error) {
        console.error('Registration failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        await authAPI.logout();
    } catch (error) {
        console.error('Logout API call failed:', error);
    } finally {
        // Always clear local data
        clearAuthData();
        updateAuthUI();
        
        // Redirect to home page
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }
}

/**
 * Google OAuth login
 */
async function loginWithGoogle() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Google login failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update authentication UI
 */
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    
    if (!authButtons) return;
    
    if (currentUser) {
        // User is logged in
        authButtons.innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user-circle"></i> ${currentUser.username || currentUser.full_name || 'User'}
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="/profile.html">
                        <i class="fas fa-user"></i> Profile
                    </a></li>
                    <li><a class="dropdown-item" href="/orders.html">
                        <i class="fas fa-shopping-bag"></i> Orders
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout()">
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
function clearAuthData() {
    currentUser = null;
    setAuthToken(null);
    setRefreshToken(null);
    
    if (supabaseClient) {
        supabaseClient.auth.signOut();
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return currentUser !== null && getAuthToken() !== null;
}

/**
 * Get current user
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Require authentication for protected pages
 */
function requireAuth() {
    if (!isAuthenticated()) {
        // Redirect to login page with return URL
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `/login.html?return=${returnUrl}`;
        return false;
    }
    return true;
}

/**
 * Handle form submission with authentication
 */
async function handleAuthForm(formElement, isLogin = true) {
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
            result = await login(data.email, data.password);
        } else {
            result = await register(data);
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
            showAuthError(result.error);
        }
    } catch (error) {
        showAuthError(error.message);
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

/**
 * Show authentication error
 */
function showAuthError(message) {
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
            showToast(message, 'error');
        } else {
            alert(message);
        }
    }
}

/**
 * Initialize authentication form handlers
 */
function initializeAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAuthForm(loginForm, true);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAuthForm(registerForm, false);
        });
    }
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const result = await loginWithGoogle();
            if (!result.success) {
                showAuthError(result.error);
            }
        });
    }
}

// Initialize auth forms when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAuthForms);

// Export functions for global use
window.initializeAuth = initializeAuth;
window.login = login;
window.register = register;
window.logout = logout;
window.loginWithGoogle = loginWithGoogle;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;
window.updateAuthUI = updateAuthUI;

