/**
 * AuthService - Frontend-only Supabase authentication
 * Handles all auth operations directly with Supabase client
 */

class AuthService {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.userRole = null;
    this.initialized = false;
    this.listeners = new Map();
    this.readyPromise = null;
  }

  /**
   * Check if there's a stored session in localStorage
   */
  hasStoredSession() {
    try {
      const keys = Object.keys(localStorage);
      return keys.some(
        (key) =>
          key.includes("supabase.auth.token") ||
          (key.includes("sb-") && key.includes("-auth-token"))
      );
    } catch (error) {
      console.error("Error checking stored session:", error);
      return false;
    }
  }

  /**
   * Initialize Supabase client
   */
  async initialize() {
    // Return existing promise if already initializing
    if (this.readyPromise) return this.readyPromise;

    if (this.initialized) return true;

    // Create and store the initialization promise
    this.readyPromise = (async () => {
      console.log("🔧 Initializing AuthService...");

      // Get config from window (set by config.js)
      if (!window.APP_CONFIG?.features?.supabaseAuth) {
        console.warn("⚠️ Supabase authentication not configured");
        return false;
      }

      // Wait for Supabase SDK to be available
      let retries = 0;
      while (!window.supabase && retries < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      if (!window.supabase) {
        console.error("❌ Supabase SDK not loaded");
        return false;
      }

      // Initialize Supabase client
      try {
        const createClient = window.supabase.createClient || window.supabase;
        this.supabase = createClient(
          window.SUPABASE_URL,
          window.SUPABASE_ANON_KEY,
          {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true,
            },
            db: {
              schema: "db_nike",
            },
          }
        );

        // Get current session
        const {
          data: { session },
        } = await this.supabase.auth.getSession();
        if (session?.user) {
          this.currentUser = session.user;
          await this.fetchUserRole(session.user.id);
          console.log(
            "✅ Session restored from localStorage:",
            this.currentUser.email
          );
        } else {
          console.log("ℹ️ No existing session found");
        }

        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange(async (event, session) => {
          await this.handleAuthStateChange(event, session);
        });

        this.initialized = true;
        console.log("✅ AuthService initialized successfully");

        // Emit initial state
        this.emit("initialized", {
          user: this.currentUser,
          role: this.userRole,
        });

        return true;
      } catch (error) {
        console.error("❌ Failed to initialize AuthService:", error);
        return false;
      }
    })();

    return this.readyPromise;
  }

  /**
   * Fetch user role from db_nike.profiles table
   */
  async fetchUserRole(userId, retryCount = 0) {
    if (!this.supabase || !userId) return null;

    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .select("role, username, full_name")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Retry logic for new users whose profile hasn't been created yet
        if (error.code === "PGRST116" && retryCount < 3) {
          console.log(`Profile not found, retrying... (${retryCount + 1}/3)`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.fetchUserRole(userId, retryCount + 1);
        }

        console.warn("Failed to fetch user role:", error.message);
        this.userRole = "customer"; // Default fallback
        return this.userRole;
      }

      this.userRole = data?.role || "customer";

      // Enhance currentUser with profile data
      if (this.currentUser && data) {
        this.currentUser = {
          ...this.currentUser,
          username: data.username,
          full_name: data.full_name,
          role: data.role,
        };
      }

      // Emit role updated event
      this.emit("roleUpdated", {
        user: this.currentUser,
        role: this.userRole,
      });

      return this.userRole;
    } catch (error) {
      console.error("Error fetching user role:", error);
      this.userRole = "customer";
      return this.userRole;
    }
  }

  /**
   * Handle authentication state changes
   */
  async handleAuthStateChange(event, session) {
    console.log("🔄 Auth state changed:", event);

    switch (event) {
      case "SIGNED_IN":
        if (session?.user) {
          this.currentUser = session.user;
          await this.fetchUserRole(session.user.id);
          this.emit("signedIn", {
            user: this.currentUser,
            role: this.userRole,
          });

          // Force immediate UI update after profile is loaded
          setTimeout(() => {
            this.emit("roleUpdated", {
              user: this.currentUser,
              role: this.userRole,
            });
          }, 100);
        }
        break;

      case "SIGNED_OUT":
        this.currentUser = null;
        this.userRole = null;
        this.emit("signedOut");
        break;

      case "TOKEN_REFRESHED":
        if (session?.user) {
          this.currentUser = session.user;
          this.emit("tokenRefreshed", { user: this.currentUser });
        }
        break;

      case "USER_UPDATED":
        if (session?.user) {
          this.currentUser = session.user;
          await this.fetchUserRole(session.user.id);
          this.emit("userUpdated", {
            user: this.currentUser,
            role: this.userRole,
          });
        }
        break;
    }
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle() {
    if (!this.supabase) {
      console.error("AuthService not initialized");
      return { error: { message: "Authentication service not available" } };
    }

    try {
      // Build redirect URL - must be full URL with protocol
      const redirectUrl = `${window.location.origin}/`;
      console.log('🔐 Google OAuth redirect URL:', redirectUrl);
      console.log('📍 Current location origin:', window.location.origin);
      console.log('📍 Current location hostname:', window.location.hostname);
      
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google login error:", error);
        return { error };
      }

      return { data };
    } catch (error) {
      console.error("Google login failed:", error);
      return { error: { message: error.message } };
    }
  }

  /**
   * Login with email and password
   */
  async loginWithEmail(email, password) {
    if (!this.supabase) {
      return { error: { message: "Authentication service not available" } };
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { data, error };
    } catch (error) {
      return { error: { message: error.message } };
    }
  }

  /**
   * Register new user
   */
  async register(email, password, userData = {}) {
    if (!this.supabase) {
      return { error: { message: "Authentication service not available" } };
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: userData.username || email.split("@")[0],
            full_name:
              userData.full_name || userData.username || email.split("@")[0],
            ...userData,
          },
        },
      });

      return { data, error };
    } catch (error) {
      return { error: { message: error.message } };
    }
  }

  /**
   * Logout user
   */
  async logout() {
    if (!this.supabase) {
      return { error: { message: "Authentication service not available" } };
    }

    try {
      const { error } = await this.supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: { message: error.message } };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    if (!this.supabase) return null;

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (user && !this.userRole) {
        await this.fetchUserRole(user.id);
      }
      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    if (!this.supabase) return null;

    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error("Error getting current session:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Get user role
   */
  getUserRole() {
    return this.userRole || "customer";
  }

  /**
   * Password reset
   */
  async resetPassword(email) {
    if (!this.supabase) {
      return { error: { message: "Authentication service not available" } };
    }

    try {
      const { data, error } = await this.supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/pages/reset-password.html`,
        }
      );
      return { data, error };
    } catch (error) {
      return { error: { message: error.message } };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    if (!this.supabase) {
      return { error: { message: "Authentication service not available" } };
    }

    try {
      const { data, error } = await this.supabase.auth.updateUser({
        data: updates,
      });
      return { data, error };
    } catch (error) {
      return { error: { message: error.message } };
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
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in auth event handler for ${eventName}:`, error);
      }
    });

    // Also dispatch as custom DOM event
    window.dispatchEvent(
      new CustomEvent(`auth:${eventName}`, {
        detail: data,
      })
    );
  }
  /**
   * ✅ Update profile avatar via API
   */
  async updateProfileAvatar(avatarUrl) {
    try {
      if (!this.currentUser) {
        console.error("❌ No user logged in");
        return false;
      }

      // ✅ Get access token
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (!session) {
        console.error("❌ No session found");
        return false;
      }

      const token = session.access_token;

      // ✅ Update via API endpoint
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatar_url: avatarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Update avatar error:", errorData);
        return false;
      }

      const data = await response.json();
      console.log("✅ Avatar updated via API");

      // ✅ Update currentUser locally
      if (data.user) {
        this.currentUser = data.user;
        this.emit("userUpdated", { avatar_url: avatarUrl });
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Update avatar error:", error);
      return false;
    }
  }

  /**
   * ✅ Fetch avatar from profiles table via API
   */
  async getProfileAvatar(userId) {
    try {
      // ✅ Get access token from current session
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session) {
        console.warn("⚠️ No session found for avatar fetch");
        return null;
      }

      const token = session.access_token;

      // ✅ Fetch từ API endpoint (chuẩn như ProfileManager)
      const response = await fetch("/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("⚠️ Profile not found (new user)");
          return null;
        }
        console.error(`❌ Failed to fetch profile: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log("✅ Avatar fetched from API:", data.user?.avatar_url);

      return data.user?.avatar_url || null;
    } catch (error) {
      console.error("❌ Error fetching avatar:", error);
      return null;
    }
  }
}

// Create and export singleton instance
const authService = new AuthService();

// Make available globally
window.authService = authService;
window.AuthService = AuthService;

export default authService;
