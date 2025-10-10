// backend/controllers/SizeController.js
// 📏 Size Controller - CRUD sizes table
// Handles size management for shoe variants

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class SizeController extends BaseController {
  constructor() {
    super();
    this.Size = null;
  }

  setModels(models) {
    this.Size = models.Size;
  }

  /**
   * GET /api/sizes
   * Get all sizes
   */
  async getSizes(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { active_only, size_type } = req.query;

        let sizes;
        if (size_type) {
          sizes = await this.Size.findByType(size_type);
        } else if (active_only === 'true') {
          sizes = await this.Size.findActive();
        } else {
          const result = await this.Size.findAll();
          sizes = result.data;
        }

        this.sendResponse(
          res,
          sizes,
          'Sizes fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/sizes/:id
   * Get specific size
   */
  async getSize(req, res) {
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

        const size = await this.Size.findById(parseInt(id));

        this.sendResponse(
          res,
          size,
          'Size fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * POST /api/sizes
   * Create new size (Admin only)
   */
  async createSize(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['admin']);

        this.validateRequest(req.body, {
          size_value: {
            required: true,
            type: 'string',
            maxLength: 10
          },
          size_type: {
            required: false,
            type: 'string',
            maxLength: 20
          }
        });

        const newSize = await this.Size.create(req.body);

        this.sendResponse(
          res,
          newSize,
          'Size created successfully',
          constants.HTTP_STATUS.CREATED
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * PUT /api/sizes/:id
   * Update size (Admin only)
   */
  async updateSize(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['admin']);

        const { id } = req.params;

        this.validateRequest(
          { ...req.body, id: parseInt(id) },
          {
            id: {
              required: true,
              type: 'integer',
              min: 1
            },
            size_value: {
              required: false,
              type: 'string',
              maxLength: 10
            },
            size_type: {
              required: false,
              type: 'string',
              maxLength: 20
            }
          }
        );

        const updatedSize = await this.Size.update(parseInt(id), req.body);

        this.sendResponse(
          res,
          updatedSize,
          'Size updated successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * DELETE /api/sizes/:id
   * Delete size (Admin only)
   */
  async deleteSize(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['admin']);

        const { id } = req.params;

        await this.Size.update(parseInt(id), { is_active: false });

        this.sendResponse(
          res,
          null,
          'Size deleted successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }
}

export default SizeController;
