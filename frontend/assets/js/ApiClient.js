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
        // Check if it's an email verification error
    if (error?.response?.data?.code === "EMAIL_VERIFICATION_REQUIRED") {
      console.warn("Email verification required");
            
            // Emit event for AuthManager to handle
      if (typeof authManager !== "undefined") {
        authManager.emit("emailVerificationRequired", {
                    message: error.response.data.message,
          email: error.response.data.details?.email,
                });
            }
            
            // Show notification
            if (window.showToast) {
        window.showToast(
          "Please verify your email to access this feature",
          "warning"
        );
            }
            
            // Redirect to verification page if not already there
      if (!window.location.pathname.includes("verify-email")) {
                setTimeout(() => {
          window.location.href = "verify-email.html";
                }, 2000);
            }
        } else {
      console.warn("Access forbidden");
            // Could show a toast or modal
            if (window.showToast) {
        window.showToast("Access denied - insufficient permissions", "error");
            }
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

    async resendVerification(email) {
    const response = await this.client.post("/api/auth/resend-verification", {
      email,
    });
        return response.data;
    }
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
        method: "PUT",
        body: formData,
        headers: {
          // Don't set Content-Type - browser will automatically set it for FormData
          // with correct boundary
        },
      });

      console.log("✅ Product updated:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Update product error:", error);
      throw error;
    }
  }

  /**
   * Create product with FormData
   */
  async createProduct(formData) {
    try {
      console.log("➕ Creating product");

      const response = await this.client.request("/api/products", {
        method: "POST",
        body: formData,
        headers: {},
      });

      console.log("✅ Product created:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Create product error:", error);
      throw error;
    }
  }
  async deleteProduct(id) {
    try {
      console.log(`🗑️ Deleting product ${id}`);
      const response = await this.client.delete(`/api/products/${id}`);
      console.log("✅ Product deleted:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Delete product error:", error);
      throw error;
    }
  }
  async restoreProduct(id) {
    try {
      console.log(`♻️ Restoring product ${id}`);
      const response = await this.client.put(`/api/products/${id}/restore`);
      console.log("✅ Product restored:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Restore product error:", error);
      throw error;
    }
  }
  /**
   * ⭐ CREATE new category (Admin only)
   */
  async createCategory(categoryData) {
    try {
      console.log('➕ Creating category:', categoryData);
      const response = await this.client.post('/api/categories', categoryData);
      console.log('✅ Category created:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Create category error:', error);
      throw error;
    }
  }

  /**
   * ⭐ UPDATE category (Admin only)
   */
  async updateCategory(categoryId, updateData) {
    try {
      console.log(`🔄 Updating category ${categoryId}:`, updateData);
      const response = await this.client.put(`/api/categories/${categoryId}`, updateData);
      console.log('✅ Category updated:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Update category error:', error);
      throw error;
    }
  }

  /**
   * ⭐ SOFT DELETE category (Admin only)
   */
  async deleteCategory(categoryId) {
    try {
      console.log(`🗑️ Soft deleting category ${categoryId}`);
      const response = await this.client.delete(`/api/categories/${categoryId}`);
      console.log('✅ Category deleted:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Delete category error:', error);
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
  /**
   * Get all import history (uses existing backend: GET /api/imports)
   * @param {Object} filters - Optional filters { shoeid, variantid, userid, fromdate, todate }
   * @param {Object} pagination - Optional { page, limit }
   */
  async getAllImportHistory(filters = {}, pagination = {}) {
    console.log("📦 API: Getting all import history...", {
      filters,
      pagination,
    });

    try {
      // Build query params
      const params = new URLSearchParams();

      // Add pagination
      if (pagination.page) params.append("page", pagination.page);
      if (pagination.limit) params.append("limit", pagination.limit);

      // Add filters
      if (filters.shoeid) params.append("shoeid", filters.shoeid);
      if (filters.variantid) params.append("variantid", filters.variantid);
      if (filters.userid) params.append("userid", filters.userid);
      if (filters.fromdate) params.append("fromdate", filters.fromdate);
      if (filters.todate) params.append("todate", filters.todate);

      const queryString = params.toString();
      const url = `/api/imports${queryString ? "?" + queryString : ""}`;

      const response = await this.client.get(url);

      console.log("✅ Import history response:", response);

      return {
        success: true,
        data: response.data.data || [],
        pagination: response.data.pagination || {},
        message: response.data.message,
      };
    } catch (error) {
      console.error("❌ Get import history error:", error);
      throw error;
    }
  }

  /**
   * Get import history for specific shoe (uses: GET /api/imports/shoe/:shoeId)
   */
  async getImportHistoryByShoe(shoeId, pagination = {}) {
    console.log(`📦 API: Getting import history for shoe ${shoeId}...`);

    try {
      const params = new URLSearchParams();
      if (pagination.page) params.append("page", pagination.page);
      if (pagination.limit) params.append("limit", pagination.limit);

      const queryString = params.toString();
      const url = `/api/imports/shoe/${shoeId}${
        queryString ? "?" + queryString : ""
      }`;

      const response = await this.client.get(url);

      console.log("✅ Shoe import history response:", response);

      return {
        success: true,
        data: response.data.data || [],
        pagination: response.data.pagination || {},
        message: response.data.message,
      };
    } catch (error) {
      console.error("❌ Get shoe import history error:", error);
      throw error;
    }
  }

  /**
   * Get import statistics (uses: GET /api/imports/statistics)
   */
  async getImportStatistics(filters = {}) {
    console.log("📊 API: Getting import statistics...", filters);

    try {
      const params = new URLSearchParams();
      if (filters.userid) params.append("userid", filters.userid);
      if (filters.fromdate) params.append("fromdate", filters.fromdate);
      if (filters.todate) params.append("todate", filters.todate);

      const queryString = params.toString();
      const url = `/api/imports/statistics${
        queryString ? "?" + queryString : ""
      }`;

      const response = await this.client.get(url);

      console.log("✅ Import statistics response:", response);

      return {
        success: true,
        data: response.data.data || {},
        message: response.data.message,
      };
    } catch (error) {
      console.error("❌ Get import statistics error:", error);
      throw error;
    }
  }
}

// ============================================================
// 🛒 CART API
// ============================================================

class CartAPI {
  constructor(client) {
    this.client = client;
  }

  /**
   * GET current user's cart
   */
  async getCart() {
    try {
      const response = await this.client.get("/api/cart");
      return response.data;
    } catch (error) {
      console.error("❌ Get cart error:", error);
      throw error;
    }
  }

  /**
   * GET cart summary (totals)
   */
  async getSummary() {
    try {
      const response = await this.client.get("/api/cart/summary");
      return response.data;
    } catch (error) {
      console.error("❌ Get cart summary error:", error);
      throw error;
    }
  }

  /**
   * POST add item to cart
   */
  async addItem(itemData) {
    try {
      const response = await this.client.post("/api/cart", itemData);
      return response.data;
    } catch (error) {
      console.error("❌ Add to cart error:", error);
      throw error;
    }
  }

  /**
   * PUT update cart item quantity or variant
   */
  async updateItem(cartId, updates) {
    try {
      const response = await this.client.put(`/api/cart/${cartId}`, updates);
      return response.data;
    } catch (error) {
      console.error("❌ Update cart item error:", error);
      throw error;
    }
  }

  /**
   * DELETE remove item from cart
   */
  async removeItem(cartId) {
    try {
      const response = await this.client.delete(`/api/cart/${cartId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Remove from cart error:", error);
      throw error;
    }
  }
}

// ============================================================
// 🛒 ORDERS API
// ============================================================

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

    async cancelOrder(id, options = {}) {
        const payload = {};
        if (options.reason) {
            payload.reason = options.reason;
        }
        const response = await this.client.put(`/api/orders/${id}/cancel`, payload);
        return response.data;
    }

  async previewOrder() {
    const response = await this.client.get("/api/orders/preview");
    return response.data;
  }

  async reorderItems(id) {
    const response = await this.client.post(`/api/orders/${id}/reorder`, {});
    return response.data;
  }
}

// ============================================================
// 👨‍💼 ADMIN ORDERS API
// ============================================================

class AdminOrdersAPI {
    constructor(client) {
        this.client = client;
    }

    async getOrders(params = {}) {
        const response = await this.client.get("/api/admin/orders", params);
        return response.data;
    }

    async getOrder(id) {
        const response = await this.client.get(`/api/admin/orders/${id}`);
        return response.data;
    }

    async updateOrderStatus(id, status) {
        const response = await this.client.put(`/api/admin/orders/${id}/status`, {
            status,
        });
        return response.data;
    }

    async cancelOrder(id, options = {}) {
        const payload = {};
        if (options.reason) {
            payload.reason = options.reason;
        }
        const response = await this.client.put(`/api/admin/orders/${id}/cancel`, payload);
        return response.data;
    }

    async approveOrder(id) {
        return this.updateOrderStatus(id, 'processing');
    }
}

// ============================================================
// 💳 PAYMENTS API
// ============================================================

class PaymentsAPI {
  constructor(client) {
    this.client = client;
  }

  /**
   * GET payments for an order
   */
  async getPayments(orderId) {
    try {
      const response = await this.client.get("/api/payments", {
        order_id: orderId
      });
      return response.data;
    } catch (error) {
      console.error("❌ Get payments error:", error);
      throw error;
    }
  }

  /**
   * GET single payment
   */
  async getPayment(id) {
    try {
      const response = await this.client.get(`/api/payments/${id}`);
      return response.data;
    } catch (error) {
      console.error("❌ Get payment error:", error);
      throw error;
    }
  }

  /**
   * POST create payment
   */
  async createPayment({ order_id, payment_method, payment_amount }) {
    try {
      const response = await this.client.post("/api/payments", {
        order_id,
        payment_method,
        payment_amount
      });
      return response.data;
    } catch (error) {
      console.error("❌ Create payment error:", error);
      throw error;
    }
  }

  /**
   * POST process payment
   */
  async processPayment({ payment_id, provider, payload }) {
    try {
      const response = await this.client.post("/api/payments/process", {
        payment_id,
        provider,
        payload
      });
      return response.data;
    } catch (error) {
      console.error("❌ Process payment error:", error);
      throw error;
    }
  }

  /**
   * PUT update payment status
   */
  async updatePaymentStatus(id, status, transactionId = null) {
    try {
      const response = await this.client.put(`/api/payments/${id}/status`, {
        status,
        transaction_id: transactionId
      });
      return response.data;
    } catch (error) {
      console.error("❌ Update payment status error:", error);
      throw error;
    }
  }

  /**
   * POST confirm bank transfer payment (admin)
   */
  async confirmPayment(paymentId) {
    try {
      const response = await this.client.post(`/api/payments/${paymentId}/confirm`, {});
      return response.data;
    } catch (error) {
      console.error("❌ Confirm payment error:", error);
      throw error;
    }
  }

  /**
   * POST approve COD order (admin)
   */
  async approveCod(paymentId) {
    try {
      const response = await this.client.post(`/api/payments/${paymentId}/approve`, {});
      return response.data;
    } catch (error) {
      console.error("❌ Approve COD error:", error);
      throw error;
    }
  }

  /**
   * POST mark COD as collected (admin)
   */
  async collectCod(paymentId) {
    try {
      const response = await this.client.post(`/api/payments/${paymentId}/collect`, {});
      return response.data;
    } catch (error) {
      console.error("❌ Collect COD error:", error);
      throw error;
    }
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
  /**
   * ✅ UPDATE VARIANT - Price and/or Stock
   * PUT /api/variants/:id
   */
  async updateVariant(variantId, updateData) {
    try {
      console.log(`💰 Updating variant ${variantId}:`, updateData);

      if (!variantId || isNaN(parseInt(variantId))) {
        throw new Error("Invalid variant ID");
      }

      const payload = {};

      if (updateData.variant_price !== undefined) {
        const price = parseFloat(updateData.variant_price);
        if (isNaN(price) || price < 0) {
          throw new Error("variant_price must be a positive number");
        }
        payload.variant_price = price;
      }

      if (updateData.stock_quantity !== undefined) {
        const stock = parseInt(updateData.stock_quantity);
        if (isNaN(stock) || stock < 0) {
          throw new Error("stock_quantity must be a non-negative integer");
        }
        payload.stock_quantity = stock;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("No valid fields to update");
      }

      const response = await this.client.put(
        `/api/variants/${variantId}`,
        payload
      );

      return response.data;
    } catch (error) {
      console.error("❌ Update variant error:", error);
      throw error;
    }
  }
  /**
   * ✅ Soft delete variant (preserve stock)
   */
  async softDeleteVariant(variantId) {
    try {
      console.log("🗑️ Soft deleting variant:", variantId);
      const response = await this.client.delete(`/api/variants/${variantId}`); // ✅ ADD /api
      console.log("✅ Soft delete response:", response);
      return response.data; // ✅ Return response.data not response
    } catch (error) {
      console.error("❌ Error soft deleting variant:", error);
      throw error;
    }
  }

  /**
   * ✅ Restore deleted variant
   */
  async restoreVariant(variantId) {
    try {
      console.log("♻️ Restoring variant:", variantId);
      const response = await this.client.post(
        `/api/variants/${variantId}/restore`
      ); // ✅ ADD /api
      console.log("✅ Restore response:", response);
      return response.data; // ✅ Return response.data
    } catch (error) {
      console.error("❌ Error restoring variant:", error);
      throw error;
    }
  }

  /**
   * ✅ Get deleted variants for a shoe
   */
  async getDeletedVariants(shoeId) {
    try {
      console.log("📋 Getting deleted variants for shoe:", shoeId);
      const response = await this.client.get(`/api/variants/deleted/${shoeId}`); // ✅ ADD /api
      console.log("✅ Deleted variants response:", response);
      return response.data; // ✅ Return response.data
    } catch (error) {
      console.error("❌ Error getting deleted variants:", error);
      throw error;
    }
  }
  /**
   * Get variants with filters
   */
  async getVariants(params = {}) {
    try {
      const response = await this.client.get("/api/variants", params);
      return response.data;
    } catch (error) {
      console.error("❌ Get variants error:", error);
      throw error;
    }
  }
  async getAllDeletedVariants() {
    try {
      console.log("📋 Getting all deleted variants...");
      const response = await this.client.get("/api/variants/deleted-all");
      console.log("✅ Get all deleted variants response:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Get all deleted variants error:", error);
      throw error;
    }
  }
}

// ============================================================
// ReviewsAPI - Product Reviews Management
// ============================================================

class ReviewsAPI {
  constructor(client) {
    this.client = client;
  }

  /**
   * GET reviews for a product with pagination and filters
   * @param {number} shoeId - Product ID
   * @param {Object} params - { page, limit, rating }
   * @returns {Promise<Object>} - { data, total, page, limit, totalPages }
   */
  async getProductReviews(shoeId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.rating) queryParams.append('rating', params.rating);

      const queryString = queryParams.toString();
      const url = `/api/products/${shoeId}/reviews${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.client.get(url);
      // Server sends paginated response: { success, data: [...], pagination: {...} }
      const responseData = response.data;
      
      // Transform to expected format
      return {
        data: responseData.data || [],
        total: responseData.pagination?.total || 0,
        page: responseData.pagination?.page || 1,
        limit: responseData.pagination?.limit || 10,
        totalPages: responseData.pagination?.totalPages || 0
      };
    } catch (error) {
      console.error('❌ Get product reviews error:', error);
      throw error;
    }
  }

  /**
   * GET review statistics for a product
   * @param {number} shoeId - Product ID
   * @returns {Promise<Object>} - { average_rating, total_reviews, distribution, percentage_distribution }
   */
  async getProductReviewStats(shoeId) {
    try {
      const response = await this.client.get(`/api/products/${shoeId}/reviews/stats`);
      // Server sends { success: true, data: {...} }, extract data property
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Get product review stats error:', error);
      throw error;
    }
  }

  /**
   * POST create a new review
   * @param {Object} reviewData - { shoe_id, rating, comment }
   * @returns {Promise<Object>} - Created review
   */
  async createReview(reviewData) {
    try {
      console.log('📝 Creating review:', reviewData);
      const response = await this.client.post('/api/reviews', reviewData);
      console.log('✅ Create review response:', response);
      // Server sends { success: true, data: {...} }, extract data property
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Create review error:', error);
      throw error;
    }
  }

  /**
   * PUT update an existing review
   * @param {number} reviewId - Review ID
   * @param {Object} updateData - { rating?, comment? }
   * @returns {Promise<Object>} - Updated review
   */
  async updateReview(reviewId, updateData) {
    try {
      console.log('✏️ Updating review:', reviewId, updateData);
      const response = await this.client.put(`/api/reviews/${reviewId}`, updateData);
      console.log('✅ Update review response:', response);
      // Server sends { success: true, data: {...} }, extract data property
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Update review error:', error);
      throw error;
    }
  }

  /**
   * DELETE a review
   * @param {number} reviewId - Review ID
   * @returns {Promise<Object>} - Deletion confirmation
   */
  async deleteReview(reviewId) {
    try {
      console.log('🗑️ Deleting review:', reviewId);
      const response = await this.client.delete(`/api/reviews/${reviewId}`);
      console.log('✅ Delete review response:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Delete review error:', error);
      throw error;
    }
  }

  /**
   * GET current user's reviews with pagination
   * @param {Object} params - { page, limit }
   * @returns {Promise<Object>} - { data, total, page, limit, totalPages }
   */
  async getMyReviews(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const queryString = queryParams.toString();
      const url = `/api/reviews/my-reviews${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.client.get(url);
      // Server sends paginated response: { success, data: [...], pagination: {...} }
      const responseData = response.data;
      
      // Transform to expected format
      return {
        data: responseData.data || [],
        total: responseData.pagination?.total || 0,
        page: responseData.pagination?.page || 1,
        limit: responseData.pagination?.limit || 10,
        totalPages: responseData.pagination?.totalPages || 0
      };
    } catch (error) {
      console.error('❌ Get my reviews error:', error);
      throw error;
    }
  }

  /**
   * GET current user's review for a specific product (optimized single query)
   * @param {number} shoeId - Product ID
   * @returns {Promise<Object|null>} - Review object or null
   */
  async getMyReviewForProduct(shoeId) {
    try {
      const response = await this.client.get(`/api/products/${shoeId}/reviews/me`);
      // Server sends { success: true, data: {...} }, extract data property
      return response.data.data || response.data;
    } catch (error) {
      // If 404 or no review, return null
      if (error?.response?.status === 404 || error?.message?.includes('not found')) {
        return null;
      }
      console.error('❌ Get my review for product error:', error);
      throw error;
    }
  }
}

// Create API instances
const authAPI = new AuthAPI(apiClient);
const productsAPI = new ProductsAPI(apiClient);
const ordersAPI = new OrdersAPI(apiClient);
const adminOrdersAPI = new AdminOrdersAPI(apiClient);
const usersAPI = new UsersAPI(apiClient);
const importsAPI = new ImportsAPI(apiClient);
const variantsAPI = new VariantsAPI(apiClient);
const cartAPI = new CartAPI(apiClient);
const paymentsAPI = new PaymentsAPI(apiClient);
const reviewsAPI = new ReviewsAPI(apiClient);

// Export for global use
window.ApiClient = ApiClient;
window.apiClient = apiClient;
window.authAPI = authAPI;
window.productsAPI = productsAPI;
window.ordersAPI = ordersAPI;
window.adminOrdersAPI = adminOrdersAPI;
window.usersAPI = usersAPI;
window.importsAPI = importsAPI;
window.variantsAPI = variantsAPI;
window.cartAPI = cartAPI;
window.paymentsAPI = paymentsAPI;
window.reviewsAPI = reviewsAPI;
