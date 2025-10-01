// 🏗️ Base Model - Common functionality for all models
// Provides base CRUD operations and common methods

class BaseModel {
    constructor(tableName, supabaseClient) {
        this.tableName = tableName;
        this.supabase = supabaseClient;
    }

    // Create a new record
    async create(data) {
        // TODO: Implement create logic
        throw new Error('Create method not implemented');
    }

    // Get all records
    async findAll(filters = {}) {
        // TODO: Implement find all logic
        throw new Error('Find all method not implemented');
    }

    // Get record by ID
    async findById(id) {
        // TODO: Implement find by ID logic
        throw new Error('Find by ID method not implemented');
    }

    // Update record
    async update(id, data) {
        // TODO: Implement update logic
        throw new Error('Update method not implemented');
    }

    // Delete record
    async delete(id) {
        // TODO: Implement delete logic
        throw new Error('Delete method not implemented');
    }
}

export default BaseModel;
