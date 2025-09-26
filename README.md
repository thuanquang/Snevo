# Snevo E-commerce Platform

A Nike-inspired e-commerce platform built with Node.js backend and vanilla JavaScript frontend, featuring a complete shoe retail system with authentication, product browsing, and order management.

## 🚀 Features

### Frontend
- **Nike-style Design**: Modern, animated interface inspired by Nike.com
- **Vanilla JavaScript**: Pure JS with Bootstrap 5.3 for responsive design
- **Smooth Animations**: Hardware-accelerated transitions and effects
- **Product Browsing**: Advanced filtering, search, and product details
- **User Authentication**: Login/register with Google OAuth support
- **Shopping Cart**: Complete cart and checkout experience
- **Responsive Design**: Mobile-first approach with modern UI/UX

### Backend
- **Node.js HTTP Server**: Built without Express.js using native HTTP module
- **MVC Architecture**: Clean separation of concerns with models, views, and controllers
- **Supabase Integration**: PostgreSQL database with real-time features
- **JWT Authentication**: Secure authentication with refresh tokens
- **RESTful API**: Complete API for all e-commerce operations
- **Role-based Access**: Customer and seller role management

### Database
- **Comprehensive Schema**: Complete shoe retail database with inventory management
- **Automatic Stock Management**: Triggers for stock updates and order processing
- **Multi-variant Products**: Size and color variants with individual pricing
- **Review System**: Product reviews with rating aggregation
- **Order Management**: Complete order lifecycle with status tracking

## 🛠 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6+, Bootstrap 5.3
- **Backend**: Node.js (native HTTP module, no Express.js)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **Architecture**: MVC (Model-View-Controller)

## 📋 Prerequisites

- Node.js >= 18.0.0
- Supabase account
- Google OAuth credentials (optional)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd snevo-ecommerce
npm install
```

### 2. Environment Setup

Copy the environment template:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Configuration
DB_SCHEMA=db_nike

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# Environment
NODE_ENV=development

# App Configuration
APP_NAME=Snevo
APP_VERSION=1.0.0

# Authentication
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

> **Important**: The build system now injects environment variables into the frontend during build time for secure credential management. See [Build Documentation](docs/BUILD.md) for details.

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `schema.sql` in your Supabase SQL editor
3. Enable authentication in Supabase dashboard
4. Configure Google OAuth provider (optional)

### 4. Run the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
snevo-ecommerce/
├── backend/                    # Server-side application
│   ├── controllers/           # Request handlers
│   ├── models/               # Database models
│   ├── routes/              # Route definitions
│   ├── middleware/          # Custom middleware
│   ├── utils/               # Utility functions
│   ├── config/              # Configuration files
│   └── server.js            # Main server file
├── frontend/               # Client-side application
│   ├── assets/            # Static assets (CSS, JS, images)
│   ├── components/        # Reusable UI components
│   ├── pages/             # HTML pages
│   └── views/             # MVC view templates
├── config/                # Project configuration
├── docs/                  # Documentation
├── tests/                 # Test files
├── package.json           # Dependencies and scripts
├── schema.sql            # Database schema
└── README.md             # This file
```

## 🔧 Development

### Available Scripts

#### Development
- `npm run dev` - Start development server with config generation and auto-reload
- `npm run dev:config` - Generate development config from .env file

#### Production
- `npm start` - Start production server
- `npm run build` - Full production build with environment variable injection
- `npm run build:frontend` - Build frontend only with environment variables
- `npm run serve` - Build and serve production version

#### Testing
- `npm test` - Run all tests
- `npm run test:backend` - Run backend tests only
- `npm run test:frontend` - Run frontend tests only

> **New Build System**: Environment variables are now injected at build time. See [Build Documentation](docs/BUILD.md) for complete details.

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/google` - Google OAuth login

#### Products
- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/:id` - Get product details
- `GET /api/products/search` - Search products
- `GET /api/products/category/:categoryId` - Get products by category
- `GET /api/products/:id/variants` - Get product variants
- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/products/:id/reviews` - Create product review

#### Categories
- `GET /api/products/categories` - Get all categories

#### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status

### Frontend Pages

- `/` - Landing page with hero sections and featured products
- `/login.html` - Login page with Google OAuth
- `/products.html` - Product browsing with filters
- `/product-detail.html` - Product detail page with variants
- `/cart.html` - Shopping cart
- `/profile.html` - User profile and order history

## 🎨 Design Features

### Nike-inspired Animations
- Smooth page transitions
- Product hover effects with image zoom
- Parallax scrolling on hero sections
- Staggered loading animations
- Cart slide-in/out animations
- Form validation with smooth feedback

### Responsive Design
- Mobile-first approach
- Bootstrap 5.3 grid system
- Custom breakpoints for optimal viewing
- Touch-friendly interactions
- Optimized images with lazy loading

## 🗄️ Database Schema

The application uses a comprehensive e-commerce database schema with:

- **Users**: Customer and seller management
- **Products**: Shoes with categories and variants
- **Inventory**: Stock management with automatic triggers
- **Orders**: Complete order processing system
- **Reviews**: Product rating and review system
- **Addresses**: Multiple address management

See `schema.sql` for complete database structure.

## 🔐 Security Features

- JWT-based authentication
- Password hashing with Supabase Auth
- CORS protection
- Rate limiting on authentication endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 🚀 Deployment

### Frontend Deployment
The frontend can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Backend Deployment
The Node.js backend can be deployed to:
- Railway
- Heroku
- DigitalOcean App Platform
- AWS EC2
- Google Cloud Run

### Environment Variables
Ensure all production environment variables are properly configured:
- Use strong JWT secrets
- Configure proper CORS origins
- Set up production database connections
- Enable HTTPS in production

## 🧪 Testing

Run tests with:
```bash
npm test
```

Test structure:
- Unit tests for models and controllers
- Integration tests for API endpoints
- Frontend tests for user interactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `docs/` folder
- Review the API documentation at `/api/docs`

## 🔄 Changelog

### Version 1.0.0
- Initial release with complete e-commerce functionality
- Nike-inspired frontend design
- MVC architecture implementation
- Supabase integration
- Authentication system
- Product management
- Order processing
- Review system

---

Built with ❤️ for modern e-commerce experiences

