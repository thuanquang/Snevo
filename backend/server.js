/**
 * Main Server File
 * Nike-inspired E-commerce Platform
 * Built with Node.js HTTP module (no Express.js)
 */

import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import configurations
import { supabase } from '../config/supabase.js';
import constants from '../config/constants.js';

// Import middleware
import corsMiddleware from './middleware/cors.js';
import authMiddleware from './middleware/auth.js';

// Import routes
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

class SnevoServer {
    constructor() {
        this.server = null;
        this.routes = new Map();
        this.middleware = [];
        this.staticPath = path.join(__dirname, '../frontend');
        
        this.setupRoutes();
        this.setupMiddleware();
    }

    /**
     * Setup middleware stack
     */
    setupMiddleware() {
        this.middleware = [
            corsMiddleware,
            this.parseBody.bind(this),
            this.serveStatic.bind(this)
        ];
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        // API Routes
        this.routes.set('/api/auth', authRoutes);
        this.routes.set('/api/products', productRoutes);
        this.routes.set('/api/orders', orderRoutes);
        this.routes.set('/api', apiRoutes);
    }

    /**
     * Parse request body for POST/PUT requests
     */
    async parseBody(req, res, next) {
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    if (req.headers['content-type']?.includes('application/json')) {
                        req.body = JSON.parse(body);
                    } else {
                        req.body = body;
                    }
                } catch (error) {
                    req.body = body;
                }
                next();
            });
        } else {
            next();
        }
    }

    /**
     * Serve static files
     */
    async serveStatic(req, res, next) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;

        // Skip API routes
        if (pathname.startsWith('/api/')) {
            return next();
        }

        try {
            let filePath = path.join(this.staticPath, pathname === '/' ? '/pages/index.html' : pathname);
            
            // If no extension, assume it's an HTML file
            if (!path.extname(filePath)) {
                filePath += '.html';
            }

            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = this.getContentType(ext);
                
                res.writeHead(200, { 'Content-Type': contentType });
                const fileStream = await fs.readFile(filePath);
                res.end(fileStream);
                return;
            }
        } catch (error) {
            // File not found, continue to next middleware
        }

        next();
    }

    /**
     * Get content type based on file extension
     */
    getContentType(ext) {
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Handle incoming requests
     */
    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        req.query = parsedUrl.query;
        req.pathname = parsedUrl.pathname;

        // Add response helper methods
        this.addResponseHelpers(res);

        try {
            await this.executeMiddleware(req, res, 0);
        } catch (error) {
            console.error('Server error:', error);
            res.json({
                success: false,
                error: 'Internal server error'
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Execute middleware chain
     */
    async executeMiddleware(req, res, index) {
        if (index >= this.middleware.length) {
            return this.routeRequest(req, res);
        }

        const middleware = this.middleware[index];
        await middleware(req, res, () => this.executeMiddleware(req, res, index + 1));
    }

    /**
     * Route requests to appropriate handlers
     */
    async routeRequest(req, res) {
        const pathname = req.pathname;

        // Find matching route
        for (const [routePattern, handler] of this.routes) {
            if (pathname.startsWith(routePattern)) {
                req.params = this.extractParams(routePattern, pathname);
                return await handler(req, res);
            }
        }

        // No route found
        res.json({
            success: false,
            error: 'Route not found'
        }, constants.HTTP_STATUS.NOT_FOUND);
    }

    /**
     * Extract parameters from route
     */
    extractParams(pattern, pathname) {
        const params = {};
        const patternParts = pattern.split('/');
        const pathParts = pathname.split('/');

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                const paramName = patternParts[i].substring(1);
                params[paramName] = pathParts[i];
            }
        }

        return params;
    }

    /**
     * Add helper methods to response object
     */
    addResponseHelpers(res) {
        res.json = (data, statusCode = 200) => {
            res.writeHead(statusCode, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end(JSON.stringify(data));
        };

        res.html = (content, statusCode = 200) => {
            res.writeHead(statusCode, { 'Content-Type': 'text/html' });
            res.end(content);
        };

        res.redirect = (location, statusCode = 302) => {
            res.writeHead(statusCode, { 'Location': location });
            res.end();
        };
    }

    /**
     * Start the server
     */
    start() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.listen(PORT, HOST, () => {
            console.log(`🚀 Snevo E-commerce Server running on http://${HOST}:${PORT}`);
            console.log(`📁 Serving static files from: ${this.staticPath}`);
            console.log(`🗄️  Database: Connected to Supabase`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }

    /**
     * Shutdown server gracefully
     */
    shutdown() {
        console.log('🛑 Shutting down server gracefully...');
        
        if (this.server) {
            this.server.close(() => {
                console.log('✅ Server closed successfully');
                process.exit(0);
            });
        }
    }
}

// Create and start server
const server = new SnevoServer();
server.start();

export default SnevoServer;

