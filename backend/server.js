// 🚀 Server Entry Point
// Main server file that starts the application

import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: path.join(process.cwd(), '.env')
});

// Import controllers and middleware
import ProductController from './controllers/productController.js';
import CategoryController from './controllers/CategoryController.js';
import OrderController from './controllers/orderController.js';
import ProfileController from './controllers/ProfileController.js';
import AddressController from './controllers/AddressController.js';
import ColorController from './controllers/ColorController.js';
import SizeController from './controllers/SizeController.js';
import VariantController from './controllers/VariantController.js';
import ImportController from './controllers/ImportController.js';
import PaymentController from './controllers/PaymentController.js';
import AdminController from './controllers/AdminController.js';
import CartController from './controllers/CartController.js';
import ReviewController from './controllers/ReviewController.js';
import authMiddleware from './middleware/auth.js';
import uploadMiddleware from './middleware/upload.js';
import { createAvatarUploadMiddleware } from './middleware/upload.js';
import corsMiddleware from './middleware/cors.js';
import createSupabaseConfig from '../config/supabase.js';
import { initializeModels } from './models/index.js';

// ⭐ Import modular routes for your modules
import productRoutes from './routes/products.js';
import variantRoutes from './routes/variants.js';
import categoryRoutes from './routes/categories.js';
import colorRoutes from './routes/colors.js';
import sizeRoutes from './routes/sizes.js';
import importRoutes from './routes/imports.js';
import adminRoutes from './routes/admin.js';
import cartRoutes from './routes/cart.js';
import reviewRoutes from './routes/reviews.js';
import orderRoutes from './routes/orders.js';
import adminOrderRoutes from './routes/adminOrders.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import profileRoutes from './routes/profiles.js';
import addressRoutes from './routes/addresses.js';
import paymentRoutes from './routes/payments.js';

class Server {
    constructor() {
        this.port = Number(process.env.PORT) || 3001;
        this.routes = new Map();
        this.maxRetries = 5;

        // Initialize Supabase and models
        this.initializeDatabase();

        // Initialize controllers
        this.productController = new ProductController();
        this.productController.setModels(this.models);

        this.categoryController = new CategoryController();
        this.categoryController.setModels(this.models);

        this.colorController = new ColorController();
        this.colorController.setModels(this.models);

        this.sizeController = new SizeController();
        this.sizeController.setModels(this.models);

        this.variantController = new VariantController();
        this.variantController.setModels(this.models);  

        this.importController = new ImportController();
        this.importController.setModels(this.models);

        this.orderController = new OrderController(this.models);
        if (this.orderController.setModels) this.orderController.setModels(this.models);
        this.profileController = new ProfileController(this.models);
        this.addressController = new AddressController(this.models);     
        this.paymentController = new PaymentController(this.models);
        if (this.paymentController.setModels) this.paymentController.setModels(this.models);
        this.adminController = new AdminController(this.models);
        this.cartController = new CartController(this.models);
        // set models for controllers that require setModels (CartController uses models)
        if (this.cartController.setModels) this.cartController.setModels(this.models);
        this.reviewController = new ReviewController();
        if (this.reviewController.setModels) this.reviewController.setModels(this.models);

        // Setup routes
        this.setupRoutes();
    }

    // Initialize database connection and models
    initializeDatabase() {
        try {
            // Check if Supabase environment variables are set
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.warn('⚠️ Supabase environment variables not found, running in mock mode');
                console.log('🔧 To enable database functionality, set SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
                this.supabaseClient = null;
                this.models = {};
                return;
            }

            // Initialize Supabase client
            this.supabaseClient = createSupabaseConfig().getClient();

            if (this.supabaseClient) {
                console.log('✅ Supabase client initialized');
                // Initialize models (they now initialize their own supabase config)
                this.models = initializeModels();
                console.log('✅ Models initialized');
            } else {
                console.warn('⚠️ Supabase client not initialized due to missing configuration');
                this.models = {};
            }

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            console.warn('⚠️ Running in mock mode due to database initialization failure');
            // Continue in mock mode
            this.supabaseClient = null;
            this.models = {};
        }
    }

    // Setup API routes
    setupRoutes() {
        // API routes will be handled in handleRequest method
        // This method is a placeholder for future route registration
    }

    // Parse JSON body
    async parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (err) {
                    reject(err);
                }
            });
            req.on('error', reject);
        });
    }

    // Send JSON response
    sendJson(res, data, statusCode = 200) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify(data));
    }

    // Send error response
    sendError(res, message, statusCode = 500) {
        this.sendJson(res, { success: false, message }, statusCode);
    }

    async handleApiRequest(req, res, pathname) {
        console.log('API Request:', req.method, pathname);
        
        try {
        // Apply CORS middleware
        corsMiddleware.configure(req, res, () => {});

        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // SKIP body parsing for upload routes
        const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');
        const isUploadRoute = (
            (req.method === 'POST' && pathname === '/api/products') ||
            (req.method === 'PUT' && pathname.match(/^\/api\/products\/\d+$/)) ||
            (req.method === 'PUT' && pathname === '/api/auth/profile' && isMultipart)  // ⭐ FIX: Only skip if multipart
        );

        // Parse body for POST/PUT/PATCH requests
        let body = {};
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const isMultipartRequest = (req.headers['content-type'] || '').includes('multipart/form-data');
            
            if (isUploadRoute || isMultipartRequest) {
                // SKIP parsing for upload routes or multipart requests - middleware will handle it
                console.log('Skipping JSON body parse for upload/multipart request');
                // Upload middleware will populate req.body
            } else {
                // Parse JSON body for normal routes
                body = await this.parseBody(req);
                req.body = body;
            }
        }

        // Parse query parameters
        const parsedUrl = url.parse(req.url, true);
        req.query = parsedUrl.query || {};

        // ⭐ MODULAR ROUTES (Your modules - use routes/ folder)
        // ⚠️ IMPORTANT: Review routes MUST come before product routes
        // because /api/products/:id/reviews/* would match /api/products first!
        
        // Review routes (both /api/reviews and /api/products/:id/reviews)
        if (pathname.startsWith('/api/reviews') || pathname.match(/^\/api\/products\/\d+\/reviews/)) {
            await reviewRoutes(req, res, this.reviewController, pathname);
            return;
        }
        
        if (pathname.startsWith('/api/products')) {
            return productRoutes(req, res, this.productController, pathname);
        }
        
        if (pathname.startsWith('/api/variants')) {
            return variantRoutes(req, res, this.variantController, pathname);
        }
        
        if (pathname.startsWith('/api/categories')) {
            return categoryRoutes(req, res, this.categoryController, pathname);
        }
        
        if (pathname.startsWith('/api/colors')) {
            return colorRoutes(req, res, this.colorController, pathname);
        }
        
        if (pathname.startsWith('/api/sizes')) {
            return sizeRoutes(req, res, this.sizeController, pathname);
        }
        if (pathname.startsWith('/api/imports')) {
            return importRoutes(req, res, this.importController, pathname);
        }
        if (pathname.startsWith('/api/cart')) {
            await cartRoutes(req, res, this.cartController, pathname);
            return;
        }

        // ⭐ BUILT-IN ROUTES (Keep existing handlers)
        // Auth routes for profile management
        if (pathname.startsWith('/api/auth/')) {
            await authRoutes(req, res, {
                profileController: this.profileController,
                addressController: this.addressController
            }, pathname, this.sendError.bind(this));
        } else if (pathname.startsWith('/api/orders') && (pathname === '/api/orders' || pathname.startsWith('/api/orders/'))) {
            await orderRoutes(req, res, this.orderController, pathname, this.sendError.bind(this));
        } else if (pathname.startsWith('/api/admin/orders') && (pathname === '/api/admin/orders' || pathname.startsWith('/api/admin/orders/'))) {
            await adminOrderRoutes(req, res, this.orderController, pathname, this.sendError.bind(this));
        } else if (pathname.startsWith('/api/users') && (pathname === '/api/users' || pathname.startsWith('/api/users/'))) {
            await userRoutes(req, res, { 
                profileController: this.profileController, 
                addressController: this.addressController 
            }, pathname, this.sendError.bind(this));
        } else if (pathname.startsWith('/api/profiles') && (pathname === '/api/profiles' || pathname.startsWith('/api/profiles/'))) {
            await profileRoutes(req, res, this.profileController, pathname, this.sendError.bind(this));
        } else if (pathname.startsWith('/api/addresses') && (pathname === '/api/addresses' || pathname.startsWith('/api/addresses/'))) {
            await addressRoutes(req, res, this.addressController, pathname, this.sendError.bind(this));
        } else if (pathname.startsWith('/api/payments') && (pathname === '/api/payments' || pathname.startsWith('/api/payments/'))) {
            await paymentRoutes(req, res, this.paymentController, pathname, this.sendError.bind(this));
        } else if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
            await this.handleAdminRoutes(req, res, pathname, req.method, body);
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }

        } catch (error) {
        console.error('API Error:', error);
        this.sendError(res, 'Internal server error', 500);
        }
    }

    // Admin routes handler
    async handleAdminRoutes(req, res, pathname, method, body) {
        return adminRoutes(req, res, this.adminController, pathname, this.sendError.bind(this));
    }

    // Start the server
    start(retryCount = 0) {
        const server = http.createServer(async (req, res) => {
            await this.handleRequest(req, res);
        });

        server.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE' && retryCount < this.maxRetries) {
                const nextPort = this.port + 1;
                console.warn(`⚠️  Port ${this.port} in use, retrying on ${nextPort}...`);
                this.port = nextPort;
                setTimeout(() => this.start(retryCount + 1), 250);
            } else {
                console.error('❌ Server failed to start:', err);
                process.exit(1);
            }
        });

        server.listen(this.port, () => {
            console.log(`🚀 Server running on port ${this.port}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }

    // Handle incoming requests
    async handleRequest(req, res) {
        try {
            const parsedUrl = url.parse(req.url || '/');
            const pathname = parsedUrl.pathname || '/';
            console.log('Request:', req.method, pathname);

            // Handle API routes
            console.log('Checking if API route:', pathname, pathname.startsWith('/api/'));
            if (pathname.startsWith('/api/')) {
                console.log('Routing to API handler');
                await this.handleApiRequest(req, res, pathname);
                return;
            }

            // Base directories
            const frontendRoot = path.join(process.cwd(), 'frontend');
            const assetsRoot = path.join(frontendRoot, 'assets');
            const pagesRoot = path.join(frontendRoot, 'pages');

            let filePath;
            if (pathname === '/' || pathname === '/index.html') {
                filePath = path.join(pagesRoot, 'index.html');
            } else if (pathname.startsWith('/assets/')) {
                filePath = path.join(frontendRoot, pathname);
            } else if (pathname.startsWith('/pages/')) {
                filePath = path.join(frontendRoot, pathname);
            } else if (pathname.endsWith('.html')) {
                // Serve explicit page under pages/
                filePath = path.join(pagesRoot, pathname.replace(/^\//, ''));
            } else {
                // Friendly URLs: /products -> pages/products.html
                const candidateHtml = path.join(pagesRoot, pathname.replace(/^\//, '')) + '.html';
                filePath = candidateHtml;
            }

            // Security: prevent path traversal outside frontend directory
            const normalized = path.normalize(filePath);
            if (!normalized.startsWith(frontendRoot)) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Forbidden');
                return;
            }

            if (!fs.existsSync(normalized)) {
                // Fallback to index.html for unknown routes (SPA-like behavior)
                const fallback = path.join(pagesRoot, 'index.html');
                if (fs.existsSync(fallback)) {
                    const html = fs.readFileSync(fallback);
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(html);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                }
                return;
            }

            const contentType = mime.lookup(normalized) || 'application/octet-stream';
            const stream = fs.createReadStream(normalized);
            stream.on('open', () => {
                res.writeHead(200, { 'Content-Type': `${contentType}${String(contentType).startsWith('text/') || contentType === 'application/javascript' ? '; charset=utf-8' : ''}` });
            });
            stream.on('error', () => {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            });
            stream.pipe(res);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Internal Server Error' }));
        }
    }

    // Add route
    addRoute(method, path, handler) {
        const key = `${method}:${path}`;
        this.routes.set(key, handler);
    }
}

// Start the server
const server = new Server();
server.start();