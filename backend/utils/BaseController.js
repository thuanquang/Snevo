/**
 * BaseController - Abstract base class for all controllers
 * Provides common functionality for request handling, validation, and response formatting
 */

import constants from '../../config/constants.js';
import { ErrorHandler, ValidationError, AuthenticationError, AuthorizationError } from './ErrorClasses.js';

export default class BaseController {
    constructor() {
        if (this.constructor === BaseController) {
            throw new Error('BaseController is an abstract class and cannot be instantiated directly');
        }
        
        // Bind methods to preserve context
        this.handleRequest = this.handleRequest.bind(this);
        this.validateRequest = this.validateRequest.bind(this);
        this.sendResponse = this.sendResponse.bind(this);
        this.sendError = this.sendError.bind(this);
    }

    /**
     * Main request handler wrapper
     */
    async handleRequest(req, res, handler) {
        try {
            // Pre-processing
            await this.beforeRequest(req, res);
            
            // Execute the handler
            const result = await handler(req, res);
            
            // Post-processing
            await this.afterRequest(req, res, result);
            
            return result;
        } catch (error) {
            await this.handleError(error, req, res);
        }
    }

    /**
     * Pre-request processing hook
     */
    async beforeRequest(req, res) {
        // Set default headers
        this.setCorsHeaders(res);
        
        // Log request (in development)
        if (process.env.NODE_ENV === 'development') {
            console.log(`${req.method} ${req.url}`, {
                body: req.body,
                query: req.query,
                headers: this.sanitizeHeaders(req.headers)
            });
        }
    }

    /**
     * Post-request processing hook
     */
    async afterRequest(req, res, result) {
        // Override in child classes for custom post-processing
    }

    /**
     * Error handling
     */
    async handleError(error, req, res) {
        const errorResponse = ErrorHandler.handleError(error, req);
        this.sendError(res, errorResponse.error, errorResponse.statusCode, errorResponse);
    }

    /**
     * Validate request data
     */
    validateRequest(data, rules, customMessages = {}) {
        const errors = [];

        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            const fieldErrors = this.validateField(field, value, rule, data);
            
            if (fieldErrors.length > 0) {
                errors.push(...fieldErrors.map(error => ({
                    field,
                    message: customMessages[`${field}.${error}`] || error
                })));
            }
        }

        if (errors.length > 0) {
            throw new ValidationError('Validation failed', errors);
        }

        return true;
    }

    /**
     * Validate individual field
     */
    validateField(field, value, rule, allData = {}) {
        const errors = [];

        // Required validation
        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
            return errors;
        }

        // Skip other validations if value is empty and not required
        if (value === undefined || value === null || value === '') {
            return errors;
        }

        // Type validation
        if (rule.type) {
            if (!this.validateType(value, rule.type)) {
                errors.push(`${field} must be of type ${rule.type}`);
            }
        }

        // String validations
        if (typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
                errors.push(`${field} must be at least ${rule.minLength} characters long`);
            }
            
            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push(`${field} must be no more than ${rule.maxLength} characters long`);
            }
            
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
            }
        }

        // Number validations
        if (typeof value === 'number') {
            if (rule.min && value < rule.min) {
                errors.push(`${field} must be at least ${rule.min}`);
            }
            
            if (rule.max && value > rule.max) {
                errors.push(`${field} must be no more than ${rule.max}`);
            }
        }

        // Array validations
        if (Array.isArray(value)) {
            if (rule.minItems && value.length < rule.minItems) {
                errors.push(`${field} must have at least ${rule.minItems} items`);
            }
            
            if (rule.maxItems && value.length > rule.maxItems) {
                errors.push(`${field} must have no more than ${rule.maxItems} items`);
            }
        }

        // Enum validation
        if (rule.enum && !rule.enum.includes(value)) {
            errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
        }

        // Custom validation
        if (rule.custom && typeof rule.custom === 'function') {
            const customError = rule.custom(value, allData);
            if (customError) {
                errors.push(customError);
            }
        }

        return errors;
    }

    /**
     * Validate type
     */
    validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'integer':
                return Number.isInteger(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'email':
                return typeof value === 'string' && constants.VALIDATION_RULES.EMAIL.test(value);
            case 'url':
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            case 'date':
                return value instanceof Date || !isNaN(Date.parse(value));
            case 'uuid':
                return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
            default:
                return true;
        }
    }

    /**
     * Extract pagination parameters
     */
    getPaginationParams(req, defaults = {}) {
        const {
            page = defaults.page || 1,
            limit = defaults.limit || 20,
            sort = defaults.sort || 'created_at',
            order = defaults.order || 'desc'
        } = req.query;

        return {
            page: Math.max(1, parseInt(page, 10)),
            limit: Math.min(100, Math.max(1, parseInt(limit, 10))), // Cap at 100
            sort: String(sort),
            order: ['asc', 'desc'].includes(String(order).toLowerCase()) ? String(order).toLowerCase() : 'desc'
        };
    }

    /**
     * Extract filter parameters
     */
    getFilterParams(req, allowedFilters = []) {
        const filters = {};
        
        for (const filter of allowedFilters) {
            if (req.query[filter] !== undefined) {
                filters[filter] = req.query[filter];
            }
        }
        
        return filters;
    }

    /**
     * Check authentication
     */
    requireAuth(req) {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }
        return req.user;
    }

    /**
     * Check authorization
     */
    requireRole(req, allowedRoles) {
        const user = this.requireAuth(req);
        
        if (!allowedRoles.includes(user.role)) {
            throw new AuthorizationError('Insufficient permissions');
        }
        
        return user;
    }

    /**
     * Send success response
     */
    sendResponse(res, data = null, message = null, statusCode = constants.HTTP_STATUS.OK) {
        const response = {
            success: true,
            ...(message && { message }),
            ...(data && { data })
        };

        res.json(response, statusCode);
    }

    /**
     * Send error response
     */
    sendError(res, message, statusCode = constants.HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
        const response = {
            success: false,
            error: message,
            ...(details && { details })
        };

        res.json(response, statusCode);
    }

    /**
     * Send paginated response
     */
    sendPaginatedResponse(res, data, pagination, message = null) {
        const response = {
            success: true,
            ...(message && { message }),
            data: data.data || data,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: data.total || 0,
                totalPages: data.totalPages || Math.ceil((data.total || 0) / pagination.limit),
                hasNext: pagination.page < (data.totalPages || Math.ceil((data.total || 0) / pagination.limit)),
                hasPrev: pagination.page > 1
            }
        };

        res.json(response);
    }

    /**
     * Set CORS headers
     */
    setCorsHeaders(res) {
        const corsOrigin = process.env.CORS_ORIGIN || '*';
        const corsHeaders = {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true'
        };

        for (const [key, value] of Object.entries(corsHeaders)) {
            res.setHeader(key, value);
        }
    }

    /**
     * Sanitize headers for logging
     */
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        
        for (const header of sensitiveHeaders) {
            if (sanitized[header]) {
                sanitized[header] = '***REDACTED***';
            }
        }
        
        return sanitized;
    }

    /**
     * Parse request body based on content type
     */
    async parseRequestBody(req) {
        if (req.body) return req.body;
        
        return new Promise((resolve, reject) => {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const contentType = req.headers['content-type'];
                    
                    if (contentType?.includes('application/json')) {
                        resolve(JSON.parse(body));
                    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
                        resolve(new URLSearchParams(body));
                    } else {
                        resolve(body);
                    }
                } catch (error) {
                    reject(new ValidationError('Invalid request body format'));
                }
            });
            
            req.on('error', reject);
        });
    }

    /**
     * Rate limiting check (placeholder - implement with Redis or similar)
     */
    async checkRateLimit(req, identifier = null, limit = 100, window = 3600) {
        // Placeholder for rate limiting implementation
        // In production, use Redis or similar for distributed rate limiting
        const key = identifier || req.ip || req.headers['x-forwarded-for'] || 'anonymous';
        
        // This is a simple in-memory implementation for demonstration
        // Replace with proper rate limiting service in production
        if (!this.rateLimitStore) {
            this.rateLimitStore = new Map();
        }
        
        const now = Date.now();
        const windowStart = now - (window * 1000);
        
        if (!this.rateLimitStore.has(key)) {
            this.rateLimitStore.set(key, []);
        }
        
        const requests = this.rateLimitStore.get(key);
        const recentRequests = requests.filter(timestamp => timestamp > windowStart);
        
        if (recentRequests.length >= limit) {
            throw new RateLimitError('Rate limit exceeded', Math.ceil((recentRequests[0] - windowStart) / 1000));
        }
        
        recentRequests.push(now);
        this.rateLimitStore.set(key, recentRequests);
        
        return true;
    }
}

