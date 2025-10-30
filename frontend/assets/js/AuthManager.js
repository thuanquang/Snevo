/**
 * AuthManager - Simplified authentication manager using AuthService
 * Handles UI updates and acts as a facade for AuthService
 */

import authService from "./services/AuthService.js";

class AuthManager {
  constructor(options = {}) {
    this.authService = authService;
    this.options = {
      autoInit: true,
      redirectOnLogout: true,
      ...options,
    };

    if (this.options.autoInit) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.initialize());
      } else {
        this.initialize();
      }
    }
  }

  /**
   * Initialize authentication
   */
  async initialize() {
    console.log("🔐 Initializing AuthManager...");

    // Initialize AuthService
    await this.authService.initialize();

    // Subscribe to auth events
    this.authService.on("signedIn", (data) => this.handleSignedIn(data));
    this.authService.on("signedOut", () => this.handleSignedOut());
    this.authService.on("userUpdated", (data) => this.handleUserUpdated(data));
    this.authService.on("initialized", (data) => this.handleInitialized(data));

    // Listen to role updates
    this.authService.on("roleUpdated", (data) => {
      console.log("🔄 Role updated, refreshing UI:", data.role);
      this.updateAuthUI();
    });

    // Update UI
    this.updateAuthUI();

    console.log("✅ AuthManager initialized");
  }

  /**
   * Handle signed in event
   */
  handleSignedIn(data) {
    console.log("✅ User signed in:", data.user?.email);
    this.updateAuthUI();

    // Force UI updates at intervals to ensure profile is loaded
    // This handles the race condition where profile data arrives after initial sign-in
    const updateIntervals = [300, 800, 1500];
    updateIntervals.forEach((delay) => {
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
    console.log("👋 User signed out");
    this.updateAuthUI();

    if (
      this.options.redirectOnLogout &&
      !window.location.pathname.includes("index.html")
    ) {
      window.location.href = "index.html";
    }
  }

  /**
   * Handle user updated event
   */
  handleUserUpdated(data) {
    console.log("🔄 User updated:", data.user?.email);
    this.updateAuthUI();
  }

  /**
   * Handle initialized event
   */
  handleInitialized(data) {
    console.log(
      "🎯 Auth initialized with user:",
      data.user?.email,
      "role:",
      data.role
    );
    this.updateAuthUI();
  }

  /**
   * Update authentication UI
   */
  async updateAuthUI() {
    const authButtons = document.getElementById("authButtons");
    if (!authButtons) {
      console.log("No authButtons element found, retrying in 100ms...");
      setTimeout(() => this.updateAuthUI(), 100);
      return;
    }

    const user = this.authService.currentUser;
    const role = this.authService.getUserRole();
    const isAuthenticated = this.authService.isAuthenticated();

    console.log("Updating auth UI:", {
      isAuthenticated,
      role,
      user: user?.email,
    });

    if (isAuthenticated && user) {
      // Get user avatar URL with fallback
      const profileAvatar = await this.authService.getProfileAvatar(user.id);
      // ✅ Avatar priority: profiles.avatar_url > auth metadata > generated
      const avatarUrl =
        profileAvatar || // ← From profiles table (Primary)
        user.user_metadata?.avatar_url || // ← From auth metadata (Fallback)
        user.user_metadata?.picture || // ← From auth picture (Fallback)
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.user_metadata?.username || user.email?.split("@")[0] || "User"
        )}&background=111827&color=fff&size=128`;
      // Better fallback chain for display name
      const userName =
        user.username ||
        user.user_metadata?.username ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.full_name ||
        user.email?.split("@")[0] ||
        "User";

      // ✅ FIX: Add email variable
      const email = user.email || user.user_metadata?.email || "";

      // Determine target page based on role
      const userRole = role || "customer";

      // Determine relative path
      const getRelativePath = (page) => {
        const currentPath = window.location.pathname;
        if (currentPath.includes("/pages/")) {
          return page;
        } else {
          return `pages/${page}`;
        }
      };

      // ✅ SELLER: Keep direct link to admin.html
      if (userRole === "seller" || userRole === "admin") {
        authButtons.innerHTML = `
                <a href="${getRelativePath(
                  "admin.html"
                )}" class="user-avatar-link" title="${userName} (Admin)">
                    <img src="${avatarUrl}" 
                         alt="${userName}" 
                         class="user-avatar rounded-circle"
                         onerror="this.src='https://ui-avatars.com/api?name=${encodeURIComponent(
                           userName
                         )}&background=111827&color=fff&size=128'">
                </a>
            `;
        return;
      }

      // ✅ CUSTOMER: Show dropdown menu
      authButtons.innerHTML = `
    <div class="dropdown" id="userDropdownContainer">
        <button class="btn btn-link p-0 border-0" 
                type="button" 
                id="userDropdown" 
                aria-expanded="false"
                title="${userName}">
            <img src="${avatarUrl}" 
                 alt="${userName}" 
                 class="user-avatar rounded-circle"
                 onerror="this.src='https://ui-avatars.com/api?name=${encodeURIComponent(
                   userName
                 )}&background=111827&color=fff&size=128'">
        </button>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
            <li class="dropdown-header">
                <div class="d-flex align-items-center">
                    <img src="${avatarUrl}" 
                         alt="${userName}" 
                         class="rounded-circle me-2"
                         style="width: 32px; height: 32px; object-fit: cover;"
                         onerror="this.src='https://ui-avatars.com/api?name=${encodeURIComponent(
                           userName
                         )}&background=111827&color=fff&size=128'">
                    <div>
                        <div class="fw-bold">${userName}</div>
                        <small class="text-muted">${email}</small>
                    </div>
                </div>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
                <a class="dropdown-item" href="${getRelativePath(
                  "profile.html"
                )}">
                    <i class="bi bi-person me-2"></i>Profile
                </a>
            </li>
            <li>
                <a class="dropdown-item" href="${getRelativePath(
                  "orders.html"
                )}">
                    <i class="bi bi-bag-check me-2"></i>My Orders
                </a>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
                <a class="dropdown-item text-danger" href="#" id="navbar-logout-btn">
                    <i class="bi bi-box-arrow-right me-2"></i>Logout
                </a>
            </li>
        </ul>
    </div>
`;

      // ✅ Setup logout handler
      this.setupDropdownLogout();

      // ✅ Setup hover behavior (NEW)
      this.setupDropdownHover();
    } else {
      // Not authenticated - show login/signup buttons
      authButtons.innerHTML = `
        <li class="nav-item">
            <a class="nav-link text-black px-4" href="#" id="globalLoginLink">Login</a>
        </li>
        `;
      // Wire up login button
      setTimeout(() => {
        const loginLink = document.getElementById("globalLoginLink");
        if (loginLink) {
          loginLink.addEventListener("click", (e) => {
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
   * Setup logout handler for dropdown menu
   */
  setupDropdownLogout() {
    const logoutBtn = document.getElementById("navbar-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        if (confirm("Are you sure you want to logout?")) {
          try {
            console.log("🚪 Logging out from navbar...");

            // ✅ Use AuthService to logout (same as ProfileManager)
            if (window.authService) {
              await window.authService.logout();
              console.log("✅ Logout successful");

              // ✅ Determine correct redirect path
              const currentPath = window.location.pathname;
              const redirectPath = currentPath.includes("/pages/")
                ? "../index.html"
                : "index.html";

              // ✅ Redirect after short delay (same as ProfileManager)
              setTimeout(() => {
                window.location.href = redirectPath;
              }, 500);
            } else {
              console.error("AuthService not available");
              // Fallback redirect
              const redirectPath = window.location.pathname.includes("/pages/")
                ? "../index.html"
                : "index.html";
              window.location.href = redirectPath;
            }
          } catch (error) {
            console.error("❌ Logout error:", error);
            alert("Failed to logout. Redirecting to home page...");

            // Error fallback redirect
            const redirectPath = window.location.pathname.includes("/pages/")
              ? "../index.html"
              : "index.html";
            window.location.href = redirectPath;
          }
        }
      });
    } else {
      console.warn(
        "⚠️ navbar-logout-btn not found, will retry on next updateAuthUI call"
      );
    }
  }
  /**
   * ✅ Setup hover behavior - Only trigger on AVATAR hover
   */
  setupDropdownHover() {
    const dropdownContainer = document.getElementById("userDropdownContainer");
    const userDropdown = document.getElementById("userDropdown");
    const dropdownMenu = dropdownContainer?.querySelector(".dropdown-menu");
    const avatar = dropdownContainer?.querySelector(".user-avatar"); // ← THÊM

    if (!dropdownContainer || !userDropdown || !dropdownMenu || !avatar) {
      console.warn("⚠️ Dropdown elements not found");
      return;
    }

    let hoverTimeout;
    let closeTimeout;
    let isDropdownOpen = false;

    // ✅ AVATAR HOVER: Show dropdown only when hovering over AVATAR
    avatar.addEventListener("mouseenter", () => {
      clearTimeout(hoverTimeout);
      clearTimeout(closeTimeout);

      isDropdownOpen = true;
      dropdownMenu.classList.remove("hiding");

      let dropdown = bootstrap.Dropdown.getInstance(userDropdown);
      if (!dropdown) {
        dropdown = new bootstrap.Dropdown(userDropdown, {
          autoClose: "outside",
        });
      }

      dropdown.show();
      console.log("👆 Dropdown opened on avatar hover");
    });

    // DROPDOWN MENU HOVER
    dropdownMenu.addEventListener("mouseenter", () => {
      clearTimeout(closeTimeout);
      isDropdownOpen = true;
    });

    // AVATAR LEAVE
    avatar.addEventListener("mouseleave", (e) => {
      const rect = dropdownMenu.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        return; // Không đóng nếu đang vào menu
      }

      scheduleClose();
    });

    // DROPDOWN MENU LEAVE: Đóng dropdown
    dropdownMenu.addEventListener("mouseleave", () => {
      scheduleClose();
    });

    // Helper function: Schedule close với animation
    function scheduleClose() {
      clearTimeout(closeTimeout);

      closeTimeout = setTimeout(() => {
        isDropdownOpen = false;
        dropdownMenu.classList.add("hiding");

        setTimeout(() => {
          const dropdown = bootstrap.Dropdown.getInstance(userDropdown);
          if (dropdown && !isDropdownOpen) {
            dropdown.hide();
          }

          setTimeout(() => {
            dropdownMenu.classList.remove("hiding");
          }, 50);
        }, 250);
      }, 150); // 150ms delay trước khi đóng
    }

    console.log("✅ Dropdown hover (avatar-only) initialized");
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
    return await this.authService.register(userData.email, userData.password, {
      username: userData.username,
      full_name: userData.full_name,
    });
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      console.log("🔐 AuthManager: Starting logout process...");

      // Call AuthService logout
      const result = await this.authService.logout();

      // Check for errors in the result
      if (result && result.error) {
        console.error("❌ AuthService logout failed:", result.error);
        throw new Error(result.error.message || "Logout failed");
      }

      // Clear local auth data
      this.clearAuthData();

      // Update UI immediately
      this.updateAuthUI();

      // Emit logout event
      this.emit("logout");

      console.log("✅ AuthManager: Logout completed successfully");
      return { success: true };
    } catch (error) {
      console.error("❌ AuthManager logout error:", error);

      // Even if logout fails, try to clear local data
      try {
        this.clearAuthData();
        this.updateAuthUI();
      } catch (clearError) {
        console.error("❌ Failed to clear auth data:", clearError);
      }

      // Re-throw the error for the calling code to handle
      throw error;
    }
  }

  /**
   * Clear authentication data
   */
  clearAuthData() {
    console.log("🧹 AuthManager: Clearing authentication data...");

    // Clear local storage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("supabase.auth.refreshToken");
    localStorage.removeItem("supabase.auth.user");

    // Clear session storage
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }

    // Clear any cookies related to auth
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (
        name.includes("auth") ||
        name.includes("session") ||
        name.includes("token") ||
        name.includes("supabase") ||
        name.includes("user")
      ) {
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie =
          name +
          "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
          window.location.hostname;
      }
    });

    console.log("✅ AuthManager: Authentication data cleared");
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
    console.log("Force updating UI - Current state:", {
      isAuthenticated: this.isAuthenticated(),
      user: this.getCurrentUser()?.email,
      role: this.getUserRole(),
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
      authService: this.authService,
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
