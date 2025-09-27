# 🚀 Snevo E-commerce Platform

A Nike-inspired e-commerce platform built with Node.js backend and vanilla JavaScript frontend, featuring a complete shoe retail system with authentication, product browsing, and order management.

## 🎯 Project Status

- ✅ **Backend**: Complete OOP MVC with Supabase integration
- ✅ **Authentication**: Supabase Auth + Google OAuth (environment-dependent)
- ✅ **API**: Full RESTful API with validation and error handling
- ✅ **Build System**: Environment variable injection and validation
- 🚧 **Frontend**: Nike-style UI with animations (in development)
- 🚧 **Product Browsing**: Advanced filtering and search (in development)

## 🛠 Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ with Bootstrap 5.3
- **Backend**: Node.js (native HTTP module, no Express.js)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **Architecture**: OOP MVC with inheritance and composition

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Git
- Supabase account

### Setup
```bash
# Clone repository
git clone https://github.com/yourusername/snevo-ecommerce.git
cd snevo-ecommerce

# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with your Supabase credentials

# Generate development config
npm run dev:config

# Start development
npm run dev
```

### Environment Setup
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get credentials from Settings → API
3. Run `schema.sql` in Supabase SQL editor
4. Configure authentication providers

## 📁 Project Structure

```
snevo-ecommerce/
├── backend/                 # ✅ COMPLETE - OOP MVC Backend
│   ├── controllers/        # AuthController, ProductController, OrderController
│   ├── models/            # User, Product, Order, Category (extend BaseModel)
│   ├── routes/            # API routes with controller instances
│   ├── middleware/        # Auth, CORS, validation middleware
│   └── utils/             # BaseModel, BaseController, ErrorClasses
├── frontend/              # 🚧 IN DEVELOPMENT - Nike-style Frontend
│   ├── assets/js/         # OOP classes: Application, AuthManager, ProductManager
│   ├── pages/             # HTML pages with Nike animations
│   └── components/         # Reusable UI components
├── config/                # Supabase and app configuration
├── scripts/               # Build system with environment injection
└── docs/                  # Documentation
```

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start with auto-reload
npm run dev:config       # Generate frontend config from .env

# Building
npm run build            # Full production build
npm run build:frontend   # Frontend build only
npm run serve            # Build and serve production

# Testing
npm test                 # Run all tests
npm run test:backend     # Backend tests only
npm run test:frontend    # Frontend tests only
```

## 🎨 Frontend Development

### Architecture
- **OOP Classes**: Application, AuthManager, ProductManager, ApiClient
- **Bootstrap 5.3**: Responsive grid system
- **Nike Animations**: Smooth transitions and hover effects
- **Component System**: Reusable HTML components

### Key Files
- `frontend/assets/js/Application.js` - Main orchestrator
- `frontend/assets/js/AuthManager.js` - Authentication handling
- `frontend/assets/js/ProductManager.js` - Product operations
- `frontend/pages/` - HTML pages with Nike-style design

## 🔧 Backend Development

### Architecture (Complete)
- **Models**: Extend BaseModel with validation and relationships
- **Controllers**: Extend BaseController with request handling
- **Routes**: RESTful API with middleware
- **Middleware**: Auth, CORS, validation

### API Endpoints
```
Authentication:
POST /api/auth/login
POST /api/auth/register
GET /api/auth/profile

Products:
GET /api/products
GET /api/products/:id
GET /api/products/search

Orders:
POST /api/orders
GET /api/orders
```

## 🚀 Deployment

### Development Testing
```bash
npm run build
npm run serve
```

### Production Deployment
- **Frontend**: Deploy `build/frontend/` to static hosting (Netlify, Vercel)
- **Backend**: Deploy `build/` directory to Node.js hosting (Railway, Heroku)
- **Database**: Supabase (already configured)

## 📚 Documentation

- `docs/BUILD.md` - Build system details
- `docs/AUTH_SETUP.md` - Authentication setup
- `STRUCTURE.md` - Complete project structure
- `EXTENSION_FUNCTIONALITY.md` - Detailed functionality

## 🤝 Team Workflow

### Daily Development
```bash
# Start your day
git pull origin main
npm run dev

# Work on features
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

### Code Review Process
1. Create feature branch
2. Implement with tests
3. Create Pull Request
4. Team review
5. Merge when approved

## 🔧 Troubleshooting

### Common Issues
```bash
# "Module not found"
npm install

# "Supabase not initialized"
npm run dev:config

# "Port in use"
# Kill process or change PORT in .env
```

### Getting Help
1. Check console logs
2. Verify `.env` configuration
3. Ask team members
4. Create GitHub issues

## 📝 License

This project is licensed under the MIT License.

---

**Ready to build something amazing! 🚀**

Built with ❤️ for modern e-commerce experiences