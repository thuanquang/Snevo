// ⭐ Review Model - reviews table
// Handles product review data management

import BaseModel from '../utils/BaseModel.js';

class Review extends BaseModel {
    constructor() {
        super('reviews');
    }

    // Get reviews by shoe ID
    async findByShoeId(shoeId) {
        // TODO: Implement find by shoe ID logic
        throw new Error('Find by shoe ID method not implemented');
    }

    // Get reviews by user ID
    async findByUserId(userId) {
        // TODO: Implement find by user ID logic
        throw new Error('Find by user ID method not implemented');
    }

    // Get average rating for shoe
    async getAverageRating(shoeId) {
        // TODO: Implement get average rating logic
        throw new Error('Get average rating method not implemented');
    }

    // Get review count for shoe
    async getReviewCount(shoeId) {
        // TODO: Implement get review count logic
        throw new Error('Get review count method not implemented');
    }
}

export default Review;
