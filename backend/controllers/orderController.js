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

        // Clear cart
        await this.Cart.clearUserCart(req.user.id);

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