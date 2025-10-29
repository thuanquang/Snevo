// 🛒 Order Controller - CRUD orders
// Handles order management and processing

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

class OrderController extends BaseController {
  constructor() {
    super();
    this.Order = null;
    this.OrderItem = null;
    this.Cart = null;
  }

  setModels(models) {
    this.Order = models.Order;
    this.OrderItem = models.OrderItem;
    this.Cart = models.Cart;
  }

  // GET /api/orders
  async getOrders(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const result = await this.Order.findByUserId(req.user.id);
      this.sendResponse(res, result, 'Orders fetched');
    });
  }

  // GET /api/orders/:id
  async getOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { id } = req.params;
      const order = await this.Order.findWithItems(parseInt(id));
      if (!order || order.user_id !== req.user.id) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }
      this.sendResponse(res, order, 'Order fetched');
    });
  }

  // GET /api/orders/preview - Get cart for checkout review
  async previewOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      
      // Load cart items with variant details
      const items = await this.Cart.listByUser(req.user.id);
      if (!items || items.length === 0) {
        this.sendError(res, 'Cart is empty', constants.HTTP_STATUS.BAD_REQUEST);
        return;
      }

      // Transform items to flatten nested data for frontend
      const transformedItems = items.map(item => ({
        cart_id: item.cart_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price_at_add: item.price_at_add,
        // Flatten variant data
        shoe_name: item.shoe_variants?.shoes?.shoe_name || 'Product',
        shoe_id: item.shoe_variants?.shoes?.shoe_id,
        image_url: item.shoe_variants?.shoes?.image_url,
        color_name: item.shoe_variants?.colors?.color_name || 'N/A',
        color_id: item.shoe_variants?.colors?.color_id,
        size_label: item.shoe_variants?.sizes?.size_value || 'N/A',
        size_id: item.shoe_variants?.sizes?.size_id,
        variant_image: item.shoe_variants?.shoes?.image_url // for checkout display
      }));

      // Get cart summary for totals
      const summary = await this.Cart.summary(req.user.id);
      
      this.sendResponse(res, {
        items: transformedItems,
        subtotal: summary.subtotal,
        shipping_cost: summary.shipping_cost || 0,
        tax_amount: summary.tax_amount || 0,
        total: summary.total_amount
      }, 'Order preview fetched');
    });
  }

  // POST /api/orders { address_id, notes }
  async createOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { address_id, notes } = req.body || {};

      this.validateRequest({ address_id: parseInt(address_id) }, {
        address_id: { required: true, type: 'integer', min: 1 }
      });

      // Load cart & summary
      const items = await this.Cart.listByUser(req.user.id);
      if (!items || items.length === 0) {
        this.sendError(res, 'Cart is empty', constants.HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const summary = await this.Cart.summary(req.user.id);

      // Create order
      const orderRow = await this.Order.createOrder({
        user_id: req.user.id,
        address_id: parseInt(address_id),
        total_amount: summary.total_amount,
        shipping_cost: summary.shipping_cost,
        tax_amount: summary.tax_amount,
        notes: notes || null
      });

      try {
        // Insert order items
        await this.OrderItem.insertItems(orderRow.order_id, items.map(it => ({
          variant_id: it.variant_id,
          quantity: it.quantity,
          price_per_unit: it.price_at_add
        })));

        // CLEAR CART IMMEDIATELY after order creation
        try {
          await this.Cart.clearUserCart(req.user.id);
          console.log('✅ Cart cleared after order creation');
        } catch (e) {
          console.warn('⚠️ Failed to clear cart after order creation:', e?.message || e);
          // Non-blocking: don't fail order creation if cart clear fails
        }

        this.sendResponse(res, { order_id: orderRow.order_id }, 'Order placed', constants.HTTP_STATUS.CREATED);
      } catch (err) {
        // Attempt to cleanup order on failure
        try { await this.Order.deleteById(orderRow.order_id); } catch (_) {}
        throw err;
      }
    });
  }

  // PUT /api/orders/:id/status { status }
  async updateOrderStatus(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { id } = req.params;
      const { status } = req.body || {};
      this.validateRequest({ status }, { status: { required: true, type: 'string', enum: Object.values(constants.ORDER_STATUS) } });
      const updated = await this.Order.updateStatus(parseInt(id), status);
      this.sendResponse(res, updated, 'Order status updated');
    });
  }

  // PUT /api/orders/:id/cancel
  async cancelOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { id } = req.params;
      const updated = await this.Order.updateStatus(parseInt(id), constants.ORDER_STATUS.CANCELLED);
      this.sendResponse(res, updated, 'Order cancelled');
    });
  }
}

export default OrderController;