// 👨‍💼 Profile Model - profiles table
// Handles user profile data management

const BaseModel = require('./BaseModel');

class Profile extends BaseModel {
    constructor(supabaseClient) {
        super('profiles', supabaseClient);
    }

    // Get profile by user ID
    async findByUserId(userId) {
        // TODO: Implement find by user ID logic
        throw new Error('Find by user ID method not implemented');
    }

    // Update profile by user ID
    async updateByUserId(userId, data) {
        // TODO: Implement update by user ID logic
        throw new Error('Update by user ID method not implemented');
    }
}

module.exports = Profile;