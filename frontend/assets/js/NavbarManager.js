/**
 * NavbarManager - Unified navbar management with override support
 * Handles navbar rendering, state updates, and page-specific customizations
 */

class NavbarManager {
    constructor(options = {}) {
        this.options = {
            autoInit: true,
            templatePath: '../components/navbar.html',
            ...options
        };
        
        // Debug path
        console.log('🔧 NavbarManager options:', this.options);
        
        this.template = null;
        this.isInitialized = false;
        this.currentPage = null;
        this.overrides = {};
        this.listeners = new Map();
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.handleDocumentReady = this.handleDocumentReady.bind(this);
        
        if (this.options.autoInit) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', this.handleDocumentReady);
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
            console.log('⚠️ NavbarManager already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing NavbarManager...');
            console.log('🔍 NavbarRoot element exists:', !!document.getElementById('navbarRoot'));
            
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
            this.emit('initialized');
            
            console.log('✅ NavbarManager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize NavbarManager:', error);
            this.emit('initializationError', error);
            throw error;
        }
    }

    /**
     * Load navbar template
     */
    async loadTemplate() {
        console.log('🔄 Skipping template loading, will create navbar directly');
        // Skip template loading for now and create navbar directly
        this.template = null;
    }

    /**
     * Create fallback navbar template
     */
    createFallbackTemplate() {
        return `
            <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm" id="unifiedNavbar" style="margin: 0; padding-left: 30px; padding-right: 30px;">
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
                                <a class="nav-link" href="#" data-navbar-link="home">Home</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#" data-navbar-link="products">Products</a>
                            </li>
                            <li class="nav-item dropdown">
                                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                    Categories
                                </a>
                                <ul class="dropdown-menu" id="categoriesDropdown">
                                    <!-- Categories will be loaded dynamically -->
                                </ul>
                            </li>
                        </ul>
                        
                        <ul class="navbar-nav">
                            <li class="nav-item">
                                <a class="nav-link" href="#" id="searchToggle">
                                    <i class="fas fa-search"></i>
                                </a>
                            </li>
                            <li class="nav-item" id="cartNavItem">
                                <a class="nav-link position-relative" href="#" data-navbar-link="cart">
                                    <i class="fas fa-shopping-cart"></i>
                                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="cartCount">
                                        0
                                    </span>
                                </a>
                            </li>
                            <ul class="navbar-nav" id="authButtons">
                                <li class="nav-item">
                                    <a class="nav-link" href="#" id="globalLoginLink">Login</a>
                                </li>
                            </ul>
                        </ul>
                    </div>
                </div>
            </nav>

            <!-- Search Overlay -->
            <div class="search-overlay d-none" id="searchOverlay">
                <div class="container">
                    <div class="row justify-content-center">
                        <div class="col-md-8">
                            <div class="search-box">
                                <input type="text" class="form-control form-control-lg" placeholder="Search for shoes..." id="searchInput">
                                <button class="btn btn-dark" id="searchButton">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Detect current page from navbar root element
     */
    detectCurrentPage() {
        const navbarRoot = document.getElementById('navbarRoot');
        if (navbarRoot) {
            this.currentPage = navbarRoot.getAttribute('data-navbar-page') || this.getPageFromPath();
        } else {
            this.currentPage = this.getPageFromPath();
        }
        console.log('📍 Current page detected:', this.currentPage);
    }

    /**
     * Get page name from current path
     */
    getPageFromPath() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path.endsWith('/') || path.endsWith('/index.html')) {
            return 'home';
        } else if (path.includes('products.html')) {
            return 'products';
        } else if (path.includes('categories.html')) {
            return 'categories';
        } else if (path.includes('cart.html')) {
            return 'cart';
        } else if (path.includes('checkout.html')) {
            return 'checkout';
        } else if (path.includes('profile.html')) {
            return 'profile';
        } else if (path.includes('orders.html')) {
            return 'orders';
        } else if (path.includes('admin.html')) {
            return 'admin';
        } else if (path.includes('login.html')) {
            return 'login';
        }
        return 'home';
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
        const navbarRoot = document.getElementById('navbarRoot');
        if (navbarRoot) {
            const dataAttrs = Array.from(navbarRoot.attributes)
                .filter(attr => attr.name.startsWith('data-navbar-'))
                .reduce((acc, attr) => {
                    const key = attr.name.replace('data-navbar-', '');
                    acc[key] = attr.value;
                    return acc;
                }, {});
            this.overrides = { ...this.overrides, ...dataAttrs };
        }
        
        console.log('🔧 Navbar overrides loaded:', this.overrides);
    }

    /**
     * Render navbar into the page
     */
    renderNavbar() {
        console.log('🔄 Rendering navbar...');
        const navbarRoot = document.getElementById('navbarRoot');
        if (!navbarRoot) {
            console.error('❌ navbarRoot element not found');
            return;
        }

        console.log('✅ navbarRoot found:', navbarRoot);
        console.log('📄 Template length:', this.template ? this.template.length : 'No template');

        // If no template, create navbar directly
        if (!this.template) {
            console.log('🔄 No template available, creating navbar directly');
            this.createNavbarDirectly();
            return;
        }

        // Create temporary container to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.template;
        
        // Get navbar and search overlay
        const navbar = tempDiv.querySelector('#unifiedNavbar');
        const searchOverlay = tempDiv.querySelector('#searchOverlay');
        
        console.log('🔍 Navbar element found:', !!navbar);
        console.log('🔍 Search overlay found:', !!searchOverlay);
        
        if (navbar) {
            navbarRoot.appendChild(navbar);
            console.log('✅ Navbar appended to navbarRoot');
        } else {
            console.error('❌ No navbar element found in template, creating directly');
            this.createNavbarDirectly();
        }
        
        if (searchOverlay) {
            // Append search overlay to body
            document.body.appendChild(searchOverlay);
            console.log('✅ Search overlay appended to body');
        }
        
        // Update paths
        this.updatePaths();
        
        console.log('✅ Navbar rendered successfully');
    }

    /**
 * Initialize scroll behavior for navbar
 * Hides navbar on scroll down, shows on scroll up
 */
initScrollBehavior() {
    let lastScrollTop = 0;
    let ticking = false;
    const scrollThreshold = 50; // Giảm threshold để nhạy hơn
    const navbarRoot = document.getElementById('navbarRoot');
    
    if (!navbarRoot) {
        console.warn('⚠️ NavbarRoot not found for scroll behavior');
        return;
    }
    
    console.log('✅ Navbar scroll behavior initialized');
    
    // Đảm bảo navbar có style ban đầu
    navbarRoot.style.position = 'fixed';
    navbarRoot.style.top = '0';
    navbarRoot.style.left = '0';
    navbarRoot.style.right = '0';
    navbarRoot.style.zIndex = '1000';
    navbarRoot.style.transform = 'translateY(0)';
    navbarRoot.style.transition = 'transform 0.3s ease-in-out';
    
    const updateNavbar = () => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        // Luôn hiện navbar ở đầu trang
        if (currentScroll <= scrollThreshold) {
            navbarRoot.style.transform = 'translateY(0)';
            lastScrollTop = currentScroll;
            ticking = false;
            return;
        }
        
        // Tính delta để kiểm tra hướng scroll
        const scrollDelta = currentScroll - lastScrollTop;
        
        // Scroll xuống (delta > 5 để tránh scroll nhỏ)
        if (scrollDelta > 5 && currentScroll > scrollThreshold) {
            navbarRoot.style.transform = 'translateY(-100%)';
            console.log('📉 Hiding navbar');
        } 
        // Scroll lên (delta < -5)
        else if (scrollDelta < -5) {
            navbarRoot.style.transform = 'translateY(0)';
            console.log('📈 Showing navbar');
        }
        
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
        ticking = false;
    };
    
    // Sử dụng requestAnimationFrame để tối ưu performance
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }, { passive: true });
    
    // Thêm event listener cho touchmove trên mobile
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        touchEndY = e.touches[0].clientY;
    }, { passive: true });
};

    /**
     * Create navbar directly in DOM
     */
    createNavbarDirectly() {
        console.log('🔄 Creating navbar directly...');
        const navbarRoot = document.getElementById('navbarRoot');
        
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
                                <a class="nav-link" href="#" data-navbar-link="home">Home</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#" data-navbar-link="products">Products</a>
                            </li>
                            <li class="nav-item dropdown">
                                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                    Categories
                                </a>
                                <ul class="dropdown-menu" id="categoriesDropdown">
                                    <!-- Categories will be loaded dynamically -->
                                </ul>
                            </li>
                        </ul>
                        
                        <ul class="navbar-nav" style="gap: 30px;">
                            <li class="nav-item">
                                <a class="nav-link" href="#" id="searchToggle">
                                    <i class="fas fa-search"></i>
                                </a>
                            </li>
                            <li class="nav-item" id="cartNavItem">
                                <a class="nav-link position-relative" href="#" data-navbar-link="cart">
                                    <i class="fas fa-shopping-cart"></i>
                                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="cartCount">
                                        0
                                    </span>
                                </a>
                            </li>
                            <li class="nav-item" style=" border-radius: 32px;">
                                <ul class="navbar-nav" id="authButtons">
                                    <li class="nav-item">
                                        <a class="nav-link px-4 fw-medium" style="color: white !important;" href="#" id="globalLoginLink">Login</a>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        `;
        
        navbarRoot.innerHTML = navbarHTML;
        console.log('✅ Navbar created directly');
        
        // Update paths
        this.updatePaths();

        // Initialize scroll behavior
        this.initScrollBehavior();

        // Update paths
        this.updatePaths();
    }

    /**
     * Update all navigation paths based on current page location
     */
    updatePaths() {
        const navbar = document.getElementById('unifiedNavbar');
        if (!navbar) return;

        // Update brand link
        const brandLink = navbar.querySelector('[data-navbar-brand]');
        if (brandLink) {
            brandLink.href = this.getRelativePath('index.html');
        }

        // Update navigation links
        const navLinks = navbar.querySelectorAll('[data-navbar-link]');
        navLinks.forEach(link => {
            const linkType = link.getAttribute('data-navbar-link');
            // Skip login link - it should open modal, not navigate
            if (linkType === 'login') {
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
        if (currentPath.includes('/pages/') || currentPath.includes('pages/')) {
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
            'home': 'index.html',
            'products': 'products.html',
            'categories': 'categories.html',
            'cart': 'cart.html',
            'profile': 'profile.html',
            'orders': 'orders.html',
            'login': 'login.html'
        };
        
        const targetPage = pathMap[linkType];
        return targetPage ? this.getRelativePath(targetPage) : null;
    }

    /**
     * Set active navigation state
     */
    setActiveState() {
        const navbar = document.getElementById('unifiedNavbar');
        if (!navbar) return;

        // Remove all active classes
        navbar.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Set active based on current page or override
        const activePage = this.overrides.active || this.currentPage;
        const activeLink = navbar.querySelector(`[data-navbar-link="${activePage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
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
        const searchToggle = document.getElementById('searchToggle');
        const searchOverlay = document.getElementById('searchOverlay');
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (searchToggle) {
            searchToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSearch();
            });
        }
        
        if (searchOverlay) {
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    this.toggleSearch();
                }
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }
    }

    /**
     * Bind mobile menu events
     */
    bindMobileMenuEvents() {
        const navbarToggler = document.querySelector('.navbar-toggler');
        if (navbarToggler) {
            navbarToggler.addEventListener('click', () => {
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
            cartLink.addEventListener('click', (e) => {
                // Let default navigation work, but we can add custom logic here
                console.log('Cart link clicked');
            });
        }
    }

    /**
     * Bind login events
     */
    bindLoginEvents() {
        const loginLink = document.getElementById('globalLoginLink');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Login link clicked, opening modal...');
                if (window.showLoginModal) {
                    window.showLoginModal();
                } else {
                    console.warn('showLoginModal not available, falling back to direct Google auth');
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
        const searchOverlay = document.getElementById('searchOverlay');
        const searchInput = document.getElementById('searchInput');
        
        if (searchOverlay) {
            searchOverlay.classList.toggle('d-none');
            
            if (!searchOverlay.classList.contains('d-none')) {
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
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            const query = searchInput.value.trim();
            const searchUrl = this.getRelativePath(`products.html?search=${encodeURIComponent(query)}`);
            window.location.href = searchUrl;
        }
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse) {
            navbarCollapse.classList.toggle('show');
        }
    }

    /**
     * Apply page-specific overrides
     */
    applyOverrides() {
        const navbar = document.getElementById('unifiedNavbar');
        if (!navbar) return;

        // Hide cart if override specifies
        if (this.overrides.hideCart) {
            const cartNavItem = document.getElementById('cartNavItem');
            if (cartNavItem) {
                cartNavItem.style.display = 'none';
            }
        }

        // Hide auth buttons if override specifies
        if (this.overrides.hideAuth) {
            const authButtons = document.getElementById('authButtons');
            if (authButtons) {
                authButtons.style.display = 'none';
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

        console.log('✅ Navbar overrides applied');
    }

    /**
     * Add custom actions to navbar
     */
    addCustomActions(actions) {
        const navbar = document.getElementById('unifiedNavbar');
        if (!navbar) return;

        const navContainer = navbar.querySelector('.navbar-nav:last-child');
        if (!navContainer) return;

        actions.forEach(action => {
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
        const li = document.createElement('li');
        li.className = 'nav-item';
        
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.href = '#';
        
        switch (action) {
            case 'admin-dashboard':
                a.innerHTML = '<i class="fas fa-tachometer-alt"></i> Admin';
                a.href = this.getRelativePath('admin.html');
                break;
            case 'logout':
                a.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.authManager) {
                        window.authManager.logout();
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
     * Update authentication state
     */
    updateAuthState(user, isAuthenticated) {
        // This will be handled by AuthManager.updateAuthUI()
        // which targets the #authButtons element
        console.log('🔄 Auth state updated in navbar:', { user, isAuthenticated });
    }

    /**
     * Update cart count
     */
    updateCartCount(count) {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = count;
            cartCount.style.display = count > 0 ? 'block' : 'none';
        }
        console.log('🛒 Cart count updated:', count);
    }

    /**
     * Update categories dropdown
     */
    updateCategories(categories) {
        const categoriesDropdown = document.getElementById('categoriesDropdown');
        if (categoriesDropdown && categories) {
            const dropdownHTML = categories.map(category => `
                <li><a class="dropdown-item" href="${this.getRelativePath(`products.html?category=${category.category_id}`)}">
                    ${category.category_name}
                </a></li>
            `).join('');
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
        handlers.forEach(handler => {
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
            navbar: !!document.getElementById('unifiedNavbar')
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
    console.log('🔄 Manual navbar initialization triggered');
    if (navbarManager.isInitialized) {
        console.log('⚠️ NavbarManager already initialized');
        return;
    }
    navbarManager.initialize();
};

export default NavbarManager;
export { navbarManager };
