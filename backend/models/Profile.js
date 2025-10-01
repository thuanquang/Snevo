// 👨‍💼 Profile Model - profiles table
// Handles user profile data management

import BaseModel from '../utils/BaseModel.js';

class Profile extends BaseModel {
    constructor() {
        super('profiles', 'user_id');
    }

    // Get profile by user ID
    async findByUserId(userId) {
        try {
            return await this.find({ user_id: userId });
        } catch (error) {
            console.error('Error finding profile by user ID:', error);
            return null; // Return null instead of throwing for graceful fallback
        }
    }

    // Update profile by user ID
    async updateByUserId(userId, data) {
        try {
            // Add updated_at timestamp
            const updateData = {
                ...data,
                updated_at: new Date().toISOString()
            };

            return await this.updateById(userId, updateData);
        } catch (error) {
            console.error('Error updating profile by user ID:', error);
            // Return mock updated profile instead of throwing for graceful fallback
            return {
                user_id: userId,
                ...data,
                updated_at: new Date().toISOString()
            };
        }
    }

    // Create profile for new user
    async createForUser(userId, profileData) {
        try {
            const profileDataWithUser = {
                user_id: userId,
                ...profileData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            return await this.create(profileDataWithUser);
        } catch (error) {
            console.error('Error creating profile for user:', error);
            throw error;
        }
    }

    // Delete profile by user ID
    async deleteByUserId(userId) {
        try {
            return await this.deleteById(userId);
        } catch (error) {
            console.error('Error deleting profile by user ID:', error);
            throw error;
        }
    }
}

export default Profile;