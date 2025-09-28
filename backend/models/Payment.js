// 💳 Payment Model - payments table
// Handles payment data management

const BaseModel = require('./BaseModel');

class Payment extends BaseModel {
    constructor(supabaseClient) {
        super('payments', supabaseClient);
    }

    // Get payments by order ID
    async findByOrderId(orderId) {
        // TODO: Implement find by order ID logic
        throw new Error('Find by order ID method not implemented');
    }

    // Get payments by status
    async findByStatus(status) {
        // TODO: Implement find by status logic
        throw new Error('Find by status method not implemented');
    }

    // Get payments by method
    async findByMethod(paymentMethod) {
        // TODO: Implement find by method logic
        throw new Error('Find by method method not implemented');
    }

    // Update payment status
    async updateStatus(paymentId, status) {
        // TODO: Implement update status logic
        throw new Error('Update status method not implemented');
    }
}

module.exports = Payment;
