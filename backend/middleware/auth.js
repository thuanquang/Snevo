// 🔐 Authentication Middleware
// Handles Supabase session authentication and user verification

class AuthMiddleware {
    constructor() {
        // No constructor needed for now
    }

    // Extract and verify Supabase session from Authorization header
    async authenticate(req, res, next) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                req.user = null;
                return next();
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix

            if (!token) {
                req.user = null;
                return next();
            }

            // Get Supabase client from request (added by server middleware)
            const supabase = req.supabase;

            if (!supabase) {
                console.error('Supabase client not available in request');
                req.user = null;
                return next();
            }

            // Verify the token with Supabase
            const { data, error } = await supabase.auth.getUser(token);

            if (error || !data.user) {
                console.log('Token verification failed:', error?.message);
                req.user = null;
                return next();
            }

            // Set user information in request
            req.user = {
                id: data.user.id,
                email: data.user.email,
                username: data.user.user_metadata?.username,
                full_name: data.user.user_metadata?.full_name,
                role: data.user.user_metadata?.role || 'customer',
                email_verified: data.user.email_confirmed_at != null
            };

            next();
        } catch (error) {
            console.error('Authentication middleware error:', error);
            req.user = null;
            next();
        }
    }

    // Check if user is authenticated
    requireAuth(req, res, next) {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        next();
    }

    // Check if user has specific role
    requireRole(role) {
        return (req, res, next) => {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (Array.isArray(role)) {
                if (!role.includes(req.user.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                }
            } else if (req.user.role !== role) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            next();
        };
    }
}

module.exports = new AuthMiddleware();