// 💳 Payment Model - payments table
// Handles payment data management

import BaseModel from '../utils/BaseModel.js';
import createSupabaseConfig from '../../config/supabase.js';
import { 
    generateMockPaymentDetails, 
    parsePaymentDetails, 
    shouldAutoCompletePayment 
} from '../utils/orderUtils.js';
import constants from '../../config/constants.js';

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
    async createPayment({ order_id, payment_method, payment_amount, status = 'pending', transaction_id = null, payment_details = {} }) {
        // Generate mock details and merge with provided details
        const mockDetailsJson = generateMockPaymentDetails(payment_method, payment_details);
        const finalTransactionId = transaction_id || mockDetailsJson;
        
        // Auto-complete status for card/Stripe
        const finalStatus = shouldAutoCompletePayment(payment_method) 
            ? constants.PAYMENT_STATUS.COMPLETED 
            : (status || constants.PAYMENT_STATUS.PENDING);
        
        console.log('💳 Creating payment:', {
            order_id,
            payment_method,
            payment_amount,
            finalStatus,
            transaction_id_length: finalTransactionId?.length
        });
        
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .insert([{
                order_id,
                payment_method,
                payment_amount,
                status: finalStatus,
                transaction_id: finalTransactionId,
                payment_date: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) throw new Error(`Failed to create payment: ${error.message}`);
        
        // Parse and attach details
        if (data) {
            data.details = parsePaymentDetails(data.transaction_id);
        }
        
        return data;
    }

    // Get latest payment by order_id with parsed details
    async findLatestByOrderId(orderId) {
        const { data, error } = await supabaseConfig.getAdminClient()
            .from(this.tableName)
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new Error(`Failed to fetch payment: ${error.message}`);
        }
        
        // Parse transaction_id into details
        if (data) {
            data.details = parsePaymentDetails(data.transaction_id);
        }
        
        return data;
    }

    // Mark payment as completed (for admin confirmation)
    async markCompleted(paymentId, options = {}) {
        try {
            const existing = await this.findById(paymentId);
            if (!existing) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            // Idempotent: if already completed, return current state
            if (existing.status === constants.PAYMENT_STATUS.COMPLETED) {
                console.log('💳 Payment already completed (idempotent):', paymentId);
                existing.details = parsePaymentDetails(existing.transaction_id);
                return existing;
            }

            // Parse existing details (compact format)
            let currentDetails;
            try {
                currentDetails = JSON.parse(existing.transaction_id);
            } catch (e) {
                currentDetails = { t: 'unknown' };
            }
            
            // Update compact format with verification/collection info
            if (currentDetails.t === 'bank' && options.verified_by) {
                currentDetails.v = options.verified_by;
                currentDetails.va = new Date().toISOString().split('T')[0];
            }
            
            // For COD, update collection status (compact format)
            if (currentDetails.t === 'cash' && options.collected) {
                currentDetails.s = 'collected';
                currentDetails.c = options.collected_by || 'Admin';
                currentDetails.ca = new Date().toISOString().split('T')[0];
            }

            const updatedTransactionId = JSON.stringify(currentDetails);
            
            // Verify length constraint
            if (updatedTransactionId.length > 100) {
                console.warn('⚠️ Transaction ID too long, truncating:', updatedTransactionId.length);
                // Fallback to minimal format
                currentDetails = { t: currentDetails.t, s: 'completed' };
            }

            const { data, error } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .update({
                    status: constants.PAYMENT_STATUS.COMPLETED,
                    transaction_id: JSON.stringify(currentDetails),
                    payment_date: new Date().toISOString()
                })
                .eq('payment_id', paymentId)
                .select()
                .single();

            if (error) throw new Error(`Failed to mark payment completed: ${error.message}`);

            console.log(`✅ Payment ${paymentId} marked completed`);
            
            // Parse and attach details
            if (data) {
                data.details = parsePaymentDetails(data.transaction_id);
            }
            
            return data;
        } catch (error) {
            console.error('Error marking payment completed:', error);
            throw error;
        }
    }

    // Refund a payment (idempotent)
    async refundPayment(paymentId, refundNote = null) {
        try {
            // Check if already refunded
            const existing = await this.findById(paymentId);
            if (!existing) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            // If already refunded, return current state (idempotent)
            if (existing.status === 'refunded') {
                console.log('💳 Payment already refunded (idempotent call):', paymentId);
                return existing;
            }

            // Generate refund transaction ID
            const refundTxnId = `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Update payment to refunded with transaction ID and timestamp
            const { data, error } = await supabaseConfig.getAdminClient()
                .from(this.tableName)
                .update({
                    status: 'refunded',
                    transaction_id: refundTxnId,
                    payment_date: new Date().toISOString()
                })
                .eq('payment_id', paymentId)
                .select()
                .single();

            if (error) throw new Error(`Failed to refund payment: ${error.message}`);

            console.log(`✅ Payment ${paymentId} refunded:`, refundTxnId);
            return data;
        } catch (error) {
            console.error('Error refunding payment:', error);
            throw error;
        }
    }

    // Calculate total revenue from completed payments (admin helper)
    async calculateTotalRevenue() {
        try {
            const { data, error } = await supabaseConfig
                .getAdminClient()
                .from(this.tableName)
                .select('payment_amount')
                .eq('status', 'completed');

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
