// 📏 Size Model - sizes table
// Handles size data management

const BaseModel = require('./BaseModel');

class Size extends BaseModel {
    constructor(supabaseClient) {
        super('sizes', supabaseClient);
    }

    // Get active sizes
    async findActive() {
        // TODO: Implement find active sizes logic
        throw new Error('Find active sizes method not implemented');
    }

    // Get sizes by type
    async findByType(sizeType) {
        // TODO: Implement find by type logic
        throw new Error('Find by type method not implemented');
    }
}

module.exports = Size;
