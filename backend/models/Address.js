// 🏠 Address Model - addresses table
// Handles user address data management

const BaseModel = require('./BaseModel');

class Address extends BaseModel {
    constructor(supabaseClient) {
        super('addresses', supabaseClient);
    }

    // Get addresses by user ID
    async findByUserId(userId) {
        // TODO: Implement find by user ID logic
        throw new Error('Find by user ID method not implemented');
    }

    // Get default address for user
    async findDefaultByUserId(userId) {
        // TODO: Implement find default address logic
        throw new Error('Find default address method not implemented');
    }

    // Set default address
    async setDefault(userId, addressId) {
        // TODO: Implement set default address logic
        throw new Error('Set default address method not implemented');
    }
}

module.exports = Address;
