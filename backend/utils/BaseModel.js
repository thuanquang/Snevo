/**
 * BaseModel - Abstract base class for all database models
 * Provides common database operations and validation
 */

import createSupabaseConfig from '../../config/supabase.js';
import { ValidationError, DatabaseError } from './ErrorClasses.js';

export default class BaseModel {
    constructor(tableName, primaryKey = 'id') {
        if (this.constructor === BaseModel) {
            throw new Error('BaseModel is an abstract class and cannot be instantiated directly');
        }

        this.tableName = tableName;
        this.schemaName = process.env.DB_SCHEMA || 'db_nike'; // Set the schema name for all tables
        this.primaryKey = primaryKey;
        this.validationRules = {};
        this.fillable = [];
        this.hidden = ['password_hash', 'password'];

        // Initialize Supabase client
        this.supabaseConfig = createSupabaseConfig();
    }

    /**
     * Get the fully qualified table name with schema
     */
    getQualifiedTableName() {
        return `${this.tableName}`;
    }

    /**
     * Get Supabase admin client
     */
    get supabase() {
        return this.supabaseConfig.getAdminClient();
    }

    /**
     * Validate data against defined rules
     */
    validate(data, rules = null) {
        const validationRules = rules || this.validationRules;
        const errors = [];

        for (const [field, rule] of Object.entries(validationRules)) {
            const value = data[field];

            // Check required fields
            if (rule.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Skip validation if value is null/undefined and not required
            if (value === undefined || value === null) {
                continue;
            }

            // ⭐ IMPROVED TYPE CHECKING
            if (rule.type) {
                const actualType = typeof value;
                let isValid = false;

                // Handle special type aliases
                switch (rule.type) {
                    case 'integer':
                    case 'number':
                    case 'decimal':
                    case 'float':
                        isValid = (actualType === 'number' && !isNaN(value));
                        break;

                    case 'string':
                    case 'text':
                    case 'varchar':
                        isValid = (actualType === 'string');
                        break;

                    case 'uuid':
                        // UUID is a string with specific format
                        isValid = (actualType === 'string' && 
                                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
                        break;

                    case 'email':
                        isValid = (actualType === 'string' && 
                                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
                        break;

                    case 'date':
                    case 'timestamp':
                    case 'timestamptz':
                        // Accept Date object or valid ISO date string
                        isValid = (value instanceof Date && !isNaN(value)) || 
                                (actualType === 'string' && !isNaN(Date.parse(value)));
                        break;

                    case 'boolean':
                        isValid = (actualType === 'boolean');
                        break;

                    case 'object':
                    case 'json':
                    case 'jsonb':
                        isValid = (actualType === 'object' && !Array.isArray(value));
                        break;

                    case 'array':
                        isValid = Array.isArray(value);
                        break;

                    default:
                        // Fallback to direct typeof comparison
                        isValid = (actualType === rule.type);
                }

                if (!isValid) {
                    errors.push(`${field} must be of type ${rule.type}`);
                }
            }

            // Length validations
            if (rule.minLength && value.length < rule.minLength) {
                errors.push(`${field} must be at least ${rule.minLength} characters long`);
            }

            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push(`${field} must be no more than ${rule.maxLength} characters long`);
            }

            // Pattern validation
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
            }

            // Custom validation
            if (rule.custom && typeof rule.custom === 'function') {
                const customError = rule.custom(value, data);
                if (customError) {
                    errors.push(customError);
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
            
            const { data: result, error } = await this.supabaseConfig.getAdminClient()
                .from(this.getQualifiedTableName())
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
            const { data, error } = await this.supabaseConfig.getAdminClient()
                .from(this.getQualifiedTableName())
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

            let query = this.supabaseConfig.getAdminClient()
                .from(this.getQualifiedTableName())
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
        // Remove undefined values
        const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
        );

        // ⭐ FIX: Use this.supabaseConfig.getAdminClient() instead of this.db
        const { data: result, error } = await this.supabaseConfig.getAdminClient()
        .from(this.getQualifiedTableName())  // ⭐ Also use getQualifiedTableName()
        .update(cleanData)
        .eq(this.primaryKey, id)
        .select()
        .single();

        if (error) {
        throw new DatabaseError(`Failed to update record: ${error.message}`, error);
        }

        return this.hideFields(result);
    } catch (error) {
        console.error(`Error updating ${this.tableName}:`, error);
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Update operation failed: ${error.message}`, error);
    }
    }


    /**
     * Delete record by ID
     */
    async deleteById(id) {
        try {
            const { error } = await this.supabaseConfig.getAdminClient()
                .from(this.getQualifiedTableName())
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
     * Soft delete a record by setting is_active = false
     */
    async softDelete(id) {
        try {
            // Check if record exists
            const existing = await this.findById(id);
            if (!existing) {
            throw new DatabaseError('Record not found', { 
                code: 'NOT_FOUND',
                details: { [this.primaryKey]: id }
            });
            }

            // Soft delete by setting is_active = false
            const { data, error } = await this.supabaseConfig.getAdminClient()
            .from(this.getQualifiedTableName())
            .update({ 
                is_active: false,
                deleted_at: new Date().toISOString()
            })
            .eq(this.primaryKey, id)
            .select()
            .single();

            if (error) {
            throw new DatabaseError(`Failed to soft delete record: ${error.message}`, error);
            }

            return this.hideFields(data);
        } catch (error) {
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(`Soft delete operation failed: ${error.message}`, error);
        }
    }

    /**
     * Restore a soft-deleted record
     */
    async restore(id) {
        try {
            const { data, error } = await this.supabaseConfig.getAdminClient()
            .from(this.getQualifiedTableName())
            .update({ 
                is_active: true,
                deleted_at: null
            })
            .eq(this.primaryKey, id)
            .select()
            .single();

            if (error) {
            throw new DatabaseError(`Failed to restore record: ${error.message}`, error);
            }

            return this.hideFields(data);
        } catch (error) {
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(`Restore operation failed: ${error.message}`, error);
        }
    }


    /**
     * Count records with filters
     */
    async count(filters = {}) {
        try {
            let query = this.supabaseConfig.getAdminClient()
                .from(this.getQualifiedTableName())
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
            const { data, error } = await this.supabaseConfig.getAdminClient().rpc(query, params);
            
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

