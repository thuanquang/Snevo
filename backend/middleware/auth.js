// 🔐 Authentication Middleware
// Handles Supabase session authentication and user verification

class AuthMiddleware {
    constructor() {
        // No constructor needed for now
    }

    /**
     * Extract and verify Supabase session from Authorization header
     * ⭐ MUST query profiles table to get role (not from user_metadata)
     */
async authenticate(req, res) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Authentication required'
                }));
                return { success: false, error: 'No auth token' };
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            
            if (!token || token.startsWith('mock_')) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Invalid token'
                }));
                return { success: false, error: 'Invalid token' };
            }

            // Import Supabase config here to avoid circular dependencies
            const createSupabaseConfig = (await import('../../config/supabase.js')).default;
            const supabaseConfig = createSupabaseConfig();

            // ⭐ USE ADMIN CLIENT to verify token (bypasses RLS)
            const { data, error } = await supabaseConfig.getAdminClient().auth.getUser(token);
            
            if (error || !data.user) {
                console.warn('❌ Token verification failed:', error?.message);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Invalid or expired token'
                }));
                return { success: false, error: 'Token verification failed' };
            }

            // ⭐ Query profiles table with ADMIN CLIENT (bypasses RLS)
            const { data: profile, error: profileError } = await supabaseConfig.getAdminClient()
                .from('profiles')
                .select('role, username, full_name')
                .eq('user_id', data.user.id)
                .single();

            if (profileError) {
                console.warn('⚠️ Profile not found for user:', data.user.id, profileError.message);
            }

            // Convert Supabase user to our expected format
            const user = {
                user_id: data.user.id,
                id: data.user.id,
                email: data.user.email,
                username: profile?.username || data.user.user_metadata?.username || data.user.email?.split('@')[0],
                full_name: profile?.full_name || data.user.user_metadata?.full_name || '',
                role: profile?.role || 'customer',  // ⭐ Role from profiles table
                email_verified: data.user.email_confirmed_at != null
            };

            req.user = user;
            console.log('✅ User authenticated:', user.email, '| Role:', user.role);
            return { success: true, user: user };

        } catch (error) {
            console.error('❌ Authentication middleware error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Authentication failed'
            }));
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user is authenticated
     */
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

    /**
     * Check if user has specific role
     */
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
                    console.warn(`❌ Role check failed: User has '${req.user.role}', required: ${role.join(' or ')}`);
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: `Insufficient permissions. Required role: ${role.join(' or ')}`
                    }));
                    return false;
                }
            } else if (req.user.role !== role) {
                console.warn(`❌ Role check failed: User has '${req.user.role}', required: '${role}'`);
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: `Insufficient permissions. Required role: ${role}`
                }));
                return false;
            }

            console.log(`✅ Role check passed: User has '${req.user.role}'`);
            return true;
        };
    }
}

export default new AuthMiddleware();
