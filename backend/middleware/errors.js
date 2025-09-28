// 🚨 Global Error Handling Middleware
// Handles global error processing and response formatting

class ErrorMiddleware {
    constructor() {
        // Initialize error middleware
    }

    // Global error handler
    handleError(err, req, res, next) {
        console.error('Error:', err);
        
        // Default error response
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        
        res.status(statusCode).json({
            error: {
                message,
                status: statusCode,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Handle 404 errors
    handleNotFound(req, res, next) {
        res.status(404).json({
            error: {
                message: 'Route not found',
                status: 404,
                timestamp: new Date().toISOString()
            }
        });
    }
}

module.exports = new ErrorMiddleware();
