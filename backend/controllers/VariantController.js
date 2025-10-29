// backend/controllers/VariantController.js
// ⭐ Variant Controller - CRUD shoe_variants (most important)
// Handles shoe variant management with stock and pricing

import BaseController from "../utils/BaseController.js";
import constants from "../../config/constants.js";

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

        this.sendResponse(res, variants, "Variants fetched successfully");
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
              type: "integer",
              min: 1,
            },
          }
        );

        const variant = await this.ShoeVariant.findById(parseInt(id));

        this.sendResponse(res, variant, "Variant fetched successfully");
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
        this.requireRole(req, ["seller", "admin"]);

        this.validateRequest(req.body, {
          shoe_id: {
            required: true,
            type: "integer",
          },
          color_id: {
            required: true,
            type: "integer",
          },
          size_id: {
            required: true,
            type: "integer",
          },
          sku: {
            required: true,
            type: "string",
            maxLength: 50,
          },
          stock_quantity: {
            required: false,
            type: "integer",
            min: 0,
          },
          variant_price: {
            required: false,
            type: "number",
            min: 0,
          },
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
            "Variant with this shoe, color, and size combination already exists",
            constants.HTTP_STATUS.CONFLICT
          );
          return;
        }

        const newVariant = await this.ShoeVariant.create(req.body);

        this.sendResponse(
          res,
          newVariant,
          "Variant created successfully",
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
        this.requireRole(req, ["seller", "admin"]);

        const { id } = req.params;

        this.validateRequest(
          { ...req.body, id: parseInt(id) },
          {
            id: {
              required: true,
              type: "integer",
              min: 1,
            },
            sku: {
              required: false,
              type: "string",
              maxLength: 50,
            },
            variant_price: {
              required: false,
              type: "number",
              min: 0,
            },
          }
        );

        const updatedVariant = await this.ShoeVariant.update(
          parseInt(id),
          req.body
        );

        this.sendResponse(res, updatedVariant, "Variant updated successfully");
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
        this.requireRole(req, ["seller", "admin"]);

        const { id } = req.params;

        await this.ShoeVariant.update(parseInt(id), { is_active: false });

        this.sendResponse(res, null, "Variant deleted successfully");
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
        this.requireRole(req, ["seller", "admin"]);

        const { id } = req.params;
        const { quantity, operation = "set" } = req.body;

        this.validateRequest(
          { id: parseInt(id), quantity: parseInt(quantity) },
          {
            id: {
              required: true,
              type: "integer",
              min: 1,
            },
            quantity: {
              required: true,
              type: "integer",
              min: 0,
            },
          }
        );

        if (!["set", "add", "subtract"].includes(operation)) {
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
          `Stock ${
            operation === "set"
              ? "set"
              : operation === "add"
              ? "added"
              : "deducted"
          } successfully`
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/variants/find
   * Find variant by composite key (shoe_id, color_id, size_id)
   */
  async findVariantByComposite(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { shoe_id, color_id, size_id } = req.query;

        this.validateRequest(
          {
            shoe_id: parseInt(shoe_id),
            color_id: parseInt(color_id),
            size_id: parseInt(size_id),
          },
          {
            shoe_id: {
              required: true,
              type: "integer",
              min: 1,
            },
            color_id: {
              required: true,
              type: "integer",
              min: 1,
            },
            size_id: {
              required: true,
              type: "integer",
              min: 1,
            },
          }
        );

        const variant = await this.ShoeVariant.findByComposite(
          parseInt(shoe_id),
          parseInt(color_id),
          parseInt(size_id)
        );

        if (!variant) {
          this.sendError(
            res,
            "Variant not found",
            constants.HTTP_STATUS.NOT_FOUND
          );
          return;
        }

        this.sendResponse(res, variant, "Variant found successfully");
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/variants/sku/:sku
   * Get variant by SKU
   */
  async getVariantBySku(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { sku } = req.params;

        this.validateRequest(
          { sku },
          {
            sku: {
              required: true,
              type: "string",
              maxLength: 50,
            },
          }
        );

        const variant = await this.ShoeVariant.findBySku(sku);

        if (!variant) {
          this.sendError(
            res,
            "Variant not found",
            constants.HTTP_STATUS.NOT_FOUND
          );
          return;
        }

        this.sendResponse(res, variant, "Variant fetched successfully");
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/variants/low-stock
   * Get low stock variants (Admin/Seller only)
   */
  async getLowStockVariants(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ["seller", "admin"]);

        const { threshold = 10 } = req.query;

        const variants = await this.ShoeVariant.findLowStock(
          parseInt(threshold)
        );

        this.sendResponse(
          res,
          variants,
          "Low stock variants fetched successfully"
        );
      } catch (error) {
        throw error;
      }
    });
  }
  /**
   * ⭐ ADD THIS METHOD - GET /api/variants/shoe/:shoeId
   * Get all variants for a specific shoe
   */
  async getVariantsByShoe(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { shoeId } = req.params;

        this.validateRequest(
          { shoeId: parseInt(shoeId) },
          {
            shoeId: {
              required: true,
              type: "integer",
              min: 1,
            },
          }
        );

        const variants = await this.ShoeVariant.findByShoeId(parseInt(shoeId));

        this.sendResponse(res, variants || [], "Variants fetched successfully");
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * GET /api/variants/shoe/:shoeId/color/:colorId
   * Get variants by shoe and color
   */
  async getVariantsByColor(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { shoeId, colorId } = req.params;

        this.validateRequest(
          {
            shoeId: parseInt(shoeId),
            colorId: parseInt(colorId),
          },
          {
            shoeId: {
              required: true,
              type: "integer",
              min: 1,
            },
            colorId: {
              required: true,
              type: "integer",
              min: 1,
            },
          }
        );

        // Get all variants for this shoe and color
        const allVariants = await this.ShoeVariant.findByShoeId(
          parseInt(shoeId)
        );
        const variants = allVariants.filter(
          (v) => v.color_id === parseInt(colorId)
        );

        this.sendResponse(res, variants, "Variants fetched successfully");
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * POST /api/variants/bulk
   * Bulk create variants (Admin/Seller only)
   */
  async bulkCreateVariants(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ["seller", "admin"]);

        const { variants } = req.body;

        if (!Array.isArray(variants) || variants.length === 0) {
          this.sendError(
            res,
            "variants must be a non-empty array",
            constants.HTTP_STATUS.BAD_REQUEST
          );
          return;
        }

        // Validate each variant
        for (const variant of variants) {
          this.validateRequest(variant, {
            shoe_id: {
              required: true,
              type: "integer",
            },
            color_id: {
              required: true,
              type: "integer",
            },
            size_id: {
              required: true,
              type: "integer",
            },
            sku: {
              required: true,
              type: "string",
              maxLength: 50,
            },
            stock_quantity: {
              required: false,
              type: "integer",
              min: 0,
            },
            variant_price: {
              required: false,
              type: "number",
              min: 0,
            },
          });
        }

        const createdVariants = await this.ShoeVariant.bulkCreate(variants);

        this.sendResponse(
          res,
          createdVariants,
          `${createdVariants.length} variants created successfully`,
          constants.HTTP_STATUS.CREATED
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * POST /api/variants/:id/check-stock
   * Check stock availability
   */
  async checkStock(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { id } = req.params;
        const { quantity } = req.body;

        this.validateRequest(
          {
            id: parseInt(id),
            quantity: parseInt(quantity),
          },
          {
            id: {
              required: true,
              type: "integer",
              min: 1,
            },
            quantity: {
              required: true,
              type: "integer",
              min: 1,
            },
          }
        );

        const stockInfo = await this.ShoeVariant.checkStock(
          parseInt(id),
          parseInt(quantity)
        );

        this.sendResponse(res, stockInfo, "Stock check completed successfully");
      } catch (error) {
        throw error;
      }
    });
  }
  /**
   * ⭐ POST /api/variants/generate-all/:shoeId
   * Generate all possible variants for a shoe
   */
  async generateAllVariants(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        // Require seller or admin role
        const user = this.requireRole(req, ["seller", "admin"]);

        const { shoeId } = req.params;
        const { defaultStock = 0 } = req.body;

        console.log(`🎨 Generating all variants for shoe ${shoeId}`);

        const result = await this.ShoeVariant.generateAllVariants(
          parseInt(shoeId),
          { defaultStock }
        );

        this.sendResponse(res, result, result.message, 201);
      } catch (error) {
        console.error("❌ Generate all variants error:", error);
        this.sendError(res, error.message, 500);
      }
    });
  }

  /**
   * POST /api/variants/generate-specific/:shoeId
   * Generate specific color/size combinations
   */
  async generateSpecificVariants(req, res) {
    return this.handleRequest(req, res, async () => {
      const { shoeId } = req.params;
      const {
        colorIds,
        sizeIds,
        defaultStock = 0,
        defaultPrice = null,
      } = req.body;

      console.log("🎯 Generate specific variants:", {
        shoeId,
        colorIds,
        sizeIds,
        defaultStock,
        defaultPrice,
      });

      // Validate inputs
      this.validateRequest(
        { shoeId: parseInt(shoeId), colorIds: colorIds, sizeIds: sizeIds },
        {
          shoeId: { required: true, type: "integer", min: 1 },
          colorIds: { required: true, type: "array", minLength: 1 },
          sizeIds: { required: true, type: "array", minLength: 1 },
        }
      );

      // Check existing variants FIRST
      const existingVariants = await this.ShoeVariant.findByShoeId(
        parseInt(shoeId)
      );

      const existingMap = new Set(
        existingVariants.map((v) => `${v.color_id}-${v.size_id}`)
      );

      // Filter out duplicates
      const duplicates = [];
      const toCreate = [];

      for (const colorId of colorIds) {
        for (const sizeId of sizeIds) {
          const key = `${colorId}-${sizeId}`;
          if (existingMap.has(key)) {
            duplicates.push({ colorId, sizeId });
          } else {
            toCreate.push({ colorId, sizeId });
          }
        }
      }

      // If ALL are duplicates, return info
      if (toCreate.length === 0) {
        return this.sendResponse(
          res,
          {
            created: 0,
            skipped: duplicates.length,
            duplicates: duplicates,
          },
          "All selected variants already exist",
          200
        );
      }

      // ✅ FIX: TRUYỀN OPTIONS OBJECT
      const result = await this.ShoeVariant.generateSpecificVariants(
        parseInt(shoeId),
        toCreate.map((v) => v.colorId),
        toCreate.map((v) => v.sizeId),
        {
          // ← ĐÚNG: Truyền object
          defaultStock: parseInt(defaultStock) || 0,
          defaultPrice: defaultPrice !== null ? parseFloat(defaultPrice) : null,
        }
      );

      this.sendResponse(
        res,
        {
          ...result,
          skipped: duplicates.length,
          duplicates: duplicates,
        },
        duplicates.length > 0
          ? `Created ${result.created} variants, skipped ${duplicates.length} duplicates`
          : `Successfully created ${result.created} variants`
      );
    });
  }
  /**
   * ✅ Soft delete variant (preserve stock)
   * DELETE /api/variants/:variantId
   */
  async softDeleteVariant(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ["seller", "admin"]);

        const { variantId } = req.params; // ✅ NOW CORRECT

        // Get variant info BEFORE deletion
        const variant = await this.ShoeVariant.findById(parseInt(variantId)); // ✅ USE ShoeVariant

        if (!variant) {
          return this.sendError(
            res,
            "Variant not found",
            constants.HTTP_STATUS.NOT_FOUND
          );
        }

        // Soft delete by calling model method
        await this.ShoeVariant.softDeleteVariant(parseInt(variantId)); // ✅ Call model method

        this.sendResponse(
          res,
          {
            variant_id: variant.variant_id,
            sku: variant.sku,
            stock_preserved: variant.stock_quantity,
            is_active: false,
          },
          variant.stock_quantity > 0
            ? `Variant deleted. Stock preserved: ${variant.stock_quantity} units`
            : "Variant deleted successfully"
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * ✅ Restore deleted variant
   * POST /api/variants/:variantId/restore
   */
  async restoreVariant(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ["seller", "admin"]);
        const { variantId } = req.params;

        // Validate ID
        if (!variantId || isNaN(parseInt(variantId))) {
          return this.sendError(res, "Invalid variant ID", 400);
        }

        // Attempt to restore with all validations
        const restoredVariant = await this.ShoeVariant.restoreVariant(
          parseInt(variantId)
        );

        this.sendResponse(
          res,
          {
            variant_id: restoredVariant.variant_id,
            sku: restoredVariant.sku,
            stock_quantity: restoredVariant.stock_quantity,
            is_active: true,
            shoe_id: restoredVariant.shoe_id,
          },
          `Variant restored successfully. Stock recovered: ${restoredVariant.stock_quantity} units`
        );
      } catch (error) {
        // Provide detailed error messages to user
        if (error.message.includes("Cannot restore variant")) {
          return this.sendError(res, error.message, 400);
        }
        if (error.message.includes("not found")) {
          return this.sendError(res, error.message, 404);
        }
        if (error.message.includes("already active")) {
          return this.sendError(res, error.message, 400);
        }
        throw error;
      }
    });
  }

  /**
   * ✅ GET /api/variants/deleted/:shoeId
   * Get deleted variants với restore status
   */
  async getDeletedVariants(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ["seller", "admin"]);
        const { shoeId } = req.params;

        // Validate ID
        if (!shoeId || isNaN(parseInt(shoeId))) {
          return this.sendError(res, "Invalid shoe ID", 400);
        }

        // Get deleted variants with restore metadata
        const deletedVariants = await this.ShoeVariant.getDeletedVariants(
          parseInt(shoeId)
        );

        // Group by restore status
        const canRestore = deletedVariants.filter((v) => v.can_restore);
        const cannotRestore = deletedVariants.filter((v) => !v.can_restore);

        this.sendResponse(
          res,
          {
            total: deletedVariants.length,
            can_restore_count: canRestore.length,
            cannot_restore_count: cannotRestore.length,
            variants: deletedVariants,
            summary: {
              restorable: canRestore.map((v) => ({
                variant_id: v.variant_id,
                sku: v.sku,
                deleted_at: v.deleted_at,
              })),
              blocked: cannotRestore.map((v) => ({
                variant_id: v.variant_id,
                sku: v.sku,
                deleted_at: v.deleted_at,
                reason: v.restore_blocker,
              })),
            },
          },
          "Deleted variants fetched successfully"
        );
      } catch (error) {
        throw error;
      }
    });
  }
  /**
   * ✅ GET /api/variants/deleted-all
   * Get ALL shoes that have deleted variants
   */
  async getAllDeletedVariants(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        this.requireRole(req, ["seller", "admin"]);

        // Get all shoes with deleted variants
        const data = await this.ShoeVariant.getAllShoesWithDeletedVariants();

        // Calculate statistics
        const totalShoes = data.length;
        const totalDeletedVariants = data.reduce(
          (sum, item) => sum + item.deleted_count,
          0
        );
        const totalRestorable = data.reduce(
          (sum, item) =>
            sum + item.deleted_variants.filter((v) => v.can_restore).length,
          0
        );
        const totalBlocked = totalDeletedVariants - totalRestorable;

        this.sendResponse(
          res,
          {
            shoes: data,
            statistics: {
              total_shoes_with_deleted_variants: totalShoes,
              total_deleted_variants: totalDeletedVariants,
              total_restorable: totalRestorable,
              total_blocked: totalBlocked,
            },
          },
          "All deleted variants fetched successfully"
        );
      } catch (error) {
        throw error;
      }
    });
  }
}

export default VariantController;
