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
        this.isSearchExpanded = false;
        
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
            // Search events may need a slight delay to ensure elements are in DOM
            setTimeout(() => {
                this.bindSearchEvents();
                console.log('✅ Search events bound after delay');
            }, 100);

            
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
}

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
                        <!-- ⭐ Expandable Search Container -->
                    <div id="navbarSearchContainer" class="navbar-search-container">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search search-input-icon"></i>
                            <input 
                                type="text" 
                                id="navbarSearchInput" 
                                class="form-control search-input" 
                                placeholder="Search shoes, brands, styles..."
                                autocomplete="off"
                            >
                        </div>
                        <div id="searchSuggestions" class="search-suggestions"></div>
                    </div>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav mx-auto" style="gap: 80px;">
                            <li class="nav-item">
                                <a class="nav-link" href="#" data-navbar-link="home">Home</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#" data-navbar-link="products">Shop</a>
                            </li>
                            <li class="nav-item dropdown">
                                <a class="nav-link dropdown-toggle" href="#" data-navbar-link="categories" role="button" data-bs-toggle="dropdown">
                                    Categories
                                </a>
                                <ul class="dropdown-menu" id="categoriesDropdown">
                                    <!-- Categories will be loaded dynamically -->
                                </ul>
                            </li>
                        </ul>
                        
                        <ul class="navbar-nav" style="gap: 30px;">
                            <li class="nav-item">
                                <a class="nav-link" href="#" id="searchToggle" data-navbar-link="search">
                                    <img src="../assets/images/ui/search.svg" alt="Search" height="20" width="20">
                                </a>
                            </li>
                            <li class="nav-item" id="cartNavItem">
                                <a class="nav-link position-relative" href="#" data-navbar-link="cart">
                                    <img src="../assets/images/ui/cart.svg" alt="Cart" height="23" width="23">
                                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="cartCount">
                                        0
                                    </span>
                                </a>
                            </li>
                            <li class="nav-item" style=" border-radius: 32px;">
                                <ul class="navbar-nav" id="authButtons">
                                    <li class="nav-item">
                                        <a class="nav-link px-4 fw-medium" style="color: black !important;" href="#" id="globalLoginLink">Login</a>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        <style>
    /* ⭐ THÊM: Expandable Search Styles */
    .navbar {
        transition: all 0.3s ease;
        z-index: 1050;
    }

    /* Search container - HIDDEN by default */
    .navbar-search-container {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        padding: 0 1rem;
        background: white;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 10;
    }

    .navbar-search-container.expanded {
        opacity: 1;
        pointer-events: auto;
    }

    .search-input-wrapper {
        position: relative;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
    }

    .search-input-icon {
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: #999;
        font-size: 18px;
        pointer-events: none;
    }

    .search-input {
        width: 100%;
        height: 48px;
        padding: 0 20px 0 50px;
        border: none;
        background: #f5f5f5;
        border-radius: 24px;
        font-size: 16px;
    }

    .search-input:focus {
        outline: none;
        background: #e8e8e8;
    }

    /* Cancel button - HIDDEN by default */
    .cancel-search-btn {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0;
        pointer-events: none;
        color: #111;
        font-weight: 500;
        transition: opacity 0.3s ease;
        z-index: 11;
    }

    .navbar.search-expanded .cancel-search-btn {
        opacity: 1;
        pointer-events: auto;
    }

    .navbar.search-expanded .navbar-collapse {
        opacity: 0;
        pointer-events: none;
    }

    .search-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 8px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-height: 400px;
        overflow-y: auto;
        display: none;
    }

    .search-suggestion-item {
        padding: 12px 20px;
        cursor: pointer;
    }

    .search-suggestion-item:hover {
        background: #f5f5f5;
    }

    .nav-item {
        transition: opacity 0.2s ease;
    }

    .navbar-brand {
        position: relative;
        z-index: 12;
    }
    </style>    
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
 * Bind search events
 */
bindSearchEvents() {
    const searchToggle = document.getElementById('searchToggle');
    const cancelSearchBtn = document.getElementById('cancelSearchBtn');
    const searchInput = document.getElementById('navbarSearchInput');

    if (!searchToggle || !cancelSearchBtn || !searchInput) {
        console.warn('⚠️ Search elements not found in navbar');
        return;
    }

    // Click search icon to expand
    searchToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.expandSearch();
    });

    // Click cancel to collapse
    cancelSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.collapseSearch();
    });

    // Handle search input
    searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value);
    });

    // Handle Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.performExpandableSearch(searchInput.value);
        } else if (e.key === 'Escape') {
            this.collapseSearch();
        }
    });

    console.log('✅ Expandable search events bound');
}
/**
 * Expand search bar (Nike-style)
 */
expandSearch() {
    console.log('🔍 Expanding search...');
    
    const navbar = document.querySelector('#unifiedNavbar');
    const navbarCollapse = document.querySelector('#navbarNav');
    const searchContainer = document.getElementById('navbarSearchContainer');
    const searchInput = document.getElementById('navbarSearchInput');
    const menuItems = document.querySelectorAll('.nav-item:not(.search-icon-item)');

    if (!navbar || !searchContainer) {
        console.error('❌ Navbar elements not found for expansion');
        return;
    }

    // Add expanded state
    navbar.classList.add('search-expanded');
    searchContainer.classList.add('expanded');

    // Hide menu items with fade out animation
    menuItems.forEach(item => {
        item.style.opacity = '0';
        item.style.pointerEvents = 'none';
        setTimeout(() => {
            item.style.display = 'none';
        }, 200);
    });

    // Collapse mobile menu if open
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) {
            bsCollapse.hide();
        }
    }

    // Focus search input
    setTimeout(() => {
        searchInput.focus();
    }, 300);

    this.isSearchExpanded = true;
    console.log('✅ Search expanded');
}

/**
 * Collapse search bar
 */
collapseSearch() {
    console.log('🔍 Collapsing search...');
    
    const navbar = document.querySelector('#unifiedNavbar');
    const searchContainer = document.getElementById('navbarSearchContainer');
    const searchInput = document.getElementById('navbarSearchInput');
    const menuItems = document.querySelectorAll('.nav-item:not(.search-icon-item)');

    if (!navbar || !searchContainer) return;

    // Remove expanded state
    navbar.classList.remove('search-expanded');
    searchContainer.classList.remove('expanded');

    // Show menu items with fade in animation
    menuItems.forEach(item => {
        item.style.display = '';
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        }, 50);
    });

    // Clear search input
    searchInput.value = '';
    
    // Hide suggestions
    this.hideSearchSuggestions();

    this.isSearchExpanded = false;
    console.log('✅ Search collapsed');
}

/**
 * Handle search input (for suggestions)
 */
handleSearchInput(query) {
    console.log('🔍 Search query:', query);
    
    if (query.length >= 2) {
        this.showSearchSuggestions(query);
    } else {
        this.hideSearchSuggestions();
    }
}

/**
 * Show search suggestions
 */
async showSearchSuggestions(query) {
    // TODO: Implement real search suggestions from API
    console.log('💡 Show suggestions for:', query);
    
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    // Mock suggestions (replace with real API call)
    const mockSuggestions = [
        'Nike Air Max',
        'Adidas Ultraboost',
        'Converse All Star'
    ].filter(item => item.toLowerCase().includes(query.toLowerCase()));

    if (mockSuggestions.length > 0) {
        suggestionsContainer.innerHTML = mockSuggestions.map(suggestion => `
            <div class="search-suggestion-item" data-suggestion="${suggestion}">
                <i class="fas fa-search me-2"></i>${suggestion}
            </div>
        `).join('');
        
        suggestionsContainer.style.display = 'block';

        // Bind click events
        suggestionsContainer.querySelectorAll('.search-suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const suggestion = item.getAttribute('data-suggestion');
                this.performExpandableSearch(suggestion);
            });
        });
    } else {
        this.hideSearchSuggestions();
    }
}

/**
 * Hide search suggestions
 */
hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }
}

/**
 * Perform expandable search
 */
performExpandableSearch(query) {
    if (!query || query.trim().length === 0) {
        return;
    }

    console.log('🔍 Performing expandable search for:', query);
    
    // Collapse search
    this.collapseSearch();

    // ⭐ FIX: Use getRelativePath to get correct path
    const searchUrl = this.getRelativePath(`products.html?search=${encodeURIComponent(query.trim())}`);
    console.log('🔗 Redirecting to:', searchUrl);
    
    window.location.href = searchUrl;
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
            'orders': 'orders.html'
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
                a.addEventListener('click', async (e) => {
                    e.preventDefault();
                    console.log('Navbar logout button clicked');
                    
                    // Disable the button and show loading state
                    a.disabled = true;
                    a.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging out...';
                    
                    try {
                        if (window.authManager) {
                            console.log('Using AuthManager logout from navbar');
                            await window.authManager.logout();
                            console.log('Navbar logout successful via AuthManager');
                        } else {
                            console.log('AuthManager not available from navbar, using fallback');
                            // Fallback logout process
                            await this.performNavbarLogout();
                        }
                    } catch (error) {
                        console.error('Navbar logout error:', error);
                        
                        // If AuthManager logout failed, try fallback
                        if (window.authManager) {
                            console.log('AuthManager logout failed from navbar, trying fallback');
                            try {
                                await this.performNavbarLogout();
                            } catch (fallbackError) {
                                console.error('Fallback navbar logout also failed:', fallbackError);
                                this.showNavbarError('Logout failed. Please clear your browser data and refresh the page.');
                                // Reset button state
                                a.disabled = false;
                                a.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                            }
                        } else {
                            this.showNavbarError('Logout failed. Please try again or refresh the page.');
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
        console.log('Performing manual navbar logout');
        
        // Show logout success message before clearing data
        this.showNavbarLogoutSuccessToast();
        
        try {
            // Small delay to let user see the message
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Clear all authentication data
            this.clearNavbarAuthenticationData();
            
            // Clear any additional session data
            this.clearNavbarSessionData();
            
            // Update UI if AuthManager is available
            if (window.authManager) {
                window.authManager.clearAuthData();
                window.authManager.updateAuthUI();
                window.authManager.emit('logout');
            }
            
            // Redirect to home page
            console.log('Redirecting to index.html after navbar logout');
            window.location.href = this.getRelativePath('index.html');
            
        } catch (error) {
            console.error('❌ Error during navbar logout process:', error);
            this.showNavbarError('Logout process failed. Please clear your browser data and refresh the page.');
            
            // Force redirect after a timeout as fallback
            setTimeout(() => {
                console.log('🔄 Force redirecting after navbar logout error');
                window.location.href = this.getRelativePath('index.html');
            }, 3000);
        }
    }
    
    /**
     * Clear navbar authentication data
     */
    clearNavbarAuthenticationData() {
        // Clear all auth tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        
        // Clear Supabase auth data if present
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        localStorage.removeItem('supabase.auth.user');
        
        // Clear any cookies related to auth
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('auth') || name.includes('session') || name.includes('token') ||
                name.includes('supabase') || name.includes('user')) {
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
            }
        });
        
        console.log('Navbar authentication data cleared');
    }
    
    /**
     * Clear navbar session data
     */
    clearNavbarSessionData() {
        // Clear any application-specific session data
        const sessionKeys = [
            'user_preferences',
            'cart_data',
            'last_activity',
            'session_id'
        ];
        
        sessionKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log('Cleared navbar session data:', key);
            }
        });
        
        // Clear sessionStorage as well
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
            console.log('Navbar sessionStorage cleared');
        }
    }
    
    /**
     * Show navbar logout success toast
     */
    showNavbarLogoutSuccessToast() {
        // Create and show logout success toast
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-black bg-info border-0';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-sign-out-alt me-2"></i>Logging out...
                </div>
            </div>
        `;
        
        // Position the toast in the center of the screen
        toast.style.position = 'fixed';
        toast.style.top = '50%';
        toast.style.left = '50%';
        toast.style.transform = 'translate(-50%, -50%)';
        toast.style.zIndex = '9999';
        toast.style.minWidth = '200px';
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, {
            delay: 1000,
            autohide: true
        });
        bsToast.show();
        
        // Remove toast after it's hidden
        const removeToast = () => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        };
        
        toast.addEventListener('hidden.bs.toast', removeToast);
        setTimeout(removeToast, 2000);
    }
    
    /**
     * Show navbar error message
     */
    showNavbarError(message) {
        // Create and show error toast
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0';
        toast.setAttribute('role', 'alert');
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
            autohide: true
        });
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
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


