// 🛒 Order Controller - CRUD orders
// Handles order management and processing

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';
import createSupabaseConfig from '../../config/supabase.js';
import { 
    validateOrderTransition, 
    shouldAutoApproveOrder,
    shouldAutoCompletePayment
} from '../utils/orderUtils.js';

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
    this.Payment = models.Payment;
  }

  // GET /api/orders
  async getOrders(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { status, page = 1, limit = 10 } = req.query || {};
      const result = await this.Order.findByUserId(req.user.id, status || null, page, limit);
      
      // Enrich each order with payment data
      for (const order of result.orders) {
        const payment = await this.Payment.findLatestByOrderId(order.order_id);
        order.payment = payment || null;
      }
      
      this.sendResponse(res, result, 'Orders fetched');
    });
  }

  // GET /api/admin/orders - Get ALL orders (admin only)
  async getAdminOrders(req, res) {
    return this.handleRequest(req, res, async () => {
      // Authorization: Only sellers can view all orders
      const user = this.requireRole(req, ['seller']);
      console.log('🔐 Seller user:', user.id, user.role);
      
      // Extract pagination parameters with default limit of 10
      const pagination = this.getPaginationParams(req, {
        page: 1,
        limit: 10,
        sort: 'created_at',
        order: 'desc'
      });
      
      const { status, search = '' } = req.query || {};
      console.log('📊 getAdminOrders params:', { status, search, pagination });
      
      const result = await this.Order.getAllOrders(status || null, pagination.page, pagination.limit, search);
      
      // Enrich each order with payment data
      for (const order of result.orders) {
        const payment = await this.Payment.findLatestByOrderId(order.order_id);
        order.payment = payment || null;
      }
      
      console.log('📊 getAdminOrders result:', { 
        ordersCount: result.orders.length,
        total: result.total,
        pages: result.pages
      });
      
      // Use sendPaginatedResponse for consistent format
      this.sendPaginatedResponse(res, result, pagination, 'Admin orders fetched');
    });
  }

  // GET /api/orders/:id
  async getOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { id } = req.params;
      // Use findWithItems which already includes payment data
      const order = await this.Order.findWithItems(parseInt(id));
      if (!order || order.user_id !== req.user.id) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }
      this.sendResponse(res, order, 'Order fetched');
    });
  }

  // GET /api/admin/orders/:id - Admin can view any order
  async getAdminOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      // Authorization: Only sellers can view any order
      const user = this.requireRole(req, ['seller']);
      const { id } = req.params;
      
      // Use findWithItems - no ownership check for sellers
      const order = await this.Order.findWithItems(parseInt(id));
      if (!order) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }
      
      console.log('🔐 Seller viewing order:', id, 'by', user.email);
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

  // POST /api/orders { address_id, notes, shipping_cost, tax_amount, payment_method, payment_details }
  async createOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { 
        address_id, 
        notes, 
        shipping_cost = 0, 
        tax_amount = 0,
        payment_method,
        payment_details = {}
      } = req.body || {};

      this.validateRequest({ 
        address_id: parseInt(address_id),
        payment_method: payment_method
      }, {
        address_id: { required: true, type: 'integer', min: 1 },
        payment_method: { required: true, type: 'string' }
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
        // Insert order items (triggers stock deduction)
        await this.OrderItem.insertItems(orderRow.order_id, items.map(it => ({
          variant_id: it.variant_id,
          quantity: it.quantity,
          price_per_unit: it.price_at_add
        })));

        // Create payment record
        const payment = await this.Payment.createPayment({
          order_id: orderRow.order_id,
          payment_method: payment_method,
          payment_amount: total_amount,
          payment_details: payment_details
        });

        console.log('💳 Payment created:', payment.payment_id, 'Status:', payment.status);

        // ⭐ Auto-complete order for card/Stripe (payment = delivered instantly)
        if (shouldAutoCompletePayment(payment.payment_method)) {
          await this.Order.setStatus(orderRow.order_id, 'delivered');
          orderRow.status = 'delivered';
          console.log('✅ Order auto-completed for', payment.payment_method);
        }
        // COD orders stay pending until admin confirms
        // Bank transfer orders stay pending until admin confirms

        // Clear cart after successful order creation
        try {
          await this.Cart.clearUserCart(req.user.id);
          console.log('✅ Cart cleared after order creation');
        } catch (e) {
          console.warn('⚠️ Failed to clear cart after order creation:', e?.message || e);
        }

        this.sendResponse(res, { 
          order_id: orderRow.order_id,
          order_status: orderRow.status,
          payment: payment
        }, 'Order placed', constants.HTTP_STATUS.CREATED);
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
      
      this.validateRequest({ status }, { 
        status: { required: true, type: 'string', enum: Object.values(constants.ORDER_STATUS) } 
      });
      
      // Get order with payment
      const order = await this.Order.getWithPayment(parseInt(id));
      if (!order) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }
      
      // Validate transition
      const validation = validateOrderTransition(order, status, order.payment);
      if (!validation.valid) {
        this.sendError(res, validation.reason, constants.HTTP_STATUS.UNPROCESSABLE_ENTITY);
        return;
      }
      
      const updated = await this.Order.updateStatus(parseInt(id), status);
      this.sendResponse(res, updated, 'Order status updated');
    });
  }

  // PUT /api/admin/orders/:id/status - Seller can update any order status
  async updateAdminOrderStatus(req, res) {
    return this.handleRequest(req, res, async () => {
      // Authorization: Only sellers can update order status
      const user = this.requireRole(req, ['seller']);
      const { id } = req.params;
      const { status } = req.body || {};
      
      this.validateRequest({ status }, { 
        status: { required: true, type: 'string', enum: Object.values(constants.ORDER_STATUS) } 
      });
      
      // Get order with payment - no ownership check
      const order = await this.Order.getWithPayment(parseInt(id));
      if (!order) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }
      
      // Sellers have broader transition permissions
      const validation = validateOrderTransition(order, status, order.payment);
      if (!validation.valid) {
        this.sendError(res, validation.reason, constants.HTTP_STATUS.UNPROCESSABLE_ENTITY);
        return;
      }
      
      const updated = await this.Order.updateStatus(parseInt(id), status);
      console.log('🔐 Seller updated order status:', id, 'to', status, 'by', user.email);
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

      // USER CAN ONLY CANCEL PENDING ORDERS
      // For regular users, only pending orders can be cancelled freely
      // Processing/success orders require admin intervention
      if (order.status !== constants.ORDER_STATUS.PENDING) {
        this.sendError(
          res, 
          `Cannot cancel order with status '${order.status}'. Only pending orders can be cancelled. Please contact support for approved/shipped orders.`,
          constants.HTTP_STATUS.UNPROCESSABLE_ENTITY
        );
        return;
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

      // ⭐ Cancel payment if exists (mark as 'failed' for cancelled orders)
      try {
        const payment = await this.Payment.findLatestByOrderId(parseInt(id));
        if (payment && payment.status === constants.PAYMENT_STATUS.PENDING) {
          console.log('💳 Marking payment as failed for cancelled order:', payment.payment_id);
          await supabaseConfig.getAdminClient()
            .from('payments')
            .update({
              status: constants.PAYMENT_STATUS.FAILED,
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', payment.payment_id);
          console.log('✅ Payment marked as failed');
        }
      } catch (e) {
        console.warn('⚠️ Failed to update payment status:', e?.message);
        // Don't fail the order cancellation if payment update fails
      }

      // Trigger restore_stock_on_cancel() automatically fires via DB
      this.sendResponse(res, updatedOrder, 'Order cancelled successfully. Stock has been released.');
    });
  }

  // PUT /api/admin/orders/:id/cancel - Seller can cancel any order at any status
  async cancelAdminOrder(req, res) {
    return this.handleRequest(req, res, async () => {
      // Authorization: Only sellers can cancel any order
      const user = this.requireRole(req, ['seller']);
      const { id } = req.params;
      const { reason } = req.body || {};
      
      // Get order - no ownership check
      const order = await this.Order.findWithItems(parseInt(id));
      if (!order) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }

      // Check if order is already cancelled (idempotent)
      if (order.status === constants.ORDER_STATUS.CANCELLED) {
        console.log('⚠️ Order already cancelled (idempotent call):', id);
        this.sendResponse(res, order, 'Order is already cancelled');
        return;
      }

      // SELLER CAN CANCEL ORDERS AT ANY STATUS (except delivered/refunded)
      // Don't allow cancelling completed deliveries
      if (order.status === constants.ORDER_STATUS.DELIVERED || order.status === 'refunded') {
        this.sendError(
          res, 
          `Cannot cancel order with status '${order.status}'. Order has been completed.`,
          constants.HTTP_STATUS.UNPROCESSABLE_ENTITY
        );
        return;
      }

      // Build cancellation reason with timestamp
      const timestamp = new Date().toISOString();
      const cancellationNote = `[SELLER CANCELLED ${timestamp}] ${reason || 'Seller cancellation'} (by ${user.email})`;
      
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

      // ⭐ Handle payment adjustments based on payment status
      try {
        const payment = await this.Payment.findLatestByOrderId(parseInt(id));
        if (payment) {
          console.log('💳 Processing payment for cancelled order:', payment.payment_id, 'Status:', payment.status);
          
          // If payment was completed, mark as refunded
          if (payment.status === constants.PAYMENT_STATUS.COMPLETED) {
            console.log('💸 Marking completed payment as refunded');
            await supabaseConfig.getAdminClient()
              .from('payments')
              .update({
                status: constants.PAYMENT_STATUS.REFUNDED,
                updated_at: new Date().toISOString()
              })
              .eq('payment_id', payment.payment_id);
            console.log('✅ Payment marked as refunded');
          } 
          // If payment was pending, mark as failed
          else if (payment.status === constants.PAYMENT_STATUS.PENDING) {
            console.log('❌ Marking pending payment as failed');
            await supabaseConfig.getAdminClient()
              .from('payments')
              .update({
                status: constants.PAYMENT_STATUS.FAILED,
                updated_at: new Date().toISOString()
              })
              .eq('payment_id', payment.payment_id);
            console.log('✅ Payment marked as failed');
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to update payment status:', e?.message);
        // Don't fail the order cancellation if payment update fails
      }

      // Trigger restore_stock_on_cancel() automatically fires via DB
      console.log('🔐 Seller cancelled order:', id, 'by', user.email);
      this.sendResponse(res, updatedOrder, 'Order cancelled successfully by seller. Stock has been released and payment adjusted.');
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

  // POST /api/orders/:id/reorder - Copy order items back to cart
  async reorderItems(req, res) {
    return this.handleRequest(req, res, async () => {
      this.requireAuth(req);
      const { id } = req.params;
      
      // Get order and verify ownership
      const order = await this.Order.findWithItems(parseInt(id));
      if (!order || order.user_id !== req.user.id) {
        this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
        return;
      }
      
      // Get order items
      if (!order.order_items || order.order_items.length === 0) {
        this.sendError(res, 'No items in this order', constants.HTTP_STATUS.BAD_REQUEST);
        return;
      }
      
      // Add items to cart
      let itemsAdded = 0;
      try {
        for (const orderItem of order.order_items) {
          // Check if item already in cart
          const existingCart = await this.Cart.findByUserAndVariant(req.user.id, orderItem.variant_id);
          
          if (existingCart) {
            // Update quantity
            await supabaseConfig.getAdminClient()
              .from('carts')
              .update({ quantity: existingCart.quantity + orderItem.quantity, updated_at: new Date().toISOString() })
              .eq('cart_id', existingCart.cart_id);
          } else {
            // Insert new item
            await supabaseConfig.getAdminClient()
              .from('carts')
              .insert([{
                user_id: req.user.id,
                variant_id: orderItem.variant_id,
                quantity: orderItem.quantity,
                price_at_add: orderItem.price_per_unit
              }]);
          }
          itemsAdded++;
        }
        
        this.sendResponse(res, { items_added: itemsAdded }, 'Items added to cart', constants.HTTP_STATUS.CREATED);
      } catch (err) {
        throw new Error(`Failed to add items to cart: ${err.message}`);
      }
    });
  }
}

export default OrderController;