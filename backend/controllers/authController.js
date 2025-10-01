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

            // For now, return a mock successful login
            // In a real implementation, you would validate against Supabase Auth
            const mockUser = {
                id: 'user_' + Date.now(),
                email: email,
                username: email.split('@')[0],
                full_name: email.split('@')[0],
                role: 'customer'
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Login successful',
                user: mockUser,
                token: 'mock_jwt_token_' + Date.now()
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

            // For now, return a mock successful registration
            // In a real implementation, you would create user in Supabase Auth
            const mockUser = {
                id: 'user_' + Date.now(),
                email: email,
                username: username || email.split('@')[0],
                full_name: full_name || username || email.split('@')[0],
                role: 'customer'
            };

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Registration successful',
                user: mockUser,
                token: 'mock_jwt_token_' + Date.now()
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

            // Use models from controller instance or mock for testing
            const Profile = this.models?.Profile;

            if (!Profile) {
                // Return mock profile for testing when database is not available
                const mockProfile = {
                    user_id: userId,
                    username: 'testuser',
                    full_name: 'Test User',
                    email: 'user@example.com',
                    role: 'customer',
                    phone: '',
                    date_of_birth: null,
                    gender: '',
                    avatar_url: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    user: mockProfile
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

            // Use models from controller instance or mock for testing
            const Profile = this.models?.Profile;

            if (!Profile) {
                // Return mock updated profile for testing when database is not available
                const mockUpdatedProfile = {
                    user_id: userId,
                    username: updates.username || 'testuser',
                    full_name: updates.full_name || 'Test User',
                    email: 'user@example.com',
                    role: 'customer',
                    phone: updates.phone || '',
                    date_of_birth: updates.date_of_birth || null,
                    gender: updates.gender || '',
                    avatar_url: updates.avatar_url || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Profile updated successfully',
                    user: mockUpdatedProfile
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