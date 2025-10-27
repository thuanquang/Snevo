// backend/controllers/CartController.js
// 🛒 Cart Controller

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class CartController extends BaseController {
  constructor() {
    super();
    this.Cart = null;
    this.ShoeVariant = null;
  }

  setModels(models) {
    this.Cart = models.Cart;
    this.ShoeVariant = models.ShoeVariant;
  }

  // GET /api/cart
  async getCart(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const items = await this.Cart.listByUser(req.user.id);
      // compute line totals on the fly
      const data = items.map(it => ({
        ...it,
        line_total: Number(it.price_at_add) * it.quantity
      }));
      this.sendResponse(res, data, 'Cart fetched');
    });
  }

  // GET /api/cart/summary
  async getSummary(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const summary = await this.Cart.summary(req.user.id);
      this.sendResponse(res, summary, 'Cart summary');
    });
  }

  // POST /api/cart { variant_id, quantity }
  async addToCart(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);

      const { variant_id, quantity = 1 } = req.body || {};

      this.validateRequest(
        { variant_id: parseInt(variant_id), quantity: parseInt(quantity) },
        {
          variant_id: { required: true, type: 'integer', min: 1 },
          quantity: { required: true, type: 'integer', min: 1, max: 99 }
        }
      );

      // Check variant
      const variant = await this.ShoeVariant.findById(parseInt(variant_id));
      if (!variant || variant.is_active === false) {
        this.sendError(res, 'Variant not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }

      // Stock check
      const stock = await this.ShoeVariant.checkStock(parseInt(variant_id), parseInt(quantity));
      if (!stock.available) {
        this.sendError(res, 'Insufficient stock', constants.HTTP_STATUS.UNPROCESSABLE_ENTITY, stock);
        return;
      }

      const priceAtAdd = Number(variant.variant_price ?? variant.base_price ?? 0);
      const inserted = await this.Cart.addOrUpdate(req.user.id, parseInt(variant_id), parseInt(quantity), priceAtAdd);
      this.sendResponse(res, inserted, 'Added to cart', constants.HTTP_STATUS.CREATED);
    });
  }

  // PUT /api/cart/:cart_id { quantity?, variant_id? }
  async updateCartItem(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { cart_id } = req.params;
      const { quantity, variant_id } = req.body || {};

      const payload = {};
      if (quantity !== undefined) {
        this.validateRequest({ quantity: parseInt(quantity) }, { quantity: { required: true, type: 'integer', min: 1, max: 99 } });
        payload.quantity = parseInt(quantity);
      }

      if (variant_id !== undefined) {
        this.validateRequest({ variant_id: parseInt(variant_id) }, { variant_id: { required: true, type: 'integer', min: 1 } });
        // Check new variant and stock against desired quantity (default to 1 if not provided)
        const variant = await this.ShoeVariant.findById(parseInt(variant_id));
        if (!variant || variant.is_active === false) {
          this.sendError(res, 'Variant not found', constants.HTTP_STATUS.NOT_FOUND);
          return;
        }

        const desiredQty = payload.quantity ?? 1;
        const stock = await this.ShoeVariant.checkStock(parseInt(variant_id), desiredQty);
        if (!stock.available) {
          this.sendError(res, 'Insufficient stock', constants.HTTP_STATUS.UNPROCESSABLE_ENTITY, stock);
          return;
        }
        payload.variant_id = parseInt(variant_id);
        payload.price_at_add = Number(variant.variant_price ?? variant.base_price ?? 0);
      }

      const updated = await this.Cart.updateItem(parseInt(cart_id), payload);
      this.sendResponse(res, updated, 'Cart item updated');
    });
  }

  // DELETE /api/cart/:cart_id
  async removeCartItem(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { cart_id } = req.params;
      await this.Cart.removeItem(parseInt(cart_id));
      this.sendResponse(res, {}, 'Cart item removed', constants.HTTP_STATUS.OK);
    });
  }
}

export default CartController;


