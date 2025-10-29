// 💳 Payment Model - payments table
// Handles payment data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';

const supabaseConfig = createSupabaseConfig();

class Payment extends BaseModel {
    constructor() {
        super('payments', 'payment_id');
    }

    // Get payments by order ID
    async findByOrderId(orderId) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
        return data || [];
    }

    // Get payments by status
    async findByStatus(status) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });
        if (error) throw new Error(`Failed to fetch payments by status: ${error.message}`);
        return data || [];
    }

    // Get payments by method
    async findByMethod(paymentMethod) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select('*')
            .eq('payment_method', paymentMethod)
            .order('created_at', { ascending: false });
        if (error) throw new Error(`Failed to fetch payments by method: ${error.message}`);
        return data || [];
    }

    // Update payment status
    async updateStatus(paymentId, status, transactionId = null) {
        const updateData = { status };
        if (transactionId) updateData.transaction_id = transactionId;
        
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .update(updateData)
            .eq(this.primaryKey, paymentId)
            .select()
            .single();
        if (error) throw new Error(`Failed to update payment status: ${error.message}`);
        return data;
    }

    // Create payment record
    async createPayment({ order_id, payment_method, payment_amount, status = 'pending', transaction_id = null }) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .insert([{
                order_id,
                payment_method,
                payment_amount,
                status,
                transaction_id,
                payment_date: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw new Error(`Failed to create payment: ${error.message}`);
        return data;
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
            return (data || []).reduce((sum, payment) => sum + (Number(payment.payment_amount) || 0), 0);
        } catch (err) {
            console.error("Error calculating revenue:", err);
            return 0;
        }
    }
}

export default Payment;
