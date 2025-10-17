// backend/config/constants.js

// 📋 Application Constants
// Defines application-wide constants and configuration

class AppConstants {
    constructor() {
        // Initialize constants
    }

    // ⭐ Database table names (NEW - for Models)
    get DATABASE_TABLES() {
        return {
            SHOES: 'shoes',
            SHOE_VARIANTS: 'shoe_variants',
            CATEGORIES: 'categories',
            COLORS: 'colors',
            SIZES: 'sizes',
            IMPORTS: 'imports',              // ⭐ NEW
            SUPPLIERS: 'suppliers',          // ⭐ NEW
            PROFILES: 'profiles',
            ADDRESSES: 'addresses',
            ORDERS: 'orders',
            ORDER_ITEMS: 'order_items',
            PAYMENTS: 'payments',
            REVIEWS: 'reviews',
            WISHLISTS: 'wishlists',
            CARTS: 'carts'
        };
    }

    // ⭐ HTTP Status codes (NEW - for Controllers)
    get HTTP_STATUS() {
        return {
            OK: 200,
            CREATED: 201,
            NO_CONTENT: 204,
            BAD_REQUEST: 400,
            UNAUTHORIZED: 401,
            FORBIDDEN: 403,
            NOT_FOUND: 404,
            CONFLICT: 409,
            UNPROCESSABLE_ENTITY: 422,
            INTERNAL_SERVER_ERROR: 500
        };
    }

    // Order statuses (GIỮ NGUYÊN)
    get ORDER_STATUSES() {
        return {
            PENDING: 'pending',
            PROCESSING: 'processing',
            SHIPPED: 'shipped',
            DELIVERED: 'delivered',
            CANCELLED: 'cancelled'
        };
    }

    // Payment statuses (GIỮ NGUYÊN)
    get PAYMENT_STATUSES() {
        return {
            PENDING: 'pending',
            COMPLETED: 'completed',
            FAILED: 'failed',
            REFUNDED: 'refunded'
        };
    }

    // Payment methods (GIỮ NGUYÊN)
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

    // User roles (GIỮ NGUYÊN)
    get USER_ROLES() {
        return {
            CUSTOMER: 'customer',
            SELLER: 'seller'
        };
    }

    // ⭐ Stock operation types (NEW - for Import operations)
    get STOCK_OPERATIONS() {
        return {
            SET: 'set',         // Set exact value
            ADD: 'add',         // Increase stock
            SUBTRACT: 'subtract' // Decrease stock
        };
    }

    // ⭐ Default pagination (NEW - for Controllers)
    get PAGINATION() {
        return {
            DEFAULT_PAGE: 1,
            DEFAULT_LIMIT: 50,
            MAX_LIMIT: 100,
            DEFAULT_SORT: 'created_at',
            DEFAULT_ORDER: 'desc'
        };
    }
}

export default new AppConstants();
