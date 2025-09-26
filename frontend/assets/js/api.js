/**
 * API Communication Module
 * Handles all API calls to the backend
 */

// API Configuration
const API_BASE_URL = window.location.origin;
const API_TIMEOUT = 10000; // 10 seconds

/**
 * Make API call with error handling
 */
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    // Add authentication token if available
    const token = getAuthToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    config.signal = controller.signal;

    try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        // Parse response
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { success: response.ok, data: await response.text() };
        }

        // Handle non-2xx responses
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        
        console.error('API call failed:', error);
        throw error;
    }
}

/**
 * GET request
 */
async function apiGet(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return apiCall(url, {
        method: 'GET'
    });
}

/**
 * POST request
 */
async function apiPost(endpoint, data = {}) {
    return apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * PUT request
 */
async function apiPut(endpoint, data = {}) {
    return apiCall(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * DELETE request
 */
async function apiDelete(endpoint) {
    return apiCall(endpoint, {
        method: 'DELETE'
    });
}

// Authentication API calls
const authAPI = {
    async login(email, password) {
        return apiPost('/api/auth/login', { email, password });
    },

    async register(userData) {
        return apiPost('/api/auth/register', userData);
    },

    async logout() {
        return apiPost('/api/auth/logout');
    },

    async getProfile() {
        return apiGet('/api/auth/profile');
    },

    async updateProfile(updates) {
        return apiPut('/api/auth/profile', updates);
    },

    async refreshToken(refreshToken) {
        return apiPost('/api/auth/refresh', { refresh_token: refreshToken });
    },

    async forgotPassword(email) {
        return apiPost('/api/auth/forgot-password', { email });
    },

    async resetPassword(token, password) {
        return apiPost('/api/auth/reset-password', { token, password });
    },

    async googleAuth(idToken) {
        return apiPost('/api/auth/google', { id_token: idToken });
    }
};

// Products API calls
const productsAPI = {
    async getProducts(params = {}) {
        return apiGet('/api/products', params);
    },

    async getProduct(id) {
        return apiGet(`/api/products/${id}`);
    },

    async searchProducts(query, params = {}) {
        return apiGet('/api/products/search', { q: query, ...params });
    },

    async getProductsByCategory(categoryId, params = {}) {
        return apiGet(`/api/products/category/${categoryId}`, params);
    },

    async getFeaturedProducts(limit = 10) {
        return apiGet('/api/products/featured', { limit });
    },

    async getCategories() {
        return apiGet('/api/products/categories');
    },

    async getProductVariants(productId) {
        return apiGet(`/api/products/${productId}/variants`);
    },

    async getProductReviews(productId, params = {}) {
        return apiGet(`/api/products/${productId}/reviews`, params);
    },

    async createProductReview(productId, reviewData) {
        return apiPost(`/api/products/${productId}/reviews`, reviewData);
    }
};

// Orders API calls
const ordersAPI = {
    async getOrders(params = {}) {
        return apiGet('/api/orders', params);
    },

    async getOrder(id) {
        return apiGet(`/api/orders/${id}`);
    },

    async createOrder(orderData) {
        return apiPost('/api/orders', orderData);
    },

    async updateOrderStatus(id, status) {
        return apiPut(`/api/orders/${id}/status`, { status });
    }
};

// Users API calls
const usersAPI = {
    async getAddresses() {
        return apiGet('/api/users/addresses');
    },

    async addAddress(addressData) {
        return apiPost('/api/users/addresses', addressData);
    },

    async updateAddress(id, updates) {
        return apiPut(`/api/users/addresses/${id}`, updates);
    },

    async deleteAddress(id) {
        return apiDelete(`/api/users/addresses/${id}`);
    }
};

// Utility functions
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

function setRefreshToken(token) {
    if (token) {
        localStorage.setItem('refresh_token', token);
    } else {
        localStorage.removeItem('refresh_token');
    }
}

// Export for global use
window.apiCall = apiCall;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.authAPI = authAPI;
window.productsAPI = productsAPI;
window.ordersAPI = ordersAPI;
window.usersAPI = usersAPI;
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.getRefreshToken = getRefreshToken;
window.setRefreshToken = setRefreshToken;

