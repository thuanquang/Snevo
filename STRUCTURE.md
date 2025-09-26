# PROJECT STRUCTURE - E-COMMERCE NIKE-STYLE WEB APPLICATION

## ARCHITECTURE: MVC Pattern
- **Model**: Database interactions, business logic, data validation
- **View**: Frontend templates, UI components, client-side rendering
- **Controller**: Request handling, routing, API endpoints, business flow coordination

## TECHNOLOGY STACK
- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+, Bootstrap 5.3
- **Backend**: Node.js (built-in HTTP module, no Express.js)
- **Database**: Supabase PostgreSQL with provided schema
- **Authentication**: Supabase Auth + Google OAuth
- **Architecture**: MVC (Model-View-Controller)

## DIRECTORY STRUCTURE
```
/
├── backend/                    # Server-side application
│   ├── controllers/           # Request handlers and business logic
│   │   ├── authController.js  # Authentication logic
│   │   ├── productController.js # Product management
│   │   ├── orderController.js # Order processing
│   │   └── userController.js  # User management
│   ├── models/               # Database models and business logic
│   │   ├── database.js       # Supabase connection
│   │   ├── User.js          # User model
│   │   ├── Product.js       # Product/Shoe model
│   │   ├── Order.js         # Order model
│   │   └── Category.js      # Category model
│   ├── routes/              # Route definitions
│   │   ├── api.js           # API route handlers
│   │   ├── auth.js          # Authentication routes
│   │   └── products.js      # Product routes
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js          # Authentication middleware
│   │   ├── cors.js          # CORS handling
│   │   └── validation.js    # Request validation
│   ├── utils/               # Utility functions
│   │   ├── helpers.js       # General helpers
│   │   ├── validation.js    # Data validation
│   │   └── response.js      # API response formatting
│   ├── config/              # Configuration files
│   │   ├── database.js      # Database configuration
│   │   └── auth.js          # Authentication configuration
│   └── server.js            # Main server file (Node.js HTTP)
├── frontend/               # Client-side application
│   ├── assets/            # Static assets
│   │   ├── css/           # Stylesheets
│   │   │   ├── main.css   # Main stylesheet
│   │   │   ├── animations.css # Nike-style animations
│   │   │   ├── components.css # Component styles
│   │   │   └── responsive.css # Responsive design
│   │   ├── js/            # JavaScript files
│   │   │   ├── main.js    # Main application logic
│   │   │   ├── auth.js    # Authentication handling
│   │   │   ├── products.js # Product browsing logic
│   │   │   ├── animations.js # Animation controllers
│   │   │   └── api.js     # API communication
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
│   │   ├── index.html     # Landing page
│   │   ├── login.html     # Login page
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
├── package.json         # Node.js dependencies
├── .gitignore          # Git ignore rules
├── .env                # Environment variables (not committed)
├── README.md           # Project documentation
├── schema.sql          # Database schema (existing)
├── STRUCTURE.md        # This file
└── EXTENSION_FUNCTIONALITY.md # Detailed project functionality
```

## MVC IMPLEMENTATION DETAILS

### MODELS (backend/models/)
- Handle database operations with Supabase
- Implement business logic and data validation
- Manage relationships between entities
- Handle CRUD operations for Users, Products, Orders, etc.

### VIEWS (frontend/pages/ + frontend/components/)
- Pure HTML templates with embedded JavaScript
- Bootstrap components for responsive design
- Nike-inspired animations and transitions
- Modular component system for reusability

### CONTROLLERS (backend/controllers/)
- Handle HTTP requests and responses
- Coordinate between Models and Views
- Implement API endpoints
- Manage authentication and authorization
- Process business logic flow

## KEY FEATURES TO IMPLEMENT
1. **Landing Page**: Nike-style hero sections, animated product showcases
2. **Authentication**: Supabase Auth with Google OAuth integration
3. **Product Browsing**: Category filtering, search, pagination
4. **Product Details**: Image galleries, variant selection, reviews
5. **User Management**: Profile, order history, addresses
6. **Responsive Design**: Mobile-first approach with Bootstrap

## DEVELOPMENT WORKFLOW
1. Backend API development with Node.js HTTP module
2. Database integration with Supabase
3. Frontend UI development with vanilla JS + Bootstrap
4. Authentication implementation with Supabase Auth
5. Product catalog and detail pages
6. Order management system
7. Testing and optimization

## PERFORMANCE CONSIDERATIONS
- Lazy loading for images and components
- Efficient database queries with proper indexing
- Client-side caching for frequently accessed data
- Optimized animations for smooth user experience
- Progressive loading for product catalogs

