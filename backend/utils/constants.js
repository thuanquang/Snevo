// 📋 Application Constants
// Defines application-wide constants and configuration

class AppConstants {
    constructor() {
        // Initialize constants
    }

    // Order statuses
    get ORDER_STATUSES() {
        return {
            PENDING: 'pending',
            PROCESSING: 'processing',
            SHIPPED: 'shipped',
            DELIVERED: 'delivered',
            CANCELLED: 'cancelled'
        };
    }

    // Payment statuses
    get PAYMENT_STATUSES() {
        return {
            PENDING: 'pending',
            COMPLETED: 'completed',
            FAILED: 'failed',
            REFUNDED: 'refunded'
        };
    }

    // Payment methods
    get PAYMENT_METHODS() {
        return {
            CASH: 'cash',
            CREDIT_CARD: 'credit_card',
            BANK_TRANSFER: 'bank_transfer',
            E_WALLET: 'e_wallet',
            PAYPAL: 'paypal',
            STRIPE: 'stripe'
        };
    }

    // User roles
    get USER_ROLES() {
        return {
            CUSTOMER: 'customer',
            SELLER: 'seller'
        };
    }
}

module.exports = new AppConstants();
