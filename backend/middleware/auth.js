// 🔐 Authentication Middleware
// Handles Supabase session authentication and user verification

class AuthMiddleware {
    constructor() {
        // No constructor needed for now
    }

    // Extract and verify Supabase session from Authorization header
    async authenticate(req, res) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                req.user = null;
                return { success: true, user: null };
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix

            if (!token || token.startsWith('mock_')) {
                req.user = null;
                return { success: true, user: null };
            }

            // Import Supabase config here to avoid circular dependencies
            const createSupabaseConfig = (await import('../../config/supabase.js')).default;
            const supabaseConfig = createSupabaseConfig();

            // Verify the JWT token with Supabase
            const { data, error } = await supabaseConfig.getClient().auth.getUser(token);

            if (error || !data.user) {
                req.user = null;
                return { success: true, user: null };
            }

            // Convert Supabase user to our expected format
            const user = {
                id: data.user.id, // This will be a valid UUID
                email: data.user.email,
                username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
                full_name: data.user.user_metadata?.full_name || '',
                role: data.user.user_metadata?.role || 'customer',
                email_verified: data.user.email_confirmed_at != null
            };

            req.user = user;
            return { success: true, user: user };

        } catch (error) {
            console.error('Authentication middleware error:', error);
            req.user = null;
            return { success: false, error: error.message };
        }
    }

    // Check if user is authenticated
    requireAuth(req, res) {
        if (!req.user || !req.user.id) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Authentication required'
            }));
            return false;
        }
        return true;
    }

    // Check if user has specific role
    requireRole(role) {
        return (req, res) => {
            if (!req.user || !req.user.id) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Authentication required'
                }));
                return false;
            }

            if (Array.isArray(role)) {
                if (!role.includes(req.user.role)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: 'Insufficient permissions'
                    }));
                    return false;
                }
            } else if (req.user.role !== role) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Insufficient permissions'
                }));
                return false;
            }

            return true;
        };
    }
}

export default new AuthMiddleware();