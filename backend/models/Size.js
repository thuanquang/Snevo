// 📏 Size Model - sizes table
// Handles size data management

import BaseModel from '../utils/BaseModel.js';

class Size extends BaseModel {
    constructor() {
        super('sizes');
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

export default Size;
