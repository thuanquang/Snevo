/**
 * Authentication Controller
 * Handles user authentication, registration, and profile management using OOP principles
 */

import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import { profileModel } from '../models/Profile.js';
import BaseController from '../utils/BaseController.js';
import { ValidationError, AuthenticationError, ConflictError, NotFoundError } from '../utils/ErrorClasses.js';

class AuthController extends BaseController {
    constructor() {
        super();
        this.profileModel = profileModel;
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

            // Check if username is available (with fallback for permission issues)
            try {
                const isUsernameAvailable = await this.profileModel.isUsernameAvailable(username);
                if (!isUsernameAvailable) {
                    throw new ConflictError('Username already exists');
                }
            } catch (error) {
                if (error.message.includes('permission denied')) {
                    console.warn('Username availability check failed due to permissions - continuing with registration. Database constraint will prevent duplicates.');
                } else {
                    throw error; // Re-throw non-permission errors
                }
            }

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

            // Profile will be auto-created by database trigger
            // But we can also create it explicitly to ensure it exists
            if (authData.user?.id) {
                try {
                    await this.profileModel.upsertProfile(authData.user.id, {
                        username,
                        full_name,
                        role
                    });
                } catch (profileError) {
                    console.warn('Profile auto-creation failed, but trigger should handle it:', profileError.message);
                }
            }

            // Determine if email verification is required
            const emailVerificationRequired = !authData.session; // No session = email verification needed
            
            this.sendResponse(res, {
                user: {
                    id: authData.user?.id,
                    email: authData.user?.email,
                    username,
                    full_name,
                    role,
                    email_verified: authData.user?.email_confirmed_at !== null,
                    requires_email_verification: emailVerificationRequired
                },
                session: authData.session,
                message: emailVerificationRequired 
                    ? 'Account created! Please check your email to verify your account before full access.'
                    : 'Account created and logged in successfully!'
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
                // Handle specific authentication errors
                console.log('Supabase auth error details:', {
                    message: error.message,
                    status: error.status,
                    code: error.code
                });

                if (error.message === 'Email not confirmed' || error.code === 'email_not_confirmed') {
                    throw new AuthenticationError(constants.ERROR_MESSAGES.AUTH.EMAIL_NOT_CONFIRMED, 401, 'EMAIL_NOT_CONFIRMED');
                } else if (error.message === 'Invalid login credentials' || error.message === 'Invalid email or password') {
                    throw new AuthenticationError(constants.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
                } else if (error.message === 'User not found' || error.message === 'No user found') {
                    throw new AuthenticationError('No account found with this email address.');
                } else if (error.message === 'Invalid password' || error.message === 'Wrong password') {
                    throw new AuthenticationError('Incorrect password. Please try again.');
                } else {
                    // Log the actual error for debugging
                    console.error('Unhandled Supabase auth error:', error);
                    throw new AuthenticationError(constants.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
                }
            }

            // Get user profile from database
            const profile = await this.profileModel.findByUserId(data.user.id);

            // If no profile exists, create a minimal one (fallback)
            if (!profile && data.user.id) {
                try {
                    const fallbackProfile = await this.profileModel.upsertProfile(data.user.id, {
                        username: data.user.email.split('@')[0],
                        full_name: data.user.user_metadata?.full_name || '',
                        role: 'customer'
                    });
                    console.log('Created fallback profile for user:', data.user.id);
                } catch (profileError) {
                    console.warn('Failed to create fallback profile:', profileError.message);
                }
            }

            this.sendResponse(res, {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    email_verified: data.user.email_confirmed_at !== null,
                    username: profile?.username,
                    full_name: profile?.full_name,
                    role: profile?.role || 'customer',
                    avatar_url: profile?.avatar_url,
                    created_at: data.user.created_at,
                    last_sign_in_at: data.user.last_sign_in_at
                },
                session: data.session
            }, constants.SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS);
        });
    }

    /**
     * Logout user - handled client-side with Supabase OAuth
     * This endpoint is kept for compatibility but logout is handled client-side
     */
    async logout(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            // For Supabase OAuth, logout is handled entirely client-side
            // The client calls supabaseClient.auth.signOut() directly
            this.sendResponse(res, null, 'Logout handled client-side with Supabase OAuth');
        });
    }

    /**
     * Get user profile
     */
    async getProfile(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            
            const profile = await this.profileModel.findByUserId(user.id);

            if (!profile) {
                throw new NotFoundError('User profile not found');
            }

            this.sendResponse(res, {
                user: {
                    id: user.id,
                    email: user.email,
                    email_verified: user.email_confirmed_at !== null,
                    created_at: user.created_at,
                    last_sign_in_at: user.last_sign_in_at
                },
                profile: profile
            });
        });
    }

    /**
     * Update user profile
     */
    async updateProfile(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const allowedFields = ['username', 'full_name', 'avatar_url', 'phone', 'date_of_birth', 'gender'];
            
            // Filter only allowed fields
            const updates = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            if (Object.keys(updates).length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            const updatedProfile = await this.profileModel.updateByUserId(user.id, updates);

            this.sendResponse(res, {
                profile: updatedProfile
            }, constants.SUCCESS_MESSAGES.AUTH.PROFILE_UPDATED);
        });
    }

    /**
     * Resend email verification
     */
    async resendVerification(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const { email } = req.body;

            this.validateRequest(req.body, {
                email: { required: true, type: 'email' }
            });

            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email
            });

            if (error) {
                throw new ValidationError(error.message);
            }

            this.sendResponse(res, null, 'Verification email sent successfully');
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
     * Reset password - handled entirely by Supabase client-side
     * This endpoint is kept for compatibility but delegates to Supabase
     */
    async resetPassword(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            // For Supabase OAuth flow, password reset is handled client-side
            // This endpoint returns a message directing users to use the client-side flow
            this.sendResponse(res, null, 'Password reset is handled client-side with Supabase. Please use the forgot password link in the login form.');
        });
    }


    /**
     * Get user addresses
     */
    async getAddresses(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const addresses = await this.profileModel.getAddresses(user.id);
            
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

            const address = await this.profileModel.addAddress(user.id, req.body);
            
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
            
            const address = await this.profileModel.updateAddress(user.id, addressId, req.body);
            
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
            
            await this.profileModel.deleteAddress(user.id, addressId);
            
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
            
            const result = await this.profileModel.getOrders(user.id, pagination);
            
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
            
            const result = await this.profileModel.getReviews(user.id, pagination);
            
            this.sendPaginatedResponse(res, result, pagination);
        });
    }
}

// Create a singleton instance for use in routes
const authController = new AuthController();

export default AuthController;
export { authController };