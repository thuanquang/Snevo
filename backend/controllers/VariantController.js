// backend/controllers/VariantController.js
// ⭐ Variant Controller - CRUD shoe_variants (most important)
// Handles shoe variant management with stock and pricing

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class VariantController extends BaseController {
  constructor() {
    super();
    this.ShoeVariant = null;
  }

  setModels(models) {
    this.ShoeVariant = models.ShoeVariant;
  }

  /**
   * GET /api/variants
   * Get all variants for a product
   */
  async getVariants(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { shoe_id } = req.query;

        let variants;
        if (shoe_id) {
          variants = await this.ShoeVariant.findByShoeId(parseInt(shoe_id));
        } else {
          const result = await this.ShoeVariant.findAll();
          variants = result.data;
        }

        this.sendResponse(
          res,
          variants,
          'Variants fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/variants/:id
   * Get specific variant
   */
  async getVariant(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { id } = req.params;

        this.validateRequest(
          { id: parseInt(id) },
          {
            id: {
              required: true,
              type: 'integer',
              min: 1
            }
          }
        );

        const variant = await this.ShoeVariant.findById(parseInt(id));

        this.sendResponse(
          res,
          variant,
          'Variant fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * POST /api/variants
   * Create new variant (Admin/Seller only)
   */
  async createVariant(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['seller', 'admin']);

        this.validateRequest(req.body, {
          shoe_id: {
            required: true,
            type: 'integer'
          },
          color_id: {
            required: true,
            type: 'integer'
          },
          size_id: {
            required: true,
            type: 'integer'
          },
          sku: {
            required: true,
            type: 'string',
            maxLength: 50
          },
          stock_quantity: {
            required: false,
            type: 'integer',
            min: 0
          },
          variant_price: {
            required: false,
            type: 'number',
            min: 0
          }
        });

        // Check if variant already exists
        const existing = await this.ShoeVariant.findByComposite(
          req.body.shoe_id,
          req.body.color_id,
          req.body.size_id
        );

        if (existing) {
          this.sendError(
            res,
            'Variant with this shoe, color, and size combination already exists',
            constants.HTTP_STATUS.CONFLICT
          );
          return;
        }

        const newVariant = await this.ShoeVariant.create(req.body);

        this.sendResponse(
          res,
          newVariant,
          'Variant created successfully',
          constants.HTTP_STATUS.CREATED
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * PUT /api/variants/:id
   * Update variant (Admin/Seller only)
   */
  async updateVariant(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['seller', 'admin']);

        const { id } = req.params;

        this.validateRequest(
          { ...req.body, id: parseInt(id) },
          {
            id: {
              required: true,
              type: 'integer',
              min: 1
            },
            sku: {
              required: false,
              type: 'string',
              maxLength: 50
            },
            variant_price: {
              required: false,
              type: 'number',
              min: 0
            }
          }
        );

        const updatedVariant = await this.ShoeVariant.update(parseInt(id), req.body);

        this.sendResponse(
          res,
          updatedVariant,
          'Variant updated successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * DELETE /api/variants/:id
   * Delete variant (Admin/Seller only)
   */
  async deleteVariant(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['seller', 'admin']);

        const { id } = req.params;

        await this.ShoeVariant.update(parseInt(id), { is_active: false });

        this.sendResponse(
          res,
          null,
          'Variant deleted successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * PATCH /api/variants/:id/stock
   * Update stock
   */
  async updateStock(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['seller', 'admin']);

        const { id } = req.params;
        const { quantity, operation = 'set' } = req.body;

        this.validateRequest(
          { id: parseInt(id), quantity: parseInt(quantity) },
          {
            id: {
              required: true,
              type: 'integer',
              min: 1
            },
            quantity: {
              required: true,
              type: 'integer',
              min: 0
            }
          }
        );

        if (!['set', 'add', 'subtract'].includes(operation)) {
          this.sendError(
            res,
            'operation must be "set", "add", or "subtract"',
            constants.HTTP_STATUS.BAD_REQUEST
          );
          return;
        }

        const updatedVariant = await this.ShoeVariant.updateStock(
          parseInt(id),
          parseInt(quantity),
          operation
        );

        this.sendResponse(
          res,
          updatedVariant,
          `Stock ${operation === 'set' ? 'set' : operation === 'add' ? 'added' : 'deducted'} successfully`
        );
      } catch (error) {
        throw error;
      }
    });
  }
}

export default VariantController;
