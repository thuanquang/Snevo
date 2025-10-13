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
            const result = await this.find({ user_id: userId });
            // Extract the first record from the paginated result
            return result.data && result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error('Error finding profile by user ID:', error);
            return null; // Return null instead of throwing for graceful fallback
        }
    }

    // Update profile by user ID
    async updateByUserId(userId, data) {
        // Add updated_at timestamp
        const updateData = {
            ...data,
            updated_at: new Date().toISOString()
        };

        return await this.updateById(userId, updateData);
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