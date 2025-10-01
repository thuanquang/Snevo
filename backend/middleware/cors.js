// 🌐 CORS Configuration Middleware
// Handles Cross-Origin Resource Sharing configuration

class CorsMiddleware {
    constructor() {
        this.allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    }

    // Configure CORS
    configure(req, res, next) {
        const origin = req.headers.origin;
        
        if (this.allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
        
        next();
    }
}

export default new CorsMiddleware();