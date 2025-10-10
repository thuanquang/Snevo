// backend/controllers/ColorController.js
// 🎨 Color Controller - CRUD colors table
// Handles color management for shoe variants

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class ColorController extends BaseController {
  constructor() {
    super();
    this.Color = null;
  }

  setModels(models) {
    this.Color = models.Color;
  }

  /**
   * GET /api/colors
   * Get all colors
   */
  async getColors(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { active_only } = req.query;

        let colors;
        if (active_only === 'true') {
          colors = await this.Color.findActive();
        } else {
          const result = await this.Color.findAll();
          colors = result.data;
        }

        this.sendResponse(
          res,
          colors,
          'Colors fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/colors/:id
   * Get specific color
   */
  async getColor(req, res) {
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

        const color = await this.Color.findById(parseInt(id));

        this.sendResponse(
          res,
          color,
          'Color fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * POST /api/colors
   * Create new color (Admin only)
   */
  async createColor(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['admin']);

        this.validateRequest(req.body, {
          color_name: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 50
          },
          hex_code: {
            required: false,
            type: 'string',
            pattern: /^#[0-9A-Fa-f]{6}$/
          }
        });

        const newColor = await this.Color.create(req.body);

        this.sendResponse(
          res,
          newColor,
          'Color created successfully',
          constants.HTTP_STATUS.CREATED
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * PUT /api/colors/:id
   * Update color (Admin only)
   */
  async updateColor(req, res) {
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
            color_name: {
              required: false,
              type: 'string',
              minLength: 2,
              maxLength: 50
            },
            hex_code: {
              required: false,
              type: 'string',
              pattern: /^#[0-9A-Fa-f]{6}$/
            }
          }
        );

        const updatedColor = await this.Color.update(parseInt(id), req.body);

        this.sendResponse(
          res,
          updatedColor,
          'Color updated successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * DELETE /api/colors/:id
   * Delete color (Admin only)
   */
  async deleteColor(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['admin']);

        const { id } = req.params;

        await this.Color.update(parseInt(id), { is_active: false });

        this.sendResponse(
          res,
          null,
          'Color deleted successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }
}

export default ColorController;
