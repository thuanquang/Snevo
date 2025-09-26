/**
 * User Model
 * Handles user data operations with Supabase using OOP principles
 */

import { supabase, supabaseAdmin } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import BaseModel from '../utils/BaseModel.js';
import { ValidationError, ConflictError, NotFoundError } from '../utils/ErrorClasses.js';

class User extends BaseModel {
    constructor() {
        super(constants.DATABASE_TABLES.USERS, 'user_id');
        
        this.fillable = [
            'email', 'username', 'full_name', 'role', 'password_hash',
            'phone', 'date_of_birth', 'gender', 'avatar_url'
        ];
        
        this.hidden = ['password_hash', 'password'];
        
        this.validationRules = {
            email: {
                required: true,
                type: 'email'
            },
            username: {
                required: true,
                type: 'string',
                minLength: 3,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9_]+$/
            },
            full_name: {
                required: true,
                type: 'string',
                minLength: 2,
                maxLength: 100
            },
            role: {
                required: false,
                type: 'string',
                enum: Object.values(constants.USER_ROLES)
            },
            phone: {
                required: false,
                type: 'string',
                pattern: /^\+?[\d\s\-\(\)]+$/
            },
            password_hash: {
                required: true,
                type: 'string'
            }
        };
    }

    /**
     * Override create to add unique validation
     */
    async create(userData) {
        // Check for existing email
        if (userData.email && await this.emailExists(userData.email)) {
            throw new ConflictError('Email already exists');
        }

        // Check for existing username
        if (userData.username && await this.usernameExists(userData.username)) {
            throw new ConflictError('Username already exists');
        }

        return super.create(userData);
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                throw error;
            }

            return data ? this.hideFields(data) : null;
        } catch (error) {
            console.error('Find user by email error:', error);
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    /**
     * Find user by username
     */
    async findByUsername(username) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('username', username)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data ? this.hideFields(data) : null;
        } catch (error) {
            console.error('Find user by username error:', error);
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    /**
     * Update user by email
     */
    async updateByEmail(email, updates) {
        try {
            // Check for conflicts if updating email or username
            if (updates.email && updates.email !== email && await this.emailExists(updates.email)) {
                throw new ConflictError('Email already exists');
            }

            if (updates.username) {
                const existingUser = await this.findByEmail(email);
                if (existingUser && await this.usernameExists(updates.username, existingUser.user_id)) {
                    throw new ConflictError('Username already exists');
                }
            }

            const { data, error } = await supabase
                .from(this.tableName)
                .update(updates)
                .eq('email', email)
                .select()
                .single();

            if (error) throw error;
            return this.hideFields(data);
        } catch (error) {
            if (error instanceof ConflictError) throw error;
            console.error('Update user error:', error);
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    /**
     * Get user addresses
     */
    async getAddresses(userId) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.ADDRESSES)
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get user addresses error:', error);
            throw new Error(`Failed to get addresses: ${error.message}`);
        }
    }

    /**
     * Add user address
     */
    async addAddress(userId, addressData) {
        try {
            // If this is set as default, unset other default addresses
            if (addressData.is_default) {
                await supabase
                    .from(constants.DATABASE_TABLES.ADDRESSES)
                    .update({ is_default: false })
                    .eq('user_id', userId);
            }

            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.ADDRESSES)
                .insert([{ ...addressData, user_id: userId }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add address error:', error);
            throw new Error(`Failed to add address: ${error.message}`);
        }
    }

    /**
     * Update user address
     */
    async updateAddress(userId, addressId, updates) {
        try {
            // If this is set as default, unset other default addresses
            if (updates.is_default) {
                await supabase
                    .from(constants.DATABASE_TABLES.ADDRESSES)
                    .update({ is_default: false })
                    .eq('user_id', userId);
            }

            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.ADDRESSES)
                .update(updates)
                .eq('address_id', addressId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update address error:', error);
            throw new Error(`Failed to update address: ${error.message}`);
        }
    }

    /**
     * Delete user address
     */
    async deleteAddress(userId, addressId) {
        try {
            const { error } = await supabase
                .from(constants.DATABASE_TABLES.ADDRESSES)
                .delete()
                .eq('address_id', addressId)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete address error:', error);
            throw new Error(`Failed to delete address: ${error.message}`);
        }
    }

    /**
     * Get user orders
     */
    async getOrders(userId, pagination = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from(constants.DATABASE_TABLES.ORDERS)
                .select(`
                    *,
                    addresses:address_id (
                        street,
                        city,
                        state,
                        country,
                        zip_code
                    )
                `, { count: 'exact' })
                .eq('user_id', userId)
                .order('order_date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            
            return {
                orders: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Get user orders error:', error);
            throw new Error(`Failed to get orders: ${error.message}`);
        }
    }

    /**
     * Get user reviews
     */
    async getReviews(userId, pagination = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from(constants.DATABASE_TABLES.REVIEWS)
                .select(`
                    *,
                    shoes:shoe_id (
                        shoe_name,
                        image_url
                    )
                `, { count: 'exact' })
                .eq('user_id', userId)
                .order('review_date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            
            return {
                reviews: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Get user reviews error:', error);
            throw new Error(`Failed to get reviews: ${error.message}`);
        }
    }

    /**
     * Check if username exists
     */
    async usernameExists(username, excludeUserId = null) {
        try {
            let query = supabase
                .from(this.tableName)
                .select('user_id')
                .eq('username', username);

            if (excludeUserId) {
                query = query.neq('user_id', excludeUserId);
            }

            const { data, error } = await query.single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return !!data;
        } catch (error) {
            console.error('Check username exists error:', error);
            throw new Error(`Failed to check username: ${error.message}`);
        }
    }

    /**
     * Check if email exists
     */
    async emailExists(email, excludeUserId = null) {
        try {
            let query = supabase
                .from(this.tableName)
                .select('user_id')
                .eq('email', email);

            if (excludeUserId) {
                query = query.neq('user_id', excludeUserId);
            }

            const { data, error } = await query.single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return !!data;
        } catch (error) {
            console.error('Check email exists error:', error);
            throw new Error(`Failed to check email: ${error.message}`);
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        try {
            const [ordersResult, reviewsResult] = await Promise.all([
                supabase
                    .from(constants.DATABASE_TABLES.ORDERS)
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId),
                supabase
                    .from(constants.DATABASE_TABLES.REVIEWS)
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
            ]);

            return {
                total_orders: ordersResult.count || 0,
                total_reviews: reviewsResult.count || 0
            };
        } catch (error) {
            console.error('Get user stats error:', error);
            throw new Error(`Failed to get user stats: ${error.message}`);
        }
    }
}

// Create a singleton instance for static-like access
const userModel = new User();

// Export both the class and instance for flexibility
export default User;
export { userModel };