/**
 * Profile Model
 * Handles user profile data operations with Supabase using OOP principles
 * Works with auth.users for identity and profiles table for app-specific data
 */

import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import BaseModel from '../utils/BaseModel.js';
import { ValidationError, ConflictError, NotFoundError } from '../utils/ErrorClasses.js';

class Profile extends BaseModel {
    constructor() {
        super(constants.DATABASE_TABLES.PROFILES, 'user_id');
        
        this.fillable = [
            'user_id', 'username', 'full_name', 'role', 'avatar_url',
            'phone', 'date_of_birth', 'gender'
        ];
        
        this.hidden = [];
        
        this.validationRules = {
            user_id: {
                required: true,
                type: 'string'
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
                enum: Object.values(constants.USER_ROLES),
                default: constants.USER_ROLES.CUSTOMER
            },
            avatar_url: {
                required: false,
                type: 'string',
                maxLength: 500
            },
            phone: {
                required: false,
                type: 'string',
                maxLength: 20,
                pattern: /^[\+]?[0-9\-\s\(\)]+$/
            },
            date_of_birth: {
                required: false,
                type: 'date'
            },
            gender: {
                required: false,
                type: 'string',
                enum: ['male', 'female', 'other']
            }
        };
    }

    /**
     * Find profile by user ID (auth.users.id)
     */
    async findByUserId(userId) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // No profile found
                }
                throw error;
            }

            return this.hideFields(data);
        } catch (error) {
            console.error('Error finding profile by user ID:', error);
            return null;
        }
    }

    /**
     * Find profile by username
     */
    async findByUsername(username) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('username', username)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // No profile found
                }
                throw error;
            }

            return this.hideFields(data);
        } catch (error) {
            console.error('Error finding profile by username:', error);
            return null;
        }
    }

    /**
     * Get full user data (auth.users + profile)
     */
    async getFullUserData(userId) {
        try {
            // Get auth user data
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
            
            if (authError) {
                throw authError;
            }

            // Get profile data
            const profile = await this.findByUserId(userId);

            return {
                id: authUser.user.id,
                email: authUser.user.email,
                email_verified: authUser.user.email_confirmed_at !== null,
                created_at: authUser.user.created_at,
                last_sign_in_at: authUser.user.last_sign_in_at,
                profile: profile || null
            };
        } catch (error) {
            console.error('Error getting full user data:', error);
            throw error;
        }
    }

    /**
     * Create or update profile for a user
     */
    async upsertProfile(userId, profileData) {
        try {
            const data = {
                user_id: userId,
                ...this.filterFillable(profileData)
            };

            this.validate(data);

            const { data: result, error } = await supabase
                .from(this.tableName)
                .upsert(data, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;

            return this.hideFields(result);
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                if (error.message.includes('username')) {
                    throw new ConflictError('Username already exists');
                }
                throw new ConflictError('Profile data conflicts with existing record');
            }
            
            if (error instanceof ValidationError) {
                throw error;
            }
            
            throw new ValidationError(`Failed to create/update profile: ${error.message}`);
        }
    }

    /**
     * Update profile by user ID
     */
    async updateByUserId(userId, updates) {
        try {
            const filteredUpdates = this.filterFillable(updates);
            
            // Don't allow updating user_id
            delete filteredUpdates.user_id;
            
            if (Object.keys(filteredUpdates).length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            // Validate updates
            this.validatePartial(filteredUpdates);

            const { data, error } = await supabase
                .from(this.tableName)
                .update(filteredUpdates)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new NotFoundError('Profile not found');
                }
                if (error.code === '23505') {
                    if (error.message.includes('username')) {
                        throw new ConflictError('Username already exists');
                    }
                    throw new ConflictError('Profile data conflicts with existing record');
                }
                throw error;
            }

            return this.hideFields(data);
        } catch (error) {
            if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
                throw error;
            }
            throw new ValidationError(`Failed to update profile: ${error.message}`);
        }
    }

    /**
     * Delete profile by user ID
     */
    async deleteByUserId(userId) {
        try {
            const { error } = await supabase
                .from(this.tableName)
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Error deleting profile:', error);
            throw new ValidationError(`Failed to delete profile: ${error.message}`);
        }
    }

    /**
     * Check if username is available
     */
    async isUsernameAvailable(username, excludeUserId = null) {
        try {
            if (excludeUserId) {
                // For updates, we need to exclude the current user's ID
                // Use the direct query approach
                let query = supabase
                    .from(this.tableName)
                    .select('user_id')
                    .eq('username', username)
                    .neq('user_id', excludeUserId);

                const { data, error } = await query;
                if (error) throw error;
                return data.length === 0;
            } else {
                // For registration, use the RPC function that bypasses RLS
                // Try the schema-specific function first, then fallback to public
                try {
                    const { data, error } = await supabase.rpc('check_username_availability', {
                        username_to_check: username
                    });

                    if (error) throw error;
                    return data; // Function returns boolean directly
                } catch (rpcError) {
                    console.warn('RPC function failed, falling back to direct query:', rpcError.message);
                    
                    // Fallback to direct query (will fail if RLS blocks it, but worth trying)
                    const { data, error } = await supabase
                        .from(this.tableName)
                        .select('user_id')
                        .eq('username', username);

                    if (error) throw error;
                    return data.length === 0;
                }
            }
        } catch (error) {
            console.error('Error checking username availability:', error);
            throw new ValidationError(`Failed to check username availability: ${error.message}`);
        }
    }

    /**
     * Get profiles by role
     */
    async getByRole(role, pagination = {}) {
        try {
            const { page = 1, limit = 10 } = pagination;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact' })
                .eq('role', role)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return {
                data: data.map(item => this.hideFields(item)),
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Error getting profiles by role:', error);
            throw new ValidationError(`Failed to get profiles: ${error.message}`);
        }
    }

    /**
     * Search profiles by username or full name
     */
    async search(query, pagination = {}) {
        try {
            const { page = 1, limit = 10 } = pagination;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact' })
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return {
                data: data.map(item => this.hideFields(item)),
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Error searching profiles:', error);
            throw new ValidationError(`Failed to search profiles: ${error.message}`);
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
            console.error('Error getting user addresses:', error);
            throw new ValidationError(`Failed to get addresses: ${error.message}`);
        }
    }

    /**
     * Add user address
     */
    async addAddress(userId, addressData) {
        try {
            const data = {
                user_id: userId,
                ...addressData
            };

            // If this is set as default, unset other defaults
            if (data.is_default) {
                await supabase
                    .from(constants.DATABASE_TABLES.ADDRESSES)
                    .update({ is_default: false })
                    .eq('user_id', userId);
            }

            const { data: result, error } = await supabase
                .from(constants.DATABASE_TABLES.ADDRESSES)
                .insert(data)
                .select()
                .single();

            if (error) throw error;

            return result;
        } catch (error) {
            console.error('Error adding address:', error);
            throw new ValidationError(`Failed to add address: ${error.message}`);
        }
    }

    /**
     * Update user address
     */
    async updateAddress(userId, addressId, updates) {
        try {
            // If setting as default, unset other defaults
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

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new NotFoundError('Address not found');
                }
                throw error;
            }

            return data;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            console.error('Error updating address:', error);
            throw new ValidationError(`Failed to update address: ${error.message}`);
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
            console.error('Error deleting address:', error);
            throw new ValidationError(`Failed to delete address: ${error.message}`);
        }
    }

    /**
     * Get user orders
     */
    async getOrders(userId, pagination = {}) {
        try {
            const { page = 1, limit = 10 } = pagination;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from(constants.DATABASE_TABLES.ORDERS)
                .select(`
                    *,
                    addresses:address_id (
                        street, city, state, country, zip_code
                    ),
                    order_items (
                        *,
                        shoe_variants (
                            *,
                            shoes (
                                shoe_name, image_url
                            ),
                            colors (
                                color_name
                            ),
                            sizes (
                                size_value
                            )
                        )
                    )
                `, { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return {
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Error getting user orders:', error);
            throw new ValidationError(`Failed to get orders: ${error.message}`);
        }
    }

    /**
     * Get user reviews
     */
    async getReviews(userId, pagination = {}) {
        try {
            const { page = 1, limit = 10 } = pagination;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from(constants.DATABASE_TABLES.REVIEWS)
                .select(`
                    *,
                    shoes (
                        shoe_name, image_url
                    )
                `, { count: 'exact' })
                .eq('user_id', userId)
                .order('review_date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return {
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Error getting user reviews:', error);
            throw new ValidationError(`Failed to get reviews: ${error.message}`);
        }
    }
}

// Create a singleton instance for use in routes
const profileModel = new Profile();

export default Profile;
export { profileModel };
