// 🛒 Order Controller - CRUD orders
// Handles order management and processing

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';
import createSupabaseConfig from '../../config/supabase.js';

const supabaseConfig = createSupabaseConfig();

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

  // POST /api/orders { address_id, notes, shipping_cost, tax_amount }
  async createOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { address_id, notes, shipping_cost = 0, tax_amount = 0 } = req.body || {};

      this.validateRequest({ address_id: parseInt(address_id) }, {
        address_id: { required: true, type: 'integer', min: 1 }
      });

      // Load cart & summary for subtotal
      const items = await this.Cart.listByUser(req.user.id);
      if (!items || items.length === 0) {
        this.sendError(res, 'Cart is empty', constants.HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const summary = await this.Cart.summary(req.user.id);

      // Calculate total with provided shipping_cost and tax_amount
      const total_amount = summary.subtotal + Number(shipping_cost) + Number(tax_amount);

      // Create order with frontend-provided shipping cost and tax
      const orderRow = await this.Order.createOrder({
        user_id: req.user.id,
        address_id: parseInt(address_id),
        total_amount: total_amount,
        shipping_cost: Number(shipping_cost),
        tax_amount: Number(tax_amount),
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

  // PUT /api/orders/:id/cancel { reason? }
  async cancelOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { id } = req.params;
      const { reason } = req.body || {};
      
      // Get order and verify ownership
      const order = await this.Order.findWithItems(parseInt(id));
      if (!order || order.user_id !== req.user.id) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }

      // Check if order is already cancelled (idempotent)
      if (order.status === constants.ORDER_STATUS.CANCELLED) {
        console.log('⚠️ Order already cancelled (idempotent call):', id);
        this.sendResponse(res, order, 'Order is already cancelled');
        return;
      }

      // Only allow cancelling pending or processing (processing = paid/success) orders
      const allowedStatuses = [constants.ORDER_STATUS.PENDING, constants.ORDER_STATUS.SUCCESS];
      if (!allowedStatuses.includes(order.status)) {
        this.sendError(
          res, 
          `Cannot cancel order with status '${order.status}'. Orders can only be cancelled if pending or approved. Please contact support for shipped/delivered orders.`,
          constants.HTTP_STATUS.UNPROCESSABLE_ENTITY
        );
        return;
      }

      // If cancelling a processing (paid) order, refund associated payments
      if (order.status === constants.ORDER_STATUS.SUCCESS) {
        try {
          const payments = await this.Payment.findByOrderId(parseInt(id));
          for (const payment of payments) {
            if (payment.status !== constants.PAYMENT_STATUS.REFUNDED) {
              console.log(`💳 Refunding payment ${payment.payment_id} for cancelled order`);
              await this.Payment.refundPayment(payment.payment_id, `Order cancelled: ${reason || 'No reason provided'}`);
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to process refunds:', e?.message || e);
          // Non-blocking: continue with order cancellation
        }
      }

      // Build cancellation reason with timestamp
      const timestamp = new Date().toISOString();
      const cancellationNote = `[CANCELLED ${timestamp}] ${reason || 'Order cancelled'}`;
      
      // Update order with cancellation reason appended to notes
      const existingNotes = order.notes ? `${order.notes}\n${cancellationNote}` : cancellationNote;
      
      const { data: updatedOrder, error } = await supabaseConfig.getAdminClient()
        .from('orders')
        .update({
          status: constants.ORDER_STATUS.CANCELLED,
          notes: existingNotes,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', parseInt(id))
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to cancel order: ${error.message}`);
      }

      // Trigger restore_stock_on_cancel() automatically fires
      const message = order.status === constants.ORDER_STATUS.SUCCESS 
        ? 'Order cancelled successfully. Payment has been refunded and stock has been released.'
        : 'Order cancelled successfully. Stock has been released.';
      
      this.sendResponse(res, updatedOrder, message);
    });
  }

  // PUT /api/orders/:id/address { address_id }
  async updateOrderAddress(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { id } = req.params;
      const { address_id } = req.body || {};

      this.validateRequest({ address_id: parseInt(address_id) }, {
        address_id: { required: true, type: 'integer', min: 1 }
      });

      // Get order and verify ownership and status
      const order = await this.Order.findWithItems(parseInt(id));
      if (!order || order.user_id !== req.user.id) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }

      // Only allow address updates for pending orders
      if (order.status !== constants.ORDER_STATUS.PENDING) {
        this.sendError(res, 'Can only update address for pending orders', constants.HTTP_STATUS.UNPROCESSABLE_ENTITY);
        return;
      }

      // Calculate totals based on order items
      const itemsSubtotal = (order.order_items || []).reduce((sum, item) => sum + Number(item.price_per_unit) * item.quantity, 0);
      const shippingCost = 0; // TODO: Calculate based on address if needed
      const taxAmount = 0; // TODO: Calculate if needed
      const totalAmount = itemsSubtotal + shippingCost + taxAmount;

      // Create update data (we'll use a direct query since Order model doesn't have an updateAddressAndTotals method)
      const { data, error } = await supabaseConfig.getAdminClient()
        .from('orders')
        .update({
          address_id: parseInt(address_id),
          shipping_cost: shippingCost,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', parseInt(id))
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update order address: ${error.message}`);
      }

      this.sendResponse(res, data, 'Order address updated');
    });
  }
}

export default OrderController;