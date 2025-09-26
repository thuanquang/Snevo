/**
 * Main JavaScript for Snevo E-commerce Platform
 * Handles page initialization, API calls, and UI interactions
 */

// Global variables
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let categories = [];
let featuredProducts = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Initialize authentication
        await initializeAuth();
        
        // Load initial data
        await loadCategories();
        await loadFeaturedProducts();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update UI based on auth state
        updateAuthUI();
        updateCartUI();
        
        // Initialize animations
        initializeAnimations();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Failed to load application', 'error');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search functionality
    const searchToggle = document.getElementById('searchToggle');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    if (searchToggle) {
        searchToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSearch();
        });
    }
    
    if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                toggleSearch();
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
    
    // Escape key to close search
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const searchOverlay = document.getElementById('searchOverlay');
            if (searchOverlay && !searchOverlay.classList.contains('d-none')) {
                toggleSearch();
            }
        }
    });
}

/**
 * Toggle search overlay
 */
function toggleSearch() {
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
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        const query = searchInput.value.trim();
        window.location.href = `/products.html?search=${encodeURIComponent(query)}`;
    }
}

/**
 * Load categories from API
 */
async function loadCategories() {
    try {
        const response = await apiCall('/api/products/categories');
        if (response.success) {
            categories = response.data.categories;
            renderCategories();
            renderCategoriesDropdown();
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

/**
 * Load featured products from API
 */
async function loadFeaturedProducts() {
    try {
        const response = await apiCall('/api/products/featured?limit=8');
        if (response.success) {
            featuredProducts = response.data.products;
            renderFeaturedProducts();
        }
    } catch (error) {
        console.error('Failed to load featured products:', error);
    }
}

/**
 * Render categories grid
 */
function renderCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (!categoriesGrid) return;
    
    if (categories.length === 0) {
        categoriesGrid.innerHTML = '<div class="col-12 text-center"><p>No categories available</p></div>';
        return;
    }
    
    const categoriesHTML = categories.map(category => `
        <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
            <div class="category-card" onclick="goToCategory(${category.category_id})">
                <img src="${category.image_url || '../assets/images/categories/default.jpg'}" 
                     alt="${category.category_name}" 
                     class="category-image">
                <div class="category-overlay">
                    <h3 class="category-title">${category.category_name}</h3>
                </div>
            </div>
        </div>
    `).join('');
    
    categoriesGrid.innerHTML = categoriesHTML;
}

/**
 * Render categories dropdown
 */
function renderCategoriesDropdown() {
    const categoriesDropdown = document.getElementById('categoriesDropdown');
    if (!categoriesDropdown) return;
    
    const dropdownHTML = categories.map(category => `
        <li><a class="dropdown-item" href="/products.html?category=${category.category_id}">
            ${category.category_name}
        </a></li>
    `).join('');
    
    categoriesDropdown.innerHTML = dropdownHTML;
}

/**
 * Render featured products
 */
function renderFeaturedProducts() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    if (featuredProducts.length === 0) {
        featuredContainer.innerHTML = '<div class="col-12 text-center"><p>No featured products available</p></div>';
        return;
    }
    
    const productsHTML = featuredProducts.map(product => `
        <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image_url || '../assets/images/products/default.jpg'}" 
                         alt="${product.shoe_name}" 
                         loading="lazy">
                    <div class="product-overlay">
                        <div class="product-actions">
                            <button class="btn btn-light btn-sm" onclick="viewProduct(${product.shoe_id})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="addToCart(${product.shoe_id})">
                                <i class="fas fa-cart-plus"></i> Add
                            </button>
                        </div>
                    </div>
                </div>
                <div class="product-info">
                    <h5 class="product-title">${product.shoe_name}</h5>
                    <div class="product-price">
                        ${formatPrice(product.min_price || product.base_price)}
                        ${product.max_price && product.max_price !== product.min_price ? 
                          ` - ${formatPrice(product.max_price)}` : ''}
                    </div>
                    <div class="product-rating">
                        <div class="rating-stars">
                            ${renderStars(4.5)} <!-- Placeholder rating -->
                        </div>
                        <span>(24 reviews)</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    featuredContainer.innerHTML = productsHTML;
}

/**
 * Go to category page
 */
function goToCategory(categoryId) {
    window.location.href = `/products.html?category=${categoryId}`;
}

/**
 * View product details
 */
function viewProduct(productId) {
    window.location.href = `/product-detail.html?id=${productId}`;
}

/**
 * Add product to cart
 */
async function addToCart(productId) {
    try {
        // For now, add with default variant
        // In a real implementation, you'd show a variant selector
        const cartItem = {
            product_id: productId,
            variant_id: null, // Will be set when variants are selected
            quantity: 1,
            added_at: new Date().toISOString()
        };
        
        cart.push(cartItem);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        
        showToast('Product added to cart!', 'success');
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showToast('Failed to add product to cart', 'error');
    }
}

/**
 * Update cart UI
 */
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cart.length;
        cartCount.style.display = cart.length > 0 ? 'block' : 'none';
    }
}

/**
 * Handle newsletter form submission
 */
function handleNewsletterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    
    // Simulate newsletter subscription
    setTimeout(() => {
        showToast('Thank you for subscribing!', 'success');
        form.reset();
    }, 500);
}

/**
 * Format price for display
 */
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(price);
}

/**
 * Render star rating
 */
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    // Add to toast container or create one
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/**
 * Initialize animations
 */
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.product-card, .category-card, .section-title').forEach(el => {
        observer.observe(el);
    });
}

// Export functions for global use
window.goToCategory = goToCategory;
window.viewProduct = viewProduct;
window.addToCart = addToCart;

