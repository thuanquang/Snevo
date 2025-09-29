// 🚀 Server Entry Point
// Main server file that starts the application

import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

class Server {
    constructor() {
        this.port = Number(process.env.PORT) || 3001;
        this.routes = new Map();
        this.maxRetries = 5;
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

            // Base directories
            const frontendRoot = path.join(process.cwd(), 'frontend');
            const assetsRoot = path.join(frontendRoot, 'assets');
            const pagesRoot = path.join(frontendRoot, 'pages');

            // API placeholder routing (reserve /api/* for backend API)
            if (pathname.startsWith('/api/')) {
                res.writeHead(501, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'API not implemented yet' }));
                return;
            }

            // Map request path to filesystem path
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