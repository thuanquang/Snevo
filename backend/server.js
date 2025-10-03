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
import AuthController from './controllers/authController.js';
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
import authMiddleware from './middleware/auth.js';
import corsMiddleware from './middleware/cors.js';
import createSupabaseConfig from '../config/supabase.js';
import { initializeModels } from './models/index.js';

class Server {
    constructor() {
        this.port = Number(process.env.PORT) || 3001;
        this.routes = new Map();
        this.maxRetries = 5;

        // Initialize Supabase and models
        this.initializeDatabase();

        // Initialize controllers
        this.authController = new AuthController(this.models);
        this.productController = new ProductController(this.models);
        this.categoryController = new CategoryController(this.models);
        this.orderController = new OrderController(this.models);
        this.profileController = new ProfileController(this.models);
        this.addressController = new AddressController(this.models);
        this.colorController = new ColorController(this.models);
        this.sizeController = new SizeController(this.models);
        this.variantController = new VariantController(this.models);
        this.importController = new ImportController(this.models);
        this.paymentController = new PaymentController(this.models);
        this.adminController = new AdminController(this.models);

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

    // Handle API routes
    async handleApiRequest(req, res, pathname) {
        console.log('API Request:', req.method, pathname);
        const method = req.method;
        const body = await this.parseBody(req);

        try {
            // Apply CORS middleware
            corsMiddleware.configure(req, res, () => {});

            // Route handlers by path
            if (pathname.startsWith('/api/auth/')) {
                await this.handleAuthRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/products/')) {
                await this.handleProductRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/categories/')) {
                await this.handleCategoryRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/orders/')) {
                await this.handleOrderRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/users/')) {
                await this.handleUserRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/profiles/')) {
                await this.handleProfileRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/addresses/')) {
                await this.handleAddressRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/colors/')) {
                await this.handleColorRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/sizes/')) {
                await this.handleSizeRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/variants/')) {
                await this.handleVariantRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/imports/')) {
                await this.handleImportRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/payments/')) {
                await this.handlePaymentRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/reviews/')) {
                await this.handleReviewRoutes(req, res, pathname, method, body);
            } else if (pathname.startsWith('/api/admin/')) {
                await this.handleAdminRoutes(req, res, pathname, method, body);
            } else {
                this.sendError(res, 'API endpoint not found', 404);
            }

        } catch (error) {
            console.error('API Error:', error);
            this.sendError(res, 'Internal server error', 500);
        }
    }

    // Auth routes handler
    async handleAuthRoutes(req, res, pathname, method, body) {
                const authPath = pathname.replace('/api/auth/', '');

                // Check authentication for protected routes
                const protectedRoutes = ['profile', 'logout'];
                const isProtectedRoute = protectedRoutes.some(route => authPath.startsWith(route));

                if (isProtectedRoute) {
                    const authResult = await authMiddleware.authenticate(req, res);
                    if (!authResult || !authResult.success) {
                        return; // authMiddleware already sent response or failed
                    }
                    req.user = authResult.user;
                }

                switch (authPath) {
                    case 'login':
                        if (method === 'POST') {
                            await this.authController.login(req, res);
                        } else {
                            this.sendError(res, 'Method not allowed', 405);
                        }
                        break;

                    case 'register':
                        if (method === 'POST') {
                            await this.authController.register(req, res);
                        } else {
                            this.sendError(res, 'Method not allowed', 405);
                        }
                        break;

                    case 'logout':
                        if (method === 'POST') {
                            await this.authController.logout(req, res);
                        } else {
                            this.sendError(res, 'Method not allowed', 405);
                        }
                        break;

                    case 'profile':
                        if (method === 'GET') {
                            await this.authController.getProfile(req, res);
                        } else if (method === 'PUT') {
                            req.body = body;
                            await this.authController.updateProfile(req, res);
                        } else {
                            this.sendError(res, 'Method not allowed', 405);
                        }
                        break;

                    default:
                        this.sendError(res, 'API endpoint not found', 404);
                }
    }

    // Product routes handler
    async handleProductRoutes(req, res, pathname, method, body) {
        const productPath = pathname.replace('/api/products', '');

        // Check authentication for protected routes
        const protectedRoutes = ['/'];
        const isProtectedRoute = method !== 'GET' && protectedRoutes.some(route => productPath.startsWith(route));

        if (isProtectedRoute) {
            const authResult = await authMiddleware.authenticate(req, res);
            if (!authResult || !authResult.success) {
                return;
            }
            req.user = authResult.user;
        }

        if (productPath === '/' || productPath === '') {
            if (method === 'GET') {
                console.log('Handling GET /api/products');
                try {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Products endpoint working - controllers not implemented yet' }));
                } catch (error) {
                    console.error('Error in getProducts:', error);
                    this.sendError(res, 'Internal server error', 500);
                }
            } else if (method === 'POST') {
                try {
                    req.body = body;
                    await this.productController.createProduct(req, res);
                } catch (error) {
                    console.error('Error in createProduct:', error);
                    this.sendError(res, 'Internal server error', 500);
                }
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (productPath.startsWith('/search')) {
            if (method === 'GET') {
                await this.productController.searchProducts(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (productPath.match(/^\/\d+$/)) {
            const id = productPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.productController.getProduct(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.productController.updateProduct(req, res);
            } else if (method === 'DELETE') {
                await this.productController.deleteProduct(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Category routes handler
    async handleCategoryRoutes(req, res, pathname, method, body) {
        const categoryPath = pathname.replace('/api/categories', '');

        // Check authentication for protected routes
        const protectedRoutes = ['/'];
        const isProtectedRoute = method !== 'GET' && protectedRoutes.some(route => categoryPath.startsWith(route));

        if (isProtectedRoute) {
            const authResult = await authMiddleware.authenticate(req, res);
            if (!authResult || !authResult.success) {
                return;
            }
            req.user = authResult.user;
        }

        if (categoryPath === '/' || categoryPath === '') {
            if (method === 'GET') {
                await this.categoryController.getCategories(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.categoryController.createCategory(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (categoryPath.match(/^\/\d+$/)) {
            const id = categoryPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.categoryController.getCategory(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.categoryController.updateCategory(req, res);
            } else if (method === 'DELETE') {
                await this.categoryController.deleteCategory(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Order routes handler
    async handleOrderRoutes(req, res, pathname, method, body) {
        const orderPath = pathname.replace('/api/orders', '');

        // Check authentication for protected routes
        const authResult = await authMiddleware.authenticate(req, res);
        if (!authResult || !authResult.success) {
            return;
        }
        req.user = authResult.user;

        if (orderPath === '/' || orderPath === '') {
            if (method === 'GET') {
                await this.orderController.getOrders(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.orderController.createOrder(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath.match(/^\/\d+$/)) {
            const id = orderPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.orderController.getOrder(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (orderPath.startsWith('/status')) {
            const id = orderPath.replace('/status', '').replace('/', '');
            if (id && method === 'PUT') {
                req.params = { id };
                req.body = body;
                await this.orderController.updateOrderStatus(req, res);
            } else {
                this.sendError(res, 'API endpoint not found', 404);
            }
        } else if (orderPath.startsWith('/cancel')) {
            const id = orderPath.replace('/cancel', '').replace('/', '');
            if (id && method === 'PUT') {
                req.params = { id };
                req.body = body;
                await this.orderController.cancelOrder(req, res);
            } else {
                this.sendError(res, 'API endpoint not found', 404);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // User routes handler (placeholder implementation)
    async handleUserRoutes(req, res, pathname, method, body) {
        this.sendError(res, 'User routes not implemented yet', 501);
    }

    // Profile routes handler
    async handleProfileRoutes(req, res, pathname, method, body) {
        // Check authentication
        const authResult = await authMiddleware.authenticate(req, res);
        if (!authResult || !authResult.success) {
            return;
        }
        req.user = authResult.user;

        if (pathname === '/api/profiles') {
            if (method === 'GET') {
                await this.profileController.getProfile(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.profileController.updateProfile(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Address routes handler
    async handleAddressRoutes(req, res, pathname, method, body) {
        // Check authentication
        const authResult = await authMiddleware.authenticate(req, res);
        if (!authResult || !authResult.success) {
            return;
        }
        req.user = authResult.user;

        if (pathname === '/api/addresses') {
            if (method === 'GET') {
                await this.addressController.getAddresses(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.addressController.createAddress(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (pathname.match(/^\/api\/addresses\/\d+$/)) {
            const id = pathname.replace('/api/addresses/', '');
            req.params = { id };
            if (method === 'PUT') {
                req.body = body;
                await this.addressController.updateAddress(req, res);
            } else if (method === 'DELETE') {
                await this.addressController.deleteAddress(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Color routes handler
    async handleColorRoutes(req, res, pathname, method, body) {
        const colorPath = pathname.replace('/api/colors', '');

        if (colorPath === '/' || colorPath === '') {
            if (method === 'GET') {
                await this.colorController.getColors(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.colorController.createColor(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (colorPath.match(/^\/\d+$/)) {
            const id = colorPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.colorController.getColor(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.colorController.updateColor(req, res);
            } else if (method === 'DELETE') {
                await this.colorController.deleteColor(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Size routes handler
    async handleSizeRoutes(req, res, pathname, method, body) {
        const sizePath = pathname.replace('/api/sizes', '');

        if (sizePath === '/' || sizePath === '') {
            if (method === 'GET') {
                await this.sizeController.getSizes(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.sizeController.createSize(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (sizePath.match(/^\/\d+$/)) {
            const id = sizePath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.sizeController.getSize(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.sizeController.updateSize(req, res);
            } else if (method === 'DELETE') {
                await this.sizeController.deleteSize(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Variant routes handler
    async handleVariantRoutes(req, res, pathname, method, body) {
        const variantPath = pathname.replace('/api/variants', '');

        if (variantPath === '/' || variantPath === '') {
            if (method === 'GET') {
                await this.variantController.getVariants(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.variantController.createVariant(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (variantPath.match(/^\/\d+$/)) {
            const id = variantPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.variantController.getVariant(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.variantController.updateVariant(req, res);
            } else if (method === 'DELETE') {
                await this.variantController.deleteVariant(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Import routes handler
    async handleImportRoutes(req, res, pathname, method, body) {
        const importPath = pathname.replace('/api/imports', '');

        // Check authentication for protected routes
        const authResult = await authMiddleware.authenticate(req, res);
        if (!authResult || !authResult.success) {
            return;
        }
        req.user = authResult.user;

        if (importPath === '/' || importPath === '') {
            if (method === 'GET') {
                await this.importController.getImports(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.importController.createImport(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (importPath.match(/^\/\d+$/)) {
            const id = importPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.importController.getImport(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.importController.updateImport(req, res);
            } else if (method === 'DELETE') {
                await this.importController.deleteImport(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Payment routes handler
    async handlePaymentRoutes(req, res, pathname, method, body) {
        const paymentPath = pathname.replace('/api/payments', '');

        // Check authentication for protected routes
        const authResult = await authMiddleware.authenticate(req, res);
        if (!authResult || !authResult.success) {
            return;
        }
        req.user = authResult.user;

        if (paymentPath === '/' || paymentPath === '') {
            if (method === 'GET') {
                await this.paymentController.getPayments(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.paymentController.createPayment(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (paymentPath.match(/^\/\d+$/)) {
            const id = paymentPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.paymentController.getPayment(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.paymentController.updatePayment(req, res);
            } else if (method === 'DELETE') {
                await this.paymentController.deletePayment(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Review routes handler
    async handleReviewRoutes(req, res, pathname, method, body) {
        const reviewPath = pathname.replace('/api/reviews', '');

        if (reviewPath === '/' || reviewPath === '') {
            if (method === 'GET') {
                await this.reviewController.getReviews(req, res);
            } else if (method === 'POST') {
                req.body = body;
                await this.reviewController.createReview(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else if (reviewPath.match(/^\/\d+$/)) {
            const id = reviewPath.substring(1);
            req.params = { id };
            if (method === 'GET') {
                await this.reviewController.getReview(req, res);
            } else if (method === 'PUT') {
                req.body = body;
                await this.reviewController.updateReview(req, res);
            } else if (method === 'DELETE') {
                await this.reviewController.deleteReview(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
    }

    // Admin routes handler
    async handleAdminRoutes(req, res, pathname, method, body) {
        const adminPath = pathname.replace('/api/admin', '');

        // Check authentication for protected routes
        const authResult = await authMiddleware.authenticate(req, res);
        if (!authResult || !authResult.success) {
            return;
        }
        req.user = authResult.user;

        if (adminPath === '/' || adminPath === '') {
            if (method === 'GET') {
                await this.adminController.getDashboard(req, res);
            } else {
                this.sendError(res, 'Method not allowed', 405);
            }
        } else {
            this.sendError(res, 'API endpoint not found', 404);
        }
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