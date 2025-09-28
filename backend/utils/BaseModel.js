/**
 * BaseModel - Abstract base class for all database models
 * Provides common database operations and validation
 */

import { supabase, supabaseAdmin } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import { ValidationError, DatabaseError } from './ErrorClasses.js';

export default class BaseModel {
    constructor(tableName, primaryKey = 'id') {
        if (this.constructor === BaseModel) {
            throw new Error('BaseModel is an abstract class and cannot be instantiated directly');
        }
        
        this.tableName = tableName;
        this.primaryKey = primaryKey;
        this.validationRules = {};
        this.fillable = [];
        this.hidden = ['password_hash', 'password'];
    }

    /**
     * Validate data against defined rules
     */
    validate(data, rules = null) {
        const validationRules = rules || this.validationRules;
        const errors = [];

        for (const [field, rule] of Object.entries(validationRules)) {
            const value = data[field];
            
            if (rule.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value !== undefined && value !== null) {
                // Handle custom types like 'email'
                if (rule.type) {
                    if (rule.type === 'email') {
                        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                            errors.push(`${field} must be a valid email address`);
                        }
                    } else if (typeof value !== rule.type) {
                        errors.push(`${field} must be of type ${rule.type}`);
                    }
                }

                if (rule.minLength && value.length < rule.minLength) {
                    errors.push(`${field} must be at least ${rule.minLength} characters long`);
                }

                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push(`${field} must be no more than ${rule.maxLength} characters long`);
                }

                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push(`${field} format is invalid`);
                }

                if (rule.custom && typeof rule.custom === 'function') {
                    const customError = rule.custom(value, data);
                    if (customError) {
                        errors.push(customError);
                    }
                }
            }
        }

        if (errors.length > 0) {
            throw new ValidationError('Validation failed', errors);
        }

        return true;
    }

    /**
     * Filter fillable fields
     */
    filterFillable(data) {
        if (this.fillable.length === 0) return data;
        
        const filtered = {};
        for (const field of this.fillable) {
            if (data.hasOwnProperty(field)) {
                filtered[field] = data[field];
            }
        }
        return filtered;
    }

    /**
     * Hide sensitive fields
     */
    hideFields(data) {
        if (!data) return data;
        
        const cleaned = Array.isArray(data) ? [...data] : { ...data };
        
        if (Array.isArray(cleaned)) {
            return cleaned.map(item => {
                const cleanedItem = { ...item };
                for (const field of this.hidden) {
                    delete cleanedItem[field];
                }
                return cleanedItem;
            });
        } else {
            for (const field of this.hidden) {
                delete cleaned[field];
            }
            return cleaned;
        }
    }

    /**
     * Create a new record
     */
    async create(data) {
        try {
            this.validate(data);
            const filteredData = this.filterFillable(data);
            
            const { data: result, error } = await supabaseAdmin
                .from(this.tableName)
                .insert([filteredData])
                .select()
                .single();

            if (error) {
                throw new DatabaseError(`Failed to create record: ${error.message}`, error);
            }
            
            return this.hideFields(result);
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            throw new DatabaseError(`Create operation failed: ${error.message}`, error);
        }
    }

    /**
     * Find record by ID
     */
    async findById(id) {
        try {
            const { data, error } = await supabaseAdmin
                .from(this.tableName)
                .select('*')
                .eq(this.primaryKey, id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw new DatabaseError(`Failed to find record: ${error.message}`, error);
            }

            return data ? this.hideFields(data) : null;
        } catch (error) {
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(`Find operation failed: ${error.message}`, error);
        }
    }

    /**
     * Find records with filters
     */
    async find(filters = {}, options = {}) {
        try {
            const { page = 1, limit = 20, orderBy, orderDirection = 'desc' } = options;
            const offset = (page - 1) * limit;

            let query = supabaseAdmin
                .from(this.tableName)
                .select('*', { count: 'exact' });

            // Apply filters
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            }

            // Apply ordering
            if (orderBy) {
                query = query.order(orderBy, { ascending: orderDirection === 'asc' });
            }

            // Apply pagination
            if (limit > 0) {
                query = query.range(offset, offset + limit - 1);
            }

            const { data, error, count } = await query;

            if (error) throw new DatabaseError(`Failed to find records: ${error.message}`, error);

            return {
                data: this.hideFields(data || []),
                total: count || 0,
                page,
                limit,
                totalPages: limit > 0 ? Math.ceil((count || 0) / limit) : 1
            };
        } catch (error) {
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(`Find operation failed: ${error.message}`, error);
        }
    }

    /**
     * Update record by ID
     */
    async updateById(id, data) {
        try {
            this.validate(data, this.getUpdateValidationRules());
            const filteredData = this.filterFillable(data);
            
            const { data: result, error } = await supabaseAdmin
                .from(this.tableName)
                .update(filteredData)
                .eq(this.primaryKey, id)
                .select()
                .single();

            if (error) throw new DatabaseError(`Failed to update record: ${error.message}`, error);
            
            return this.hideFields(result);
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            throw new DatabaseError(`Update operation failed: ${error.message}`, error);
        }
    }

    /**
     * Delete record by ID
     */
    async deleteById(id) {
        try {
            const { error } = await supabaseAdmin
                .from(this.tableName)
                .delete()
                .eq(this.primaryKey, id);

            if (error) throw new DatabaseError(`Failed to delete record: ${error.message}`, error);
            
            return true;
        } catch (error) {
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(`Delete operation failed: ${error.message}`, error);
        }
    }

    /**
     * Count records with filters
     */
    async count(filters = {}) {
        try {
            let query = supabaseAdmin
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });

            // Apply filters
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            }

            const { count, error } = await query;

            if (error) throw new DatabaseError(`Failed to count records: ${error.message}`, error);

            return count || 0;
        } catch (error) {
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(`Count operation failed: ${error.message}`, error);
        }
    }

    /**
     * Get validation rules for updates (usually less strict)
     */
    getUpdateValidationRules() {
        const updateRules = { ...this.validationRules };
        
        // Make all fields optional for updates
        for (const rule of Object.values(updateRules)) {
            rule.required = false;
        }
        
        return updateRules;
    }

    /**
     * Execute raw query (use with caution)
     */
    async rawQuery(query, params = []) {
        try {
            const { data, error } = await supabaseAdmin.rpc(query, params);
            
            if (error) throw new DatabaseError(`Raw query failed: ${error.message}`, error);
            
            return data;
        } catch (error) {
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(`Raw query execution failed: ${error.message}`, error);
        }
    }

    /**
     * Begin transaction (Supabase doesn't support transactions directly, 
     * but this method can be overridden in specific models if needed)
     */
    async beginTransaction() {
        // Placeholder for transaction support
        console.warn('Transactions are not directly supported in Supabase');
    }

    /**
     * Commit transaction
     */
    async commitTransaction() {
        // Placeholder for transaction support
        console.warn('Transactions are not directly supported in Supabase');
    }

    /**
     * Rollback transaction
     */
    async rollbackTransaction() {
        // Placeholder for transaction support
        console.warn('Transactions are not directly supported in Supabase');
    }
}

