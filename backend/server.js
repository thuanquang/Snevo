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
import authMiddleware from './middleware/auth.js';
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
        const method = req.method;
        const body = await this.parseBody(req);

        try {
            // Auth routes
            if (pathname.startsWith('/api/auth/')) {
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
                return;
            }

            // Other API routes can be added here
            this.sendError(res, 'API endpoint not found', 404);

        } catch (error) {
            console.error('API Error:', error);
            this.sendError(res, 'Internal server error', 500);
        }
    }

    // Start the server
    start(retryCount = 0) {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
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
    handleRequest(req, res) {
        try {
            const parsedUrl = url.parse(req.url || '/');
            const pathname = parsedUrl.pathname || '/';

            // Handle API routes
            if (pathname.startsWith('/api/')) {
                this.handleApiRequest(req, res, pathname);
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