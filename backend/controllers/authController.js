/**
 * Authentication Controller
 * Handles user authentication, registration, and profile management
 */

import { supabase, supabaseAdmin } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import User from '../models/User.js';

class AuthController {
    /**
     * Register new user
     */
    static async register(req, res) {
        try {
            const { email, password, full_name, username, role = 'customer' } = req.body;

            // Validation
            if (!email || !password || !full_name || !username) {
                return res.json({
                    success: false,
                    error: 'All fields are required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Validate email format
            if (!constants.VALIDATION_RULES.EMAIL.test(email)) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.VALIDATION.INVALID_EMAIL
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Validate password length
            if (password.length < constants.VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.VALIDATION.INVALID_PASSWORD
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Check if role is valid
            if (!Object.values(constants.USER_ROLES).includes(role)) {
                return res.json({
                    success: false,
                    error: 'Invalid user role'
                }, constants.HTTP_STATUS.BAD_REQUEST);
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
                return res.json({
                    success: false,
                    error: authError.message
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Create user record in database
            const userData = {
                email,
                username,
                full_name,
                role,
                password_hash: 'handled_by_supabase_auth' // Supabase handles password hashing
            };

            const user = await User.create(userData);

            res.json({
                success: true,
                message: constants.SUCCESS_MESSAGES.AUTH.REGISTER_SUCCESS,
                data: {
                    user: {
                        id: authData.user?.id,
                        email: authData.user?.email,
                        username,
                        full_name,
                        role
                    },
                    session: authData.session
                }
            }, constants.HTTP_STATUS.CREATED);

        } catch (error) {
            console.error('Registration error:', error);
            res.json({
                success: false,
                error: error.message || constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Login user
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.json({
                    success: false,
                    error: 'Email and password are required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS
                }, constants.HTTP_STATUS.UNAUTHORIZED);
            }

            // Get user details from database
            const userDetails = await User.findByEmail(email);

            res.json({
                success: true,
                message: constants.SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS,
                data: {
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        username: userDetails?.username,
                        full_name: userDetails?.full_name,
                        role: userDetails?.role
                    },
                    session: data.session
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Logout user
     */
    static async logout(req, res) {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                return res.json({
                    success: false,
                    error: error.message
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            res.json({
                success: true,
                message: constants.SUCCESS_MESSAGES.AUTH.LOGOUT_SUCCESS
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get user profile
     */
    static async getProfile(req, res) {
        try {
            const userDetails = await User.findByEmail(req.user.email);

            if (!userDetails) {
                return res.json({
                    success: false,
                    error: constants.ERROR_MESSAGES.AUTH.ACCOUNT_NOT_FOUND
                }, constants.HTTP_STATUS.NOT_FOUND);
            }

            res.json({
                success: true,
                data: {
                    user: {
                        id: req.user.id,
                        email: userDetails.email,
                        username: userDetails.username,
                        full_name: userDetails.full_name,
                        role: userDetails.role,
                        created_at: userDetails.created_at
                    }
                }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(req, res) {
        try {
            const { username, full_name } = req.body;
            const updates = {};

            if (username) updates.username = username;
            if (full_name) updates.full_name = full_name;

            if (Object.keys(updates).length === 0) {
                return res.json({
                    success: false,
                    error: 'No valid fields to update'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const updatedUser = await User.updateByEmail(req.user.email, updates);

            res.json({
                success: true,
                message: constants.SUCCESS_MESSAGES.AUTH.PROFILE_UPDATED,
                data: {
                    user: updatedUser
                }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Refresh authentication token
     */
    static async refreshToken(req, res) {
        try {
            const { refresh_token } = req.body;

            if (!refresh_token) {
                return res.json({
                    success: false,
                    error: 'Refresh token is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const { data, error } = await supabase.auth.refreshSession({
                refresh_token
            });

            if (error) {
                return res.json({
                    success: false,
                    error: error.message
                }, constants.HTTP_STATUS.UNAUTHORIZED);
            }

            res.json({
                success: true,
                data: {
                    session: data.session
                }
            });

        } catch (error) {
            console.error('Refresh token error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Forgot password
     */
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.json({
                    success: false,
                    error: 'Email is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.FRONTEND_URL}/reset-password`
            });

            if (error) {
                return res.json({
                    success: false,
                    error: error.message
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            res.json({
                success: true,
                message: 'Password reset email sent successfully'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reset password
     */
    static async resetPassword(req, res) {
        try {
            const { access_token, refresh_token, password } = req.body;

            if (!access_token || !refresh_token || !password) {
                return res.json({
                    success: false,
                    error: 'Access token, refresh token, and new password are required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Set session with tokens
            const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token
            });

            if (sessionError) {
                return res.json({
                    success: false,
                    error: sessionError.message
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Update password
            const { error } = await supabase.auth.updateUser({
                password
            });

            if (error) {
                return res.json({
                    success: false,
                    error: error.message
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            res.json({
                success: true,
                message: 'Password reset successfully'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Google OAuth authentication
     */
    static async googleAuth(req, res) {
        try {
            const { id_token } = req.body;

            if (!id_token) {
                return res.json({
                    success: false,
                    error: 'Google ID token is required'
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: id_token
            });

            if (error) {
                return res.json({
                    success: false,
                    error: error.message
                }, constants.HTTP_STATUS.BAD_REQUEST);
            }

            // Check if user exists in database, create if not
            let userDetails = await User.findByEmail(data.user.email);

            if (!userDetails) {
                // Create user record for Google OAuth user
                const userData = {
                    email: data.user.email,
                    username: data.user.user_metadata?.full_name?.replace(/\s+/g, '_').toLowerCase() || data.user.email.split('@')[0],
                    full_name: data.user.user_metadata?.full_name || '',
                    role: 'customer',
                    password_hash: 'google_oauth'
                };

                userDetails = await User.create(userData);
            }

            res.json({
                success: true,
                message: constants.SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS,
                data: {
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        username: userDetails.username,
                        full_name: userDetails.full_name,
                        role: userDetails.role
                    },
                    session: data.session
                }
            });

        } catch (error) {
            console.error('Google auth error:', error);
            res.json({
                success: false,
                error: constants.ERROR_MESSAGES.GENERAL.INTERNAL_ERROR
            }, constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

export default AuthController;

