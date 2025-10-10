// backend/controllers/CategoryController.js
// 📂 Category Controller - CRUD categories for shoes
// Handles shoe category management

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class CategoryController extends BaseController {
  constructor() {
    super();
    this.Category = null;
  }

  setModels(models) {
    this.Category = models.Category;
  }

  /**
   * GET /api/categories
   * Get all categories
   */
  async getCategories(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { active_only, include_count } = req.query;

        let categories;
        if (active_only === 'true') {
          categories = await this.Category.findActive();
        } else if (include_count === 'true') {
          categories = await this.Category.findWithProductCount();
        } else {
          const result = await this.Category.findAll();
          categories = result.data;
        }

        this.sendResponse(
          res,
          categories,
          'Categories fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/categories/:id
   * Get specific category
   */
  async getCategory(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { id } = req.params;
        const { include_products } = req.query;

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

        let category;
        if (include_products === 'true') {
          category = await this.Category.findWithProducts(parseInt(id));
        } else {
          category = await this.Category.findById(parseInt(id));
        }

        this.sendResponse(
          res,
          category,
          'Category fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * POST /api/categories
   * Create new category (Admin only)
   */
  async createCategory(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['admin']);

        this.validateRequest(req.body, {
          category_name: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100
          },
          description: {
            required: false,
            type: 'string',
            maxLength: 500
          },
          image_url: {
            required: false,
            type: 'string'
          }
        });

        const newCategory = await this.Category.create(req.body);

        this.sendResponse(
          res,
          newCategory,
          'Category created successfully',
          constants.HTTP_STATUS.CREATED
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * PUT /api/categories/:id
   * Update category (Admin only)
   */
  async updateCategory(req, res) {
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
            category_name: {
              required: false,
              type: 'string',
              minLength: 2,
              maxLength: 100
            }
          }
        );

        const updatedCategory = await this.Category.update(parseInt(id), req.body);

        this.sendResponse(
          res,
          updatedCategory,
          'Category updated successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * DELETE /api/categories/:id
   * Delete category (Admin only)
   */
  async deleteCategory(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ['admin']);

        const { id } = req.params;

        await this.Category.update(parseInt(id), { is_active: false });

        this.sendResponse(
          res,
          null,
          'Category deleted successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }
}

export default CategoryController;
