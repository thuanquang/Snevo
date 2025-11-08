/**
 * NavbarManager - Unified navbar management with override support
 * Handles navbar rendering, state updates, and page-specific customizations
 */

class NavbarManager {
  constructor(options = {}) {
    this.options = {
      autoInit: true,
      templatePath: "../components/navbar.html",
      ...options,
    };

    this.template = null;
    this.isInitialized = false;
    this.currentPage = null;
    this.overrides = {};
    this.listeners = new Map();
    this.isSearchExpanded = false;
    this.searchTimeout = null;

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handleDocumentReady = this.handleDocumentReady.bind(this);

    if (this.options.autoInit) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", this.handleDocumentReady);
      } else {
        this.handleDocumentReady();
      }
    }
  }

  /**
   * Handle document ready
   */
  handleDocumentReady() {
    this.initialize();
  }

  /**
   * Initialize the navbar manager
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load navbar template
      await this.loadTemplate();

      // Detect current page
      this.detectCurrentPage();

      // Load page overrides
      this.loadOverrides();

      // Render navbar
      this.renderNavbar();

      // Bind events
      this.bindEvents();

      // Apply overrides
      this.applyOverrides();

      this.isInitialized = true;
      this.emit("initialized");
    } catch (error) {
      console.error("❌ Failed to initialize NavbarManager:", error);
      this.emit("initializationError", error);
      throw error;
    }
  }

  /**
   * Load navbar template
   */
  async loadTemplate() {
    // Skip template loading for now and create navbar directly
    this.template = null;
  }

  /**
   * Detect current page from navbar root element
   */
  detectCurrentPage() {
    const navbarRoot = document.getElementById("navbarRoot");
    if (navbarRoot) {
      this.currentPage =
        navbarRoot.getAttribute("data-navbar-page") || this.getPageFromPath();
    } else {
      this.currentPage = this.getPageFromPath();
    }
  }

  /**
   * Get page name from current path
   */
  getPageFromPath() {
    const path = window.location.pathname;
    if (
      path.includes("index.html") ||
      path.endsWith("/") ||
      path.endsWith("/index.html")
    ) {
      return "home";
    } else if (path.includes("products.html")) {
      return "products";
    } else if (path.includes("categories.html")) {
      return "categories";
    } else if (path.includes("about.html")) {
      return "about";
    } else if (path.includes("cart.html")) {
      return "cart";
    } else if (path.includes("checkout.html")) {
      return "checkout";
    } else if (path.includes("profile.html")) {
      return "profile";
    } else if (path.includes("orders.html")) {
      return "orders";
    } else if (path.includes("admin.html")) {
      return "admin";
    }
    return "home";
  }

  /**
   * Load page overrides
   */
  loadOverrides() {
    // Load from window.NAVBAR_OVERRIDES
    if (window.NAVBAR_OVERRIDES) {
      this.overrides = { ...this.overrides, ...window.NAVBAR_OVERRIDES };
    }

    // Load from data attributes
    const navbarRoot = document.getElementById("navbarRoot");
    if (navbarRoot) {
      const dataAttrs = Array.from(navbarRoot.attributes)
        .filter((attr) => attr.name.startsWith("data-navbar-"))
        .reduce((acc, attr) => {
          const key = attr.name.replace("data-navbar-", "");
          acc[key] = attr.value;
          return acc;
        }, {});
      this.overrides = { ...this.overrides, ...dataAttrs };
    }
  }

  /**
   * Render navbar into the page
   */
  renderNavbar() {
    const navbarRoot = document.getElementById("navbarRoot");
    if (!navbarRoot) {
      console.error("❌ navbarRoot element not found");
      return;
    }

    // If no template, create navbar directly
    if (!this.template) {
      this.createNavbarDirectly();
      return;
    }

    // Create temporary container to parse HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = this.template;

    // Get navbar and search overlay
    const navbar = tempDiv.querySelector("#unifiedNavbar");
    const searchOverlay = tempDiv.querySelector("#searchOverlay");

    if (navbar) {
      navbarRoot.appendChild(navbar);
    } else {
      console.error(
        "❌ No navbar element found in template, creating directly"
      );
      this.createNavbarDirectly();
    }

    if (searchOverlay) {
      // Append search overlay to body
      document.body.appendChild(searchOverlay);
    }

    // Update paths
    this.updatePaths();
  }

  /**
   * Initialize scroll behavior for navbar
   * Hides navbar on scroll down, shows on scroll up
   */
  initScrollBehavior() {
    let lastScrollTop = 0;
    let ticking = false;
    const scrollThreshold = 50; // Reduce threshold for more responsiveness
    const navbarRoot = document.getElementById("navbarRoot");

    if (!navbarRoot) {
      console.warn("⚠️ NavbarRoot not found for scroll behavior");
      return;
    }

    // Ensure navbar has initial style
    navbarRoot.style.position = "fixed";
    navbarRoot.style.top = "0";
    navbarRoot.style.left = "0";
    navbarRoot.style.right = "0";
    navbarRoot.style.zIndex = "1000";
    navbarRoot.style.transform = "translateY(0)";
    navbarRoot.style.transition = "transform 0.3s ease-in-out";

    const updateNavbar = () => {
      const currentScroll =
        window.pageYOffset || document.documentElement.scrollTop;

      // Always show navbar at top of page
      if (currentScroll <= scrollThreshold) {
        navbarRoot.style.transform = "translateY(0)";
        lastScrollTop = currentScroll;
        ticking = false;
        return;
      }

      // Calculate delta to check scroll direction
      const scrollDelta = currentScroll - lastScrollTop;

      // Scroll down (delta > 5 to avoid small scrolls)
      if (scrollDelta > 5 && currentScroll > scrollThreshold) {
        navbarRoot.style.transform = "translateY(-100%)";
      }
      // Scroll up (delta < -5)
      else if (scrollDelta < -5) {
        navbarRoot.style.transform = "translateY(0)";
      }

      lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
      ticking = false;
    };

    // Use requestAnimationFrame to optimize performance
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateNavbar);
          ticking = true;
        }
      },
      { passive: true }
    );

    // Add event listener for touchmove on mobile
    let touchStartY = 0;
    let touchEndY = 0;

    document.addEventListener(
      "touchstart",
      (e) => {
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    document.addEventListener(
      "touchmove",
      (e) => {
        touchEndY = e.touches[0].clientY;
      },
      { passive: true }
    );
  }
  /**
   * ✅ Close user dropdown when scrolling down
   */
  initDropdownScrollBehavior() {
      let lastScrollTop = 0;
      const scrollThreshold = 5; // Sensitivity
      
      window.addEventListener('scroll', () => {
          const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
          const scrollDelta = currentScroll - lastScrollTop;
          
          // Only close dropdown when scrolling DOWN
          if (scrollDelta > scrollThreshold) {
              // Find dropdown element
              const userDropdown = document.getElementById('userDropdown');
              if (userDropdown) {
                  // Get Bootstrap dropdown instance
                  const dropdownInstance = bootstrap.Dropdown.getInstance(userDropdown);
                  
                  // If dropdown is open, close it
                  if (dropdownInstance && dropdownInstance._isShown()) {
                      dropdownInstance.hide();
                  }
              }
          }
          
          // Scroll UP: Do nothing (don't auto-open dropdown)
          
          lastScrollTop = currentScroll;
      }, { passive: true });
  }


  /**
   * Setup scroll behavior for navbar
   */
  setupScrollBehavior() {
    const navbarRoot = document.getElementById("navbarRoot");
    if (!navbarRoot) {
      console.warn("⚠️ navbarRoot not found for scroll behavior");
      return;
    }

    // Set initial state (transparent)
    navbarRoot.classList.add("navbar-transparent");

    // Scroll handler
    let lastScrollTop = 0;
    const scrollThreshold = 50;

    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > scrollThreshold) {
        // Scrolled down - show white navbar
        navbarRoot.classList.remove("navbar-transparent");
        navbarRoot.classList.add("navbar-scrolled");
      } else {
        // At top - show transparent navbar
        navbarRoot.classList.remove("navbar-scrolled");
        navbarRoot.classList.add("navbar-transparent");
      }

      lastScrollTop = scrollTop;
    };

    // Throttle scroll event for performance
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Initial check
    handleScroll();
  }

  /**
   * Bind new search bar events (with .input and .close classes)
   */
  bindNewSearchEvents() {
    const searchInput = document.getElementById("navbarSearchInput");
    const closeBtn = document.getElementById("navbarSearchClose");
    const searchNavItem = document.getElementById("searchNavItem");

    if (!searchInput || !closeBtn) {
      console.warn("⚠️ New search elements not found");
      return;
    }

    // Handle input focus - expand search
    searchInput.addEventListener("focus", () => {
      searchNavItem?.classList.add("active");
    });

    // Handle input blur - collapse if empty
    searchInput.addEventListener("blur", () => {
      if (!searchInput.value.trim()) {
        searchNavItem?.classList.remove("active");
      }
    });

    // Handle Enter key - perform search
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.performNavbarSearch();
      }
    });

    // Handle close button click
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.clearNavbarSearch();
      searchNavItem?.classList.remove("active");
    });

    // Auto-populate search from URL if on products page
    this.populateSearchFromURL();
  }

  /**
   * Populate search input from URL parameters
   */
  populateSearchFromURL() {
    const searchInput = document.getElementById("navbarSearchInput");
    if (!searchInput) return;

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("search");

    if (searchQuery && this.currentPage === "products") {
      searchInput.value = searchQuery;
      document.getElementById("searchNavItem")?.classList.add("active");
    }
  }

  /**
   * Perform navbar search - Navigate to products page with search query
   */
  performNavbarSearch() {
    const searchInput = document.getElementById("navbarSearchInput");
    const query = searchInput?.value.trim();

    if (!query) {
      console.warn("⚠️ Empty search query");
      return;
    }

    // Build search URL
    const searchUrl = this.buildSearchURL(query);

    // Check if already on products page
    if (this.currentPage === "products" && window.productManager) {
      this.updateProductsPageSearch(query);
    } else {
      window.location.href = searchUrl;
    }
  }

  /**
   * Build search URL for products page
   */
  buildSearchURL(query) {
    const encodedQuery = encodeURIComponent(query);
    const productsPath = this.getRelativePath("products.html");
    return `${productsPath}?search=${encodedQuery}`;
  }

  /**
   * Update products page with new search (if already on products page)
   */
  updateProductsPageSearch(query) {
    if (!window.productManager) {
      console.error("❌ ProductManager not available");
      return;
    }

    try {
      // Update ProductManager search filter
      window.productManager.currentFilters.search = query;
      window.productManager.currentPage = 1;

      // Update page URL without reload
      const newUrl = this.buildSearchURL(query);
      window.history.pushState({}, "", newUrl);

      // Trigger product reload
      window.productManager.loadProducts();
    } catch (error) {
      console.error("❌ Error updating products search:", error);
      // Fallback: reload page with new search
      window.location.href = this.buildSearchURL(query);
    }
  }

  /**
   * Clear navbar search
   */
  clearNavbarSearch() {
    const searchInput = document.getElementById("navbarSearchInput");
    if (searchInput) {
      searchInput.value = "";
      searchInput.blur();
    }
  }

  /**
   * Create navbar directly in DOM
   */
  createNavbarDirectly() {
    const navbarRoot = document.getElementById("navbarRoot");

    const navbarHTML = `
            <nav class="navbar navbar-expand-lg navbar-light bg-transparent fixed-top " id="unifiedNavbar" style="margin: 0;">
                <div class="container">
                    <a class="navbar-brand" href="#" data-navbar-brand>
                        <img src="../assets/images/ui/logo.svg" alt="SNEVO" height="50">
                    </a>                    
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav mx-auto" style="gap: 80px;">
                            <li class="nav-item">
                                <a class="nav-link" href="#" data-navbar-link="home">Trang chủ</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#" data-navbar-link="products">Mua sắm</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#" data-navbar-link="about">
                                    Giới thiệu
                                </a>
                            </li>
                        </ul>
                        
                        <ul class="navbar-nav " style="gap: 30px;">    
                            <li class="nav-item" id="searchNavItem">
                                <header class="search-header">
                                    <input type="text" 
                                          class="input" 
                                          id="navbarSearchInput"
                                          placeholder="Search products..."
                                          autocomplete="off"
                                          aria-label="Search products"/>    
                                    <div class="close" id="navbarSearchClose">
                                        <span class="front"></span>
                                        <span class="back"></span>
                                    </div> 
                                </header>
                            </li>
                            <li class="nav-item" id="cartNavItem">
                                <a class="nav-link position-relative" href="#" data-navbar-link="cart">
                                    <img src="../assets/images/ui/cart.svg" alt="Cart" height="23" width="23">
                                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-white text-black" id="cartCount">
                                        0
                                    </span>
                                </a>
                            </li>
                            <li class="nav-item" style=" border-radius: 32px;">
                                <ul class="navbar-nav" id="authButtons">
                                    <li class="nav-item">
                                        <a class="nav-link px-4 fw-medium" style="color: black !important;" href="#" id="globalLoginLink">Đăng nhập</a>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav> 
        `;

    navbarRoot.innerHTML = navbarHTML;

    // Bind new search events
    this.bindNewSearchEvents();

    // Update paths
    this.updatePaths();

    // Initialize scroll behavior
    this.initScrollBehavior();

    this.initDropdownScrollBehavior();

    this.setupScrollBehavior();

    // Update paths
    this.updatePaths();
  }
  /**
   * Update all navigation paths based on current page location
   */
  updatePaths() {
    const navbar = document.getElementById("unifiedNavbar");
    if (!navbar) return;

    // Update brand link
    const brandLink = navbar.querySelector("[data-navbar-brand]");
    if (brandLink) {
      brandLink.href = this.getRelativePath("index.html");
    }

    // Update navigation links
    const navLinks = navbar.querySelectorAll("[data-navbar-link]");
    navLinks.forEach((link) => {
      const linkType = link.getAttribute("data-navbar-link");
      // Skip login link - it should open modal, not navigate
      if (linkType === "login") {
        return;
      }
      const href = this.getPathForLink(linkType);
      if (href) {
        link.href = href;
      }
    });

    // Set active state
    this.setActiveState();
  }

  /**
   * Get relative path for a target page
   */
  getRelativePath(targetPage) {
    const currentPath = window.location.pathname;

    // If we're in a subdirectory (pages/), need to go up one level
    if (currentPath.includes("/pages/") || currentPath.includes("pages/")) {
      return `../pages/${targetPage}`;
    } else {
      return targetPage;
    }
  }

  /**
   * Get path for specific link types
   */
  getPathForLink(linkType) {
    const pathMap = {
      home: "index.html",
      products: "products.html",
      about: "about.html",
      cart: "cart.html",
      profile: "profile.html",
      orders: "orders.html",
    };

    const targetPage = pathMap[linkType];
    return targetPage ? this.getRelativePath(targetPage) : null;
  }

  /**
   * Set active navigation state
   */
  setActiveState() {
    const navbar = document.getElementById("unifiedNavbar");
    if (!navbar) return;

    // Remove all active classes
    navbar.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    // Set active based on current page or override
    const activePage = this.overrides.active || this.currentPage;
    const activeLink = navbar.querySelector(
      `[data-navbar-link="${activePage}"]`
    );
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Search functionality
    this.bindSearchEvents();

    // Mobile menu toggle
    this.bindMobileMenuEvents();

    // Cart events
    this.bindCartEvents();

    // Login events
    this.bindLoginEvents();
  }

  /**
   * Bind search events
   */
  bindSearchEvents() {
    const searchToggle = document.getElementById("searchToggle");
    const searchOverlay = document.getElementById("searchOverlay");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");

    if (searchToggle) {
      searchToggle.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleSearch();
      });
    }

    if (searchOverlay) {
      searchOverlay.addEventListener("click", (e) => {
        if (e.target === searchOverlay) {
          this.toggleSearch();
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.performSearch();
        }
      });
    }

    if (searchButton) {
      searchButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.performSearch();
      });
    }
  }

  /**
   * Bind mobile menu events
   */
  bindMobileMenuEvents() {
    const navbarToggler = document.querySelector(".navbar-toggler");
    if (navbarToggler) {
      navbarToggler.addEventListener("click", () => {
        this.toggleMobileMenu();
      });
    }
  }

  /**
   * Bind cart events
   */
  bindCartEvents() {
    const cartLink = document.querySelector('[data-navbar-link="cart"]');
    if (cartLink) {
      cartLink.addEventListener("click", (e) => {
        // Let default navigation work, but we can add custom logic here
      });
    }
  }

  /**
   * Bind login events
   */
  bindLoginEvents() {
    const loginLink = document.getElementById("globalLoginLink");
    if (loginLink) {
      loginLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.showLoginModal) {
          window.showLoginModal();
        } else {
          console.warn(
            "showLoginModal not available, falling back to direct Google auth"
          );
          // Fallback to direct Google auth if modal not available
          if (window.authManager) {
            window.authManager.loginWithGoogle();
          }
        }
      });
    }
  }

  /**
   * Toggle search overlay
   */
  toggleSearch() {
    const searchOverlay = document.getElementById("searchOverlay");
    const searchInput = document.getElementById("searchInput");

    if (searchOverlay) {
      searchOverlay.classList.toggle("d-none");

      if (!searchOverlay.classList.contains("d-none")) {
        setTimeout(() => {
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    }
  }

  /**
   * Perform search
   */
  performSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput && searchInput.value.trim()) {
      const query = searchInput.value.trim();
      const searchUrl = this.getRelativePath(
        `products.html?search=${encodeURIComponent(query)}`
      );
      window.location.href = searchUrl;
    }
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    const navbarCollapse = document.getElementById("navbarNav");
    if (navbarCollapse) {
      navbarCollapse.classList.toggle("show");
    }
  }

  /**
   * Apply page-specific overrides
   */
  applyOverrides() {
    const navbar = document.getElementById("unifiedNavbar");
    if (!navbar) return;

    // Hide cart if override specifies
    if (this.overrides.hideCart) {
      const cartNavItem = document.getElementById("cartNavItem");
      if (cartNavItem) {
        cartNavItem.style.display = "none";
      }
    }

    // Hide auth buttons if override specifies
    if (this.overrides.hideAuth) {
      const authButtons = document.getElementById("authButtons");
      if (authButtons) {
        authButtons.style.display = "none";
      }
    }

    // Add custom classes
    if (this.overrides.class) {
      navbar.classList.add(this.overrides.class);
    }

    // Add custom actions
    if (this.overrides.customActions) {
      this.addCustomActions(this.overrides.customActions);
    }
  }

  /**
   * Add custom actions to navbar
   */
  addCustomActions(actions) {
    const navbar = document.getElementById("unifiedNavbar");
    if (!navbar) return;

    const navContainer = navbar.querySelector(".navbar-nav:last-child");
    if (!navContainer) return;

    actions.forEach((action) => {
      const actionElement = this.createCustomAction(action);
      if (actionElement) {
        navContainer.appendChild(actionElement);
      }
    });
  }

  /**
   * Create custom action element
   */
  createCustomAction(action) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const a = document.createElement("a");
    a.className = "nav-link";
    a.href = "#";

    switch (action) {
      case "admin-dashboard":
        a.innerHTML = '<i class="fas fa-tachometer-alt"></i> Admin';
        a.href = this.getRelativePath("admin.html");
        break;
      case "logout":
        a.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        a.addEventListener("click", async (e) => {
          e.preventDefault();

          // Disable the button and show loading state
          a.disabled = true;
          a.innerHTML =
            '<i class="fas fa-spinner fa-spin me-2"></i>Logging out...';

          try {
            if (window.authManager) {
              await window.authManager.logout();
            } else {
              // Fallback logout process
              await this.performNavbarLogout();
            }
          } catch (error) {
            console.error("Navbar logout error:", error);

            // If AuthManager logout failed, try fallback
            if (window.authManager) {
              try {
                await this.performNavbarLogout();
              } catch (fallbackError) {
                console.error(
                  "Fallback navbar logout also failed:",
                  fallbackError
                );
                this.showNavbarError(
                  "Logout failed. Please clear your browser data and refresh the page."
                );
                // Reset button state
                a.disabled = false;
                a.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
              }
            } else {
              this.showNavbarError(
                "Logout failed. Please try again or refresh the page."
              );
              // Reset button state
              a.disabled = false;
              a.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            }
          }
        });
        break;
      default:
        return null;
    }

    li.appendChild(a);
    return li;
  }

  /**
   * Perform navbar logout fallback
   */
  async performNavbarLogout() {
    // Show logout success message before clearing data
    this.showNavbarLogoutSuccessToast();

    try {
      // Small delay to let user see the message
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Clear all authentication data
      this.clearNavbarAuthenticationData();

      // Clear any additional session data
      this.clearNavbarSessionData();

      // Update UI if AuthManager is available
      if (window.authManager) {
        window.authManager.clearAuthData();
        window.authManager.updateAuthUI();
        window.authManager.emit("logout");
      }

      // Redirect to home page
      window.location.href = this.getRelativePath("index.html");
    } catch (error) {
      console.error("❌ Error during navbar logout process:", error);
      this.showNavbarError(
        "Logout process failed. Please clear your browser data and refresh the page."
      );

      // Force redirect after a timeout as fallback
      setTimeout(() => {
        window.location.href = this.getRelativePath("index.html");
      }, 3000);
    }
  }

  /**
   * Clear navbar authentication data
   */
  clearNavbarAuthenticationData() {
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
  }

  /**
   * Clear navbar session data
   */
  clearNavbarSessionData() {
    // Clear any application-specific session data
    const sessionKeys = [
      "user_preferences",
      "cart_data",
      "last_activity",
      "session_id",
    ];

    sessionKeys.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage as well
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
  }

  /**
   * Show navbar logout success toast
   */
  showNavbarLogoutSuccessToast() {
    // Create and show logout success toast
    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-black bg-info border-0";
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

    // Remove toast after it's hidden
    const removeToast = () => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    };

    toast.addEventListener("hidden.bs.toast", removeToast);
    setTimeout(removeToast, 2000);
  }

  /**
   * Show navbar error message
   */
  showNavbarError(message) {
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
   * Update authentication state
   */
  updateAuthState(user, isAuthenticated) {
    // This will be handled by AuthManager.updateAuthUI()
    // which targets the #authButtons element
  }

  /**
   * Update cart count
   */
  updateCartCount(count) {
    const cartCount = document.getElementById("cartCount");
    if (cartCount) {
      cartCount.textContent = count;
      cartCount.style.display = count > 0 ? "block" : "none";
    }
  }

  /**
   * Update categories dropdown
   */
  updateCategories(categories) {
    const categoriesDropdown = document.getElementById("categoriesDropdown");
    if (categoriesDropdown && categories) {
      const dropdownHTML = categories
        .map(
          (category) => `
                <li><a class="dropdown-item" href="${this.getRelativePath(
                  `products.html?category=${category.category_id}`
                )}">
                    ${category.category_name}
                </a></li>
            `
        )
        .join("");
      categoriesDropdown.innerHTML = dropdownHTML;
    }
  }

  /**
   * Force refresh navbar
   */
  refresh() {
    if (this.isInitialized) {
      this.detectCurrentPage();
      this.loadOverrides();
      this.updatePaths();
      this.applyOverrides();
    }
  }

  /**
   * Event management
   */
  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(handler);
  }

  off(eventName, handler) {
    if (!this.listeners.has(eventName)) return;

    const handlers = this.listeners.get(eventName);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(eventName, data = null) {
    if (!this.listeners.has(eventName)) return;

    const handlers = this.listeners.get(eventName);
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in navbar event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Debug information
   */
  debug() {
    return {
      isInitialized: this.isInitialized,
      currentPage: this.currentPage,
      overrides: this.overrides,
      template: !!this.template,
      navbar: !!document.getElementById("unifiedNavbar"),
    };
  }
}

// Create global instance
const navbarManager = new NavbarManager();

// Export for global use
window.NavbarManager = NavbarManager;
window.navbarManager = navbarManager;

// Manual initialization trigger (for debugging)
window.initNavbar = () => {
  if (navbarManager.isInitialized) {
    return;
  }
  navbarManager.initialize();
};

// Export for module imports
export default NavbarManager;
export { navbarManager };


