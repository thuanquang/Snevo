# 🚀 Snevo Team Development Guide

## 📋 Quick Overview

**Snevo** is a Nike-inspired e-commerce platform with:
- **Backend**: Node.js (native HTTP, no Express) + Supabase ✅ **COMPLETE**
- **Frontend**: Vanilla JS + Bootstrap 5.3 + Nike-style animations 🚧 **IN DEVELOPMENT**
- **Architecture**: OOP MVC pattern with inheritance
- **Status**: Backend ready, Frontend needs Nike-style UI implementation

---

## 🛠 Prerequisites (For New Team Members)

### Required Software
```bash
# 1. Node.js (version 18+)
# Download from https://nodejs.org or use nvm:
nvm install 18.19.0
nvm use 18.19.0

# 2. Git
# Download from https://git-scm.com/

# 3. Code Editor (VS Code recommended)
# Install extensions: ES6 snippets, Prettier, Live Server
```

### First-Time Setup
```bash
# Clone repository
git clone https://github.com/yourusername/snevo-ecommerce.git
cd snevo-ecommerce

# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with your credentials (see Environment Setup below)

# Generate development config
npm run dev:config

# Start development
npm run dev
```

---

## 🏗 Project Structure

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

### Current Implementation Status
- ✅ **Backend**: Complete OOP MVC with Supabase integration
- ✅ **Authentication**: Supabase Auth + Google OAuth (environment-dependent)
- ✅ **API**: Full RESTful API with validation and error handling
- ✅ **Build System**: Environment variable injection and validation
- 🚧 **Frontend**: Nike-style UI with animations (in development)
- 🚧 **Product Browsing**: Advanced filtering and search (in development)

---

## ⚙️ Environment Setup

### 1. Create `.env` File
```bash
cp env.example .env
```

### 2. Required Configuration
Edit `.env` with these values:

```env
# SUPABASE (Required)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# APP CONFIG
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
PORT=3001
NODE_ENV=development

# AUTHENTICATION
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=24h

# GOOGLE OAUTH (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. Get credentials from Settings → API
3. Run `schema.sql` in Supabase SQL editor
4. Enable authentication providers

---

## 🚀 Development Workflow

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

### Available Commands
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

---

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

### Development Guidelines
1. **Follow OOP principles** - Extend base classes
2. **Use Bootstrap components** - Responsive design
3. **Implement Nike animations** - Smooth transitions
4. **Mobile-first approach** - Responsive breakpoints

---

## 🔧 Backend Development

### Architecture (Complete)
- **Models**: Extend BaseModel with validation and relationships
- **Controllers**: Extend BaseController with request handling
- **Routes**: RESTful API with middleware
- **Middleware**: Auth, CORS, validation

### Key Files
- `backend/models/` - Database models (User, Product, Order, Category)
- `backend/controllers/` - API endpoints
- `backend/routes/` - Route definitions
- `backend/middleware/` - Custom middleware

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

---

## 🧪 Testing & Quality

### Testing Commands
```bash
npm test                 # All tests
npm run test:backend     # Backend tests
npm run test:frontend    # Frontend tests
```

### Code Review Process
1. Create feature branch
2. Implement with tests
3. Create Pull Request
4. Team review
5. Merge when approved

---

## 🚀 Deployment

### Development Testing
```bash
npm run build
npm run serve
```

### Production Deployment
```bash
# Frontend: Deploy build/frontend/ to static hosting
# Backend: Deploy build/ directory to Node.js hosting
# Set production environment variables
```

### Hosting Options
- **Frontend**: Netlify, Vercel, GitHub Pages
- **Backend**: Railway, Heroku, DigitalOcean
- **Database**: Supabase (already configured)

---

## 🔧 Troubleshooting

### Common Issues
```bash
# "Module not found"
npm install

# "Supabase not initialized"
npm run dev:config

# "Port in use"
# Kill process or change PORT in .env

# "Google OAuth not working"
# Check credentials in .env and Supabase dashboard
```

### Getting Help
1. Check console logs
2. Verify `.env` configuration
3. Ask team members
4. Create GitHub issues

---

## 📚 Key Documentation

- `README.md` - Project overview
- `docs/BUILD.md` - Build system details
- `docs/AUTH_SETUP.md` - Authentication setup
- `STRUCTURE.md` - Complete project structure
- `EXTENSION_FUNCTIONALITY.md` - Detailed functionality

---

## 🎯 Quick Start Checklist

### For New Team Members
- [ ] Install Node.js 18+
- [ ] Install Git and VS Code
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Copy `env.example` to `.env`
- [ ] Set up Supabase project
- [ ] Run `npm run dev:config`
- [ ] Start with `npm run dev`
- [ ] Test basic functionality

### For Project Lead
- [ ] Set up GitHub repository
- [ ] Add team members as collaborators
- [ ] Set up branch protection
- [ ] Create development branches
- [ ] Schedule team meetings

---

## 💬 Team Communication

- **GitHub**: Code, issues, Pull Requests
- **Daily Standups**: Progress updates
- **Code Reviews**: All changes reviewed
- **Documentation**: Keep updated

---

**Ready to build something amazing! 🚀**

This streamlined guide covers the essentials your team needs to work effectively on the Snevo project. The backend is complete and ready for frontend development with Nike-style animations and responsive design.
