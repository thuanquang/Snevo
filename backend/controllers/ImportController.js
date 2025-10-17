// backend/controllers/ImportController.js

// 📥 Import Controller - CRUD imports management
// Handles inventory import operations with authorization

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/ErrorClasses.js';

class ImportController extends BaseController {
    constructor() {
        super();
        this.Import = null; // Will be set by Server during initialization
    }

    /**
     * Initialize with models
     */
    setModels(models) {
        this.Import = models.Import;
    }

    /**
     * ⭐ GET /api/imports
     * Get all imports with filters and pagination
     * Query params: page, limit, shoe_id, variant_id, user_id, from_date, to_date
     */
    async getImports(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                // Get pagination params using BaseController method
                const pagination = this.getPaginationParams(req, {
                    page: 1,
                    limit: 50,
                    sort: 'import_date',
                    order: 'desc'
                });

                // Get filter params
                const filters = {
                    shoe_id: req.query.shoe_id,
                    variant_id: req.query.variant_id,
                    user_id: req.query.user_id,
                    from_date: req.query.from_date,
                    to_date: req.query.to_date,
                    orderBy: pagination.sort,
                    orderDirection: pagination.order
                };

                // Remove undefined filters
                Object.keys(filters).forEach(key => 
                    filters[key] === undefined && delete filters[key]
                );

                // Get imports with details
                const result = await this.Import.findAllWithDetails(filters, pagination);

                // Send paginated response using BaseController method
                this.sendPaginatedResponse(
                    res,
                    result,
                    pagination,
                    'Imports fetched successfully'
                );

            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * GET /api/imports/:id
     * Get specific import with full details
     */
    async getImport(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                const { id } = req.params;

                if (!id || isNaN(parseInt(id))) {
                    throw new ValidationError('Invalid import ID');
                }

                const importRecord = await this.Import.findById(parseInt(id));

                if (!importRecord) {
                    throw new NotFoundError(`Import with ID ${id} not found`);
                }

                this.sendResponse(
                    res,
                    importRecord,
                    'Import fetched successfully'
                );

            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * ⭐ POST /api/imports
     * Create new import (single)
     * Body: { variant_id, quantity_imported, import_price, notes? }
     */
    async createImport(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                // Authorization: Only sellers/admins can create imports
                const user = this.requireRole(req, ['seller', 'admin', 'authenticated']);

                // Validate request body using BaseController method
                this.validateRequest(req.body, {
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
                    notes: {
                        required: false,
                        type: 'string',
                        maxLength: 500
                    }
                });

                // Create import record
                const importData = {
                    ...req.body,
                    user_id: user.user_id,
                    import_date: new Date().toISOString()
                };

                const newImport = await this.Import.create(importData);

                this.sendResponse(
                    res,
                    newImport,
                    'Import created successfully',
                    constants.HTTP_STATUS.CREATED
                );

            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * ⭐ POST /api/imports/batch
     * Create multiple imports at once (batch import)
     * Body: { imports: [{variant_id, quantity_imported, import_price}], notes? }
     */
    async createBatchImport(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                console.log('📦 Batch import request received');
                
                // ⭐ Validate user role
                const user = this.requireRole(req, ['seller', 'admin']);
                console.log(`✅ User authorized: ${user.email} (${user.role})`);

                // Validate request body
                if (!req.body || !req.body.imports || !Array.isArray(req.body.imports)) {
                    throw new ValidationError('Invalid request: imports array is required');
                }

                const { imports, notes } = req.body;

                if (imports.length === 0) {
                    throw new ValidationError('At least one import is required');
                }

                console.log(`📥 Creating batch import: ${imports.length} items`);

                // Validate each import item
                imports.forEach((imp, index) => {
                    if (!imp.variant_id || imp.quantity_imported === undefined || imp.import_price === undefined) {
                        throw new ValidationError(
                            `Import item ${index + 1}: variant_id, quantity_imported, and import_price are required`
                        );
                    }
                    if (imp.quantity_imported <= 0) {
                        throw new ValidationError(`Import item ${index + 1}: quantity must be greater than 0`);
                    }
                    if (imp.import_price < 0) {
                        throw new ValidationError(`Import item ${index + 1}: price cannot be negative`);
                    }
                });

                // ⭐ Create batch import with user_id
                const result = await this.Import.batchCreate(
                    imports,
                    user.user_id,  // ⭐ Attach authenticated user
                    notes || null
                );

                console.log(`✅ Batch import created: ${result.length} records`);

                this.sendSuccess(res, result, `Successfully created ${result.length} import records`, 201);

            } catch (error) {
                console.error('❌ Batch import error:', error);
                
                if (error instanceof ValidationError) {
                    this.sendError(res, error.message, 400);
                } else if (error instanceof AuthorizationError) {
                    this.sendError(res, error.message, 403);
                } else {
                    this.sendError(res, 'Failed to create batch import', 500);
                }
            }
        });
    }

    /**
     * GET /api/imports/statistics
     * Get import statistics with filters
     * Query params: user_id, from_date, to_date
     */
    async getImportStatistics(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                // Authorization check (optional - only for own stats)
                const user = req.user;

                const filters = {
                    user_id: req.query.user_id || (user ? user.user_id : undefined),
                    from_date: req.query.from_date,
                    to_date: req.query.to_date
                };

                // Remove undefined filters
                Object.keys(filters).forEach(key => 
                    filters[key] === undefined && delete filters[key]
                );

                const stats = await this.Import.getStatistics(filters);

                this.sendResponse(
                    res,
                    stats,
                    'Import statistics fetched successfully'
                );

            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * GET /api/imports/shoe/:shoeId
     * Get all imports for a specific shoe (all variants)
     */
    async getImportsByShoe(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                const { shoeId } = req.params;

                if (!shoeId || isNaN(parseInt(shoeId))) {
                    throw new ValidationError('Invalid shoe ID');
                }

                const pagination = this.getPaginationParams(req);

                const result = await this.Import.findByShoeId(
                    parseInt(shoeId),
                    pagination
                );

                this.sendPaginatedResponse(
                    res,
                    result,
                    pagination,
                    'Shoe imports fetched successfully'
                );

            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * GET /api/imports/variant/:variantId
     * Get all imports for a specific variant
     */
    async getImportsByVariant(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                const { variantId } = req.params;

                if (!variantId || isNaN(parseInt(variantId))) {
                    throw new ValidationError('Invalid variant ID');
                }

                const pagination = this.getPaginationParams(req);

                const result = await this.Import.findByVariantId(
                    parseInt(variantId),
                    pagination
                );

                this.sendPaginatedResponse(
                    res,
                    result,
                    pagination,
                    'Variant imports fetched successfully'
                );

            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * ⚠️ DELETE /api/imports/:id
     * Delete import and reverse stock (ADMIN ONLY)
     * Use with extreme caution - affects stock levels
     */
    async deleteImport(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                // Authorization: Only admins can delete imports
                this.requireRole(req, ['admin']);

                const { id } = req.params;

                if (!id || isNaN(parseInt(id))) {
                    throw new ValidationError('Invalid import ID');
                }

                const result = await this.Import.deleteWithStockReverse(parseInt(id));

                this.sendResponse(
                    res,
                    result,
                    'Import deleted and stock reversed successfully'
                );

            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * PUT /api/imports/:id
     * Update import (limited fields - mainly notes)
     * Body: { notes }
     */
    async updateImport(req, res) {
        return this.handleRequest(req, res, async () => {
            try {
                // Authorization: Only sellers/admins can update
                this.requireRole(req, ['seller', 'admin']);

                const { id } = req.params;

                if (!id || isNaN(parseInt(id))) {
                    throw new ValidationError('Invalid import ID');
                }

                // Only allow updating notes (no quantity/price changes for audit)
                this.validateRequest(req.body, {
                    notes: {
                        required: false,
                        type: 'string',
                        maxLength: 500
                    }
                });

                const updateData = { notes: req.body.notes };

                const updatedImport = await this.Import.updateById(
                    parseInt(id),
                    updateData
                );

                if (!updatedImport) {
                    throw new NotFoundError(`Import with ID ${id} not found`);
                }

                this.sendResponse(
                    res,
                    updatedImport,
                    'Import updated successfully'
                );

            } catch (error) {
                throw error;
            }
        });
    }
}

export default ImportController;
