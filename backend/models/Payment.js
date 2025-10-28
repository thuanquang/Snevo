// 💳 Payment Model - payments table
// Handles payment data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';

const supabaseConfig = createSupabaseConfig();

class Payment extends BaseModel {
    constructor() {
        super('payments');
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

    // Calculate total revenue from completed payments (admin helper)
    async calculateTotalRevenue() {
        try {
            const { data, error } = await supabaseConfig
                .getAdminClient()
                .from(this.tableName)
                .select('payment_amount')
                .eq('payment_status', 'completed');

            if (error) {
                console.error("Error calculating revenue:", error);
                return 0;
            }
            return (data || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        } catch (err) {
            console.error("Error calculating revenue:", err);
            return 0;
        }
    }
}

export default Payment;
