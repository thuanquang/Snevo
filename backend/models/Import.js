// backend/models/Import.js

// 📥 Import Model - imports table
// Handles inventory import data management with full audit trail

import createSupabaseConfig from '../../config/supabase.js';
import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';
import { NotFoundError, ValidationError } from '../utils/ErrorClasses.js';

const supabaseConfig = createSupabaseConfig();

class Import extends BaseModel {
    constructor() {
        super(constants.DATABASE_TABLES.IMPORTS || 'imports', 'import_id');
        
        this.fillable = [
            'user_id',
            'variant_id',
            'quantity_imported',
            'import_price',
            'import_date',
            'notes'
        ];
        
        this.validationRules = {
            variant_id: {
                required: true,
                type: 'integer'
            },
            quantity_imported: {
                required: true,
                type: 'integer',
                min: 1
            },
            import_price: {
                required: true,
                type: 'number',
                min: 0
            },
            user_id: {
                required: true,
                type: 'uuid'  // ⭐ BaseController supports 'uuid' type
            },
            notes: {
                required: false,
                type: 'string',
                maxLength: 500
            },
            import_date: {
                required: false,
                type: 'date'  // ⭐ BaseController supports 'date' type
            }
        };
    }

    /**
     * ⭐ Get all imports with full details (JOIN với related tables)
     * Sử dụng Supabase foreign key expansion
     */
    async findAllWithDetails(filters = {}, pagination = {}) {
        try {
            const {
                page = 1,
                limit = 50,
                shoe_id,
                variant_id,
                user_id,
                from_date,
                to_date,
                orderBy = 'import_date',
                orderDirection = 'desc'
            } = { ...filters, ...pagination };

            // Build query với JOINs using foreign key expansion
            let query = this.supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select(`
                    *,
                    user:user_id (
                        user_id,
                        username,
                        full_name
                    ),
                    variant:variant_id (
                        variant_id,
                        sku,
                        stock_quantity,
                        variant_price,
                        shoe:shoe_id (
                            shoe_id,
                            shoe_name,
                            image_url,
                            category:category_id (
                                category_id,
                                category_name
                            )
                        ),
                        color:color_id (
                            color_id,
                            color_name,
                            hex_code
                        ),
                        size:size_id (
                            size_id,
                            size_value,
                            size_type
                        )
                    )
                `, { count: 'exact' });

            // Apply filters
            if (variant_id) {
                query = query.eq('variant_id', variant_id);
            }

            if (user_id) {
                query = query.eq('user_id', user_id);
            }

            // ⭐ Filter by shoe_id requires joining through variants
            // We'll handle this in post-processing or use a different approach

            if (from_date) {
                query = query.gte('import_date', from_date);
            }

            if (to_date) {
                query = query.lte('import_date', to_date);
            }

            // Sorting
            query = query.order(orderBy, { ascending: orderDirection === 'asc' });

            // Pagination
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            // Post-filter by shoe_id if needed
            let filteredData = data || [];
            if (shoe_id) {
                filteredData = filteredData.filter(imp => 
                    imp.variant?.shoe?.shoe_id === parseInt(shoe_id)
                );
            }

            return {
                data: filteredData,
                total: shoe_id ? filteredData.length : (count || 0),
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil((shoe_id ? filteredData.length : (count || 0)) / limit)
            };

        } catch (error) {
            throw new Error(`Failed to fetch imports with details: ${error.message}`);
        }
    }

    /**
     * Get imports by user ID (admin history)
     * Uses BaseModel.find() method
     */
    async findByUserId(userId, options = {}) {
        return await this.find({ user_id: userId }, options);
    }

    /**
     * Get imports by variant ID (product history)
     * Uses BaseModel.find() method
     */
    async findByVariantId(variantId, options = {}) {
        return await this.find({ variant_id: variantId }, options);
    }

    /**
     * Get imports by shoe ID (all variants of a product)
     * Custom query required due to nested relationship
     */
    /**
     * ⭐ Get imports by shoe ID 
     */
    async findByShoeId(shoeId, options = {}) {
        try {
            console.log('📦 Finding imports for shoe:', shoeId);

            // Step 1: Get all variant IDs for this shoe
            const { data: variants, error: variantError } = await supabaseConfig.getAdminClient()
                .from('shoe_variants')
                .select('variant_id')
                .eq('shoe_id', shoeId);

            if (variantError) {
                console.error('❌ Variant query error:', variantError);
                throw variantError;
            }

            if (!variants || variants.length === 0) {
                console.log('⚠️ No variants found for shoe', shoeId);
                return {
                    data: [],
                    total: 0,
                    page: options.page || 1,
                    limit: options.limit || 50,
                    totalPages: 0
                };
            }

            const variantIds = variants.map(v => v.variant_id);
            console.log('📋 Found variant IDs:', variantIds);

            // Step 2: ⭐ Query imports WITHOUT profiles join first
            const { page = 1, limit = 50 } = options;
            const offset = (page - 1) * limit;

            const { data: imports, error: importError, count } = await supabaseConfig.getAdminClient()
                .from('imports')
                .select(`
                    *,
                    variant:shoe_variants!variant_id (
                        sku,
                        stock_quantity,
                        color:colors!color_id (color_name, hex_code),
                        size:sizes!size_id (size_value, size_type)
                    )
                `, { count: 'exact' })
                .in('variant_id', variantIds)
                .order('import_date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (importError) {
                console.error('❌ Import query error:', importError);
                throw importError;
            }

            console.log(`✅ Found ${imports?.length || 0} imports`);

            // Step 3: ⭐ MANUALLY fetch user profiles (AVOID foreign key issue)
            if (imports && imports.length > 0) {
                // Get unique user IDs
                const userIds = [...new Set(imports.map(imp => imp.user_id))];
                console.log('👤 Fetching profiles for users:', userIds);

                // Fetch all profiles in one query
                const { data: profiles, error: profileError } = await supabaseConfig.getAdminClient()
                    .from('profiles')
                    .select('user_id, username, full_name')
                    .in('user_id', userIds);

                if (profileError) {
                    console.error('⚠️ Profile query error (non-fatal):', profileError);
                    // Continue without profiles
                } else {
                    // Map profiles to imports
                    const profileMap = {};
                    profiles?.forEach(p => {
                        profileMap[p.user_id] = p;
                    });

                    imports.forEach(imp => {
                        imp.profiles = profileMap[imp.user_id] || { 
                            username: 'Unknown', 
                            full_name: 'Unknown User' 
                        };
                    });

                    console.log('✅ Attached profiles to imports');
                }
            }

            const totalPages = Math.ceil((count || 0) / limit);

            return {
                data: imports || [],
                total: count || 0,
                page: page,
                limit: limit,
                totalPages: totalPages
            };

        } catch (error) {
            console.error('❌ findByShoeId error:', error);
            console.error('Stack:', error.stack);
            throw error;
        }
    }



    /**
     * Get imports by date range
     * Custom implementation with date filtering
     */
    async findByDateRange(startDate, endDate = null, options = {}) {
        try {
            const { page = 1, limit = 50, orderBy = 'import_date', orderDirection = 'desc' } = options;
            const offset = (page - 1) * limit;

            let query = this.supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select('*', { count: 'exact' })
                .gte('import_date', startDate)
                .order(orderBy, { ascending: orderDirection === 'asc' })
                .range(offset, offset + limit - 1);

            if (endDate) {
                query = query.lte('import_date', endDate);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                data: data || [],
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil((count || 0) / limit)
            };

        } catch (error) {
            throw new Error(`Failed to fetch imports by date range: ${error.message}`);
        }
    }

    /**
     * ⭐ Batch create imports (for bulk import feature)
     * Validates all items before insertion
     */
    async batchCreate(imports, userId, notes = null) {
        try {
            console.log('📦 Batch create imports called');
            console.log('  - User ID:', userId, 'Type:', typeof userId);
            console.log('  - Imports count:', imports.length);
            console.log('  - First import:', imports[0]);

            // ⭐ CONVERT data types BEFORE validation
            const records = imports.map((imp, index) => {
                const record = {
                    user_id: userId,  // Already UUID from req.user
                    variant_id: parseInt(imp.variant_id),  // ⭐ Convert to integer
                    quantity_imported: parseInt(imp.quantity_imported),  // ⭐ Convert to integer
                    import_price: parseFloat(imp.import_price),  // ⭐ Convert to decimal
                    notes: notes || imp.notes || null,
                    import_date: new Date().toISOString()
                };

                console.log(`  Record ${index + 1}:`, record);
                console.log(`    - variant_id type: ${typeof record.variant_id}`);
                console.log(`    - quantity_imported type: ${typeof record.quantity_imported}`);
                console.log(`    - user_id type: ${typeof record.user_id}`);

                return record;
            });

            // Validate each record
            console.log('🔍 Validating records...');
            records.forEach((record, index) => {
                try {
                    this.validate(record);
                    console.log(`  ✅ Record ${index + 1} validation passed`);
                } catch (error) {
                    console.error(`  ❌ Record ${index + 1} validation failed:`, error.message);
                    throw error;
                }
            });

            // ⭐ Use admin client to bypass RLS
            const client = this.supabaseConfig.getAdminClient();

            console.log('💾 Inserting records into database...');
            const { data, error } = await client
                .from(this.tableName)
                .insert(records)
                .select();

            if (error) {
                console.error('❌ Database insert error:', error);
                throw error;
            }

            console.log(`✅ Successfully created ${data.length} import records`);
            return data;

        } catch (error) {
            console.error('❌ Batch create imports error:', error);
            throw error;
        }
    }


    /**
     * Get import statistics (for dashboard)
     * Returns aggregated metrics
     */
    async getStatistics(filters = {}) {
        try {
            const { user_id, from_date, to_date } = filters;

            let query = this.supabaseConfig.getAdminClient()
                .from(this.tableName)
                .select('quantity_imported, import_price, import_date');

            if (user_id) query = query.eq('user_id', user_id);
            if (from_date) query = query.gte('import_date', from_date);
            if (to_date) query = query.lte('import_date', to_date);

            const { data, error } = await query;

            if (error) throw error;

            // Calculate statistics
            const totalQuantity = data.reduce((sum, imp) => sum + (imp.quantity_imported || 0), 0);
            const totalCost = data.reduce((sum, imp) => 
                sum + ((imp.quantity_imported || 0) * (imp.import_price || 0)), 0
            );

            return {
                total_imports: data.length,
                total_quantity: totalQuantity,
                total_cost: parseFloat(totalCost.toFixed(2)),
                average_import_price: totalQuantity > 0 
                    ? parseFloat((totalCost / totalQuantity).toFixed(2)) 
                    : 0
            };

        } catch (error) {
            throw new Error(`Failed to get import statistics: ${error.message}`);
        }
    }

    /**
     * ⚠️ Delete import and reverse stock (admin only)
     * This should also update stock back - USE WITH CAUTION
     */
    async deleteWithStockReverse(importId) {
        try {
            // Get import details first
            const importRecord = await this.findById(importId);
            
            if (!importRecord) {
                throw new NotFoundError(`Import with ID ${importId} not found`);
            }

            // Reverse stock update
            const { error: stockError } = await this.supabaseConfig.getAdminClient()
                .rpc('update_variant_stock', {
                    p_variant_id: importRecord.variant_id,
                    p_quantity: -importRecord.quantity_imported,
                    p_operation: 'add'
                });

            if (stockError) throw stockError;

            // Delete import record using BaseModel method
            await this.deleteById(importId);

            return { 
                success: true, 
                message: 'Import deleted and stock reversed',
                reversed_quantity: importRecord.quantity_imported
            };

        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error(`Failed to delete import with stock reverse: ${error.message}`);
        }
    }
}

export default Import;
