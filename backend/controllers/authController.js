// 🔐 Authentication Controller - Login/register/logout for users
// Handles user authentication, registration, and session management

class AuthController {
    constructor(models = null) {
        this.models = models;
    }

    // Login user
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Email and password are required'
                }));
                return;
            }

            // Import Supabase config
            const createSupabaseConfig = (await import('../../config/supabase.js')).default;
            const supabaseConfig = createSupabaseConfig();

            // Use real Supabase Auth
            const { data, error } = await supabaseConfig.getClient().auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Invalid email or password'
                }));
                return;
            }

            // Get user profile data if models are available
            const Profile = this.models?.Profile;
            let profile = null;

            if (Profile && data.user) {
                profile = await Profile.findByUserId(data.user.id);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Login successful',
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
                    full_name: data.user.user_metadata?.full_name || '',
                    role: data.user.user_metadata?.role || 'customer'
                },
                token: data.session?.access_token,
                profile: profile
            }));
        } catch (error) {
            console.error('Login error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error during login'
            }));
        }
    }

    // Register new user
    async register(req, res) {
        try {
            const { email, password, username, full_name } = req.body;

            if (!email || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Email and password are required'
                }));
                return;
            }

            // Import Supabase config
            const createSupabaseConfig = (await import('../../config/supabase.js')).default;
            const supabaseConfig = createSupabaseConfig();

            // Use real Supabase Auth
            const { data, error } = await supabaseConfig.getClient().auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username || email.split('@')[0],
                        full_name: full_name || username || email.split('@')[0],
                        role: 'customer'
                    }
                }
            });

            if (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: error.message
                }));
                return;
            }

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Registration successful. Please check your email for verification.',
                user: {
                    id: data.user?.id,
                    email: data.user?.email,
                    username: data.user?.user_metadata?.username,
                    full_name: data.user?.user_metadata?.full_name,
                    role: data.user?.user_metadata?.role || 'customer'
                },
                token: data.session?.access_token
            }));
        } catch (error) {
            console.error('Registration error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error during registration'
            }));
        }
    }

    // Logout user
    async logout(req, res) {
        try {
            // Get user ID from authenticated request
            const userId = req.user?.id;

            if (!userId) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'User not authenticated' }));
                return;
            }

            // TODO: Implement logout logic (e.g., invalidate tokens, clear sessions)
            // For now, just return success since Supabase handles session management

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Logged out successfully'
            }));
        } catch (error) {
            console.error('Logout error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error during logout'
            }));
        }
    }

    // Get user profile
    async getProfile(req, res) {
        try {
            // Get user ID from authenticated request
            const userId = req.user?.id;

            if (!userId) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'User not authenticated'
                }));
                return;
            }

            // Use models from controller instance
            const Profile = this.models?.Profile;

            if (!Profile) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Profile model not available'
                }));
                return;
            }

            // Get profile data from database
            const profile = await Profile.findByUserId(userId);

            if (!profile) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Profile not found'
                }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                user: profile
            }));
        } catch (error) {
            console.error('Get profile error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error while fetching profile'
            }));
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            // Get user ID from authenticated request
            const userId = req.user?.id;

            if (!userId) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'User not authenticated'
                }));
                return;
            }

            const updates = req.body;

            // Validate required fields
            if (!updates || Object.keys(updates).length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'No updates provided'
                }));
                return;
            }

            // Use models from controller instance
            const Profile = this.models?.Profile;

            if (!Profile) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Profile model not available'
                }));
                return;
            }

            // Update profile in database
            const updatedProfile = await Profile.updateByUserId(userId, updates);

            if (!updatedProfile) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Profile not found or update failed'
                }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Profile updated successfully',
                user: updatedProfile
            }));
        } catch (error) {
            console.error('Update profile error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error while updating profile'
            }));
        }
    }
}

export default AuthController;