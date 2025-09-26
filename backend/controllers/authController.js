/**
 * Authentication Controller
 * Handles user authentication, registration, and profile management using OOP principles
 */

import { supabase, supabaseAdmin } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import { userModel } from '../models/User.js';
import BaseController from '../utils/BaseController.js';
import { ValidationError, AuthenticationError, ConflictError } from '../utils/ErrorClasses.js';

class AuthController extends BaseController {
    constructor() {
        super();
        this.userModel = userModel;
    }

    /**
     * Register new user
     */
    async register(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { email, password, full_name, username, role = 'customer' } = req.body;

            // Validate input data
            this.validateRequest(req.body, {
                email: { required: true, type: 'email' },
                password: { required: true, type: 'string', minLength: constants.VALIDATION_RULES.PASSWORD_MIN_LENGTH },
                full_name: { required: true, type: 'string', minLength: 2 },
                username: { required: true, type: 'string', minLength: 3 },
                role: { required: false, type: 'string', enum: Object.values(constants.USER_ROLES) }
            });

            // Register user with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name,
                        username,
                        role
                    }
                }
            });

            if (authError) {
                throw new ValidationError(authError.message);
            }

            // Create user record in database
            const userData = {
                email,
                username,
                full_name,
                role,
                password_hash: 'handled_by_supabase_auth' // Supabase handles password hashing
            };

            const user = await this.userModel.create(userData);

            this.sendResponse(res, {
                user: {
                    id: authData.user?.id,
                    email: authData.user?.email,
                    username,
                    full_name,
                    role
                },
                session: authData.session
            }, constants.SUCCESS_MESSAGES.AUTH.REGISTER_SUCCESS, constants.HTTP_STATUS.CREATED);
        });
    }

    /**
     * Login user
     */
    async login(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { email, password } = req.body;

            // Validate input
            this.validateRequest(req.body, {
                email: { required: true, type: 'email' },
                password: { required: true, type: 'string' }
            });

            // Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw new AuthenticationError(constants.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
            }

            // Get user details from database
            const userDetails = await this.userModel.findByEmail(email);

            this.sendResponse(res, {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: userDetails?.username,
                    full_name: userDetails?.full_name,
                    role: userDetails?.role
                },
                session: data.session
            }, constants.SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS);
        });
    }

    /**
     * Logout user
     */
    async logout(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { error } = await supabase.auth.signOut();

            if (error) {
                throw new Error(error.message);
            }

            this.sendResponse(res, null, constants.SUCCESS_MESSAGES.AUTH.LOGOUT_SUCCESS);
        });
    }

    /**
     * Get user profile
     */
    async getProfile(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            
            const userDetails = await this.userModel.findByEmail(user.email);

            if (!userDetails) {
                throw new NotFoundError('User account');
            }

            this.sendResponse(res, {
                user: {
                    id: user.id,
                    email: userDetails.email,
                    username: userDetails.username,
                    full_name: userDetails.full_name,
                    role: userDetails.role,
                    created_at: userDetails.created_at
                }
            });
        });
    }

    /**
     * Update user profile
     */
    async updateProfile(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { username, full_name } = req.body;

            // Validate updates
            const updates = {};
            if (username) {
                this.validateRequest({ username }, {
                    username: { required: true, type: 'string', minLength: 3, maxLength: 50 }
                });
                updates.username = username;
            }
            
            if (full_name) {
                this.validateRequest({ full_name }, {
                    full_name: { required: true, type: 'string', minLength: 2, maxLength: 100 }
                });
                updates.full_name = full_name;
            }

            if (Object.keys(updates).length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            const updatedUser = await this.userModel.updateByEmail(user.email, updates);

            this.sendResponse(res, {
                user: updatedUser
            }, constants.SUCCESS_MESSAGES.AUTH.PROFILE_UPDATED);
        });
    }

    /**
     * Refresh authentication token
     */
    async refreshToken(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { refresh_token } = req.body;

            if (!refresh_token) {
                throw new ValidationError('Refresh token is required');
            }

            const { data, error } = await supabase.auth.refreshSession({
                refresh_token
            });

            if (error) {
                throw new AuthenticationError(error.message);
            }

            this.sendResponse(res, {
                session: data.session
            });
        });
    }

    /**
     * Forgot password
     */
    async forgotPassword(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { email } = req.body;

            this.validateRequest(req.body, {
                email: { required: true, type: 'email' }
            });

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.FRONTEND_URL}/reset-password`
            });

            if (error) {
                throw new Error(error.message);
            }

            this.sendResponse(res, null, 'Password reset email sent successfully');
        });
    }

    /**
     * Reset password
     */
    async resetPassword(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { access_token, refresh_token, password } = req.body;

            this.validateRequest(req.body, {
                access_token: { required: true, type: 'string' },
                refresh_token: { required: true, type: 'string' },
                password: { required: true, type: 'string', minLength: constants.VALIDATION_RULES.PASSWORD_MIN_LENGTH }
            });

            // Set session with tokens
            const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token
            });

            if (sessionError) {
                throw new AuthenticationError(sessionError.message);
            }

            // Update password
            const { error } = await supabase.auth.updateUser({
                password
            });

            if (error) {
                throw new Error(error.message);
            }

            this.sendResponse(res, null, 'Password reset successfully');
        });
    }

    /**
     * Google OAuth authentication
     */
    async googleAuth(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { id_token, redirect_url } = req.body;

            // Validate required fields
            if (!id_token) {
                throw new ValidationError('Google ID token is required');
            }

            // Verify Google ID token using Supabase helper
            const result = await supabaseHelpers.verifyGoogleIdToken(id_token);
            
            if (!result.success) {
                throw new AuthenticationError(result.error || 'Failed to verify Google ID token');
            }

            const { data } = result;

            // Check if user exists in database, create if not
            let userDetails = await this.userModel.findByEmail(data.user.email);

            if (!userDetails) {
                // Create user record for Google OAuth user
                const userData = {
                    email: data.user.email,
                    username: data.user.user_metadata?.full_name?.replace(/\s+/g, '_').toLowerCase() || data.user.email.split('@')[0],
                    full_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
                    role: 'customer',
                    password_hash: 'google_oauth', // Placeholder for OAuth users
                    email_verified: true // Google users are pre-verified
                };

                try {
                    userDetails = await this.userModel.create(userData);
                    console.log(`✅ Created new user from Google OAuth: ${data.user.email}`);
                } catch (createError) {
                    console.error('Error creating Google OAuth user:', createError);
                    throw new ValidationError('Failed to create user account');
                }
            }

            this.sendResponse(res, {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: userDetails.username,
                    full_name: userDetails.full_name,
                    role: userDetails.role,
                    email_verified: true
                },
                session: data.session,
                redirect_url: redirect_url || process.env.FRONTEND_URL || '/'
            }, constants.SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS);
        });
    }

    /**
     * Get user addresses
     */
    async getAddresses(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const addresses = await this.userModel.getAddresses(user.id);
            
            this.sendResponse(res, { addresses });
        });
    }

    /**
     * Add user address
     */
    async addAddress(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            
            // Validate address data
            this.validateRequest(req.body, {
                street: { required: true, type: 'string', maxLength: 255 },
                city: { required: true, type: 'string', maxLength: 100 },
                state: { required: true, type: 'string', maxLength: 100 },
                country: { required: true, type: 'string', maxLength: 100 },
                zip_code: { required: true, type: 'string', maxLength: 20 },
                is_default: { required: false, type: 'boolean' }
            });

            const address = await this.userModel.addAddress(user.id, req.body);
            
            this.sendResponse(res, { address }, 'Address added successfully', constants.HTTP_STATUS.CREATED);
        });
    }

    /**
     * Update user address
     */
    async updateAddress(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { addressId } = req.params;
            
            const address = await this.userModel.updateAddress(user.id, addressId, req.body);
            
            this.sendResponse(res, { address }, 'Address updated successfully');
        });
    }

    /**
     * Delete user address
     */
    async deleteAddress(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { addressId } = req.params;
            
            await this.userModel.deleteAddress(user.id, addressId);
            
            this.sendResponse(res, null, 'Address deleted successfully');
        });
    }

    /**
     * Get user orders
     */
    async getOrders(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const pagination = this.getPaginationParams(req);
            
            const result = await this.userModel.getOrders(user.id, pagination);
            
            this.sendPaginatedResponse(res, result, pagination);
        });
    }

    /**
     * Get user reviews
     */
    async getReviews(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const pagination = this.getPaginationParams(req);
            
            const result = await this.userModel.getReviews(user.id, pagination);
            
            this.sendPaginatedResponse(res, result, pagination);
        });
    }
}

// Create a singleton instance for use in routes
const authController = new AuthController();

export default AuthController;
export { authController };