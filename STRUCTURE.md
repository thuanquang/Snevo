# PROJECT STRUCTURE - E-COMMERCE NIKE-STYLE WEB APPLICATION

## ARCHITECTURE: Object-Oriented MVC Pattern
- **Model**: OOP-based database models extending BaseModel with validation, relationships, and business logic
- **View**: Component-based frontend with BaseComponent classes and modular UI elements
- **Controller**: OOP controllers extending BaseController with request handling, validation, and response formatting

## TECHNOLOGY STACK
- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ Classes, Bootstrap 5.3
- **Backend**: Node.js (built-in HTTP module, no Express.js) with OOP Architecture
- **Database**: Supabase PostgreSQL with provided schema
- **Authentication**: Supabase Auth + Google OAuth with OOP AuthManager
- **Architecture**: Object-Oriented MVC with inheritance, composition, and encapsulation

## DIRECTORY STRUCTURE
```
/
├── backend/                    # Server-side application (OOP Architecture)
│   ├── controllers/           # OOP Controllers extending BaseController
│   │   ├── authController.js  # AuthController class - authentication logic (✓ implemented)
│   │   ├── productController.js # ProductController class - product management (✓ implemented)
│   │   └── orderController.js # OrderController class - order processing (✓ implemented)
│   ├── models/               # OOP Models extending BaseModel
│   │   ├── User.js          # User model class with validation and relationships (✓ implemented)
│   │   ├── Product.js       # Product/Shoe model class with variant management (✓ implemented)
│   │   ├── Order.js         # Order model class with status tracking (✓ implemented)
│   │   └── Category.js      # Category model class with hierarchy support (✓ implemented)
│   ├── routes/              # Route definitions using controller instances
│   │   ├── api.js           # API route handlers (✓ enhanced with comprehensive docs)
│   │   ├── auth.js          # Authentication routes (✓ implemented)
│   │   ├── products.js      # Product routes (✓ implemented)
│   │   └── orders.js        # Order routes (✓ implemented)
│   ├── middleware/          # Custom middleware functions
│   │   ├── auth.js          # Authentication middleware (✓ enhanced with role-based access)
│   │   ├── cors.js          # CORS handling (✓ implemented)
│   │   └── validation.js    # Request validation (✓ comprehensive validation system)
│   ├── utils/               # OOP Utility classes and base classes
│   │   ├── BaseModel.js     # Abstract base model class (✓ implemented)
│   │   ├── BaseController.js # Abstract base controller class (✓ implemented)
│   │   └── ErrorClasses.js  # Custom error classes with inheritance (✓ comprehensive)
│   ├── config/              # Configuration files
│   │   ├── database.js      # Database configuration
│   │   └── auth.js          # Authentication configuration
│   └── server.js            # Main server class (SnevoServer)
├── frontend/               # Client-side application
│   ├── assets/            # Static assets
│   │   ├── css/           # Stylesheets
│   │   │   ├── main.css   # Main stylesheet
│   │   │   ├── animations.css # Nike-style animations
│   │   │   ├── components.css # Component styles
│   │   │   └── responsive.css # Responsive design
│   │   ├── js/            # JavaScript OOP classes and modules
│   │   │   ├── main.js    # Legacy compatibility layer
│   │   │   ├── config.js  # Frontend configuration (✓ implemented)
│   │   │   ├── login.js   # Login page functionality (✓ implemented)
│   │   │   ├── Application.js # Main application class (orchestrates everything)
│   │   │   ├── AuthManager.js # OOP authentication management class (✓ implemented)
│   │   │   ├── ProductManager.js # OOP product management class
│   │   │   ├── BaseComponent.js # Abstract base component class
│   │   │   ├── ApiClient.js # OOP API client with interceptors (✓ implemented)
│   │   │   └── animations.js # Animation controllers
│   │   ├── images/        # Image assets
│   │   │   ├── products/  # Product images
│   │   │   ├── icons/     # UI icons
│   │   │   └── hero/      # Hero section images
│   │   └── fonts/         # Custom fonts
│   ├── components/        # Reusable UI components
│   │   ├── header.html    # Header component
│   │   ├── footer.html    # Footer component
│   │   ├── product-card.html # Product card component
│   │   └── modal.html     # Modal component
│   ├── pages/             # HTML pages
│   │   ├── index.html     # Landing page (✓ implemented)
│   │   ├── login.html     # Login page (✓ implemented with Supabase auth)
│   │   ├── products.html  # Product browsing
│   │   ├── product-detail.html # Product detail view
│   │   ├── cart.html      # Shopping cart
│   │   └── profile.html   # User profile
│   └── views/             # MVC Views (templates)
│       ├── layouts/       # Layout templates
│       └── partials/      # Partial templates
├── config/                # Project configuration
│   ├── .env.example      # Environment variables template
│   ├── supabase.js       # Supabase configuration
│   └── constants.js      # Application constants
├── docs/                 # Documentation
│   ├── api.md           # API documentation
│   ├── database.md      # Database schema documentation
│   └── deployment.md    # Deployment instructions
├── tests/               # Test files
│   ├── backend/         # Backend tests
│   └── frontend/        # Frontend tests
├── package.json         # Node.js dependencies (✓ updated with build scripts)
├── .gitignore          # Git ignore rules
├── env.example         # Environment variables template (✓ implemented)
├── .env                # Environment variables (not committed)
├── README.md           # Project documentation (✓ updated)
├── schema.sql          # Database schema (existing)
├── scripts/            # Build and utility scripts (✓ implemented)
│   ├── build.js        # Main build script with env injection
│   ├── build-frontend.js # Frontend build with env injection
│   └── dev-config.js   # Development config generation
├── docs/               # Documentation
│   └── BUILD.md        # Build system documentation (✓ implemented)
├── STRUCTURE.md        # This file
└── EXTENSION_FUNCTIONALITY.md # Detailed project functionality
```

## OOP MVC IMPLEMENTATION DETAILS

### MODELS (backend/models/)
- **BaseModel**: Abstract base class with common CRUD operations, validation, and error handling
- **User Model**: Extends BaseModel with authentication, profile management, and relationship handling
- **Product Model**: Extends BaseModel with variant management, search, and category relationships
- **Category Model**: Extends BaseModel with hierarchy support and product counting
- **Features**: Built-in validation, field filtering, hidden fields, pagination, and caching

### VIEWS (frontend/assets/js/)
- **BaseComponent**: Abstract base class for UI components with lifecycle management
- **Application**: Main orchestration class managing all other components
- **AuthManager**: Handles authentication state, UI updates, and session management
- **ProductManager**: Manages product display, cart operations, and API communication
- **ApiClient**: OOP HTTP client with interceptors, error handling, and retry logic

### CONTROLLERS (backend/controllers/)
- **BaseController**: Abstract base class with request handling, validation, and response formatting
- **AuthController**: Extends BaseController with authentication endpoints and middleware
- **ProductController**: Extends BaseController with product CRUD, search, and review operations
- **Features**: Built-in validation, pagination helpers, error handling, and authentication checks

## KEY FEATURES TO IMPLEMENT
1. **Landing Page**: Nike-style hero sections, animated product showcases
2. **Authentication**: Supabase Auth with Google OAuth integration
3. **Product Browsing**: Category filtering, search, pagination
4. **Product Details**: Image galleries, variant selection, reviews
5. **User Management**: Profile, order history, addresses
6. **Responsive Design**: Mobile-first approach with Bootstrap

## OOP DEVELOPMENT WORKFLOW
1. **Base Classes**: Implement BaseModel, BaseController, BaseComponent with common functionality
2. **Backend Models**: Create model classes extending BaseModel with specific business logic
3. **Backend Controllers**: Implement controller classes extending BaseController with endpoint logic
4. **Frontend Managers**: Create manager classes for authentication, products, and application orchestration
5. **UI Components**: Build reusable component classes extending BaseComponent
6. **Integration**: Wire up OOP instances in routes and main application
7. **Testing & Optimization**: Test class inheritance, encapsulation, and performance

## PERFORMANCE CONSIDERATIONS
- Lazy loading for images and components
- Efficient database queries with proper indexing
- Client-side caching for frequently accessed data
- Optimized animations for smooth user experience
- Progressive loading for product catalogs

