/**
 * ProfileManager - OOP Profile management class
 * Handles user profile operations, address management, and settings
 */

class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.addresses = [];
    this.notificationSettings = {};
    this.isInitialized = false;
    this.uiInitialized = false;
  }

    /**
     * Initialize profile manager
     */
    async initialize() {
        try {
            await this.loadUserProfile();
            await this.loadAddresses();
            await this.loadNotificationSettings();
            this.isInitialized = true;
            console.log('ProfileManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ProfileManager:', error);
            throw error;
        }
    }

    /**
     * Load user profile data
     */
    async loadUserProfile() {
        try {
            console.log('🔄 Loading user profile...');

            // Get session from Supabase
            if (!window.authService || !window.authService.supabase) {
                console.error('AuthService not available');
                this.showError('Authentication service not available');
                return;
            }

      const {
        data: { session },
      } = await window.authService.supabase.auth.getSession();
      if (!session) {
        console.log("No active session found");
        this.showError("Authentication required. Please log in again.");
        if (window.showLoginModal) {
          window.showLoginModal();
        }
        return;
      }

            const token = session.access_token;
            console.log('✅ Got access token from session');

      const response = await fetch("/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Profile loaded from API:', data);
                this.currentUser = data.user;
                await this.updateProfileDisplay();
                await this.loadAddresses();
                return this.currentUser;
            } else if (response.status === 404) {
                console.log('Profile not found - this might be a new user');
                // For new users, try to get basic info from AuthManager
                if (window.authManager && window.authManager.getCurrentUser()) {
                    const authUser = window.authManager.getCurrentUser();
                    this.currentUser = {
                        user_id: authUser.id,
                        email: authUser.email,
                        username: authUser.username || authUser.email.split('@')[0],
                        full_name: authUser.full_name || authUser.username || authUser.email.split('@')[0],
                        role: authUser.role || 'customer',
                        phone: '',
                        date_of_birth: null,
                        gender: '',
                        avatar_url: authUser.avatar_url || ''
                    };
                    console.log('Using AuthManager user data as fallback:', this.currentUser);
                    await this.updateProfileDisplay();
                    await this.loadAddresses();
                    return this.currentUser;
                } else {
                    this.showError('Profile not found and no authentication data available');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to load profile (${response.status})`);
            }
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            this.showError(`Failed to load profile data: ${error.message}`);

            // Fallback to AuthManager data if API fails
            if (window.authManager && window.authManager.getCurrentUser()) {
                console.log('🔄 Falling back to AuthManager user data');
                const authUser = window.authManager.getCurrentUser();
                this.currentUser = {
                    user_id: authUser.id,
                    email: authUser.email,
                    username: authUser.username || authUser.email.split('@')[0],
                    full_name: authUser.full_name || authUser.username || authUser.email.split('@')[0],
                    role: authUser.role || 'customer'
                };
                await this.updateProfileDisplay();
            }
        }
    }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    try {
      const response = await apiClient.put("/auth/profile", updates);

      if (response.success) {
        this.currentUser = { ...this.currentUser, ...response.data.profile };
        return this.currentUser;
      } else {
        throw new Error(response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

    /**
     * Load user addresses
     */
    async loadAddresses() {
        try {
            // Get the current session token
            const { data: { session } } = await window.authService.supabase.auth.getSession();
            if (!session) {
                console.log('No active session for loading addresses');
                const addressesList = document.getElementById('addressesList');
                if (addressesList) {
                    addressesList.innerHTML = '<div class="alert alert-info">Please log in to view your addresses.</div>';
                }
                return;
            }

      const response = await fetch("/api/auth/addresses", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.addresses = data.addresses || [];
        this.renderAddresses();
        return this.addresses;
      } else {
        throw new Error("Failed to load addresses");
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
      const addressesList = document.getElementById("addressesList");
      if (addressesList) {
        addressesList.innerHTML =
          '<div class="alert alert-warning">Failed to load addresses. Please try again.</div>';
      }
    }
  }
  /**
   * Change user password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiClient.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.success) {
        return true;
      } else {
        throw new Error(response.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Load notification settings
   */
  async loadNotificationSettings() {
    try {
      const response = await apiClient.get("/auth/notifications");

      if (response.success) {
        this.notificationSettings = response.data.settings || {};
        return this.notificationSettings;
      } else {
        // If no settings exist, use defaults
        this.notificationSettings = {
          email_notifications: true,
          order_updates: true,
          product_recommendations: true,
          marketing_emails: false,
        };
        return this.notificationSettings;
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
      // Use defaults on error
      this.notificationSettings = {
        email_notifications: true,
        order_updates: true,
        product_recommendations: true,
        marketing_emails: false,
      };
      return this.notificationSettings;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings) {
    try {
      const response = await apiClient.put("/auth/notifications", settings);

      if (response.success) {
        this.notificationSettings = {
          ...this.notificationSettings,
          ...settings,
        };
        return this.notificationSettings;
      } else {
        throw new Error(
          response.error || "Failed to update notification settings"
        );
      }
    } catch (error) {
      console.error("Error updating notification settings:", error);
      throw error;
    }
  }

  /**
   * Get user orders
   */
  async getOrders(page = 1, limit = 10) {
    try {
      const response = await apiClient.get(
        `/auth/orders?page=${page}&limit=${limit}`
      );

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "Failed to load orders");
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      throw error;
    }
  }

  /**
   * Get user reviews
   */
  async getReviews(page = 1, limit = 10) {
    try {
      const response = await apiClient.get(
        `/auth/reviews?page=${page}&limit=${limit}`
      );

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "Failed to load reviews");
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get user addresses
   */
  getAddresses() {
    return this.addresses;
  }

  /**
   * Get notification settings
   */
  getNotificationSettings() {
    return this.notificationSettings;
  }

  /**
   * Check if profile is complete
   */
  isProfileComplete() {
    if (!this.currentUser) return false;

    const requiredFields = ["full_name", "username", "email"];
    return requiredFields.every((field) => this.currentUser[field]);
  }

  /**
   * Get profile completion percentage
   */
  getProfileCompletionPercentage() {
    if (!this.currentUser) return 0;

    const allFields = [
      "full_name",
      "username",
      "email",
      "phone",
      "date_of_birth",
      "gender",
      "avatar_url",
    ];

    const completedFields = allFields.filter(
      (field) => this.currentUser[field]
    );
    return Math.round((completedFields.length / allFields.length) * 100);
  }

  /**
   * Get default address
   */
  getDefaultAddress() {
    return this.addresses.find((addr) => addr.is_default) || this.addresses[0];
  }

  /**
   * Set default address
   */
  async setDefaultAddress(addressId) {
    try {
      // First, unset all other defaults
      await Promise.all(
        this.addresses
          .filter((addr) => addr.address_id !== addressId && addr.is_default)
          .map((addr) =>
            this.updateAddress(addr.address_id, { is_default: false })
          )
      );

      // Then set the new default
      await this.updateAddress(addressId, { is_default: true });

      return true;
    } catch (error) {
      console.error("Error setting default address:", error);
      throw error;
    }
  }

  /**
   * Validate address data
   */
  validateAddressData(addressData) {
    const requiredFields = ["street", "city", "state", "country", "zip_code"];
    const missingFields = requiredFields.filter((field) => !addressData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    return true;
  }

  /**
   * Validate password change data
   */
  validatePasswordChangeData(passwordData) {
    const { current_password, new_password, confirm_password } = passwordData;

    if (!current_password) {
      throw new Error("Current password is required");
    }

    if (!new_password) {
      throw new Error("New password is required");
    }

    if (new_password.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    if (new_password !== confirm_password) {
      throw new Error("New passwords do not match");
    }

    return true;
  }

  /**
   * Format address for display
   */
  formatAddress(address) {
    return `${address.street}, ${address.city}, ${address.state} ${address.zip_code}, ${address.country}`;
  }

  /**
   * Get profile statistics
   */
  getProfileStats() {
    return {
      completionPercentage: this.getProfileCompletionPercentage(),
      addressCount: this.addresses.length,
      hasDefaultAddress: !!this.getDefaultAddress(),
      isProfileComplete: this.isProfileComplete(),
    };
  }

  /**
   * Export profile data
   */
  async exportProfileData() {
    try {
      const [orders, reviews] = await Promise.all([
        this.getOrders(1, 1000), // Get all orders
        this.getReviews(1, 1000), // Get all reviews
      ]);

      return {
        profile: this.currentUser,
        addresses: this.addresses,
        notificationSettings: this.notificationSettings,
        orders: orders.data || [],
        reviews: reviews.data || [],
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error exporting profile data:", error);
      throw error;
    }
  }

  /**
   * Reset profile manager
   */
  reset() {
    this.currentUser = null;
    this.addresses = [];
    this.notificationSettings = {};
    this.isInitialized = false;
    this.uiInitialized = false;
  }

  // ==================== UI INITIALIZATION METHODS ====================

    /**
     * Initialize profile page - main entry point for profile.html
     */
    async initializeProfilePage() {
        console.log('🔍 initializeProfilePage called');
        console.log('Current URL:', window.location.href);
        console.log('AuthManager available:', !!window.authManager);
        
        // Wait for AuthManager to be available and initialized
        await this.waitForAuthManager();
        console.log('AuthManager ready');
        
        // Wait for AuthService to be fully initialized
        await this.waitForAuthService();
        
        console.log('Is authenticated:', window.authManager.isAuthenticated());
        console.log('Current user:', window.authManager.getCurrentUser());
        
        // Revalidate session first to avoid stale state
        try {
            if (window.authManager && typeof window.authManager.validateAndRefreshSession === 'function') {
                await window.authManager.validateAndRefreshSession();
            }
        } catch (e) {
            console.warn('Profile page revalidation failed:', e);
        }

        // Enforce authentication strictly for profile
        if (!window.authManager.isAuthenticated()) {
            console.log('❌ Not authenticated after revalidation, showing login modal');
            // Show login modal instead of redirecting
            if (window.showLoginModal) {
                window.showLoginModal();
            }
            return;
        }
        
        console.log('✅ User is authenticated, proceeding with profile page');
        
        // Continue with profile setup
        console.log('🚀 Setting up profile page');
        this.setupProfileNavigation();
        await this.loadUserProfile();
        this.setupProfileForms();
        this.setupLogoutButton();
        this.uiInitialized = true;
    }

    /**
     * Wait for AuthManager to be available
     */
    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (window.authManager && typeof window.authManager.isAuthenticated === 'function') {
                console.log('AuthManager found after', attempts * 100, 'ms');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('AuthManager not found after 5 seconds, proceeding anyway');
    }

    /**
     * Wait for AuthService to be fully initialized
     */
    async waitForAuthService() {
        console.log('🔍 Waiting for AuthService initialization...');
        
        // Wait for authService to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (window.authService) {
                console.log('✅ AuthService object found');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.authService) {
            console.error('❌ AuthService not available after 5 seconds');
            return;
        }
        
        // Wait for the initialization promise to resolve
        try {
            console.log('⏳ Awaiting AuthService initialization...');
            await window.authService.initialize();
            console.log('✅ AuthService fully initialized with session restored');
            
            // Check if we have a session
            const hasSession = window.authService.hasStoredSession();
            const isAuthenticated = window.authService.isAuthenticated();
            console.log('📊 Session status:', { hasSession, isAuthenticated });
            
            return;
        } catch (error) {
            console.error('❌ Error waiting for AuthService:', error);
        }
    }

  // ==================== UI SETUP METHODS ====================

  /**
   * Setup profile navigation with tab switching
   */
  setupProfileNavigation() {
    const navLinks = document.querySelectorAll(".profile-nav .nav-link");
    const sections = document.querySelectorAll(".profile-section-content");

    // Initially hide all sections except the active one
    sections.forEach((section) => {
      section.style.display = "none";
    });

    // Show the default active section (Personal Info)
    const personalInfoSection = document.getElementById(
      "personal-info-section"
    );
    if (personalInfoSection) {
      personalInfoSection.style.display = "block";
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();

        const targetSection = this.getAttribute("data-section");

        // Update active nav link
        navLinks.forEach((nav) => nav.classList.remove("active"));
        this.classList.add("active");

        // Hide all sections with fade effect
        sections.forEach((section) => {
          if (section.classList.contains("active")) {
            section.classList.remove("active");
            section.style.opacity = "0";
            setTimeout(() => {
              section.style.display = "none";
            }, 300);
          }
        });

        // Show target section with fade effect
        const targetElement = document.getElementById(
          targetSection + "-section"
        );
        if (targetElement) {
          setTimeout(() => {
            targetElement.style.display = "block";
            targetElement.style.opacity = "0";
            targetElement.classList.add("active");

            // Trigger reflow for animation
            targetElement.offsetHeight;

            targetElement.style.opacity = "1";
            targetElement.style.transform = "translateY(0)";
          }, 100);
        }

        // Scroll to top of content area
        const profileContent = document.querySelector(".profile-content");
        if (profileContent) {
          profileContent.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  /**
   * Setup profile forms with event handlers
   */
  setupProfileForms() {
    // Personal info form
    const personalInfoForm = document.getElementById("personalInfoForm");
    if (personalInfoForm) {
      personalInfoForm.addEventListener("submit", (e) =>
        this.handlePersonalInfoSubmit(e)
      );
    }
    this.setupAvatarUploadHandlers();
  }

  /**
   * Setup avatar upload handlers
   *
   * ⭐ IMPORTANT: Avatar preview is INDEPENDENT from form validation
   *
   * This method:
   * - Listens for file selection changes only
   * - Updates preview display based on selected file
   * - Does NOT validate form or prevent submission
   * - Does NOT interfere with other form fields
   * - Safely handles file clearing (preview resets to default)
   *
   * The form submission is handled separately in handlePersonalInfoSubmit()
   * which decides whether to use multipart (with file) or JSON (without file).
   */
  setupAvatarUploadHandlers() {
    const avatarFileInput = document.getElementById("avatarFile");
    const avatarPreview = document.getElementById("avatarPreview");
    const avatarError = document.getElementById("avatarError");

    if (avatarFileInput && avatarPreview) {
      avatarFileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            avatarPreview.innerHTML =
              '<div style="width: 120px; height: 120px; margin: 0 auto; border-radius: 50%; overflow: hidden; border: 2px solid #0d6efd;"><img src="' +
              e.target.result +
              '" style="width: 100%; height: 100%; object-fit: cover;"></div>';
            avatarPreview.classList.remove("d-none");
          };
          reader.readAsDataURL(file);
        } else {
          avatarPreview.innerHTML =
            '<div style="width: 120px; height: 120px; margin: 0 auto; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px dashed #dee2e6;"><i class="fas fa-user fa-3x" style="color: #999;"></i></div>';
          avatarPreview.classList.add("d-none");
        }
      });
    }
  }

    /**
     * Setup logout button with loading states
     */
    setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                console.log('Profile logout button clicked');

                // Disable button and show loading state
                logoutBtn.disabled = true;
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging out...';

                try {
                    if (window.authManager) {
                        console.log('Using AuthManager logout for profile');
                        const result = await window.authManager.logout();
                        console.log('Profile logout result:', result);
                        
                        // Check if logout was successful
                        if (result && result.error) {
                            throw new Error(result.error.message || 'Logout failed');
                        }
                        
                        console.log('Profile logout successful via AuthManager');
                        // AuthManager handles redirect and auth state clearing
                    } else {
                        console.log('AuthManager not available, using fallback for profile');
                        // Fallback logout process
                        await this.performLogout();
                    }
                } catch (error) {
                    console.error('Profile logout error:', error);

                    // If AuthManager logout failed, try fallback
                    if (window.authManager) {
                        console.log('AuthManager logout failed, trying fallback for profile');
                        try {
                            await this.performLogout();
                        } catch (fallbackError) {
                            console.error('Fallback logout also failed:', fallbackError);
                            this.showError('Logout failed. Please clear your browser data and refresh the page.');
                            // Reset button state
                            logoutBtn.disabled = false;
                            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Logout';
                        }
                    } else {
                        this.showError('Logout failed. Please try again or refresh the page.');
                        // Reset button state
                        logoutBtn.disabled = false;
                        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Logout';
                    }
                }
            });
        }
    }

  // ==================== DISPLAY UPDATE METHODS ====================

  /**
   * Update profile display with current user data
   */
  async updateProfileDisplay() {
    if (!this.currentUser) return;

    // Update profile info
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileAvatar = document.getElementById("profileAvatar");

    if (profileName) {
      profileName.textContent =
        this.currentUser.full_name || this.currentUser.username || "User";
    }

    if (profileEmail) {
      profileEmail.textContent = this.currentUser.email || "";
    }

    if (profileAvatar && this.currentUser.avatar_url) {
      profileAvatar.innerHTML = `<img src="${this.currentUser.avatar_url}" alt="Avatar" class="rounded-circle" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

    // Update form fields
    this.updatePersonalInfoForm();
    await this.updateAccountSettings();
  }

  /**
   * Update personal info form with current user data
   */
  updatePersonalInfoForm() {
    if (!this.currentUser) return;

    const form = document.getElementById("personalInfoForm");
    if (!form) return;

    // Populate form fields
    const fields = [
      "full_name",
      "username",
      "email",
      "phone",
      "date_of_birth",
      "gender",
      "avatar_url",
    ];
    fields.forEach((field) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && this.currentUser[field] !== undefined) {
        input.value = this.currentUser[field] || "";
      }
    });
  }

  /**
   * Update account settings section
   */
  async updateAccountSettings() {
    if (!this.currentUser) return;

    const accountStatus = document.getElementById("accountStatus");
    const verificationBadge = document.getElementById("verificationBadge");
    const memberSince = document.getElementById("memberSince");

    // For Google OAuth users, check Supabase auth user's email verification status
    let isEmailVerified = false;
    try {
      if (window.authService && window.authService.supabase) {
        const {
          data: { user },
        } = await window.authService.supabase.auth.getUser();
        if (user) {
          // For Google OAuth, email is automatically verified
          // For email/password, check user.email_confirmed_at
          isEmailVerified =
            user.email_confirmed_at !== null ||
            user.app_metadata?.provider === "google";
        }
      }
    } catch (error) {
      console.warn("Could not get auth user for verification status:", error);
      // Fallback to database field if available
      isEmailVerified = this.currentUser.email_verified || false;
    }

    if (accountStatus) {
      accountStatus.textContent = isEmailVerified
        ? "Active"
        : "Pending Verification";
    }

    // Update the verification badge
    if (verificationBadge) {
      if (isEmailVerified) {
        verificationBadge.textContent = "Verified";
        verificationBadge.className = "badge bg-success";
        verificationBadge.style.background = "#000";
      } else {
        verificationBadge.textContent = "Pending";
        verificationBadge.className = "badge bg-warning";
        verificationBadge.style.background = "#ffc107";
      }
    }

    if (memberSince && this.currentUser.created_at) {
      const date = new Date(this.currentUser.created_at);
      memberSince.textContent = date.toLocaleDateString();
    }
  }

  /**
   * Render addresses list
   */
  renderAddresses() {
    const addressesList = document.getElementById("addressesList");
    if (!addressesList) return;

    if (this.addresses.length === 0) {
      addressesList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
                    <h5>No addresses found</h5>
                    <p class="text-muted">Add your first address to get started</p>
                </div>
            `;
      return;
    }

    const addressesHTML = this.addresses
      .map(
        (address) => `
            <div class="address-card mb-3">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="address-info">
                                <h6 class="card-title">
                                    ${address.street}
                                    ${
                                      address.is_default
                                        ? '<span class="badge bg-primary ms-2">Default</span>'
                                        : ""
                                    }
                                </h6>
                                <p class="card-text text-muted">
                                    ${address.city}, ${address.state}<br>
                                    ${address.country} ${address.zip_code}
                                </p>
                            </div>
                            <div class="address-actions">
                                <button onclick="window.openEditAddressModal(${
                                  address.address_id
                                })" class="btn btn-sm btn-outline-primary me-2">
                                <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="window.openDeleteAddressModal(${
                                  address.address_id
                                })" class="btn btn-sm btn-outline-danger">
                                <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
      )
      .join("");

    addressesList.innerHTML = addressesHTML;
  }

  // ==================== FORM HANDLERS ====================

  /**
   * Handle personal info form submission
   *
   * ⭐ KEY FEATURE: Avatar upload is COMPLETELY OPTIONAL
   *
   * This method intelligently handles profile updates with or without avatar:
   * - If avatar file is selected: Uses multipart FormData for file upload
   * - If no avatar file: Uses JSON for profile-only updates
   * - Avatar upload status NEVER blocks profile field submission
   *
   * Behavior:
   * 1. Validates profile fields (full_name, username required)
   * 2. Checks if user selected an avatar file
   * 3. If file exists: validates (type, size), uploads via multipart
   * 4. If no file: submits profile fields via JSON
   * 5. Shows success/error feedback independent of avatar status
   *
   * Supported scenarios:
   * ✅ Update profile WITHOUT avatar (name, username, phone changes only)
   * ✅ Update profile WITH avatar (profile + file upload)
   * ✅ Update avatar ONLY (just replace avatar, keep other fields)
   *
   * @param {Event} e - Form submit event from personalInfoForm
   * @returns {Promise<void>}
   */
  async handlePersonalInfoSubmit(e) {
    e.preventDefault();

    const form = e.target;

    // Check if form is valid using Bootstrap validation
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add("was-validated");
      return;
    }

    const submitBtn = document.getElementById("savePersonalInfoBtn");
    const loadingIndicator = document.getElementById("personalInfoLoading");
    const messageDiv = document.getElementById("personalInfoMessage");

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    loadingIndicator.classList.remove("d-none");

    // Clear previous messages
    messageDiv.classList.add("d-none");
    messageDiv.className = "d-none";

    try {
      // ⭐ UPDATED: Check for avatar file - auto-detect and use FormData
      const avatarFileInput = document.getElementById("avatarFile");
      const avatarFile =
        avatarFileInput && avatarFileInput.files
          ? avatarFileInput.files[0]
          : null;

      let response;

            if (avatarFile) {
                // ⭐ NEW: File selected - use FormData with multipart upload
                console.log('📤 Avatar file detected, using FormData for multipart upload');
                
                // Validate file
                const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
                if (!validTypes.includes(avatarFile.type)) {
                    throw new Error('Invalid image format. Please use JPG, PNG, or WEBP.');
                }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (avatarFile.size > maxSize) {
          throw new Error("Image size must be less than 5MB");
        }

        // Create FormData with file + other fields
        const formData = new FormData(form);
        formData.append("avatar_file", avatarFile);

        // Remove avatar_url if we're uploading a file
        formData.delete("avatar_url");

        // ⭐ CRITICAL FIX: Remove empty fields (same as JSON path does)
        const keys = Array.from(formData.keys());
        keys.forEach((key) => {
          const value = formData.get(key);
          if (value === "" || value === null || value === undefined) {
            formData.delete(key);
          }
        });

        // Get the current session token
        const {
          data: { session },
        } = await window.authService.supabase.auth.getSession();
        if (!session) {
          throw new Error("Please log in to update your profile");
        }

                response = await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                        // Note: Don't set Content-Type - browser will set it with boundary
                    },
                    body: formData
                });

            } else {
                // ⭐ EXISTING: No file - use JSON as before
                console.log('📝 No avatar file, using JSON for update');
                
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);

                // Remove empty fields and convert date to ISO string if present
                Object.keys(data).forEach(key => {
                    if (data[key] === '' || data[key] === null || data[key] === undefined) {
                        delete data[key];
                    } else if (key === 'date_of_birth' && data[key]) {
                        data[key] = new Date(data[key]).toISOString().split('T')[0];
                    }
                });

                console.log('📝 Submitting profile update:', data);

        // Get the current session token
        const {
          data: { session },
        } = await window.authService.supabase.auth.getSession();
        if (!session) {
          throw new Error("Please log in to update your profile");
        }

        response = await fetch("/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(data),
        });
      }

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Profile updated successfully:', result);

        // Show success message
        messageDiv.className = "alert alert-success";
        messageDiv.innerHTML =
          '<i class="fas fa-check-circle me-2"></i>Profile updated successfully!';
        messageDiv.classList.remove("d-none");

        // Clear avatar file input after successful upload
        if (avatarFileInput) {
          avatarFileInput.value = "";
        }

        // Reload profile data to get updated values
        await this.loadUserProfile();

                // Auto-hide success message after 3 seconds
                setTimeout(() => {
                    messageDiv.classList.add('d-none');
                }, 3000);

            } else {
                const error = await response.json();
                console.error('❌ Profile update failed:', error);
                throw new Error(error.message || `Failed to update profile (${response.status})`);
            }

        } catch (error) {
            console.error('❌ Error updating profile:', error);

      // Show error message
      messageDiv.className = "alert alert-danger";
      messageDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${
        error.message || "Failed to update profile. Please try again."
      }`;
      messageDiv.classList.remove("d-none");
    } finally {
      // Hide loading state
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
      loadingIndicator.classList.add("d-none");
    }
  }
  /**
   * Setup Event Listeners
   */
  setupAddressEventListeners() {
    // ⭐ Save Address Button (Add)
    const btnSaveAddress = document.getElementById("btnSaveAddress");
    if (btnSaveAddress) {
      btnSaveAddress.addEventListener("click", () => this.handleAddAddress());
    }

    // ⭐ Update Address Button (Edit Modal)
    const btnUpdateAddress = document.getElementById("btnUpdateAddress");
    if (btnUpdateAddress) {
      btnUpdateAddress.addEventListener("click", () =>
        this.handleUpdateAddress()
      );
    }

    // ⭐ Confirm Delete Button
    const btnConfirmDelete = document.getElementById("btnConfirmDelete");
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener("click", () =>
        this.handleDeleteAddress()
      );
    }
  }
  /**
   * Validate form and show errors inline
   */
  validateAddressForm(form) {
    const requiredFields = {
      recipient_name: "Recipient Name",
      phone_number: "Phone Number",
      street: "Street Address",
      ward: "Ward",
      district: "District",
      city: "City",
      state: "State/Province",
    };

    const errors = [];

    // Clear all previous errors
    form.querySelectorAll("input").forEach((input) => {
      input.classList.remove("is-invalid");
      const errorMsg = input.parentElement.querySelector("small");
      if (errorMsg) errorMsg.style.display = "none";
    });

    // Check each required field
    for (const [fieldName, fieldLabel] of Object.entries(requiredFields)) {
      const input = form.querySelector(`[name="${fieldName}"]`);
      const value = input?.value?.trim();

      if (!value) {
        errors.push(fieldName);

        // ⭐ Highlight field red + show error message
        if (input) {
          input.classList.add("is-invalid");
          const errorMsg = input.parentElement.querySelector("small");
          if (errorMsg) {
            errorMsg.textContent = `${fieldLabel} is required`;
            errorMsg.style.display = "block";
          }
        }
      }
    }

    return errors.length === 0; // Return true if valid, false if has errors
  }
  /**
   * Open Add Address Modal
   */
  openAddAddressModal() {
    const form = document.getElementById("addAddressForm");
    form.reset();
    const modal = new bootstrap.Modal(
      document.getElementById("addAddressModal")
    );
    modal.show();
  }
  /**
   * Handle Add Address
   */
  async handleAddAddress() {
    try {
      const form = document.getElementById("addAddressForm");
      if (!form) return;

      // ⭐ Validate first - không dùng alert
      if (!this.validateAddressForm(form)) {
        console.warn("Validation failed - errors shown on form");
        return; // Stop here, don't call API
      }

      // ✅ Validation passed - proceed with API
      const formData = new FormData(form);
      const addressData = {
        recipient_name: formData.get("recipient_name"),
        phone_number: formData.get("phone_number"),
        street: formData.get("street"),
        ward: formData.get("ward"),
        district: formData.get("district"),
        city: formData.get("city"),
        state: formData.get("state"),
        zip_code: formData.get("zip_code") || null,
        country: formData.get("country") || "Vietnam",
        is_default: formData.get("is_default") === "on",
      };

      const response = await apiClient.post("/api/addresses", addressData);

      if (!response.data?.success) {
        // Show error dưới form nếu có lỗi từ server
        alert(`Error: ${response.data?.message}`);
        return;
      }

      // Success
      alert("✅ Address added successfully!");

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addAddressModal")
      );
      if (modal) modal.hide();

      form.reset();
      await this.loadAddresses();
    } catch (error) {
      console.error("Error adding address:", error);
      alert(`Error: ${error.message}`);
    }
  }

  /**
   * Handle editing address
   */
  editAddress(addressId) {
    const address = this.addresses.find(
      (addr) => addr.address_id === addressId
    );
    if (!address) return;

    // Populate edit form
    document.getElementById("editAddressId").value = address.address_id;
    document.getElementById("editAddressStreet").value = address.street;
    document.getElementById("editAddressCity").value = address.city;
    document.getElementById("editAddressState").value = address.state;
    document.getElementById("editAddressCountry").value = address.country;
    document.getElementById("editAddressZip").value = address.zip_code;
    document.getElementById("editAddressDefault").checked = address.is_default;

    // Show modal
    new bootstrap.Modal(document.getElementById("editAddressModal")).show();
  }
  /**
   * Open Edit Address Modal
   */
  async openEditAddressModal(addressId) {
    const address = this.addresses.find((a) => a.address_id === addressId);
    if (!address) {
      this.showError("Address not found");
      return;
    }

    const form = document.getElementById("editAddressForm");
    form.querySelector('[name="recipient_name"]').value =
      address.recipient_name || "";
    form.querySelector('[name="phone_number"]').value =
      address.phone_number || "";
    form.querySelector('[name="street"]').value = address.street || "";
    form.querySelector('[name="ward"]').value = address.ward || "";
    form.querySelector('[name="district"]').value = address.district || "";
    form.querySelector('[name="city"]').value = address.city || "";
    form.querySelector('[name="state"]').value = address.state || "";
    form.querySelector('[name="zip_code"]').value = address.zip_code || "";
    form.querySelector('[name="country"]').value = address.country || "Vietnam";
    form.querySelector('[name="is_default"]').checked =
      address.is_default || false;

    document.getElementById("editAddressId").value = addressId;

    const modal = new bootstrap.Modal(
      document.getElementById("editAddressModal")
    );
    modal.show();
  }
  /**
   * Handle Update Address
   */
  async handleUpdateAddress() {
    try {
      const form = document.getElementById("editAddressForm");
      if (!form) return;

      // ⭐ Validate first
      if (!this.validateAddressForm(form)) {
        console.warn("Validation failed - errors shown on form");
        return;
      }

      const addressIdInput = document.getElementById("editAddressId");
      const addressId = parseInt(addressIdInput.value);

      const formData = new FormData(form);
      const addressData = {
        recipient_name: formData.get("recipient_name"),
        phone_number: formData.get("phone_number"),
        street: formData.get("street"),
        ward: formData.get("ward"),
        district: formData.get("district"),
        city: formData.get("city"),
        state: formData.get("state"),
        zip_code: formData.get("zip_code") || null,
        country: formData.get("country") || "Vietnam",
        is_default: formData.get("is_default") === "on",
      };

      const response = await apiClient.put(
        `/api/addresses/${addressId}`,
        addressData
      );

      if (!response.data?.success) {
        alert(`Error: ${response.data?.message}`);
        return;
      }

      alert("✅ Address updated successfully!");

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editAddressModal")
      );
      if (modal) modal.hide();

      await this.loadAddresses();
    } catch (error) {
      console.error("Error updating address:", error);
      alert(`Error: ${error.message}`);
    }
  }

  /**
   * Open Delete Address Modal
   */
  openDeleteAddressModal(addressId) {
    document.getElementById("deleteAddressId").value = addressId;
    const modal = new bootstrap.Modal(
      document.getElementById("deleteAddressModal")
    );
    modal.show();
  }

  /**
   * Handle Delete Address - With Validation & Alert
   */
  async handleDeleteAddress() {
    try {
      const addressIdInput = document.getElementById("deleteAddressId");
      if (!addressIdInput) {
        alert("❌ Error: Address ID not found");
        return;
      }

      const addressId = parseInt(addressIdInput.value);

      console.log("🗑️ Deleting address:", addressId);

      // Call API - using deleteForUser
      const response = await apiClient.delete(`/api/addresses/${addressId}`);

      console.log("Response:", response);

      // ⭐ Check response
      if (!response.data?.success) {
        const message = response.data?.message || "Failed to delete address";
        const code = response.data?.code;

        // ⭐ Handle different error types
        if (code === "ADDRESS_IN_USE") {
          alert(`⚠️ Cannot Delete Address\n\n${message}`);
          console.warn("Address in use:", message);
        } else if (
          message.includes("not found") ||
          message.includes("401") ||
          message.includes("403")
        ) {
          alert(`❌ ${message}`);
        } else {
          alert(`❌ Error: ${message}`);
        }
        return;
      }

      // ✅ Success
      alert("✅ Address deleted successfully!");
      console.log("✅ Address deleted");

      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteAddressModal")
      );
      if (modal) modal.hide();

      // Reload addresses
      await this.loadAddresses();
    } catch (error) {
      console.error("❌ Error deleting address:", error);

      // ⭐ Handle error cases
      if (
        error.message?.includes("foreign key") ||
        error.message?.includes("ADDRESS_IN_USE")
      ) {
        alert(
          "⚠️ Cannot Delete\n\nThis address is used in your existing orders.\n\nPlease ensure this address is not used in any orders before deleting."
        );
      } else if (
        error.message?.includes("401") ||
        error.message?.includes("unauthorized")
      ) {
        alert("❌ Authentication Error - Please login again");
      } else if (error.message?.includes("404")) {
        alert("❌ Address not found");
      } else {
        alert(`❌ Failed to delete: ${error.message}`);
      }
    }
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * View active sessions
   */
  async viewSessions() {
    try {
      // Show the modal
      const modal = new bootstrap.Modal(
        document.getElementById("sessionsModal")
      );
      modal.show();

      // Load sessions
      await this.loadSessions();
    } catch (error) {
      console.error("Error opening sessions modal:", error);
      this.showError("Failed to load sessions");
    }
  }

  /**
   * Load and display sessions
   */
  async loadSessions() {
    try {
      const sessionsList = document.getElementById("sessionsList");
      if (!sessionsList) return;

      // Get current session info
      const {
        data: { session },
      } = await window.authService.supabase.auth.getSession();
      if (!session) {
        sessionsList.innerHTML =
          '<div class="text-center py-4"><p class="text-muted">No active session found</p></div>';
        return;
      }

      // Create session info (since Supabase doesn't provide multiple sessions via API)
      const currentSession = {
        id: session.access_token.substring(0, 8) + "...",
        device: this.getDeviceInfo(),
        location: "Current Location",
        lastActive: new Date().toLocaleString(),
        isCurrent: true,
      };

      // Display sessions
      sessionsList.innerHTML = `
                <div class="session-item border rounded p-3 mb-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">Current Session</h6>
                            <p class="text-muted mb-1">${currentSession.device}</p>
                            <p class="text-muted mb-1">${currentSession.location}</p>
                            <small class="text-muted">Last active: ${currentSession.lastActive}</small>
                        </div>
                        <div>
                            <span class="badge bg-success">Active</span>
                        </div>
                    </div>
                </div>
                <div class="text-muted text-center py-2">
                    <small>Note: Supabase manages session security automatically. Only one active session is shown.</small>
                </div>
            `;
    } catch (error) {
      console.error("Error loading sessions:", error);
      const sessionsList = document.getElementById("sessionsList");
      if (sessionsList) {
        sessionsList.innerHTML =
          '<div class="text-center py-4"><p class="text-danger">Failed to load sessions</p></div>';
      }
    }
  }

  /**
   * Get device information from user agent
   */
  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Mobile")) {
      return "Mobile Device";
    } else if (userAgent.includes("Tablet")) {
      return "Tablet";
    } else {
      return "Desktop Computer";
    }
  }

  /**
   * Terminate all sessions
   */
  async terminateAllSessions() {
    if (
      confirm(
        "This will log you out of all devices. You will need to log in again. Continue?"
      )
    ) {
      this.showSuccess(
        "All other sessions have been terminated. You are now logged out."
      );
      // In a real implementation, this would call an API to invalidate other sessions
      // For now, we'll just show a message
      setTimeout(() => {
        if (window.authManager && window.authManager.logout) {
          window.authManager.logout();
        }
      }, 2000);
    }
  }

  // ==================== ACCOUNT DELETION ====================

  /**
   * Confirm account deletion
   */
  confirmAccountDeletion() {
    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("deleteAccountModal")
    );

    // Set current email in the display
    const currentEmailDisplay = document.getElementById("currentEmailDisplay");
    if (currentEmailDisplay && this.currentUser) {
      currentEmailDisplay.textContent = this.currentUser.email || "";
    }

    // Clear the input field and error
    const emailInput = document.getElementById("deleteEmailConfirm");
    if (emailInput) {
      emailInput.value = "";
    }

    const errorDiv = document.getElementById("deleteAccountError");
    if (errorDiv) {
      errorDiv.classList.add("d-none");
    }

    modal.show();
  }

  /**
   * Execute account deletion
   */
  async executeAccountDeletion() {
    const emailInput = document.getElementById("deleteEmailConfirm");
    const errorDiv = document.getElementById("deleteAccountError");

    if (!emailInput || !errorDiv) return;

    const enteredEmail = emailInput.value.trim();
    const currentEmail = this.currentUser?.email || "";

    // Clear previous errors
    errorDiv.classList.add("d-none");

    // Validate email match
    if (!enteredEmail) {
      errorDiv.textContent = "Please enter your email address to confirm";
      errorDiv.classList.remove("d-none");
      return;
    }

    if (enteredEmail.toLowerCase() !== currentEmail.toLowerCase()) {
      errorDiv.textContent =
        "Email address does not match. Please enter the correct email.";
      errorDiv.classList.remove("d-none");
      return;
    }

    // Confirm one more time
    if (
      !confirm(
        "This is your final confirmation. Delete your account permanently?"
      )
    ) {
      return;
    }

    try {
      // Show loading state
      const deleteBtn = event.target;
      const originalText = deleteBtn.innerHTML;
      deleteBtn.disabled = true;
      deleteBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

      // Get session token
      const {
        data: { session },
      } = await window.authService.supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in to delete your account");
      }

      // Call backend API to delete account
      const response = await fetch("/api/auth/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Delete the auth user from Supabase
        const { error } =
          await window.authService.supabase.auth.admin.deleteUser(
            this.currentUser.user_id
          );

        if (error) {
          console.warn("Could not delete auth user:", error);
        }

        // Close modal
        bootstrap.Modal.getInstance(
          document.getElementById("deleteAccountModal")
        ).hide();

        // Show success message
        this.showSuccess(
          "Your account has been permanently deleted. You will be logged out shortly."
        );

        // Log out after 2 seconds
        setTimeout(() => {
          if (window.authManager && window.authManager.logout) {
            window.authManager.logout();
          } else {
            window.location.href = "../pages/index.html";
          }
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      errorDiv.textContent = `Error: ${error.message}`;
      errorDiv.classList.remove("d-none");

      // Restore button state
      const deleteBtn = event.target;
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Delete Account';
      }
    }
  }

  // ==================== LOGOUT LOGIC ====================

    /**
     * Perform manual logout
     */
    async performLogout() {
        console.log('Performing manual logout');

        // Show logout success message before clearing data
        this.showLogoutSuccessToast();

    try {
      // Small delay to let user see the message
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Clear all authentication data
      const tokensCleared = this.clearAuthenticationData();

      // Clear any additional session data
      this.clearSessionData();

            // Update UI if AuthManager is available
            if (window.authManager) {
                window.authManager.clearAuthData();
                window.authManager.updateAuthUI();
                window.authManager.emit('logout');
            }

            // Verify logout was successful
            const verification = this.verifyAuthDataCleared();
            const logoutSuccessful = Object.values(verification).every(value => value === true);

            if (logoutSuccessful) {
                console.log('✅ Logout completed successfully');
            } else {
                console.warn('⚠️ Some auth data may still exist after logout:', verification);
            }

            // Redirect to home page
            console.log('Redirecting to index.html after logout');
            window.location.href = 'index.html';

        } catch (error) {
            console.error('❌ Error during logout process:', error);
            this.showError('Logout process failed. Please clear your browser data and refresh the page.');

            // Force redirect after a timeout as fallback
            setTimeout(() => {
                console.log('🔄 Force redirecting after error');
                window.location.href = 'index.html';
            }, 3000);
        }
    }

  /**
   * Clear authentication data
   */
  clearAuthenticationData() {
    const clearedTokens = {
      authToken: !!localStorage.getItem("auth_token"),
      refreshToken: !!localStorage.getItem("refresh_token"),
      supabaseSession: !!localStorage.getItem("supabase.auth.token"),
      supabaseUser: !!localStorage.getItem("supabase.auth.user"),
    };

    // Clear all auth tokens
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");

    // Clear Supabase auth data if present
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("supabase.auth.refreshToken");
    localStorage.removeItem("supabase.auth.user");

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

        // Verify that data was cleared
        const verification = this.verifyAuthDataCleared();

        console.log('Authentication data cleared:', clearedTokens);
        console.log('Verification result:', verification);

        return { clearedTokens, verification };
    }

  /**
   * Verify authentication data was cleared
   */
  verifyAuthDataCleared() {
    const verification = {
      authTokenCleared: !localStorage.getItem("auth_token"),
      refreshTokenCleared: !localStorage.getItem("refresh_token"),
      supabaseSessionCleared: !localStorage.getItem("supabase.auth.token"),
      supabaseUserCleared: !localStorage.getItem("supabase.auth.user"),
      authManagerStateCleared: true, // Will be checked if AuthManager exists
      authManagerUserCleared: true, // Will be checked if AuthManager exists
    };

        // Check if AuthManager state is cleared
        if (window.authManager) {
            verification.authManagerStateCleared = !window.authManager.isAuthenticated();
            verification.authManagerUserCleared = !window.authManager.getCurrentUser();
        }

        const allCleared = Object.values(verification).every(value => value === true);

        if (!allCleared) {
            console.warn('Some authentication data may not have been cleared properly:', verification);
        }

    return verification;
  }

  /**
   * Clear session data
   */
  clearSessionData() {
    // Clear any application-specific session data
    const sessionKeys = [
      "user_preferences",
      "cart_data",
      "last_activity",
      "session_id",
    ];

        sessionKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log('Cleared session data:', key);
            }
        });

        // Clear sessionStorage as well
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
            console.log('SessionStorage cleared');
        }
    }

  // ==================== UI UTILITIES ====================

  /**
   * Show success toast
   */
  showSuccess(message) {
    // Create and show success toast
    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-white bg-success border-0";
    toast.setAttribute("role", "alert");
    toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
      delay: 3000,
      autohide: true,
    });
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener("hidden.bs.toast", () => {
      document.body.removeChild(toast);
    });
  }

  /**
   * Show error toast
   */
  showError(message) {
    // Create and show error toast
    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-white bg-danger border-0";
    toast.setAttribute("role", "alert");
    toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-triangle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
      delay: 5000,
      autohide: true,
    });
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener("hidden.bs.toast", () => {
      document.body.removeChild(toast);
    });
  }

  /**
   * Show logout success toast
   */
  showLogoutSuccessToast() {
    // Create and show logout success toast (positioned to be visible during redirect)
    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-white bg-info border-0";
    toast.setAttribute("role", "alert");
    toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-sign-out-alt me-2"></i>Logging out...
                </div>
            </div>
        `;

    // Position the toast in the center of the screen
    toast.style.position = "fixed";
    toast.style.top = "50%";
    toast.style.left = "50%";
    toast.style.transform = "translate(-50%, -50%)";
    toast.style.zIndex = "9999";
    toast.style.minWidth = "200px";

    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
      delay: 1000,
      autohide: true,
    });
    bsToast.show();

    // Remove toast after it's hidden (or after a timeout)
    const removeToast = () => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    };

    toast.addEventListener("hidden.bs.toast", removeToast);
    // Fallback removal after 2 seconds
    setTimeout(removeToast, 2000);
  }

    /**
     * Refresh personal info data
     */
    refreshPersonalInfo() {
        console.log('🔄 Refreshing personal info data...');
        this.loadUserProfile();
        this.showSuccess('Profile data refreshed successfully!');
    }

    /**
     * Debug profile authentication
     */
    debugProfileAuth() {
        console.log('🔍 Profile Authentication Debug:');
        console.log('Current URL:', window.location.href);
        console.log('AuthManager available:', !!window.authManager);
        if (window.authManager) {
            console.log('Is authenticated:', window.authManager.isAuthenticated());
            console.log('Current user:', window.authManager.getCurrentUser());
            console.log('Auth token:', window.authManager.getAuthToken() ? 'Present' : 'Missing');
        }
        return {
            url: window.location.href,
            authManagerAvailable: !!window.authManager,
            authenticated: window.authManager ? window.authManager.isAuthenticated() : false,
            user: window.authManager ? window.authManager.getCurrentUser() : null
        };
    }
}

// Create a singleton instance for use across the application
const profileManager = new ProfileManager();

// Export for global use
window.ProfileManager = ProfileManager;
window.profileManager = profileManager;

export default ProfileManager;
export { profileManager };
