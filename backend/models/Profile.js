// 👨‍💼 Profile Model - profiles table
// Handles user profile data management

const BaseModel = require('./BaseModel');

class Profile extends BaseModel {
    constructor(supabaseClient) {
        super('profiles');
        this.supabaseClient = supabaseClient;
    }

    // Get profile by user ID
    async findByUserId(userId) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await this.supabaseClient
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows returned
                    return null;
                }
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error finding profile by user ID:', error);
            throw error;
        }
    }

    // Update profile by user ID
    async updateByUserId(userId, data) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Add updated_at timestamp
            const updateData = {
                ...data,
                updated_at: new Date().toISOString()
            };

            const { data: updatedProfile, error } = await this.supabaseClient
                .from('profiles')
                .update(updateData)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return updatedProfile;
        } catch (error) {
            console.error('Error updating profile by user ID:', error);
            throw error;
        }
    }

    // Create profile for new user
    async createForUser(userId, profileData) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const profileDataWithUser = {
                user_id: userId,
                ...profileData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabaseClient
                .from('profiles')
                .insert(profileDataWithUser)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error creating profile for user:', error);
            throw error;
        }
    }

    // Delete profile by user ID
    async deleteByUserId(userId) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabaseClient
                .from('profiles')
                .delete()
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error deleting profile by user ID:', error);
            throw error;
        }
    }
}

module.exports = Profile;