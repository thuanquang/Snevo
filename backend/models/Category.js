// 📂 Category Model - categories table
// Handles shoe category data management

import BaseModel from '../utils/BaseModel.js';

class Category extends BaseModel {
    constructor() {
        super('categories');
    }

    // Get active categories
    async findActive() {
        // TODO: Implement find active categories logic
        throw new Error('Find active categories method not implemented');
    }

    // Get category with products
    async findWithProducts(categoryId) {
        // TODO: Implement find category with products logic
        throw new Error('Find category with products method not implemented');
    }
}

export default Category;