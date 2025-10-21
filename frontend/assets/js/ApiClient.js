/**
 * ApiClient - OOP API communication class
 * Handles all API calls to the backend with error handling and authentication
 */

class ApiClient {
  constructor(baseURL = window.location.origin, options = {}) {
    this.baseURL = baseURL;
    this.timeout = options.timeout || 10000;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    this.interceptors = {
      request: [],
      response: [],
    };

    // Setup default interceptors
    this.setupDefaultInterceptors();
  }

  /**
   * Setup default request/response interceptors
   */
  setupDefaultInterceptors() {
    // Request interceptor for authentication
    this.addRequestInterceptor((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.addResponseInterceptor(
      (response) => response,
      (error) => {
        // Handle common errors
        if (error.status === 401) {
          this.handleUnauthorized();
        } else if (error.status === 403) {
          this.handleForbidden(error);
        } else if (error.status >= 500) {
          this.handleServerError(error);
        }
        throw error;
      }
    );
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(fulfilled, rejected = null) {
    this.interceptors.request.push({ fulfilled, rejected });
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(fulfilled, rejected = null) {
    this.interceptors.response.push({ fulfilled, rejected });
  }

  /**
   * Apply request interceptors
   */
  async applyRequestInterceptors(config) {
    let currentConfig = config;

    for (const interceptor of this.interceptors.request) {
      try {
        if (interceptor.fulfilled) {
          currentConfig = await interceptor.fulfilled(currentConfig);
        }
      } catch (error) {
        if (interceptor.rejected) {
          currentConfig = await interceptor.rejected(error);
        } else {
          throw error;
        }
      }
    }

    return currentConfig;
  }

  /**
   * Apply response interceptors
   */
  async applyResponseInterceptors(response) {
    let currentResponse = response;

    for (const interceptor of this.interceptors.response) {
      try {
        if (interceptor.fulfilled) {
          currentResponse = await interceptor.fulfilled(currentResponse);
        }
      } catch (error) {
        if (interceptor.rejected) {
          currentResponse = await interceptor.rejected(error);
        } else {
          throw error;
        }
      }
    }

    return currentResponse;
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    // Apply request interceptors
    const finalConfig = await this.applyRequestInterceptors(config);

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    finalConfig.signal = controller.signal;

    try {
      const response = await fetch(url, finalConfig);
      clearTimeout(timeoutId);

      // Parse response
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { success: response.ok, data: await response.text() };
      }

      const responseObj = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: finalConfig,
      };

      // Handle non-2xx responses
      if (!response.ok) {
        const error = new Error(
          data.error || `HTTP ${response.status}: ${response.statusText}`
        );
        error.response = responseObj;
        error.status = response.status;
        throw error;
      }

      // Apply response interceptors
      return await this.applyResponseInterceptors(responseObj);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        const timeoutError = new Error("Request timeout");
        timeoutError.code = "TIMEOUT";
        throw timeoutError;
      }

      console.error("API request failed:", error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: "GET",
      ...options,
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: "DELETE",
      ...options,
    });
  }

  /**
   * Upload file
   */
  async upload(endpoint, file, options = {}) {
    const formData = new FormData();
    formData.append("file", file);

    // Add additional form data
    if (options.data) {
      for (const [key, value] of Object.entries(options.data)) {
        formData.append(key, value);
      }
    }

    return this.request(endpoint, {
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary
        ...options.headers,
      },
    });
  }

  /**
   * Download file
   */
  async download(endpoint, filename, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    // Create blob and download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return response;
  }

  /**
   * Get authentication token
   */
  /**
   * Get authentication token from Supabase localStorage
   */
  getAuthToken() {
    try {
      // ⭐ Try to find Supabase auth token key
      const keys = Object.keys(localStorage);
      const supabaseAuthKey = keys.find(
        (key) => key.includes("-auth-token") && key.startsWith("sb-")
      );

      if (supabaseAuthKey) {
        const tokenData = localStorage.getItem(supabaseAuthKey);
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          const token =
            parsed.access_token || parsed.currentSession?.access_token;

          if (token) {
            console.log("✅ Found Supabase auth token");
            return token;
          }
        }
      }

      // Fallback to old keys for compatibility
      return (
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("auth_token")
      );
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
      return null;
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  /**
   * Get refresh token
   */
  getRefreshToken() {
    return localStorage.getItem("refresh_token");
  }

  /**
   * Set refresh token
   */
  setRefreshToken(token) {
    if (token) {
      localStorage.setItem("refresh_token", token);
    } else {
      localStorage.removeItem("refresh_token");
    }
  }

  /**
   * Handle unauthorized response
   */
  handleUnauthorized() {
    console.warn("Unauthorized access - redirecting to login");
    // Clear tokens
    this.setAuthToken(null);
    this.setRefreshToken(null);

    // Show login modal
    if (window.showLoginModal) {
      window.showLoginModal();
    } else {
      console.error("Login modal not available");
    }
  }

    /**
     * Handle forbidden response
     */
    handleForbidden(error) {
        console.warn('Access forbidden');
        // Show a generic permissions toast only
        if (window.showToast) {
            window.showToast('Access denied - insufficient permissions', 'error');
        }
    }

  /**
   * Handle server error
   */
  handleServerError(error) {
    console.error("Server error:", error);
    // Could show a toast or modal
    if (window.showToast) {
      window.showToast("Server error - please try again later", "error");
    }
  }

  /**
   * Retry request with exponential backoff
   */
  async retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Create request with retry
   */
  createRetryRequest(method, endpoint, data = null, options = {}) {
    const requestFn = () => {
      if (data) {
        return this[method](endpoint, data, options);
      } else {
        return this[method](endpoint, options);
      }
    };

    return () =>
      this.retryRequest(requestFn, options.maxRetries, options.baseDelay);
  }
}

// Create default instance
const apiClient = new ApiClient();

// Authentication API
class AuthAPI {
  constructor(client) {
    this.client = client;
  }

  async login(email, password) {
    const response = await this.client.post("/api/auth/login", {
      email,
      password,
    });
    return response.data;
  }

  async register(userData) {
    const response = await this.client.post("/api/auth/register", userData);
    return response.data;
  }

  async logout() {
    const response = await this.client.post("/api/auth/logout");
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get("/api/auth/profile");
    return response.data;
  }

  async updateProfile(updates) {
    const response = await this.client.put("/api/auth/profile", updates);
    return response.data;
  }

  async refreshToken(refreshToken) {
    const response = await this.client.post("/api/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  }

  async forgotPassword(email) {
    const response = await this.client.post("/api/auth/forgot-password", {
      email,
    });
    return response.data;
  }

  async resetPassword(token, password) {
    // Note: Password reset is handled client-side with Supabase
    // This method is kept for compatibility but should not be used
    console.warn(
      "Password reset should be handled client-side with Supabase auth"
    );
    const response = await this.client.post("/api/auth/reset-password", {
      token,
      password,
    });
    return response.data;
  }

    // resendVerification removed: email verification flow is not used

}

// Products API - UPDATED to match your backend routes
class ProductsAPI {
  constructor(client) {
    this.client = client;
  }

  /**
   * Get all products with filters
   */
  async getProducts(params = {}) {
    try {
      console.log("📞 API: Getting products", params);

      const response = await this.client.get("/api/products", params);

      console.log("✅ Products response:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Get products error:", error);
      return { success: false, data: [], message: error.message };
    }
  }
  /**
   * Get all colors
   */
  async getColors() {
    const response = await this.client.get("/api/colors", {
      active_only: true,
    });
    return response.data;
  }

  /**
   * Get all sizes
   */
  async getSizes(sizeType = null) {
    const params = sizeType ? { size_type: sizeType } : { active_only: true };
    const response = await this.client.get("/api/sizes", params);
    return response.data;
  }
  /**
   * Get single product by ID
   */
  async getProduct(id) {
    const response = await this.client.get(`/api/products/${id}`);
    return response.data;
  }

  /**
   * Search products
   */
  async searchProducts(query, params = {}) {
    const response = await this.client.get("/api/products/search", {
      q: query,
      ...params,
    });
    return response.data;
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId, params = {}) {
    const response = await this.client.get("/api/products", {
      category_id: categoryId,
      ...params,
    });
    return response.data;
  }

  /**
   * Get all categories
   */
  async getCategories(params = {}) {
    try {
      console.log("📞 API: Getting categories");

      // ⭐ Force include_count for admin
      const response = await this.client.get("/api/categories", {
        ...params,
        include_count: "true",
      });

      console.log("✅ Categories with count:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Get categories error:", error);
      return { success: false, data: [], message: error.message };
    }
  }

  /**
   * Get category by ID
   */
  async getCategory(id, params = {}) {
    const response = await this.client.get(`/api/categories/${id}`, params);
    return response.data;
  }

  /**
   * Get product variants by shoe ID
   */
  async getProductVariants(shoeId) {
    try {
      const params = shoeId ? { shoe_id: shoeId } : {};
      const response = await this.client.get("/api/variants", params);
      return response.data;
    } catch (error) {
      console.error("❌ Get variants error:", error);
      return { success: false, data: [], message: error.message };
    }
  }

  /**
   * Get variant by ID
   */
  async getVariant(variantId) {
    const response = await this.client.get(`/api/variants/${variantId}`);
    return response.data;
  }

  /**
   * Get all colors
   */
  async getColors() {
    const response = await this.client.get("/api/colors", {
      active_only: true,
    });
    return response.data;
  }

  /**
   * Get all sizes
   */
  async getSizes(sizeType = null) {
    const params = sizeType ? { size_type: sizeType } : { active_only: true };
    const response = await this.client.get("/api/sizes", params);
    return response.data;
  }
   /**
   * ⭐ Update product with FormData
   */
  async updateProduct(id, formData) {
    try {
      console.log(`🔄 Updating product ${id}`);
      
      // Use PUT request with FormData
      const response = await this.client.request(`/api/products/${id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          // Don't set Content-Type - browser will automatically set it for FormData
          // with correct boundary
        }
      });

      console.log('✅ Product updated:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Update product error:', error);
      throw error;
    }
  }

  /**
   * ⭐ Create product with FormData
   */
  async createProduct(formData) {
    try {
      console.log('➕ Creating product');
      
      const response = await this.client.request('/api/products', {
        method: 'POST',
        body: formData,
        headers: {}
      });

      console.log('✅ Product created:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Create product error:', error);
      throw error;
    }
  }
}
class ImportsAPI {
  constructor(client) {
    this.client = client;
  }

  /**
   * Get all imports with filters
   */
  async getImports(params = {}) {
    try {
      const response = await this.client.get("/api/imports", params);
      return response.data;
    } catch (error) {
      console.error("❌ Get imports error:", error);
      return { success: false, data: [], message: error.message };
    }
  }

  /**
   * Get imports by shoe ID
   */
  async getImportsByShoe(shoeId, params = {}) {
    try {
      const response = await this.client.get(
        `/api/imports/shoe/${shoeId}`,
        params
      );
      return response.data;
    } catch (error) {
      console.error("❌ Get imports by shoe error:", error);
      return { success: false, data: [], message: error.message };
    }
  }

  /**
   * Create single import
   */
  async createImport(importData) {
    try {
      const response = await this.client.post("/api/imports", importData);
      return response.data;
    } catch (error) {
      console.error("❌ Create import error:", error);
      throw error;
    }
  }

  /**
   * ⭐ Create batch import (MAIN METHOD)
   */
  async createBatchImport(data) {
    try {
      console.log("📦 Submitting batch import:", data);
      const response = await this.client.post("/api/imports/batch", data);
      console.log("✅ Batch import success:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Batch import error:", error);
      throw error;
    }
  }

  /**
   * Get import statistics
   */
  async getStatistics(params = {}) {
    try {
      const response = await this.client.get("/api/imports/statistics", params);
      return response.data;
    } catch (error) {
      console.error("❌ Get import stats error:", error);
      return { success: false, data: null, message: error.message };
    }
  }
}

// Orders API
class OrdersAPI {
  constructor(client) {
    this.client = client;
  }

  async getOrders(params = {}) {
    const response = await this.client.get("/api/orders", params);
    return response.data;
  }

  async getOrder(id) {
    const response = await this.client.get(`/api/orders/${id}`);
    return response.data;
  }

  async createOrder(orderData) {
    const response = await this.client.post("/api/orders", orderData);
    return response.data;
  }

  async updateOrderStatus(id, status) {
    const response = await this.client.put(`/api/orders/${id}/status`, {
      status,
    });
    return response.data;
  }
}

// Users API
class UsersAPI {
  constructor(client) {
    this.client = client;
  }

  async getAddresses() {
    const response = await this.client.get("/api/users/addresses");
    return response.data;
  }

  async addAddress(addressData) {
    const response = await this.client.post(
      "/api/users/addresses",
      addressData
    );
    return response.data;
  }

  async updateAddress(id, updates) {
    const response = await this.client.put(
      `/api/users/addresses/${id}`,
      updates
    );
    return response.data;
  }

  async deleteAddress(id) {
    const response = await this.client.delete(`/api/users/addresses/${id}`);
    return response.data;
  }
}
// ============================================================
// 🔹 VARIANTS API - GENERATION METHODS
// ============================================================

class VariantsAPI {
  constructor(client) {
    this.client = client;
  }
  /**
   * GET all variants for a shoe
   */
  async getVariantsByShoe(shoeId) {
    try {
      const response = await this.client.get(`/api/variants/shoe/${shoeId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Get variants by shoe error:", error);
      throw error;
    }
  }

  /**
   * ⭐ POST - Generate ALL variants (colors × sizes)
   */
  async generateAllVariants(shoeId, defaultStock = 0) {
    try {
      console.log("🎨 Generating all variants for shoe:", shoeId);
      const response = await this.client.post(
        `/api/variants/generate-all/${shoeId}`,
        {
          defaultStock: defaultStock,
        }
      );
      console.log("✅ Generate all variants response:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Generate all variants error:", error);
      throw error;
    }
  }

  /**
   * ⭐ POST - Generate SPECIFIC variants (selected colors/sizes)
   */
  async generateSpecificVariants(
    shoeId,
    colorIds,
    sizeIds,
    defaultStock,
    defaultPrice
  ) {
    try {
      console.log("🎯 Generating specific variants:", {
        shoeId,
        colorIds,
        sizeIds,
        defaultStock,
        defaultPrice,
      });

      // ⭐ CORRECT: Use this.client.post() method
      const response = await this.client.post(
        `/api/variants/generate-specific/${shoeId}`,
        {
          colorIds,
          sizeIds,
          defaultStock,
          defaultPrice,
        }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Generate specific variants error:", error);
      throw error;
    }
  }

  /**
   * CREATE single variant
   */
  async createVariant(variantData) {
    try {
      const response = await this.client.post("/api/variants", variantData);
      return response.data;
    } catch (error) {
      console.error("❌ Create variant error:", error);
      throw error;
    }
  }
}
// Create API instances
const authAPI = new AuthAPI(apiClient);
const productsAPI = new ProductsAPI(apiClient);
const ordersAPI = new OrdersAPI(apiClient);
const usersAPI = new UsersAPI(apiClient);
const importsAPI = new ImportsAPI(apiClient);
const variantsAPI = new VariantsAPI(apiClient);

// Export for global use
window.ApiClient = ApiClient;
window.apiClient = apiClient;
window.authAPI = authAPI;
window.productsAPI = productsAPI;
window.ordersAPI = ordersAPI;
window.usersAPI = usersAPI;
window.importsAPI = importsAPI;
window.variantsAPI = variantsAPI;
