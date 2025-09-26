/**
 * Validation Middleware
 * Provides request validation utilities and middleware functions
 */

import constants from '../../config/constants.js';
import { ValidationError } from '../utils/ErrorClasses.js';

/**
 * Generic validation middleware factory
 */
export function validateBody(schema, options = {}) {
    return async (req, res, next) => {
        try {
            const { strict = true, allowEmpty = false } = options;
            
            if (!req.body && !allowEmpty) {
                throw new ValidationError('Request body is required');
            }

            const data = req.body || {};
            const errors = [];

            // Validate each field in schema
            for (const [field, rules] of Object.entries(schema)) {
                const value = data[field];
                const fieldErrors = validateField(field, value, rules, data);
                errors.push(...fieldErrors);
            }

            // Check for unexpected fields in strict mode
            if (strict) {
                const allowedFields = Object.keys(schema);
                const unexpectedFields = Object.keys(data).filter(field => !allowedFields.includes(field));
                
                if (unexpectedFields.length > 0) {
                    errors.push({
                        field: 'body',
                        message: `Unexpected fields: ${unexpectedFields.join(', ')}`
                    });
                }
            }

            if (errors.length > 0) {
                throw new ValidationError('Validation failed', errors);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Query parameter validation middleware
 */
export function validateQuery(schema, options = {}) {
    return async (req, res, next) => {
        try {
            const { allowEmpty = true } = options;
            
            if (!req.query && !allowEmpty) {
                throw new ValidationError('Query parameters are required');
            }

            const data = req.query || {};
            const errors = [];

            // Validate each field in schema
            for (const [field, rules] of Object.entries(schema)) {
                const value = data[field];
                const fieldErrors = validateField(field, value, rules, data);
                errors.push(...fieldErrors);
            }

            if (errors.length > 0) {
                throw new ValidationError('Query validation failed', errors);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * URL parameters validation middleware
 */
export function validateParams(schema) {
    return async (req, res, next) => {
        try {
            const data = req.params || {};
            const errors = [];

            // Validate each field in schema
            for (const [field, rules] of Object.entries(schema)) {
                const value = data[field];
                const fieldErrors = validateField(field, value, rules, data);
                errors.push(...fieldErrors);
            }

            if (errors.length > 0) {
                throw new ValidationError('Parameter validation failed', errors);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Validate individual field
 */
function validateField(field, value, rules, allData = {}) {
    const errors = [];

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
            field,
            message: `${field} is required`
        });
        return errors;
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
        return errors;
    }

    // Type validation
    if (rules.type) {
        const typeError = validateType(field, value, rules.type);
        if (typeError) {
            errors.push(typeError);
            return errors; // Stop validation if type is wrong
        }
    }

    // String validations
    if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
            errors.push({
                field,
                message: `${field} must be at least ${rules.minLength} characters long`
            });
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({
                field,
                message: `${field} must be no more than ${rules.maxLength} characters long`
            });
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({
                field,
                message: `${field} format is invalid`
            });
        }
        
        if (rules.trim && value !== value.trim()) {
            errors.push({
                field,
                message: `${field} should not have leading or trailing whitespace`
            });
        }
    }

    // Number validations
    if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
            errors.push({
                field,
                message: `${field} must be at least ${rules.min}`
            });
        }
        
        if (rules.max !== undefined && value > rules.max) {
            errors.push({
                field,
                message: `${field} must be no more than ${rules.max}`
            });
        }
        
        if (rules.integer && !Number.isInteger(value)) {
            errors.push({
                field,
                message: `${field} must be an integer`
            });
        }
    }

    // Array validations
    if (Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
            errors.push({
                field,
                message: `${field} must have at least ${rules.minItems} items`
            });
        }
        
        if (rules.maxItems && value.length > rules.maxItems) {
            errors.push({
                field,
                message: `${field} must have no more than ${rules.maxItems} items`
            });
        }
        
        if (rules.unique && new Set(value).size !== value.length) {
            errors.push({
                field,
                message: `${field} must contain unique items`
            });
        }
        
        // Validate array items
        if (rules.items) {
            value.forEach((item, index) => {
                const itemErrors = validateField(`${field}[${index}]`, item, rules.items, allData);
                errors.push(...itemErrors);
            });
        }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
            field,
            message: `${field} must be one of: ${rules.enum.join(', ')}`
        });
    }

    // Custom validation
    if (rules.custom && typeof rules.custom === 'function') {
        const customError = rules.custom(value, allData, field);
        if (customError) {
            errors.push({
                field,
                message: typeof customError === 'string' ? customError : `${field} is invalid`
            });
        }
    }

    // Conditional validation
    if (rules.when && typeof rules.when === 'function') {
        const conditionalRules = rules.when(allData);
        if (conditionalRules) {
            const conditionalErrors = validateField(field, value, conditionalRules, allData);
            errors.push(...conditionalErrors);
        }
    }

    return errors;
}

/**
 * Validate type
 */
function validateType(field, value, expectedType) {
    let isValid = false;
    let actualType = typeof value;

    switch (expectedType) {
        case 'string':
            isValid = typeof value === 'string';
            break;
        case 'number':
            isValid = typeof value === 'number' && !isNaN(value);
            break;
        case 'integer':
            isValid = Number.isInteger(Number(value));
            if (isValid && typeof value === 'string') {
                // Convert string to number for further validations
                value = Number(value);
            }
            break;
        case 'boolean':
            isValid = typeof value === 'boolean' || value === 'true' || value === 'false';
            break;
        case 'array':
            isValid = Array.isArray(value);
            actualType = Array.isArray(value) ? 'array' : actualType;
            break;
        case 'object':
            isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
            break;
        case 'email':
            isValid = typeof value === 'string' && constants.VALIDATION_RULES.EMAIL.test(value);
            break;
        case 'url':
            try {
                new URL(value);
                isValid = true;
            } catch {
                isValid = false;
            }
            break;
        case 'date':
            isValid = value instanceof Date || !isNaN(Date.parse(value));
            break;
        case 'uuid':
            isValid = typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
            break;
        case 'phone':
            isValid = typeof value === 'string' && constants.VALIDATION_RULES.PHONE.test(value);
            break;
        case 'password':
            isValid = typeof value === 'string' && value.length >= constants.VALIDATION_RULES.PASSWORD_MIN_LENGTH;
            break;
        default:
            isValid = true; // Unknown type, assume valid
    }

    if (!isValid) {
        return {
            field,
            message: `${field} must be of type ${expectedType}, got ${actualType}`
        };
    }

    return null;
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
    pagination: {
        page: { type: 'integer', min: 1 },
        limit: { type: 'integer', min: 1, max: 100 }
    },
    
    id: {
        id: { required: true, type: 'integer', min: 1 }
    },
    
    search: {
        q: { required: true, type: 'string', minLength: 2, maxLength: 100 }
    },
    
    userRegistration: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'password' },
        full_name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
        username: { required: true, type: 'string', minLength: 3, maxLength: 50, pattern: /^[a-zA-Z0-9_]+$/ }
    },
    
    userLogin: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'string', minLength: 1 }
    },
    
    address: {
        street: { required: true, type: 'string', maxLength: 255 },
        city: { required: true, type: 'string', maxLength: 100 },
        state: { required: true, type: 'string', maxLength: 100 },
        country: { required: true, type: 'string', maxLength: 100 },
        zip_code: { required: true, type: 'string', maxLength: 20 },
        is_default: { type: 'boolean' }
    },
    
    review: {
        rating: { required: true, type: 'integer', min: 1, max: 5 },
        comment: { type: 'string', maxLength: 1000 }
    }
};

/**
 * Sanitization utilities
 */
export const sanitize = {
    /**
     * Trim and normalize string
     */
    string(value) {
        if (typeof value !== 'string') return value;
        return value.trim().replace(/\s+/g, ' ');
    },

    /**
     * Sanitize email
     */
    email(value) {
        if (typeof value !== 'string') return value;
        return value.toLowerCase().trim();
    },

    /**
     * Sanitize phone number
     */
    phone(value) {
        if (typeof value !== 'string') return value;
        return value.replace(/\D/g, '');
    },

    /**
     * Sanitize HTML (basic)
     */
    html(value) {
        if (typeof value !== 'string') return value;
        return value
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },

    /**
     * Sanitize SQL (basic protection)
     */
    sql(value) {
        if (typeof value !== 'string') return value;
        return value.replace(/['";\\]/g, '');
    }
};

/**
 * Sanitization middleware
 */
export function sanitizeBody(fields = {}) {
    return (req, res, next) => {
        if (!req.body) return next();

        for (const [field, sanitizer] of Object.entries(fields)) {
            if (req.body[field] !== undefined) {
                if (typeof sanitizer === 'string' && sanitize[sanitizer]) {
                    req.body[field] = sanitize[sanitizer](req.body[field]);
                } else if (typeof sanitizer === 'function') {
                    req.body[field] = sanitizer(req.body[field]);
                }
            }
        }

        next();
    };
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(identifier, limit = 100, window = 3600) {
    const store = new Map();
    
    return (req, res, next) => {
        const key = identifier(req) || req.ip || 'anonymous';
        const now = Date.now();
        const windowStart = now - (window * 1000);
        
        if (!store.has(key)) {
            store.set(key, []);
        }
        
        const requests = store.get(key);
        const recentRequests = requests.filter(timestamp => timestamp > windowStart);
        
        if (recentRequests.length >= limit) {
            const error = new ValidationError('Rate limit exceeded');
            error.statusCode = 429;
            error.retryAfter = Math.ceil((recentRequests[0] - windowStart) / 1000);
            return next(error);
        }
        
        recentRequests.push(now);
        store.set(key, recentRequests);
        
        next();
    };
}

export default {
    validateBody,
    validateQuery,
    validateParams,
    commonSchemas,
    sanitize,
    sanitizeBody,
    validateRateLimit
};
