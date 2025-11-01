// Order & Payment Utilities
// Handles order transitions, payment details generation, and review eligibility

import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../../config/constants.js';

/**
 * Generate mock payment details based on method
 * @param {string} method - Payment method
 * @param {Object} inputData - Form data from checkout
 * @returns {string} - JSON string to store in transaction_id (max 100 chars)
 */
export const generateMockPaymentDetails = (method, inputData = {}) => {
  const timestamp = new Date().toISOString().split('T')[0]; // Date only (YYYY-MM-DD)
  let details = {};
  
  switch(method) {
    case PAYMENT_METHODS.CREDIT_CARD:
    case PAYMENT_METHODS.DEBIT_CARD:
      details = {
        t: 'card',
        n: `***${inputData.cardNumber?.slice(-4) || '1234'}`,
        d: timestamp
      };
      break;
      
    case PAYMENT_METHODS.BANK_TRANSFER:
      details = {
        t: 'bank',
        b: inputData.bankName || inputData.bankCode || 'VCB',
        a: `***${inputData.accountNumber?.slice(-4) || inputData.bankAccount?.slice(-4) || '1234'}`,
        d: timestamp
      };
      break;
      
    case PAYMENT_METHODS.STRIPE:
      details = {
        t: 'stripe',
        pi: `pi_${Date.now()}`,
        d: timestamp
      };
      break;
      
    case PAYMENT_METHODS.CASH:
      details = {
        t: 'cash',
        s: 'pending'
      };
      break;
      
    default:
      details = {
        t: method,
        d: timestamp
      };
  }
  
  // Return compact JSON string to fit in VARCHAR(100)
  return JSON.stringify(details);
};

/**
 * Parse payment details from transaction_id
 * @param {string} transactionId - Transaction ID from database
 * @returns {Object|null} - Parsed payment details or legacy transaction ID
 */
export const parsePaymentDetails = (transactionId) => {
  if (!transactionId) return null;
  
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(transactionId);
    
    // Expand compact format to full format for display
    if (parsed.t) {
      const expanded = {
        type: parsed.t,
        date: parsed.d
      };
      
      // Card details
      if (parsed.t === 'card') {
        expanded.card_number = parsed.n;
        expanded.processed_at = parsed.d;
      }
      // Bank transfer
      else if (parsed.t === 'bank') {
        expanded.bank_code = parsed.b;
        expanded.account_number = parsed.a;
        expanded.submitted_at = parsed.d;
        if (parsed.v) expanded.verified_by = parsed.v;
        if (parsed.va) expanded.verified_at = parsed.va;
      }
      // Stripe
      else if (parsed.t === 'stripe') {
        expanded.stripe_payment_intent_id = parsed.pi;
        expanded.processed_at = parsed.d;
      }
      // Cash
      else if (parsed.t === 'cash') {
        expanded.collection_status = parsed.s || 'pending';
        if (parsed.c) expanded.collected_by = parsed.c;
        if (parsed.ca) expanded.collected_at = parsed.ca;
      }
      
      return expanded;
    }
    
    // Already in full format (backward compatibility)
    return parsed;
  } catch (e) {
    // Not JSON, return as legacy transaction ID string
    return {
      type: 'legacy',
      transaction_id: transactionId
    };
  }
};

/**
 * Check if order qualifies for leaving reviews
 * @param {Object} order - Order object with status
 * @param {Object} payment - Payment object with status, payment_method
 * @returns {boolean}
 */
export const canLeaveReview = (order, payment) => {
  // Orders must be "Delivered" (completed) with payment completed
  return order.status === 'delivered' && 
         payment?.status === PAYMENT_STATUS.COMPLETED;
};

/**
 * Validate order status transition
 * @param {Object} order - Current order state
 * @param {string} newStatus - Target status
 * @param {Object} payment - Payment object (optional)
 * @returns {Object} - { valid: boolean, reason: string }
 */
export const validateOrderTransition = (order, newStatus, payment = null) => {
  if (newStatus === ORDER_STATUS.SUCCESS) {
    if (order.status !== ORDER_STATUS.PENDING) {
      return { 
        valid: false, 
        reason: 'Can only approve pending orders' 
      };
    }
    
    // For non-COD orders, payment must be completed
    if (payment && 
        payment.payment_method !== PAYMENT_METHODS.CASH && 
        payment.status !== PAYMENT_STATUS.COMPLETED) {
      return { 
        valid: false, 
        reason: 'Payment must be completed before approval' 
      };
    }
  }
  
  if (newStatus === ORDER_STATUS.CANCELLED) {
    if (order.status !== ORDER_STATUS.PENDING) {
      return { 
        valid: false, 
        reason: 'Can only cancel pending orders. Use refund for approved orders.' 
      };
    }
  }
  
  return { valid: true };
};

/**
 * Determine if payment should auto-complete
 * @param {string} paymentMethod - Payment method
 * @returns {boolean}
 */
export const shouldAutoCompletePayment = (paymentMethod) => {
  return [
    PAYMENT_METHODS.CREDIT_CARD,
    PAYMENT_METHODS.DEBIT_CARD,
    PAYMENT_METHODS.STRIPE
  ].includes(paymentMethod);
};

/**
 * Determine if order should auto-approve
 * @param {string} paymentMethod - Payment method
 * @param {string} paymentStatus - Payment status
 * @returns {boolean}
 */
export const shouldAutoApproveOrder = (paymentMethod, paymentStatus) => {
  // Auto-approve for COD or completed card/Stripe payments
  return paymentMethod === PAYMENT_METHODS.CASH || 
         paymentStatus === PAYMENT_STATUS.COMPLETED;
};

export default {
  generateMockPaymentDetails,
  parsePaymentDetails,
  canLeaveReview,
  validateOrderTransition,
  shouldAutoCompletePayment,
  shouldAutoApproveOrder
};
