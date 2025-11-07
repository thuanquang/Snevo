// backend/controllers/CategoryController.js
// 📂 Category Controller - CRUD categories for shoes
// Handles shoe category management

import BaseController from "../utils/BaseController.js";
import constants from "../../config/constants.js";

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
        if (active_only === "true") {
          categories = await this.Category.findActive();
        } else if (include_count === "true") {
          categories = await this.Category.findWithProductCount();
        } else {
          const result = await this.Category.findAll();
          categories = result.data;
        }

        this.sendResponse(res, categories, "Categories fetched successfully");
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
              type: "integer",
              min: 1,
            },
          }
        );

        let category;
        if (include_products === "true") {
          category = await this.Category.findWithProducts(parseInt(id));
        } else {
          category = await this.Category.findById(parseInt(id));
        }

        this.sendResponse(res, category, "Category fetched successfully");
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
      // ⭐ Bỏ try-catch - gọi trực tiếp
      this.requireRole(req, ["seller", "admin"]);

      // Validate request
      this.validateRequest(req.body, {
        category_name: {
          required: true,
          type: "string",
          minLength: 2,
          maxLength: 100,
        },
        description: {
          required: false,
          type: "string",
          maxLength: 500,
        },
        image_url: {
          required: false,
          type: "string",
        },
      });

      const { category_name, description, image_url } = req.body;

      // Check unique name
      const isUnique = await this.Category.validateUniqueName(category_name);
      if (!isUnique) {
        return this.sendError(
          res,
          `Category name "${category_name}" already exists`,
          constants.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Create category
      const categoryData = {
        category_name: category_name.trim(),
        description: description?.trim() || null,
        image_url: image_url?.trim() || null,
        is_active: true,
      };

      const newCategory = await this.Category.create(categoryData);

      this.sendResponse(
        res,
        newCategory,
        "Category created successfully",
        constants.HTTP_STATUS.CREATED
      );
    });
  }

  /**
   * PUT /api/categories/:id
   * Update category (Admin only)
   */
  async updateCategory(req, res) {
    return this.handleRequest(req, res, async () => {
      // ⭐ Bỏ try-catch - gọi trực tiếp
      this.requireRole(req, ["seller", "admin"]);

      const { id } = req.params;
      const categoryId = parseInt(id);

      // Validate ID
      this.validateRequest(
        { id: categoryId },
        { id: { required: true, type: "integer", min: 1 } }
      );

      // Validate update fields
      this.validateRequest(req.body, {
        category_name: {
          required: false,
          type: "string",
          minLength: 2,
          maxLength: 100,
        },
        description: {
          required: false,
          type: "string",
          maxLength: 500,
        },
        image_url: {
          required: false,
          type: "string",
        },
      });

      // Check if category exists
      const existingCategory = await this.Category.findById(categoryId);
      if (!existingCategory) {
        return this.sendError(
          res,
          `Category with ID ${categoryId} not found`,
          constants.HTTP_STATUS.NOT_FOUND
        );
      }

      const { category_name, description, image_url } = req.body;
      const updateData = {};

      // Check unique name if changed
      if (
        category_name &&
        category_name.trim() !== existingCategory.category_name
      ) {
        const isUnique = await this.Category.validateUniqueName(
          category_name.trim(),
          categoryId
        );

        if (!isUnique) {
          return this.sendError(
            res,
            `Category name "${category_name}" already exists`,
            constants.HTTP_STATUS.BAD_REQUEST
          );
        }

        updateData.category_name = category_name.trim();
      }

      // Update description if provided
      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }

      // Update image_url if provided
      if (image_url !== undefined) {
        updateData.image_url = image_url?.trim() || null;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return this.sendResponse(res, existingCategory, "No changes detected");
      }

      // Update using BaseModel method
      const updatedCategory = await this.Category.updateById(
        categoryId,
        updateData
      );

      this.sendResponse(res, updatedCategory, "Category updated successfully");
    });
  }

  /**
   * DELETE /api/categories/:id
   * Soft delete category (Admin only)
   */
  async deleteCategory(req, res) {
    return this.handleRequest(req, res, async () => {
      // ⭐ Bỏ try-catch - gọi trực tiếp
      this.requireRole(req, ["seller", "admin"]);

      const { id } = req.params;
      const categoryId = parseInt(id);

      // Validate ID
      this.validateRequest(
        { id: categoryId },
        { id: { required: true, type: "integer", min: 1 } }
      );

      // Check if category exists
      const category = await this.Category.findById(categoryId);
      if (!category) {
        return this.sendError(
          res,
          `Category with ID ${categoryId} not found`,
          constants.HTTP_STATUS.NOT_FOUND
        );
      }

      // Check if already inactive
      if (!category.is_active) {
        return this.sendResponse(res, category, "Category is already inactive");
      }

      // VALIDATION: Check active shoes count
      const activeShoesCount = await this.Category.checkActiveShoesCount(
        categoryId
      );

      if (activeShoesCount > 0) {
        return this.sendError(
          res,
          `Cannot delete category. It contains ${activeShoesCount} active shoe(s). Please deactivate or move the shoes first.`,
          constants.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Soft delete using BaseModel method
      const deletedCategory = await this.Category.updateById(categoryId, {
        is_active: false,
      });

      this.sendResponse(
        res,
        deletedCategory,
        "Category deleted successfully (soft delete)"
      );
    });
  }
}

export default CategoryController;
