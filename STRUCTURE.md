# SNEVO E-COMMERCE PLATFORM - NEW STRUCTURE (updated)

## PROJECT OVERVIEW
**Name**: Snevo E-commerce Platform  
**Type**: Nike-inspired shoe e-commerce website  
**Architecture**: MVC Pattern with Node.js backend and vanilla frontend  
**Database**: Supabase PostgreSQL with comprehensive shoe retail schema

## NEW FOLDER STRUCTURE

```
snevo/
├── backend/                           # ⚙️ Backend Node.js OOP MVC
│   ├── controllers/                   # 🎯 Controllers - Xử lý API requests
│   │   ├── AuthController.js          # (removed) Supabase handles auth
│   │   ├── ProfileController.js       # 👨‍💼 Hồ sơ - Quản lý profiles của users
│   │   ├── AddressController.js       # 🏠 Địa chỉ - CRUD addresses của users
│   │   ├── CategoryController.js      # 📂 Danh mục - CRUD categories giày
│   │   ├── ProductController.js       # 👟 Sản phẩm - CRUD shoes table
│   │   ├── ColorController.js         # 🎨 Màu sắc - CRUD colors table
│   │   ├── SizeController.js          # 📏 Kích cỡ - CRUD sizes table
│   │   ├── VariantController.js       # ⭐ Biến thể - CRUD shoe_variants (quan trọng nhất)
│   │   ├── ImportController.js        # 📥 Nhập kho - CRUD imports từ suppliers
│   │   ├── OrderController.js         # 🛒 Đơn hàng - CRUD orders
│   │   ├── OrderItemController.js     # 📋 Chi tiết đơn - CRUD order_items
│   │   ├── PaymentController.js       # 💳 Thanh toán - CRUD payments
│   │   └── AdminController.js         # 👑 Admin - Dashboard tổng quan
│   ├── models/                        # 📊 Models - Theo đúng database schema
│   │   ├── BaseModel.js               # 🏗️ Base class - Chung cho tất cả models
│   │   ├── Profile.js                 # 👨‍💼 Model profiles table
│   │   ├── Address.js                 # 🏠 Model addresses table
│   │   ├── Category.js                # 📂 Model categories table
│   │   ├── Shoe.js                    # 👟 Model shoes table
│   │   ├── Color.js                   # 🎨 Model colors table
│   │   ├── Size.js                    # 📏 Model sizes table
│   │   ├── ShoeVariant.js             # ⭐ Model shoe_variants table (trung tâm)
│   │   ├── Import.js                  # 📥 Model imports table
│   │   ├── Order.js                   # 🛒 Model orders table
│   │   ├── OrderItem.js               # 📋 Model order_items table
│   │   ├── Payment.js                 # 💳 Model payments table
│   │   └── Review.js                  # ⭐ Model reviews table
│   ├── routes/                        # 🛣️ API routes - Kết nối endpoints với controllers (no Express)
│   │   ├── index.js                   # 🏠 Main router - Tập hợp tất cả routes
│   │   ├── auth.js                    # 🔐 Auth routes - /api/auth/*
│   │   ├── users.js                   # (removed)
│   │   ├── profiles.js                # (removed)
│   │   ├── addresses.js               # (removed)
│   │   ├── categories.js              # 📂 Category routes - /api/categories/*
│   │   ├── products.js                # 👟 Product routes - /api/products/*
│   │   ├── colors.js                  # 🎨 Color routes - /api/colors/*
│   │   ├── sizes.js                   # 📏 Size routes - /api/sizes/*
│   │   ├── variants.js                # ⭐ Variant routes - /api/variants/*
│   │   ├── imports.js                 # (removed)
│   │   ├── orders.js                  # (removed)
│   │   ├── payments.js                # (removed)
│   │   ├── reviews.js                 # (removed)
│   │   └── admin.js                   # (removed)
│   ├── middleware/                    # 🛡️ Middleware - Auth, validation, errors
│   │   ├── auth.js                    # 🔐 JWT authentication middleware
│   │   ├── admin.js                   # 👑 Admin authorization middleware
│   │   ├── validation.js              # ✅ Request validation middleware
│   │   ├── cors.js                    # 🌐 CORS configuration middleware
│   │   ├── upload.js                  # 📤 File upload middleware
│   │   └── errors.js                  # 🚨 Global error handling middleware
│   ├── utils/                         # 🔧 Utilities - Helpers, base classes, tools
│   │   ├── jwt.js                     # (removed) Supabase manages JWT
│   │   ├── validation.js              # ✅ Validation schemas (Joi)
│   │   ├── stock.js                   # 📊 Stock calculation utilities
│   │   ├── constants.js               # 📋 Application constants
│   │   └── errors.js                  # 🚨 Custom error classes
│   └── server.js                      # 🚀 Server entry point
├── frontend/                          # 🎨 Frontend Nike-style
│   ├── assets/                        # 📦 Static assets
│   │   ├── css/                       # 🎨 Stylesheets
│   │   │   ├── main.css               # 🎨 Main Nike-style CSS
│   │   │   ├── components.css         # 🧩 Component styles
│   │   │   ├── animations.css         # ✨ Nike animations & transitions
│   │   │   └── responsive.css         # 📱 Mobile responsive styles
│   │   ├── js/                        # 💻 OOP JavaScript classes
│   │   │   ├── Application.js         # 🚀 Main application class
│   │   │   ├── AuthManager.js         # 🔐 Authentication manager
│   │   │   ├── NavbarManager.js       # 🧭 Unified navbar manager with overrides
│   │   │   ├── UserManager.js         # 👤 User profile manager
│   │   │   ├── ProductManager.js      # 👟 Product & shoe manager
│   │   │   ├── VariantManager.js      # ⭐ Shoe variant manager (size/color/stock)
│   │   │   ├── CategoryManager.js     # 📂 Category manager
│   │   │   ├── CartManager.js         # 🛍️ Shopping cart manager
│   │   │   ├── OrderManager.js        # 🛒 Order management
│   │   │   ├── ReviewManager.js       # ⭐ Review manager
│   │   │   ├── AdminManager.js        # 👑 Admin dashboard manager
│   │   │   └── utils.js               # 🔧 Frontend utilities & helpers
│   │   └── images/                    # 🖼️ Images & assets
│   │       ├── products/              # 👟 Product images
│   │       ├── variants/              # ⭐ Variant images (theo màu sắc)
│   │       ├── categories/            # 📂 Category images
│   │       └── ui/                    # 🎨 UI elements & icons
│   ├── pages/                         # 📄 HTML pages với Nike animations
│   │   ├── index.html                 # 🏠 Homepage với hero banner
│   │   ├── products.html              # 👟 Product listing page
│   │   ├── product-detail.html        # 🔍 Product detail với variant selector
│   │   ├── categories.html            # 📂 Category listing page
│   │   ├── cart.html                  # 🛍️ Shopping cart page
│   │   ├── checkout.html              # 💳 Checkout process page
│   │   ├── orders.html                # 📦 Order history page
│   │   ├── profile.html               # 👤 User profile page
│   │   ├── addresses.html             # 🏠 Address management page
│   │   ├── login.html                 # (removed) Use global login modal
│   │   ├── register.html              # (removed)
│   │   └── admin.html                 # 👑 Admin dashboard page
│   └── components/                    # 🧩 Reusable UI components
│       ├── navbar.html                # 🧭 Unified navbar template with overrides
│       ├── navbar-overrides.js        # 🔧 Navbar override presets & utilities
│       ├── header.html                # 🎯 Site header với navigation (legacy)
│       ├── footer.html                # 🔗 Site footer
│       ├── product-card.html          # 🃏 Product card component
│       ├── variant-selector.html      # ⭐ Size/Color selector component
│       ├── cart-item.html             # 🛍️ Cart item component
│       ├── review-card.html           # ⭐ Review component
│       ├── modal.html                 # 🪟 Modal dialog component
│       └── loading.html               # ⏳ Loading spinner component
├── config/                            # ⚙️ Configuration files
│   ├── supabase.js                    # 🗄️ Supabase configuration
│   ├── app.js                         # 🚀 Application configuration
│   └── upload.js                      # 📤 File upload configuration
├── scripts/                           # 📜 Build system & deployment
│   ├── build.js                       # 🏗️ Build script với environment injection
│   ├── seed.js                        # 🌱 Database seeding script
│   └── deploy.js                      # 🚀 Deployment script
├── docs/                              # 📚 Documentation
│   ├── README.md                      # 📖 Project overview
│   ├── API.md                         # 📡 API documentation
│   ├── DATABASE.md                    # 🗃️ Database schema documentation
│   ├── SETUP.md                       # 🛠️ Setup instructions
│   └── DEPLOYMENT.md                  # 🚀 Deployment guide
└── schema.sql                         # 🗄️ Database schema
```

## UNIFIED NAVBAR SYSTEM

### Overview
The unified navbar system provides consistent navigation across all pages with page-specific overrides support.

### Key Components
- **`frontend/components/navbar.html`**: Unified navbar template with Bootstrap styling
- **`frontend/assets/js/NavbarManager.js`**: Manages navbar rendering, state updates, and overrides
  - Role-aware integration: works with `AuthManager.updateAuthUI()` output (`#authButtons`)
  - Seller users will see link to `admin.html`; customers to `profile.html`
- **`frontend/components/navbar-overrides.js`**: Preset override configurations for different page types

### Implementation
- **Page Integration**: Each page uses `<div id="navbarRoot" data-navbar-page="pageType"></div>`
- **Override System**: Supports `window.NAVBAR_OVERRIDES` and `data-navbar-*` attributes
- **State Synchronization**: Automatically syncs with AuthManager and CartManager
- **Path Resolution**: Handles relative paths automatically based on current page location

### Auth/Role Integration (Simplified with Direct Supabase)
- Frontend uses direct Supabase Auth client (no backend auth proxy)
- `AuthService` handles all authentication operations directly with Supabase
- User roles fetched from `db_nike.profiles` table after Supabase authentication
- `AuthManager.updateAuthUI()` renders admin/profile links based on role from profiles table
- Role-based navigation: 'customer' → profile.html, 'seller' → admin.html
- No backend auth controller, routes, or JWT utilities needed
- Session management handled entirely by Supabase client
- Auth state persists across pages via Supabase's localStorage tokens
- Pages await `authService.initialize()` to ensure session is restored before auth checks
- `readyPromise` pattern ensures no race conditions on page load

### Override Examples
```javascript
// Checkout page - hide cart, show progress
window.NAVBAR_OVERRIDES = {
    hideCart: true,
    showProgressBar: true,
    customActions: ['save-progress', 'back-to-cart']
};

// Admin page - show admin menu
window.NAVBAR_OVERRIDES = {
    showAdminMenu: true,
    customActions: ['admin-dashboard', 'logout']
};
```

## USER FLOWS

### Flow 1: Authentication & Account Setup
Homepage → Login through Google only → Email Verification (only to order)→ 
Profile Setup → Address Addition → Dashboard Welcome

## LANDING PAGE (index.html) - PROTOTYPE OVERVIEW

- Sections:
  - Header with primary navigation (`Products`, `Categories`, `Cart`, `Orders`, `Profile`, `Login`)
    - Login opens a Google login modal (no password forms)
  - Hero with primary CTAs (`Shop Now` → `products.html`, `Browse Categories` → `categories.html`)
  - Featured Categories preview (anchors to `categories.html#men|#women|#kids`)
  - Trending products preview (placeholder cards link to `products.html`)
  - Brand story with CTAs (`login.html` intercepted to modal, `profile.html`)
  - Quick Links (`cart.html`, `checkout.html`, `orders.html`, `addresses.html`)
  - Footer (copyright)

- Route map from landing:
  - `/frontend/pages/products.html`
  - `/frontend/pages/categories.html`
  - `/frontend/pages/cart.html`
  - `/frontend/pages/orders.html`
  - `/frontend/pages/profile.html`
  - `/frontend/pages/login.html`
  - `/frontend/pages/checkout.html`
  - `/frontend/pages/addresses.html`

- Scripts loaded:
  - `../assets/js/Application.js`
  - `../assets/js/animations.js`
  - `../assets/js/main.js`

### Flow 2: Product Discovery & Browsing
Homepage → Category Selection → Product Grid → Filter Application (price range, size, color, brand) → 
Sort Options (ascending/descending in price, name a->z) → Search Function → Filtered Product Results Display

### Flow 3: Product Detail & Variant Selection
Product Card Click → Product Detail Page → Image Gallery → Size Selection → 
Color Selection → Stock Check → Price Update → Add to Cart

### Flow 4: Shopping Cart Management
Add to Cart → Cart Sidebar Open → Quantity Adjustment → Variant Change → 
Remove Items → Price Recalculation → Continue Shopping or Checkout

### Flow 5: Checkout Process
Login only -> cart review → Shipping Address Selection → 
Delivery Options (mock) → Payment Method (extra: vnpay) → Order Review → Payment Processing (mock if no vnpay) → 
Order Confirmation

### Flow 6: Order History & Management
Order Confirmation → Email Receipt → Order Tracking Page → Status Updates → 
Delivery Notification → Order Completion → Review Prompt

### Flow 7: User Profile Management
Profile Access → Personal Info Edit → Address Book Management (separate from 'profile' table) → 
Password Change → Notification Preferences → Account Settings Save

### Flow 8: Product Review System
Under each product
Review View → Review Form → Rating Selection → 
Photo Upload → Review Submission → Review Display

### Flow 9: Advanced Search & Filtering
Search Bar Focus → Search Query → Product Selection

### Flow 10: Admin Product & Inventory Management (Supabase frontend)
Seller Login → Admin Dashboard →
- Categories: list/create/update/delete (subject to RLS permissions)
- Variants (`shoe_variants`): list/create/update/delete
- Stock: add via `imports` insert (triggers stock increase)

### Flow 11: Admin Inventory Management
Inventory Dashboard → Stock Levels Review → Low Stock Alerts (mock) → Import Order → Stock Update → Alert Notification

### Flow 12: Admin Order Processing
Order Queue → Order Detail View → Status Update → Payment Verification → 
Shipping Label → Tracking Update → Customer Notification



