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

            if (!token) {
                req.user = null;
                return { success: true, user: null };
            }

            // For now, return a mock user since we're not using real Supabase Auth
            // In a real implementation, you would verify the token with Supabase
            const mockUser = {
                id: 'user_mock_' + Date.now(),
                email: 'user@example.com',
                username: 'testuser',
                full_name: 'Test User',
                role: 'customer',
                email_verified: true
            };

            req.user = mockUser;
            return { success: true, user: mockUser };

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