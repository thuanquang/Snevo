/**
 * User Model
 * Handles user data operations with Supabase
 */

import { supabase, supabaseAdmin } from '../../config/supabase.js';
import constants from '../../config/constants.js';

class User {
    /**
     * Create a new user
     */
    static async create(userData) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .insert([userData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('User creation error:', error);
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Find user by email error:', error);
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    /**
     * Find user by ID
     */
    static async findById(userId) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Find user by ID error:', error);
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    /**
     * Find user by username
     */
    static async findByUsername(username) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .select('*')
                .eq('username', username)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Find user by username error:', error);
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    /**
     * Update user by email
     */
    static async updateByEmail(email, updates) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .update(updates)
                .eq('email', email)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update user error:', error);
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    /**
     * Update user by ID
     */
    static async updateById(userId, updates) {
        try {
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .update(updates)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update user by ID error:', error);
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    /**
     * Delete user by ID
     */
    static async deleteById(userId) {
        try {
            const { error } = await supabase
                .from(constants.DATABASE_TABLES.USERS)
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete user error:', error);
            throw new Error(`Failed to delete user: ${error.message}`);
        }
    }

    /**
     * Get user addresses
     */
    static async getAddresses(userId) {
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
    static async addAddress(userId, addressData) {
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
    static async updateAddress(userId, addressId, updates) {
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
    static async deleteAddress(userId, addressId) {
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
    static async getOrders(userId, pagination = {}) {
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
    static async getReviews(userId, pagination = {}) {
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
    static async usernameExists(username, excludeUserId = null) {
        try {
            let query = supabase
                .from(constants.DATABASE_TABLES.USERS)
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
    static async emailExists(email, excludeUserId = null) {
        try {
            let query = supabase
                .from(constants.DATABASE_TABLES.USERS)
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
}

export default User;

