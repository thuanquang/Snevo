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

Auth/Login Behavior (Simplified Direct Supabase)
------------------------------------------------
- Direct Supabase Auth client integration (no backend auth proxy)
- `AuthService` (`frontend/assets/js/services/AuthService.js`) handles all auth operations
- Global modal (`LoginModal.js`) calls `authService.loginWithGoogle()` directly
- User roles fetched from `db_nike.profiles` table after Supabase authentication
- Role-aware navbar: 'customer' → profile.html, 'seller' → admin.html
- Session management handled by Supabase `onAuthStateChange` listener
- No backend AuthController, auth routes, or JWT utilities needed

Key Files:
- `frontend/assets/js/services/AuthService.js`: Direct Supabase client operations
- `frontend/assets/js/AuthManager.js`: Simplified UI wrapper around AuthService
- `frontend/assets/js/LoginModal.js`: Google OAuth modal using AuthService
- `frontend/assets/js/Application.js`: Initializes AuthService first
- `backend/middleware/auth.js`: Token verification only (kept for protected routes)
- `backend/models/Profile.js`: Role management from db_nike.profiles

Deleted Files (Redundant):
- `backend/controllers/authController.js` - Supabase handles auth
- `backend/routes/auth.js` - No backend auth routes needed
- `backend/utils/jwt.js` - Supabase handles JWT

Config prerequisites:
- `frontend/assets/js/config.js` sets `APP_CONFIG.features.googleAuth` true with valid Supabase config.

Variant Controller Bug Fix (Oct 2025)
--------------------------------------
✅ FIXED: Missing methods in VariantController that were being called from variants.js routes
- Added `findVariantByComposite(req, res)` - GET /api/variants/find with query params
- Added `getVariantBySku(req, res)` - GET /api/variants/sku/:sku
- Added `getLowStockVariants(req, res)` - GET /api/variants/low-stock (seller/admin only)
- Added `getVariantsByColor(req, res)` - GET /api/variants/shoe/:shoeId/color/:colorId
- Added `bulkCreateVariants(req, res)` - POST /api/variants/bulk (seller/admin only)
- Added `checkStock(req, res)` - POST /api/variants/:id/check-stock

All methods include:
- Proper request validation with type checking
- Error handling with appropriate HTTP status codes
- Integration with ShoeVariant model methods
- Role-based access control where needed (seller/admin)
- Comprehensive response messages

Files modified:
- `backend/controllers/VariantController.js`: Added 6 new controller methods

Auth UI Update Timing Fix (Oct 2025)
-------------------------------------
✅ FIXED: Auth buttons not updating immediately after first-time Google login
Issue: Race condition between navbar loading and auth UI updates

Root Causes:
1. NavbarManager loading navbar.html asynchronously into DOM
2. AuthManager.updateAuthUI() being called before #authButtons element exists
3. Profile data (role, username) fetching from database taking time
4. Multiple components trying to update UI at different times

Fixes Applied:
1. Modified AuthManager.updateAuthUI() to retry if #authButtons not found
   - Automatically retries after 100ms if element doesn't exist yet
   - Prevents silent failure when navbar hasn't loaded

2. Added roleUpdated event listener in Application.js
   - Listens for when user profile/role is fetched from database
   - Triggers UI update when role becomes available
   - Ensures correct admin.html vs profile.html link

3. Improved handleSignedIn timing with multiple scheduled updates
   - Updates at 300ms, 800ms, and 1500ms after sign-in
   - Catches profile data whenever it arrives
   - Handles slow database responses

4. Enhanced event bridging in Application.js
   - signedIn event triggers delayed auth UI update (200ms)
   - Ensures navbar is fully loaded before updating
   - Coordinates between AuthManager and NavbarManager

5. Created database migration script (scripts/fix-profile-trigger.sql)
   - Fixes potential trigger errors with username field
   - Ensures proper Google OAuth metadata handling
   - Adds proper TG_OP checks to avoid accessing OLD on INSERT

Files modified:
- `frontend/assets/js/AuthManager.js`: Retry logic and improved timing
- `frontend/assets/js/Application.js`: roleUpdated listener and delayed updates
- `scripts/fix-profile-trigger.sql`: Database trigger fixes

Testing Notes:
- Test first-time Google login (new user creation)
- Test returning user Google login (existing profile)
- Verify correct link shows (admin.html for sellers, profile.html for customers)
- Check that hovering shows correct URL immediately after login
- Ensure no console errors about missing elements
- Verify profile/admin pages wait for AuthService before checking authentication
- Confirm login.html is deleted and all references updated to use modal

Login Modal Migration (Oct 2025)
---------------------------------
✅ COMPLETED: Removed login.html and migrated to modal-based authentication

Changes:
1. Deleted `frontend/pages/login.html` - no longer needed
2. All authentication now handled through global login modal
3. Updated all redirect logic to show modal instead

Files Modified:
- Deleted: `frontend/pages/login.html`
- `frontend/assets/js/AuthManager.js`: Removed login.html redirects
- `frontend/assets/js/Application.js`: Removed login page redirect logic
- `frontend/assets/js/NavbarManager.js`: Removed login.html from path mappings
- `frontend/assets/js/ApiClient.js`: Updated unauthorized handler to use modal only
- `frontend/assets/js/AdminManager.js`: Updated auth check to use modal
- `frontend/assets/js/cart.js`: Updated login redirect to use modal
- `frontend/pages/profile.html`: Added AuthService initialization wait, uses modal for auth

Benefits:
- Cleaner UX - no page reload required for login
- Consistent authentication flow across all pages
- Faster login experience
- Reduced maintenance - one auth UI to manage

Auth State Persistence Fix (Oct 2025)
--------------------------------------
✅ FIXED: Authentication state now properly persists across pages

Root Cause:
- Pages were checking authentication before Supabase session was fully restored
- Race condition between page initialization and AuthService.initialize()
- No reliable way for pages to wait for auth to be ready

Solutions Implemented:

1. **AuthService Ready Promise** (`frontend/assets/js/services/AuthService.js`):
   - Added `readyPromise` property to track initialization state
   - Wrapped initialize() to return a reusable promise
   - Added `hasStoredSession()` helper to check for stored Supabase tokens
   - Now logs "Session restored from localStorage" when session is found
   - Multiple calls to initialize() return the same promise (idempotent)

2. **Application.js Auth Ready Event** (`frontend/assets/js/Application.js`):
   - Added `authReady` boolean property to track auth state
   - Emits 'authReady' event after AuthService.initialize() completes
   - Event includes user, isAuthenticated, and role data
   - Pages can now listen for this event or await authService.readyPromise

3. **Profile Page Auth Wait** (`frontend/pages/profile.html`):
   - Updated `waitForAuthService()` to properly await authService.initialize()
   - Now uses the readyPromise instead of polling initialized flag
   - Updated `loadUserProfile()` to get token from Supabase session directly
   - Uses `session.access_token` instead of localStorage 'auth_token'
   - Properly handles case where session doesn't exist

How It Works:
1. Supabase client stores session in localStorage automatically (persistSession: true)
2. On page load, AuthService.initialize() calls `supabase.auth.getSession()`
3. Supabase restores the session from localStorage tokens
4. Pages await authService.initialize() before checking authentication
5. Session tokens are automatically refreshed by Supabase (autoRefreshToken: true)

Files Modified:
- `frontend/assets/js/services/AuthService.js`: Added readyPromise and hasStoredSession()
- `frontend/assets/js/Application.js`: Added authReady property and event emission
- `frontend/pages/profile.html`: Updated to properly await auth initialization

Storage Keys Used by Supabase:
- `sb-<project-ref>-auth-token` - Main session token with access/refresh tokens
- Session includes: access_token, refresh_token, expires_at, user data

Benefits:
- Auth state now persists reliably across page navigation
- No more race conditions or stale auth checks
- Pages can await auth initialization before proceeding
- Cleaner, more predictable authentication flow
- Works seamlessly with Supabase's built-in session management

Navbar Consistency Across All Pages (Oct 2025)
-----------------------------------------------
✅ FIXED: All pages now have consistent script loading and navbar behavior

Issues Fixed:
1. **products.html** had typo in config.js path (`assetasfas` instead of `assets`)
2. **product-detail.html** was missing Supabase SDK, config.js, and Application.js
3. **categories.html**, **orders.html**, **addresses.html** were bare-bones stubs
4. **verify-email.html** was missing NavbarManager and Application.js

Standardized Script Loading Order (All Pages):
```html
<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Configuration -->
<script src="../assets/js/config.js"></script>

<!-- Custom Scripts -->
<script type="module" src="../assets/js/ApiClient.js"></script>
<script type="module" src="../assets/js/AuthManager.js"></script>
<script type="module" src="../assets/js/NavbarManager.js"></script>
<script type="module" src="../assets/js/Application.js"></script>
<script src="../assets/js/animations.js"></script>
```

Pages Updated:
- ✅ `frontend/pages/products.html` - Fixed config.js typo
- ✅ `frontend/pages/product-detail.html` - Added missing scripts
- ✅ `frontend/pages/categories.html` - Rebuilt with proper structure
- ✅ `frontend/pages/orders.html` - Rebuilt with proper structure and auth wait
- ✅ `frontend/pages/addresses.html` - Rebuilt with proper structure and auth wait
- ✅ `frontend/pages/verify-email.html` - Added missing NavbarManager and Application.js
- ✅ `frontend/pages/index.html` - Already correct
- ✅ `frontend/pages/profile.html` - Already correct
- ✅ `frontend/pages/admin.html` - Already correct
- ✅ `frontend/pages/cart.html` - Already correct
- ✅ `frontend/pages/checkout.html` - Already correct

Navbar Behavior:
- All pages use `<div id="navbarRoot" data-navbar-page="pageType"></div>`
- NavbarManager automatically loads on all pages
- Auth buttons update consistently across all pages
- Login modal works globally
- User state persists and displays correctly everywhere

Benefits:
- Consistent user experience across all pages
- Auth state visible immediately on page load
- No more broken navigation or missing navbars
- All pages follow the same initialization pattern
- Easy to debug and maintain



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

## PROFILE MANAGEMENT AUTO-LOAD/SAVE (Oct 2025)
✅ COMPLETED: Profile information auto-loads and saves from/to db_nike.profiles

**Implementation Details**:
1. **Backend ProfileController** (`backend/controllers/ProfileController.js`):
   - Fully implemented `getProfile()` method to fetch user profile from db_nike.profiles
   - Fully implemented `updateProfile()` method to save changes to db_nike.profiles
   - Validates all profile fields (full_name, username, phone, date_of_birth, gender, avatar_url)
   - Includes proper error handling and authentication checks
   - Filters updates to only allowed fields for security

2. **Backend Auth Routes** (`backend/server.js`):
   - Added `handleAuthRoutes()` method to handle /api/auth/* endpoints
   - Routes GET /api/auth/profile to ProfileController.getProfile
   - Routes PUT /api/auth/profile to ProfileController.updateProfile
   - Includes authentication middleware for all auth routes
   - Also handles /api/auth/addresses endpoints for address management

3. **Frontend Integration** (`frontend/pages/profile.html`):
   - Already had complete implementation with inline scripts
   - Auto-loads profile data on page load via GET /api/auth/profile
   - Populates all form fields with user data from database
   - "Save Changes" button triggers PUT /api/auth/profile
   - Displays success/error messages with Bootstrap toasts
   - Includes "Refresh Data" button to reload profile info

**Features**:
- ✅ Auto-loads profile info from db_nike.profiles table
- ✅ Populates Personal Info tab fields (full_name, username, email, phone, date_of_birth, gender, avatar_url)
- ✅ Email field is read-only (cannot be changed)
- ✅ Validates all input fields (client-side and server-side)
- ✅ Updates profile data in database when "Save Changes" is clicked
- ✅ Shows loading indicators during save operation
- ✅ Displays success/error messages to user
- ✅ Authentication required for all profile operations
- ✅ Handles 404 gracefully for new users without profiles

**Files Modified**:
- `backend/controllers/ProfileController.js`: Implemented controller methods
- `backend/server.js`: Added handleAuthRoutes and wired up auth endpoints
- No frontend changes needed (already implemented)

**Database Schema**:
- Table: `db_nike.profiles`
- Key fields: user_id (PK, UUID), username, full_name, phone, date_of_birth, gender, avatar_url, role, created_at, updated_at

## ADDRESS BOOK MANAGEMENT (Oct 2025)
✅ COMPLETED: Address book tab now fully functional with auto-load and CRUD operations

**Issues Fixed**:
1. Backend AddressController was returning 501 "not implemented" errors
2. Frontend was using wrong authentication token (localStorage 'auth_token' instead of Supabase session)
3. Address model methods were not implemented

**Implementation Details**:

1. **Backend Address Model** (`backend/models/Address.js`):
   - Implemented `findByUserId(userId)` - Get all addresses for a user (ordered by default, then created_at)
   - Implemented `findDefaultByUserId(userId)` - Get user's default address
   - Implemented `setDefault(userId, addressId)` - Set an address as default (unsets others)
   - Implemented `createForUser(userId, addressData)` - Create address with user validation
   - Implemented `updateForUser(userId, addressId, addressData)` - Update address with user validation
   - Implemented `deleteForUser(userId, addressId)` - Delete address with user validation
   - All methods include proper error handling and Supabase integration

2. **Backend AddressController** (`backend/controllers/AddressController.js`):
   - Implemented `getAddresses(req, res)` - GET /api/auth/addresses - Returns all user addresses
   - Implemented `getAddress(req, res)` - GET /api/auth/addresses/:id - Get specific address
   - Implemented `createAddress(req, res)` - POST /api/auth/addresses - Create new address
   - Implemented `updateAddress(req, res)` - PUT /api/auth/addresses/:id - Update address
   - Implemented `deleteAddress(req, res)` - DELETE /api/auth/addresses/:id - Delete address
   - All methods validate authentication, required fields, and user ownership
   - Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)

3. **Frontend Authentication Fix** (`frontend/pages/profile.html`):
   - Fixed `loadAddresses()` to use Supabase session token instead of localStorage
   - Fixed `saveNewAddress()` to use Supabase session token
   - Fixed `updateAddress()` to use Supabase session token
   - Fixed `deleteAddress()` to use Supabase session token
   - Also fixed profile update and password change functions for consistency
   - All functions now get token via: `await window.authService.supabase.auth.getSession()`

**Features**:
- ✅ Auto-loads user addresses on profile page load
- ✅ "Add New Address" modal works correctly
- ✅ Edit address functionality with pre-populated form
- ✅ Delete address with confirmation dialog
- ✅ Set default address (automatically unsets previous default)
- ✅ Displays "No addresses found" message when empty
- ✅ Shows loading spinner while fetching addresses
- ✅ Success/error toast notifications for all operations
- ✅ Proper authentication checks on all endpoints
- ✅ User can only access their own addresses (security)

**Files Modified**:
- `backend/models/Address.js`: Implemented all model methods
- `backend/controllers/AddressController.js`: Implemented all controller methods
- `frontend/pages/profile.html`: Fixed authentication token usage in all address functions

**Database Schema**:
- Table: `db_nike.addresses`
- Key fields: address_id (PK), user_id (FK to profiles), street, city, state, zip_code, country, is_default, created_at, updated_at

## ACCOUNT DELETION FUNCTIONALITY (Oct 2025)
✅ COMPLETED: Account deletion now works with email confirmation modal

**Implementation Details**:

1. **Delete Account Modal** (`frontend/pages/profile.html`):
   - Created professional confirmation modal with red danger theme
   - Lists all data that will be deleted (profile, addresses, orders, reviews)
   - Requires user to type their email address to confirm deletion
   - Email validation ensures exact match (case-insensitive)
   - Shows current email for reference
   - Error handling for mismatched emails
   - Final confirmation dialog before deletion
   - Loading state during deletion process

2. **Backend DELETE Endpoint** (`backend/server.js`):
   - Added DELETE method handler for `/api/auth/profile` route
   - Routes to `ProfileController.deleteProfile(req, res)`
   - Protected by authentication middleware
   - Already implemented in ProfileController

3. **Profile Controller** (`backend/controllers/ProfileController.js`):
   - `deleteProfile(req, res)` already implemented
   - Deletes profile from db_nike.profiles table
   - Requires authentication
   - Returns success/error responses

4. **Frontend Deletion Flow** (`frontend/pages/profile.html`):
   - `confirmAccountDeletion()` - Opens modal and displays current email
   - `executeAccountDeletion()` - Validates email and executes deletion
   - Email validation with clear error messages
   - Final confirmation prompt
   - Calls DELETE /api/auth/profile with auth token
   - Attempts to delete Supabase auth user (admin.deleteUser)
   - Shows success message and logs out after 2 seconds
   - Proper error handling with user feedback

**Features**:
- ✅ Professional modal with danger styling
- ✅ Email confirmation required to proceed
- ✅ Lists all data that will be deleted
- ✅ Case-insensitive email matching
- ✅ Clear error messages for validation failures
- ✅ Final confirmation dialog
- ✅ Loading state with spinner during deletion
- ✅ Success message before logout
- ✅ Deletes profile from database
- ✅ Attempts to delete Supabase auth user
- ✅ Automatic logout after deletion
- ✅ Proper error handling throughout

**Security**:
- ✅ Requires active authentication session
- ✅ Email confirmation prevents accidental deletion
- ✅ Final confirmation dialog adds extra safety
- ✅ Backend validates user ownership
- ✅ Cannot delete another user's account

**Files Modified**:
- `frontend/pages/profile.html`: Added modal and JavaScript functions
- `backend/server.js`: Added DELETE route handler for /api/auth/profile

**User Flow**:
1. User clicks "Delete Account" button in Account Settings
2. Modal opens showing warning and data to be deleted
3. User must type their email address exactly
4. System validates email matches current user email
5. Final confirmation dialog appears
6. System deletes profile from database
7. System attempts to delete Supabase auth user
8. Success message shown
9. User automatically logged out after 2 seconds
10. Redirected to homepage


## DEPLOYMENT REQUIREMENTS
- **Frontend**: Static hosting (Netlify/Vercel) with build process
- **Backend**: Node.js hosting (Railway/Heroku) with environment variables
- **Database**: Supabase cloud instance
- **CDN**: For static assets and images
- **SSL**: HTTPS enforcement
- **Environment**: Separate dev/staging/production configs via .env files
- **Build Process**: `npm run build` creates production-ready files

## ADMIN DASHBOARD ENDPOINTS (Oct 2025 - Complete Implementation)
✅ IMPLEMENTED: Full admin dashboard with data aggregation and joins

**Implementation Overview:**

The admin dashboard (`/api/admin/`) provides aggregated statistics and recent activity data with joined information from related tables.

**Backend Endpoints** (`backend/controllers/AdminController.js`):

1. **GET /api/admin/** - Dashboard Overview
   - Returns aggregated data in single request
   - Combines: summary (totals), stats (counts), recentActivity (orders + products)
   - Joins profiles table to get username and avatar_url for recent orders
   - Joins shoes table to get shoe details for top-selling products

2. **GET /api/admin/statistics** - Detailed Statistics (Stub - Coming Soon)

3. **GET /api/admin/users** - User Management (Stub - Coming Soon)

4. **GET /api/admin/inventory** - Inventory Stats (Stub - Coming Soon)

5. **GET /api/admin/orders** - Order Management (Stub - Coming Soon)

**Key Database Joins:**

1. **Recent Orders Query** (lines 120-149):
   ```sql
   SELECT orders.*, profiles.username, profiles.avatar_url
   FROM orders
   LEFT JOIN profiles ON orders.user_id = profiles.user_id
   ORDER BY orders.created_at DESC
   LIMIT 5
   ```
   - Gets order info WITH customer username and avatar
   - Displays customer profile picture in dashboard

2. **Top Selling Products Query** (lines 151-200):
   ```sql
   SELECT order_items.quantity, 
          shoes.shoe_id, shoes.shoe_name, shoes.image_url
   FROM order_items
   INNER JOIN shoe_variants ON order_items.variant_id = shoe_variants.variant_id
   INNER JOIN shoes ON shoe_variants.shoe_id = shoes.shoe_id
   ORDER BY order_items.quantity DESC
   LIMIT 5
   ```
   - Joins order_items → shoe_variants → shoes
   - Aggregates sales by product
   - Returns shoe picture, name, and sales count

**Dashboard Response Structure:**

```javascript
{
  success: true,
  data: {
    summary: {
      totalProducts: 45,
      totalOrders: 128,
      lowStockItems: 5,
      totalRevenue: "15234.50"
    },
    stats: {
      activeCategories: 8,
      totalVariants: 342,
      pendingOrders: 12
    },
    recentActivity: {
      recentOrders: [
        {
          order_id: "ORD001",
          user_id: "uuid",
          total_amount: 129.99,
          order_status: "delivered",
          created_at: "2025-01-15T10:30:00Z",
          username: "john_doe",
          avatar_url: "https://..."
        }
      ],
      topSellingProducts: [
        {
          shoe_id: 1,
          shoe_name: "Nike Air Force 1",
          image_url: "https://...",
          salesCount: 45
        }
      ]
    }
  }
}
```

**Frontend Integration:**

1. **AdminAPI.js** - API wrapper class
   - `getDashboard()` - Fetches dashboard data
   - `getStatistics()` - Gets stats data
   - Error handling and fallback defaults

2. **AdminCore.js** - Data management
   - `loadDashboardData()` - Calls AdminAPI
   - Stores data in state

3. **AdminManager.js** - UI rendering
   - `loadDashboard()` - Fetches and triggers render
   - `renderDashboard()` - Generates HTML with data
   - `renderRecentOrders()` - Displays orders with avatars
   - `renderTopSellingProducts()` - Shows product cards with images
   - `getStatusBadgeClass()` - Color-codes order statuses

4. **admin.html** - Dashboard display
   - Summary cards (4 columns)
   - Statistics list (3 items)
   - Recent orders table with customer avatars
   - Top selling products gallery (3 columns)

**Files Modified:**
- `backend/controllers/AdminController.js`: Implemented all dashboard methods with joins
- `frontend/assets/js/admin/AdminAPI.js`: Created new API wrapper
- `frontend/assets/js/admin/AdminCore.js`: Added loadDashboardData()
- `frontend/assets/js/admin/AdminManager.js`: Added loadDashboard(), renderDashboard(), helper methods
- `frontend/pages/admin.html`: Added AdminAPI script, updated dashboard HTML
- `backend/server.js`: Already has handleAdminRoutes() wired correctly

**Key Learning Concepts:**

1. **Database Joins**: Using Supabase `.select()` with nested relations
   - `profiles:user_id ()` - Left join to get customer info
   - `shoe_variants!inner () → shoes!inner ()` - Inner joins for product data

2. **Data Aggregation**: Map/reduce pattern to combine sales by product
   ```javascript
   const productMap = new Map();
   data.forEach(item => {
     // Aggregate by shoe_id
   });
   Array.from(productMap.values()).sort(...);
   ```

3. **API Wrapper Pattern**: Single class handles all admin API calls
   - Consistent error handling
   - Centralized endpoint management
   - Easy to extend with new methods

4. **Async/Await Flow**: Parallel data loading
   ```javascript
   await Promise.all([
     this.core.loadShoes(),
     this.core.loadCategories(),
     this.loadDashboard()
   ]);
   ```

5. **Template Literals**: Dynamic HTML generation
   - Embed data directly in strings
   - Map arrays to HTML rows/cards
   - Conditional rendering (avatar vs icon)

**Testing:**
- Backend: Verify `/api/admin/` returns proper data
- Frontend: Check browser console for successful API calls
- Dashboard: Verify cards, tables, and product cards render correctly
- Avatar display: Check if user avatars show in recent orders table

**Performance Notes:**
- All queries use `count: 'exact'` with `head: true` for efficiency
- Limits set on queries to reduce data transfer
- No N+1 queries due to proper joins
- Avatar images lazy-loaded with fallback icons

Admin Routes Refactoring (Oct 2025)
-----------------------------------
✅ COMPLETED: Extracted admin route handlers from server.js into dedicated routes/admin.js file

**Objectives:**
- Better code organization and maintainability
- Follow modular routes pattern consistent with other routes (products, variants, categories, etc.)
- Reduce server.js file complexity
- Prepare for future admin endpoint expansion

**Implementation Details:**

1. **New File** (`backend/routes/admin.js`):
   - Exported default function `handleAdminRoutes(req, res, adminController, pathname, sendError)`
   - Handles all `/api/admin/*` endpoints
   - Includes authentication middleware check
   - Manages 5 endpoints:
     - GET /api/admin/ → adminController.getDashboard()
     - GET /api/admin/statistics → adminController.getStatistics()
     - GET /api/admin/users → adminController.getUserManagement()
     - GET /api/admin/inventory → adminController.getInventoryManagement()
     - GET /api/admin/orders → adminController.getOrderManagement()
   - Centralized error handling for admin routes

2. **Updated** (`backend/server.js`):
   - Added import statement: `import adminRoutes from './routes/admin.js'`
   - Simplified handleAdminRoutes() method to delegate to new module
   - Maintains same calling convention for backward compatibility
   - Binds sendError method to preserve this context

3. **Benefits:**
   - ✅ Follows established modular routes pattern
   - ✅ Reduces server.js by ~50 lines (473-521)
   - ✅ Easier to extend admin endpoints in future
   - ✅ Better code organization and readability
   - ✅ Clearer separation of concerns
   - ✅ All admin logic now in dedicated file

**Files Modified:**
- `backend/routes/admin.js`: NEW - Contains all admin route handlers
- `backend/server.js`: Updated import and handleAdminRoutes delegation

**Backward Compatibility:**
- ✅ No API changes - all endpoints work identically
- ✅ No frontend changes needed
- ✅ No database changes
- ✅ All admin controller methods remain unchanged

Admin Controller Refactoring - Supabase Queries to Models (Oct 2025)
--------------------------------------------------------------------
✅ COMPLETED: Moved all Supabase query logic from AdminController to corresponding model files

**Objectives:**
- Follow proper MVC pattern separation of concerns
- Move database logic from controller to models (where it belongs)
- Reduce AdminController complexity and responsibility
- Improve code reusability and testability
- Cleaner controller code focused on request/response handling

**Implementation Details:**

1. **Shoe Model** (`backend/models/Shoe.js`):
   - Added `countAll()` - Count all products
   - Replaces: `AdminController.countActiveProducts()`

2. **Order Model** (`backend/models/Order.js`):
   - Added `countAll()` - Count all orders
   - Added `countPending()` - Count pending/processing orders
   - Added `getRecent(limit)` - Get recent orders with user profile info
   - Replaces: `AdminController.countOrders()`, `countPendingOrders()`, `getRecentOrders()`

3. **Payment Model** (`backend/models/Payment.js`):
   - Added `calculateTotalRevenue()` - Sum all completed payments
   - Replaces: `AdminController.calculateRevenue()`

4. **ShoeVariant Model** (`backend/models/ShoeVariant.js`):
   - Added `countAll()` - Count all variants
   - Added `getLowStockCount(threshold)` - Count variants below threshold (default 10)
   - Replaces: `AdminController.countVariants()`, `getLowStockCount()`

5. **Category Model** (`backend/models/Category.js`):
   - Added `countAll()` - Count all categories
   - Replaces: `AdminController.countCategories()`

6. **OrderItem Model** (`backend/models/OrderItem.js`):
   - Added `getTopSellingProducts(limit)` - Get top products with aggregated sales counts
   - Replaces: `AdminController.getTopSellingProducts()`

7. **AdminController** (`backend/controllers/AdminController.js`):
   - Refactored `getDashboard()` to call model methods instead of local helpers
   - Removed 9 helper methods (~230 lines):
     - ~~countActiveProducts()~~
     - ~~countOrders()~~
     - ~~getLowStockCount()~~
     - ~~calculateRevenue()~~
     - ~~countCategories()~~
     - ~~countVariants()~~
     - ~~countPendingOrders()~~
     - ~~getRecentOrders()~~
     - ~~getTopSellingProducts()~~
   - Controller reduced from 378 lines to 149 lines (60% reduction)
   - Now focused on HTTP request/response handling only

**Code Quality Improvements:**
- ✅ Better separation of concerns (models handle DB, controller handles HTTP)
- ✅ DRY principle - no duplicate code across controllers
- ✅ Easier testing - can test model queries independently
- ✅ Better reusability - other controllers can use same model methods
- ✅ Consistent error handling across all models
- ✅ Clear method naming and documentation

**Example Usage:**

```javascript
// Before (in controller):
async countActiveProducts() {
    const { count, error } = await this.models.Shoe.supabase
        .from('shoes')
        .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
}

// After (in model):
async countAll() {
    try {
        const { count, error } = await supabaseConfig
            .getAdminClient()
            .from(this.tableName)
            .select('*', { count: 'exact', head: true });
        if (error) {
            console.error("Error counting products:", error);
            return 0;
        }
        return count || 0;
    } catch (err) {
        console.error("Error counting products:", err);
        return 0;
    }
}

// Controller now simply calls:
const totalProducts = await this.models.Shoe.countAll();
```

**Files Modified:**
- `backend/models/Shoe.js`: Added countAll()
- `backend/models/Order.js`: Added countAll(), countPending(), getRecent()
- `backend/models/Payment.js`: Added calculateTotalRevenue()
- `backend/models/ShoeVariant.js`: Added countAll(), getLowStockCount()
- `backend/models/Category.js`: Added countAll()
- `backend/models/OrderItem.js`: Added getTopSellingProducts()
- `backend/controllers/AdminController.js`: Refactored getDashboard(), removed 9 helper methods

**Backward Compatibility:**
- ✅ No API changes - dashboard response identical
- ✅ No frontend changes needed
- ✅ No database changes
- ✅ Internal refactoring only
- ✅ All error handling preserved

**Benefits Summary:**
- 60% reduction in AdminController code
- Proper MVC pattern implementation
- Reusable model methods
- Better code organization
- Easier maintenance and testing

## AVATAR UPLOAD FUNCTIONALITY (Oct 2025)
✅ COMPLETED: Implemented avatar upload functionality for user profiles

**Implementation Details**:

1. **Backend ProfileController** (`backend/controllers/ProfileController.js`):
   - Added `uploadAvatar(req, res)` - POST /api/auth/upload-avatar
   - Handles file upload to Supabase storage
   - Updates `avatar_url` in the user's profile
   - Returns success/error response

2. **Frontend Profile Page** (`frontend/pages/profile.html`):
   - Added file input for avatar selection
   - Updated `updateProfile()` to include `avatar_url` in the payload
   - Displays success/error messages for avatar upload
   - Uses `window.authService.supabase.storage.from('avatars').upload`
   - Gets signed URL for direct upload

**Features**:
- ✅ User can select a new avatar from their device
- ✅ Avatar is uploaded to Supabase storage
- ✅ Signed URL is generated for direct upload
- ✅ Profile is updated with the new avatar URL
- ✅ Error handling for file size, type, and upload failures
- ✅ Success/error messages displayed to user
- ✅ No page reload required for avatar update

**Files Modified**:
- `backend/controllers/ProfileController.js`: Added uploadAvatar()
- `frontend/pages/profile.html`: Added file input and updated updateProfile()

**Database Schema**:
- Table: `db_nike.profiles`
- Key fields: user_id (PK, UUID), username, full_name, phone, date_of_birth, gender, avatar_url, role, created_at, updated_at

**Benefits**:
- ✅ Improved user profile customization
- ✅ Consistent avatar across all pages
- ✅ No backend file system dependencies
- ✅ Secure and scalable storage

## AVATAR UPLOAD BUG FIX (Oct 2025)
✅ FIXED: Avatar upload 500 error caused by missing class method indentation

**Root Cause**:

The `parseMultipartData()` and `convertFieldTypes()` methods in `backend/middleware/upload.js` were defined with incorrect indentation and were NOT part of the `UploadMiddleware` class. This caused the methods to be undefined at runtime, resulting in a 500 Internal Server Error when trying to process multipart form-data requests.

**Error Flow**:
1. User uploads avatar in profile.html and clicks "Save Changes"
2. Frontend sends FormData with `avatar_file` as multipart/form-data to PUT /api/auth/profile
3. Server detects multipart request and calls `createAvatarUploadMiddleware(req.user.id)`
4. Middleware's `handleUpload()` method calls `await this.parseMultipartData(buffer, req.headers)` (line 260)
5. **BUG**: `parseMultipartData` was not a class method (bad indentation)
6. Runtime error: "this.parseMultipartData is not a function" → 500 error

**The Fix**:

Fixed indentation of two methods in `backend/middleware/upload.js`:

1. **`parseMultipartData(buffer, headers)` (lines 60-115)**:
   - **Before**: Method body indented at wrong level (column 0 instead of column 2)
   - **After**: Properly indented as part of `UploadMiddleware` class (column 2)
   - This method parses multipart form-data using busboy library
   - Extracts files and form fields from request buffer
   - Converts field types (strings to numbers/floats) before resolving

2. **`convertFieldTypes(fields)` (lines 291-314)**:
   - **Before**: Method body indented at wrong level (column 0 instead of column 2)
   - **After**: Properly indented as part of `UploadMiddleware` class (column 2)
   - This method converts string form fields to proper types
   - Handles integer fields (category_id, stock, quantity, variant_id)
   - Handles float fields (base_price, price)

**Files Modified**:
- `backend/middleware/upload.js`: Fixed indentation of parseMultipartData() and convertFieldTypes() methods

**How It Works Now**:

1. User selects avatar file and saves profile
2. Frontend sends FormData with `avatar_file` to PUT /api/auth/profile
3. Server.js detects multipart/form-data and applies avatar upload middleware
4. Middleware's handleUpload() correctly calls parseMultipartData() (now a proper class method)
5. parseMultipartData() buffers request and uses busboy to parse multipart data
6. Calls convertFieldTypes() to convert string fields to proper types
7. Uploads file to Supabase Storage bucket "avatars"
8. Returns image URL and sets req.body.image_url
9. ProfileController.updateProfile() receives req.body with image_url
10. Maps image_url to avatar_url and updates profile in database
11. Returns success response to frontend
12. Frontend shows success message and reloads profile

**Testing Steps**:

1. Start the server: `npm start`
2. Navigate to Profile page (must be logged in)
3. Click on Personal Info tab
4. Select an avatar image (JPG/PNG/WEBP)
5. Click "Save Changes" button
6. **Expected Result**: Success message appears, avatar updates without 500 error
7. **Verify**: Check browser console for no errors
8. **Verify**: Check Supabase Storage "avatars" bucket for uploaded file
9. **Verify**: Refresh page - avatar should persist from database

**Error Handling**:

The fix also ensures proper error handling in the upload flow:
- File validation errors → 400 Bad Request
- Upload failures → 400 Bad Request with error message
- Database errors → 500 Internal Server Error with details
- All errors properly logged to console with 🔴 error indicators

**Related Features**:
- Avatar upload uses existing multipart upload middleware
- Same bucket and path configuration as product uploads
- File optimization (resizing, quality) via Sharp library
- Support for JPG, PNG, WEBP formats (max 5MB)
- Supabase Storage integration with signed URLs

