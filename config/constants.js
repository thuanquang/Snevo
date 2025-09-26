/**
 * Application Constants
 * Central place for all application constants and configuration
 */

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

export const USER_ROLES = {
    CUSTOMER: 'customer',
    SELLER: 'seller'
};

export const ORDER_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};

export const PAYMENT_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

export const PAYMENT_METHODS = {
    CASH: 'cash',
    CREDIT_CARD: 'credit_card',
    BANK_TRANSFER: 'bank_transfer',
    E_WALLET: 'e_wallet'
};

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        PROFILE: '/api/auth/profile',
        REFRESH: '/api/auth/refresh'
    },
    PRODUCTS: {
        LIST: '/api/products',
        DETAIL: '/api/products/:id',
        CATEGORY: '/api/products/category/:categoryId',
        SEARCH: '/api/products/search'
    },
    CATEGORIES: {
        LIST: '/api/categories',
        DETAIL: '/api/categories/:id'
    },
    ORDERS: {
        LIST: '/api/orders',
        CREATE: '/api/orders',
        DETAIL: '/api/orders/:id',
        UPDATE_STATUS: '/api/orders/:id/status'
    },
    USERS: {
        PROFILE: '/api/users/profile',
        ADDRESSES: '/api/users/addresses',
        ADDRESS_DETAIL: '/api/users/addresses/:id'
    },
    REVIEWS: {
        PRODUCT_REVIEWS: '/api/products/:id/reviews',
        CREATE: '/api/products/:id/reviews',
        UPDATE: '/api/reviews/:id',
        DELETE: '/api/reviews/:id'
    }
};

export const VALIDATION_RULES = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    PHONE: /^\+?[\d\s\-\(\)]+$/,
    RATING: {
        MIN: 1,
        MAX: 5
    }
};

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
};

export const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    UPLOAD_PATH: 'uploads/'
};

export const CACHE_DURATION = {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 30 * 60 * 1000,    // 30 minutes
    LONG: 60 * 60 * 1000,      // 1 hour
    VERY_LONG: 24 * 60 * 60 * 1000 // 24 hours
};

export const RATE_LIMITING = {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    AUTH_MAX_REQUESTS: 5 // For login attempts
};

export const CORS_CONFIG = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

export const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET || 'your-secret-key',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    ALGORITHM: 'HS256'
};

export const DATABASE_TABLES = {
    USERS: 'Users',
    ADDRESSES: 'Addresses',
    CATEGORIES: 'Categories',
    SHOES: 'Shoes',
    COLORS: 'Colors',
    SIZES: 'Sizes',
    SHOE_VARIANTS: 'Shoe_Variants',
    SUPPLIERS: 'Suppliers',
    IMPORTS: 'Imports',
    ORDERS: 'Orders',
    ORDER_ITEMS: 'Order_Items',
    PAYMENTS: 'Payments',
    REVIEWS: 'Reviews'
};

export const ERROR_MESSAGES = {
    VALIDATION: {
        REQUIRED_FIELD: 'This field is required',
        INVALID_EMAIL: 'Please enter a valid email address',
        INVALID_PASSWORD: 'Password must be at least 8 characters long',
        PASSWORDS_DONT_MATCH: 'Passwords do not match',
        INVALID_PHONE: 'Please enter a valid phone number'
    },
    AUTH: {
        INVALID_CREDENTIALS: 'Invalid email or password',
        UNAUTHORIZED: 'You are not authorized to access this resource',
        TOKEN_EXPIRED: 'Your session has expired. Please login again',
        ACCOUNT_NOT_FOUND: 'Account not found'
    },
    PRODUCT: {
        NOT_FOUND: 'Product not found',
        OUT_OF_STOCK: 'Product is out of stock',
        INSUFFICIENT_STOCK: 'Insufficient stock available'
    },
    ORDER: {
        NOT_FOUND: 'Order not found',
        INVALID_STATUS: 'Invalid order status',
        CANNOT_CANCEL: 'Order cannot be cancelled at this stage'
    },
    GENERAL: {
        INTERNAL_ERROR: 'An internal server error occurred',
        NOT_FOUND: 'Resource not found',
        BAD_REQUEST: 'Invalid request data'
    }
};

export const SUCCESS_MESSAGES = {
    AUTH: {
        LOGIN_SUCCESS: 'Login successful',
        REGISTER_SUCCESS: 'Account created successfully',
        LOGOUT_SUCCESS: 'Logged out successfully',
        PROFILE_UPDATED: 'Profile updated successfully'
    },
    PRODUCT: {
        CREATED: 'Product created successfully',
        UPDATED: 'Product updated successfully',
        DELETED: 'Product deleted successfully'
    },
    ORDER: {
        CREATED: 'Order placed successfully',
        UPDATED: 'Order updated successfully',
        CANCELLED: 'Order cancelled successfully'
    }
};

// Frontend specific constants
export const FRONTEND_ROUTES = {
    HOME: '/',
    LOGIN: '/login.html',
    REGISTER: '/register.html',
    PRODUCTS: '/products.html',
    PRODUCT_DETAIL: '/product-detail.html',
    CART: '/cart.html',
    CHECKOUT: '/checkout.html',
    PROFILE: '/profile.html',
    ORDERS: '/orders.html'
};

export const ANIMATION_DURATIONS = {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000
};

export const BREAKPOINTS = {
    XS: 0,
    SM: 576,
    MD: 768,
    LG: 992,
    XL: 1200,
    XXL: 1400
};

export default {
    HTTP_STATUS,
    USER_ROLES,
    ORDER_STATUS,
    PAYMENT_STATUS,
    PAYMENT_METHODS,
    API_ENDPOINTS,
    VALIDATION_RULES,
    PAGINATION,
    FILE_UPLOAD,
    CACHE_DURATION,
    RATE_LIMITING,
    CORS_CONFIG,
    JWT_CONFIG,
    DATABASE_TABLES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    FRONTEND_ROUTES,
    ANIMATION_DURATIONS,
    BREAKPOINTS
};

