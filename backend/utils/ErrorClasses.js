/**
 * Custom Error Classes for OOP Error Handling
 * Provides structured error handling across the application
 */

/**
 * Base application error class
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, code = null, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Maintains proper stack trace for where error was thrown (Node.js only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert error to JSON for API responses
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
        };
    }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
    constructor(message = 'Validation failed', errors = [], statusCode = 400) {
        super(message, statusCode, 'VALIDATION_ERROR', errors);
        this.errors = errors;
    }

    /**
     * Add validation error
     */
    addError(field, message) {
        if (!this.errors) this.errors = [];
        this.errors.push({ field, message });
        this.details = this.errors;
    }

    /**
     * Check if field has error
     */
    hasError(field) {
        if (!this.errors) return false;
        return this.errors.some(error => error.field === field);
    }

    /**
     * Get errors for specific field
     */
    getFieldErrors(field) {
        if (!this.errors) return [];
        return this.errors.filter(error => error.field === field);
    }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', statusCode = 401) {
        super(message, statusCode, 'AUTHENTICATION_ERROR');
    }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Access denied', statusCode = 403) {
        super(message, statusCode, 'AUTHORIZATION_ERROR');
    }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', originalError = null, statusCode = 500) {
        super(message, statusCode, 'DATABASE_ERROR', originalError?.message);
        this.originalError = originalError;
    }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource', statusCode = 404) {
        super(`${resource} not found`, statusCode, 'NOT_FOUND_ERROR');
        this.resource = resource;
    }
}

/**
 * Conflict error class (for duplicate resources, etc.)
 */
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict', statusCode = 409) {
        super(message, statusCode, 'CONFLICT_ERROR');
    }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', retryAfter = null, statusCode = 429) {
        super(message, statusCode, 'RATE_LIMIT_ERROR');
        this.retryAfter = retryAfter;
    }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
    constructor(service, message = 'External service error', statusCode = 502) {
        super(`${service}: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR');
        this.service = service;
    }
}

/**
 * File operation error class
 */
export class FileError extends AppError {
    constructor(operation, filename, message = 'File operation failed', statusCode = 500) {
        super(`${operation} failed for ${filename}: ${message}`, statusCode, 'FILE_ERROR');
        this.operation = operation;
        this.filename = filename;
    }
}

/**
 * Configuration error class
 */
export class ConfigurationError extends AppError {
    constructor(setting, message = 'Configuration error', statusCode = 500) {
        super(`Configuration error for ${setting}: ${message}`, statusCode, 'CONFIGURATION_ERROR');
        this.setting = setting;
    }
}

/**
 * Business logic error class
 */
export class BusinessLogicError extends AppError {
    constructor(message = 'Business logic error', statusCode = 422) {
        super(message, statusCode, 'BUSINESS_LOGIC_ERROR');
    }
}

/**
 * Network error class
 */
export class NetworkError extends AppError {
    constructor(message = 'Network error', statusCode = 503) {
        super(message, statusCode, 'NETWORK_ERROR');
    }
}

/**
 * Timeout error class
 */
export class TimeoutError extends AppError {
    constructor(operation = 'Operation', timeout = null, statusCode = 408) {
        super(`${operation} timed out${timeout ? ` after ${timeout}ms` : ''}`, statusCode, 'TIMEOUT_ERROR');
        this.operation = operation;
        this.timeout = timeout;
    }
}

/**
 * Error factory for creating appropriate error instances
 */
export class ErrorFactory {
    /**
     * Create error based on type and context
     */
    static createError(type, message, details = null) {
        switch (type) {
            case 'validation':
                return new ValidationError(message, details);
            case 'authentication':
                return new AuthenticationError(message);
            case 'authorization':
                return new AuthorizationError(message);
            case 'database':
                return new DatabaseError(message, details);
            case 'not_found':
                return new NotFoundError(message);
            case 'conflict':
                return new ConflictError(message);
            case 'rate_limit':
                return new RateLimitError(message, details);
            case 'external_service':
                return new ExternalServiceError(details, message);
            case 'file':
                return new FileError(details?.operation, details?.filename, message);
            case 'configuration':
                return new ConfigurationError(details, message);
            case 'business_logic':
                return new BusinessLogicError(message);
            case 'network':
                return new NetworkError(message);
            case 'timeout':
                return new TimeoutError(details?.operation, details?.timeout);
            default:
                return new AppError(message, 500, type, details);
        }
    }

    /**
     * Create validation error with multiple field errors
     */
    static createValidationError(fieldErrors = {}) {
        const errors = [];
        for (const [field, messages] of Object.entries(fieldErrors)) {
            const fieldMessages = Array.isArray(messages) ? messages : [messages];
            for (const message of fieldMessages) {
                errors.push({ field, message });
            }
        }
        return new ValidationError('Validation failed', errors);
    }

    /**
     * Convert unknown error to AppError
     */
    static fromError(error, defaultMessage = 'An unexpected error occurred') {
        if (error instanceof AppError) {
            return error;
        }

        if (error instanceof Error) {
            return new AppError(error.message || defaultMessage, 500, 'UNKNOWN_ERROR', {
                originalName: error.name,
                originalStack: error.stack
            });
        }

        return new AppError(defaultMessage, 500, 'UNKNOWN_ERROR', error);
    }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
    /**
     * Handle error and return appropriate response data
     */
    static handleError(error, req = null) {
        // Convert unknown errors to AppError
        const appError = ErrorFactory.fromError(error);
        
        // Log error (in production, use proper logging service)
        console.error('Error handled:', {
            name: appError.name,
            message: appError.message,
            statusCode: appError.statusCode,
            code: appError.code,
            details: appError.details,
            stack: appError.stack,
            url: req?.url,
            method: req?.method,
            userAgent: req?.headers?.['user-agent'],
            timestamp: appError.timestamp
        });

        return {
            success: false,
            error: appError.message,
            code: appError.code,
            statusCode: appError.statusCode,
            ...(appError.details && { details: appError.details }),
            ...(process.env.NODE_ENV === 'development' && { stack: appError.stack })
        };
    }

    /**
     * Check if error is operational (expected) vs programming error
     */
    static isOperationalError(error) {
        if (error instanceof AppError) {
            return true;
        }
        return false;
    }

    /**
     * Get HTTP status code from error
     */
    static getStatusCode(error) {
        if (error instanceof AppError) {
            return error.statusCode;
        }
        return 500;
    }
}

