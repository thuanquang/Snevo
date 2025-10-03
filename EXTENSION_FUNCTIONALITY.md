Unified Navbar System
---------------------
- Single navbar template in `frontend/components/navbar.html` with Bootstrap styling.
- `NavbarManager.js` handles rendering, state updates, and page-specific overrides.
- Each page uses `<div id="navbarRoot" data-navbar-page="pageType"></div>` for injection.
- Supports `window.NAVBAR_OVERRIDES` and `data-navbar-*` attributes for customizations.
- Automatically syncs with AuthManager and CartManager for real-time updates.
- Centralized path resolution handles relative paths based on current page location.

Files added:
- `frontend/components/navbar.html`: Unified navbar template with placeholders.
- `frontend/assets/js/NavbarManager.js`: Core navbar management with override support.
- `frontend/components/navbar-overrides.js`: Preset configurations for different page types.

Integration:
- `Application.js` initializes NavbarManager after AuthManager.
- Auth events bridge to `navbarManager.updateAuthState(user, isAuthenticated)`.
- Cart events bridge to `navbarManager.updateCartCount(count)`.
- Categories events bridge to `navbarManager.updateCategories(categories)`.

Override Examples:
- Checkout: `{ hideCart: true, showProgressBar: true, customActions: ['save-progress'] }`
- Admin: `{ showAdminMenu: true, customActions: ['admin-dashboard', 'logout'] }`
- Cart: `{ hideCart: true, customActions: ['continue-shopping'] }`

Auth/Login Behavior (Google-only)
---------------------------------
- Global modal is injected by `frontend/assets/js/Application.js#initializeLoginModal`.
- Exposes `window.showLoginModal()` to open modal.
- All anchors pointing to `login.html` are intercepted to open modal instead of navigating.
- `AuthManager.loginWithGoogle()` now redirects back to `window.location.href` after OAuth.
- `AuthManager.updateAuthUI()` renders a `Login` link that calls the modal via `#globalLoginLink`.
- Role-aware navbar: when authenticated AND role is known, customers see `profile.html`; sellers see `admin.html`. If role unknown, show Login.
- Protected page access triggers modal instead of redirect.
- Fallbacks: if modal isn't ready, code falls back to `login.html` navigation in ApiClient/cart.

Files touched:
- `frontend/assets/js/AuthManager.js`: modal login UI hookup, Google redirect change; attach role after session validate/refresh; gate UI on real role; temp session without role.
- `frontend/assets/js/Application.js`: inject modal; intercept `login.html` links; protected page handling.
- `frontend/assets/js/ApiClient.js`: use modal on 401 redirect if available.
- `frontend/assets/js/cart.js`: open modal on auth-required paths.
- `frontend/assets/js/AdminManager.js`: revalidate session and attach role before enforcing seller access.
- `frontend/pages/profile.html`: revalidate session on load; strict redirect to login if invalid.

Config prerequisites:
- `frontend/assets/js/config.js` sets `APP_CONFIG.features.googleAuth` true with valid Supabase config.

# EXTENSION FUNCTIONALITY - SNEVO E-COMMERCE PLATFORM

## PROJECT OVERVIEW
**Name**: Snevo E-commerce Platform  
**Type**: Nike-inspired shoe e-commerce website  
**Architecture**: MVC Pattern with Node.js backend and vanilla frontend  
**Database**: Supabase PostgreSQL with comprehensive shoe retail schema  
**Status**: ✅ REFACTORED TO NEW STRUCTURE

## DETAILED REQUIREMENTS ANALYSIS

### FRONTEND SPECIFICATIONS
- **Technology**: Vanilla HTML5, CSS3, JavaScript ES6+
- **Framework**: Bootstrap 5.3 (no other frameworks allowed)
- **Design**: Nike.com inspired with full animations
- **Responsiveness**: Mobile-first approach
- **Animation Requirements**: 
  - Smooth page transitions
  - Product hover effects
  - Loading animations
  - Scroll-triggered animations
  - Hero section parallax effects
  - Product gallery animations

### BACKEND SPECIFICATIONS
- **Technology**: Node.js with built-in HTTP module
- **No Express.js**: Must use Node.js core modules only
- **Architecture**: Strict MVC pattern implementation
- **API**: RESTful API design
- **Authentication**: Supabase Auth with Google OAuth

### DATABASE SCHEMA ANALYSIS (UPDATED - from schema.sql)
**Schema Name**: db_nike  
**Status**: ✅ UPDATED - Removed wishlist table, added email column to profiles, removed supplier table  
**Tables Identified**:
1. **profiles** - User profile management with email column (linked to auth.users)
2. **addresses** - Multiple address support per user
3. **categories** - Shoe categorization system
4. **shoes** - Main product table with base information
5. **colors & sizes** - Product variant attributes
6. **shoe_variants** - SKU-based inventory with stock management (MOST IMPORTANT)
7. **imports** - Inventory management with automatic stock updates (NO supplier references)
8. **orders** - Order processing with status tracking
9. **order_items** - Order line items with automatic stock deduction
10. **payments** - Payment processing with multiple methods
11. **reviews** - Product review system with ratings

**Key Database Features**:
- ✅ Automatic stock management with triggers
- ✅ Role-based user system (customer/seller)
- ✅ Multi-variant product support (color/size combinations)
- ✅ Comprehensive order lifecycle management
- ✅ Review system with rating constraints
- ✅ Address management with default selection
- ✅ Import tracking (NO supplier dependencies)
- ✅ Email column in profiles table
- ✅ Removed wishlist functionality

## CORE FUNCTIONALITY REQUIREMENTS

### 1. LANDING PAGE
**Nike.com Style Requirements**:
- Hero section with large product imagery
- Animated product showcases
- Category navigation
- Featured products carousel
- Brand storytelling sections
- Newsletter signup
- Social media integration
- Smooth scrolling navigation

**Technical Implementation**:
- Intersection Observer API for scroll animations
- CSS Grid and Flexbox for layouts
- Bootstrap components for responsive design
- Lazy loading for performance

### 1.a Landing Page Prototype Snapshot (Implemented)
- Header navigation: `Products`, `Categories`, `Cart`, `Orders`, `Profile`, `Login`
- Hero CTAs: `Shop Now` → `products.html`, `Browse Categories` → `categories.html`
- Sections: Featured Categories preview, Trending preview, Brand story, Quick Links
- Quick Links target: `cart.html`, `checkout.html`, `orders.html`, `addresses.html`
- Scripts included: `Application.js`, `animations.js`, `main.js` (prototype hooks only)
- All links are direct navigation for now; auth-aware behavior handled on target pages

### 2. AUTHENTICATION SYSTEM (✓ ENHANCED & ENVIRONMENT-DEPENDENT)
**Supabase Integration** (✓ FULLY ENVIRONMENT-DEPENDENT & OVERHAULED):
- ✓ Email/password authentication with environment validation
- ✓ Unified Google OAuth integration with comprehensive error handling
- ✓ User session management with proper token handling and OAuth callbacks
- ✓ Role-based access control (customer/seller)
- ✓ Password reset functionality with environment-based URLs
- ✓ Email verification with Supabase integration
- ✓ Comprehensive environment variable validation
- ✓ Automatic feature enabling/disabling based on configuration
- ✓ Backend OAuth callback handling for Google authentication
- ✓ Unified authentication flow across all pages

**Frontend Components** (✓ ENHANCED WITH CONFIG VALIDATION):
- ✓ Login page with Nike-inspired design and config-based features
- ✓ Registration modal with validation and environment checks
- ✓ Social login buttons (Google OAuth) with dynamic availability
- ✓ Password reset modal with proper environment handling
- ✓ Form validation and error handling with helpful messages
- ✓ Responsive design for all devices
- ✓ Nike-style animations and transitions
- ✓ Real-time configuration validation and user feedback
- ✓ Development vs production configuration handling

### 3. PRODUCT BROWSING SYSTEM
**Database Integration**:
- Category-based filtering using Categories table
- Search functionality across Shoes table
- Price range filtering using variant_price
- Color and size filtering using Shoe_Variants
- Stock availability checking
- Pagination for large catalogs

**Frontend Features**:
- Grid/list view toggle
- Advanced filtering sidebar
- Sort options (price, popularity, newest)
- Search autocomplete
- Product quick view
- Wishlist functionality

### 4. PRODUCT DETAIL PAGE
**Database Queries**:
- Shoe details from Shoes table
- Available variants from Shoe_Variants
- Stock quantities for each variant
- Product reviews from Reviews table
- Related products based on category

**Frontend Components**:
- Image gallery with zoom functionality
- Size and color selection
- Stock availability indicator
- Add to cart functionality
- Product specifications
- Customer reviews section
- Related products carousel

### 5. USER MANAGEMENT (✓ ENHANCED WITH COMPREHENSIVE PROFILE SYSTEM)
**Profile Features** (✓ FULLY IMPLEMENTED):
- ✓ Personal information editing with form validation
- ✓ Address management (multiple addresses) with CRUD operations
- ✓ Order history with status tracking
- ✓ Review management
- ✓ Wishlist management
- ✓ Password change functionality with security validation
- ✓ Notification preferences management
- ✓ Account settings with comprehensive options
- ✓ Nike-style profile interface with smooth navigation

**Seller Features** (if role = 'seller'):
- Inventory management
- Import tracking
- Sales analytics
- Product management

## TECHNICAL IMPLEMENTATION DETAILS

### BACKEND API ENDPOINTS
```
Authentication:
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET /api/auth/profile
PUT /api/auth/profile

Products:
GET /api/products
GET /api/products/:id
GET /api/products/category/:categoryId
GET /api/categories
GET /api/products/search?q=query

Orders:
POST /api/orders
GET /api/orders
GET /api/orders/:id
PUT /api/orders/:id/status

User Management (✓ ENHANCED):
GET /api/auth/profile
PUT /api/auth/profile
POST /api/auth/change-password
GET /api/auth/addresses
POST /api/auth/addresses
PUT /api/auth/addresses/:id
DELETE /api/auth/addresses/:id
GET /api/auth/orders
GET /api/auth/reviews
GET /api/auth/notifications
PUT /api/auth/notifications

Reviews:
GET /api/products/:id/reviews
POST /api/products/:id/reviews
PUT /api/reviews/:id
DELETE /api/reviews/:id
```

### FRONTEND COMPONENT ARCHITECTURE
**Modular Design**:
- Reusable HTML components
- JavaScript modules for functionality
- CSS component libraries
- Bootstrap integration
- Animation libraries

**State Management**:
- LocalStorage for cart and preferences
- Session management with Supabase
- Real-time updates for stock levels
- Form validation and error handling

### ANIMATION SPECIFICATIONS (Nike-style)
**Required Animations**:
1. **Page Load**: Fade-in with stagger effect
2. **Product Cards**: Hover animations with image transitions
3. **Hero Section**: Parallax scrolling effects
4. **Navigation**: Smooth slide transitions
5. **Cart**: Slide-in/slide-out animations
6. **Product Gallery**: Image zoom and carousel effects
7. **Form Interactions**: Focus states and validation feedback
8. **Loading States**: Skeleton screens and spinners

**Performance Considerations**:
- CSS transforms for hardware acceleration
- RequestAnimationFrame for smooth animations
- Intersection Observer for scroll-triggered effects
- Preload critical animations
- Fallbacks for reduced motion preferences

## DEVELOPMENT PHASES

### Phase 1: Project Setup
- Directory structure creation
- Package.json configuration
- Environment setup
- Supabase connection
- Basic server implementation

### Phase 2: Backend Development (✓ COMPLETED)
- ✓ Database models implementation (User, Product, Category, Order)
- ✓ API endpoints development (comprehensive RESTful API)
- ✓ Authentication integration (Supabase Auth with enhanced middleware)
- ✓ Middleware development (validation, enhanced auth, error handling)
- ✓ Error handling (comprehensive custom error classes)

### Phase 3: Frontend Foundation
- HTML structure creation
- CSS framework setup
- JavaScript module architecture
- Bootstrap integration
- Basic routing

### Phase 4: Core Features
- Landing page implementation
- Product browsing
- Product detail pages
- User profile management

### Phase 5: Advanced Features
- Shopping cart functionality
- Order processing
- Payment integration
- Review system
- Admin features

### Phase 6: Polish & Optimization
- Animation implementation
- Performance optimization
- Testing and debugging
- Documentation completion
- Deployment preparation

## PERFORMANCE TARGETS
- **Page Load**: < 3 seconds
- **Animation Frame Rate**: 60 FPS
- **API Response Time**: < 500ms
- **Mobile Performance**: Lighthouse score > 90
- **SEO Score**: Lighthouse score > 90

## SECURITY CONSIDERATIONS
- Input validation on all forms
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure authentication flow
- Rate limiting for API endpoints
- Secure environment variable handling

## BUILD SYSTEM (✓ ENHANCED WITH VALIDATION)
**Environment Variable Injection**:
- ✓ Secure credential management via .env files with comprehensive validation
- ✓ Build-time environment variable injection with feature detection
- ✓ Development and production configuration separation
- ✓ Automatic config generation for frontend with validation
- ✓ Smart config loading with fallbacks and error handling
- ✓ Dynamic feature enabling/disabling based on environment variables
- ✓ Real-time validation feedback during development

**Build Scripts** (✓ ENHANCED):
- ✓ `npm run build` - Full production build with environment validation
- ✓ `npm run build:frontend` - Frontend build with env injection and validation
- ✓ `npm run dev:config` - Development config generation with validation
- ✓ `npm run serve` - Build and serve production version

**Security Features** (✓ ENHANCED):
- ✓ Environment variables never committed to git
- ✓ Production builds inject variables at build time with validation
- ✓ Sensitive keys masked in console output
- ✓ Development warnings for missing/invalid configuration
- ✓ Automatic detection of placeholder values
- ✓ Comprehensive environment variable validation on startup
- ✓ Helpful error messages for configuration issues

## DEPLOYMENT REQUIREMENTS
- **Frontend**: Static hosting (Netlify/Vercel) with build process
- **Backend**: Node.js hosting (Railway/Heroku) with environment variables
- **Database**: Supabase cloud instance
- **CDN**: For static assets and images
- **SSL**: HTTPS enforcement
- **Environment**: Separate dev/staging/production configs via .env files
- **Build Process**: `npm run build` creates production-ready files

