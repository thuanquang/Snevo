// backend/controllers/ProductController.js
// 👟 Product Controller - CRUD shoes table with variant filtering
// Handles shoe product management

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class ProductController extends BaseController {
  constructor() {
    super();
    this.Shoe = null; // Will be set by Server during initialization
  }

  /**
   * Initialize with models
   */
  setModels(models) {
    this.Shoe = models.Shoe;
  }

  /**
   * ⭐ GET /api/products
   * Get all products with filtering, search, and pagination
   * NOW SUPPORTS: color_ids and size_ids filters
   */
  async getProducts(req, res) {
    return this.handleRequest(req, res, async () => {
        try {
            const pagination = this.getPaginationParams(req);
            
            const parsedColorIds = req.query.color_ids
                ? req.query.color_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                : undefined;
            
            const parsedSizeIds = req.query.size_ids
                ? req.query.size_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                : undefined;

            const filters = {
                category_id: req.query.category_id,
                min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
                max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
                search: req.query.search,
                color_ids: parsedColorIds,
                size_ids: parsedSizeIds,
                is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : true,
                include_no_variants: req.query.include_no_variants === 'true'  // ⭐ NEW
            };
            const result = await this.Shoe.findAllWithFilters(
                filters,
                pagination,
                req.query.sort_by || 'created_at',
                req.query.sort_order || 'desc'
            );

            console.log(`✅ ProductController - Returning ${result.data.length} products`);
            
            this.sendPaginatedResponse(
                res,
                result,
                pagination,
                'Products fetched successfully'
            );
        } catch (error) {
            throw error;
        }
    });
}

  /**
   * GET /api/products/:id
   * Get specific product with full details
   */
  async getProduct(req, res) {
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

        const product = await this.Shoe.findByIdWithDetails(parseInt(id));

        this.sendResponse(
          res,
          product,
          'Product fetched successfully',
          constants.HTTP_STATUS.OK
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * POST /api/products
   * Create new product (Admin/Seller only)
   */
  async createProduct(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        // Check authorization
        this.requireRole(req, ['seller', 'admin']);

        // Validate request body
        this.validateRequest(req.body, {
          shoe_name: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100
          },
          category_id: {
            required: true,
            type: 'integer'
          },
          base_price: {
            required: true,
            type: 'number',
            min: 0
          },
          description: {
            required: false,
            type: 'string',
            maxLength: 2000
          },
          image_url: {
            required: false,
            type: 'string'
          }
        });
        const productData = {
          ...req.body,
          image_url: req.body.image_url || null
        };
        const newProduct = await this.Shoe.create(productData);

        this.sendResponse(
          res,
          newProduct,
          'Product created successfully',
          constants.HTTP_STATUS.CREATED
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * PUT /api/products/:id
   * Update product (Admin/Seller only)
   */
  async updateProduct(req, res) {
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
            shoe_name: {
              required: false,
              type: 'string',
              minLength: 2,
              maxLength: 100
            },
            category_id: {
              required: false,
              type: 'integer'
            },
            base_price: {
              required: false,
              type: 'number',
              min: 0
            }
          }
        );
        const updateData = { ...req.body };

        const updatedProduct = await this.Shoe.updateById(parseInt(id), updateData);

        this.sendResponse(
          res,
          updatedProduct,
          'Product updated successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }
  /**
   * DELETE /api/products/:id
   * Soft delete a product (requires seller/admin role)
   */
  async deleteProduct(req, res) {
    return this.handleRequest(req, res, async () => {
      // Check authentication and authorization
      this.requireRole(req, ['seller', 'admin']);
      
      const { id } = req.params;
      const productId = parseInt(id);

      // Validate ID
      if (isNaN(productId) || productId <= 0) {
        return this.sendError(res, 'Invalid product ID', 400);
      }

      // Check if product exists
      const product = await this.Shoe.findById(productId);
      if (!product) {
        return this.sendError(res, 'Product not found', 404);
      }

      // Check if product is already deleted
      if (!product.is_active) {
        return this.sendError(res, 'Product is already deleted', 400);
      }

      // Optional: Check if product has active orders
      // Uncomment này nếu muốn prevent deletion khi có orders
      /*
      const { data: activeOrders } = await this.Shoe.supabaseConfig.getAdminClient()
        .from(constants.DATABASE_TABLES.ORDER_ITEMS)
        .select('order_id, orders!inner(status)')
        .in('orders.status', ['pending', 'processing'])
        .eq('variant_id', productId)
        .limit(1);

      if (activeOrders && activeOrders.length > 0) {
        return this.sendError(
          res,
          'Cannot delete product with active orders. Please complete or cancel orders first.',
          409
        );
      }
      */

      // Soft delete the product
      const deletedProduct = await this.Shoe.softDelete(productId);

      // Log the deletion (for audit trail)
      console.log(`✅ Product ${productId} deleted by user ${req.user?.email || 'unknown'} at ${new Date().toISOString()}`);

      // Return success response
      this.sendResponse(res, {
        product: deletedProduct,
        message: 'Product and its variants have been deleted successfully'
      }, 'Product deleted successfully');
    });
  }
  /**
   * PUT /api/products/:id/restore
   * Restore a soft-deleted product (requires seller/admin role)
   */
  async restoreProduct(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireRole(req, ['seller', 'admin']);
      
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId) || productId <= 0) {
        return this.sendError(res, 'Invalid product ID', 400);
      }

      // Find the product (including deleted ones)
      const { data: product } = await this.Shoe.supabaseConfig.getAdminClient()
        .from(constants.DATABASE_TABLES.SHOES)
        .select('*')
        .eq('shoe_id', productId)
        .single();

      if (!product) {
        return this.sendError(res, 'Product not found', 404);
      }

      if (product.is_active) {
        return this.sendError(res, 'Product is not deleted', 400);
      }

      // Restore the product
      const restoredProduct = await this.Shoe.restore(productId);

      console.log(`✅ Product ${productId} restored by user ${req.user?.email || 'unknown'}`);

      this.sendResponse(res, {
        product: restoredProduct,
        message: 'Product and its variants have been restored successfully'
      }, 'Product restored successfully');
    });
  }



  /**
   * GET /api/products/search
   * Search products
   */
  async searchProducts(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { q: searchQuery } = req.query;
        const pagination = this.getPaginationParams(req);

        if (!searchQuery || searchQuery.trim().length < 2) {
          this.sendError(
            res,
            'Search query must be at least 2 characters',
            constants.HTTP_STATUS.BAD_REQUEST
          );
          return;
        }

        const result = await this.Shoe.search(searchQuery, pagination);

        this.sendPaginatedResponse(
          res,
          result,
          pagination,
          `Search results for "${searchQuery}"`
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * ⭐ NEW: GET /api/products/featured
   * Get featured products
   */
  async getFeaturedProducts(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const pagination = this.getPaginationParams(req);
        
        const filters = {
          is_active: true,
          // Add any featured-specific filters if you have a 'is_featured' column
        };

        const result = await this.Shoe.findAllWithFilters(
          filters,
          pagination,
          'created_at',
          'desc'
        );

        this.sendPaginatedResponse(
          res,
          result,
          pagination,
          'Featured products fetched successfully'
        );
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * ⭐ NEW: GET /api/products/category/:categoryId
   * Get products by category
   */
  async getProductsByCategory(req, res) {
    return this.handleRequest(req, res, async () => {
      try {
        const { categoryId } = req.params;
        const pagination = this.getPaginationParams(req);

        this.validateRequest(
          { categoryId: parseInt(categoryId) },
          {
            categoryId: {
              required: true,
              type: 'integer',
              min: 1
            }
          }
        );

        const filters = {
          category_id: parseInt(categoryId),
          is_active: true
        };

        const result = await this.Shoe.findAllWithFilters(
          filters,
          pagination,
          req.query.sort_by || 'created_at',
          req.query.sort_order || 'desc'
        );

        this.sendPaginatedResponse(
          res,
          result,
          pagination,
          `Products in category ${categoryId} fetched successfully`
        );
      } catch (error) {
        throw error;
      }
    });
  }
}

// Export CLASS (not instance)
export default ProductController;