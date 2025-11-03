// 💳 Payment Controller - CRUD payments
// Handles payment processing and management

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';
import { shouldAutoCompletePayment } from '../utils/orderUtils.js';

class PaymentController extends BaseController {
    constructor() {
        super();
        this.Payment = null;
        this.Order = null;
        this.Cart = null;
    }

    setModels(models) {
        this.Payment = models.Payment;
        this.Order = models.Order;
        this.Cart = models.Cart;
    }

    // GET /api/payments?order_id=
    async getPayments(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);
            const { order_id } = req.query;

            if (!order_id) {
                this.sendError(res, 'order_id is required', constants.HTTP_STATUS.BAD_REQUEST);
                return;
            }

            // Verify order belongs to user
            const order = await this.Order.findWithItems(parseInt(order_id));
            if (!order || order.user_id !== req.user.id) {
                this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            const payments = await this.Payment.findByOrderId(parseInt(order_id));
            this.sendResponse(res, payments, 'Payments fetched');
        });
    }

    // GET /api/payments/:id
    async getPayment(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);
            const { id } = req.params;

            const payment = await this.Payment.findById(parseInt(id));
            if (!payment) {
                this.sendError(res, 'Payment not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            // Verify order belongs to user
            const order = await this.Order.findWithItems(payment.order_id);
            if (!order || order.user_id !== req.user.id) {
                this.sendError(res, 'Unauthorized', constants.HTTP_STATUS.FORBIDDEN);
                return;
            }

            this.sendResponse(res, payment, 'Payment fetched');
        });
    }

    // POST /api/payments { order_id, payment_method, payment_amount, payment_details }
    async createPayment(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);
            const { order_id, payment_method, payment_amount, payment_details = {} } = req.body || {};

            console.log('💳 Create payment request:', { order_id, payment_method, payment_amount, has_details: !!payment_details });

            this.validateRequest(
                { order_id: parseInt(order_id), payment_method, payment_amount: Number(payment_amount) },
                {
                    order_id: { required: true, type: 'integer', min: 1 },
                    payment_method: { required: true, type: 'string' },
                    payment_amount: { required: true, type: 'number', min: 0 }
                }
            );

            console.log('✅ Validation passed');

            // Verify order belongs to user
            const order = await this.Order.findWithItems(parseInt(order_id));
            if (!order || order.user_id !== req.user.id) {
                this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            console.log('✅ Order verified, creating payment');

            // Create payment record with mock details
            const payment = await this.Payment.createPayment({
                order_id: parseInt(order_id),
                payment_method,
                payment_amount: Number(payment_amount),
                payment_details  // Pass form data for mock generation
            });

            console.log('✅ Payment created:', payment.payment_id, 'Status:', payment.status);

            this.sendResponse(res, payment, 'Payment created', constants.HTTP_STATUS.CREATED);
        });
    }

    // POST /api/payments/process { payment_id, provider?, payload? }
    async processPayment(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);
            const { payment_id } = req.body || {};

            if (!payment_id) {
                this.sendError(res, 'payment_id is required', constants.HTTP_STATUS.BAD_REQUEST);
                return;
            }

            const payment = await this.Payment.findById(parseInt(payment_id));
            if (!payment) {
                this.sendError(res, 'Payment not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            // Verify order belongs to user
            const order = await this.Order.findWithItems(payment.order_id);
            if (!order || order.user_id !== req.user.id) {
                this.sendError(res, 'Unauthorized', constants.HTTP_STATUS.FORBIDDEN);
                return;
            }

            // ⭐ IDEMPOTENCY: If payment is already completed, return current state
            if (payment.status === constants.PAYMENT_STATUS.COMPLETED) {
                console.log('💳 Payment already completed (idempotent call):', payment_id);
                
                // Fetch with parsed details
                const latestPayment = await this.Payment.findLatestByOrderId(payment.order_id);
                this.sendResponse(res, latestPayment, 'Payment already completed');
                return;
            }

            // ⭐ Deterministic flow based on payment method
            const method = payment.payment_method;
            
            // Card/Stripe should already be completed
            if (shouldAutoCompletePayment(method)) {
                console.log('� Card/Stripe payment - should already be completed');
                const latestPayment = await this.Payment.findLatestByOrderId(payment.order_id);
                this.sendResponse(res, latestPayment, 'Payment processed');
                return;
            }
            
            // Bank transfer stays pending
            if (method === constants.PAYMENT_METHODS.BANK_TRANSFER) {
                console.log('🏦 Bank transfer - awaiting admin confirmation');
                const latestPayment = await this.Payment.findLatestByOrderId(payment.order_id);
                this.sendResponse(res, latestPayment, 'Bank transfer awaiting confirmation');
                return;
            }
            
            // COD should not reach here (handled in order creation)
            if (method === constants.PAYMENT_METHODS.CASH) {
                console.log('💵 COD payment - handled during order creation');
                const latestPayment = await this.Payment.findLatestByOrderId(payment.order_id);
                this.sendResponse(res, latestPayment, 'COD payment will be collected on delivery');
                return;
            }

            // Fallback - mark as completed
            console.log('⚠️ Unknown payment method, marking completed:', method);
            const updatedPayment = await this.Payment.markCompleted(parseInt(payment_id));
            
            // Clear cart after successful payment
            try {
                await this.Cart.clearUserCart(req.user.id);
                console.log('✅ Cart cleared after payment completion');
            } catch (e) {
                console.warn('⚠️ Failed to clear cart:', e?.message);
            }

            this.sendResponse(res, updatedPayment, 'Payment processed');
        });
    }

    // PUT /api/payments/:id/status { status, transaction_id? }
    async updatePaymentStatus(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);
            const { id } = req.params;
            const { status, transaction_id } = req.body || {};

            this.validateRequest({ status }, {
                status: { required: true, type: 'string', enum: Object.values(constants.PAYMENT_STATUS) }
            });

            const payment = await this.Payment.findById(parseInt(id));
            if (!payment) {
                this.sendError(res, 'Payment not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            // Verify order belongs to user
            const order = await this.Order.findWithItems(payment.order_id);
            if (!order || order.user_id !== req.user.id) {
                this.sendError(res, 'Unauthorized', constants.HTTP_STATUS.FORBIDDEN);
                return;
            }

            const updated = await this.Payment.updateStatus(parseInt(id), status, transaction_id || null);
            this.sendResponse(res, updated, 'Payment status updated');
        });
    }

    // POST /api/payments/:id/confirm - Admin confirms bank transfer
    async confirmPayment(req, res) {
        return this.handleRequest(req, res, async () => {
            // Authorization: Only sellers can confirm payments
            const user = this.requireRole(req, ['seller']);
            const { id } = req.params;

            console.log('🏦 Seller confirming payment:', id, 'by', user.email);

            const payment = await this.Payment.findById(parseInt(id));
            if (!payment) {
                this.sendError(res, 'Payment not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            // Only allow confirmation for bank transfer and pending status
            if (payment.payment_method !== constants.PAYMENT_METHODS.BANK_TRANSFER) {
                this.sendError(res, 'Only bank transfer payments can be confirmed', constants.HTTP_STATUS.BAD_REQUEST);
                return;
            }

            if (payment.status === constants.PAYMENT_STATUS.COMPLETED) {
                console.log('⚠️ Payment already confirmed (idempotent)');
                const latest = await this.Payment.findLatestByOrderId(payment.order_id);
                this.sendResponse(res, latest, 'Payment already confirmed');
                return;
            }

            // Mark payment completed with admin verification
            const updatedPayment = await this.Payment.markCompleted(parseInt(id), {
                verified_by: req.user.id
            });

            // ⭐ AUTO-COMPLETE ORDER (payment complete = order delivered)
            await this.Order.setStatus(payment.order_id, 'delivered');

            console.log('✅ Payment confirmed and order completed');

            this.sendResponse(res, updatedPayment, 'Payment confirmed successfully');
        });
    }

    // POST /api/payments/:id/approve - Admin approves COD order (not collected yet)
    async approveCod(req, res) {
        return this.handleRequest(req, res, async () => {
            // Authorization: Only sellers can approve COD
            const user = this.requireRole(req, ['seller']);
            const { id } = req.params;

            console.log('✅ Seller approving COD order:', id, 'by', user.email);

            const payment = await this.Payment.findById(parseInt(id));
            if (!payment) {
                this.sendError(res, 'Payment not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            // Only allow for COD
            if (payment.payment_method !== constants.PAYMENT_METHODS.CASH) {
                this.sendError(res, 'Only COD payments can be approved', constants.HTTP_STATUS.BAD_REQUEST);
                return;
            }

            // Get current order status
            const order = await this.Order.findWithItems(payment.order_id);
            if (!order) {
                this.sendError(res, 'Order not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            if (order.status !== 'pending') {
                console.log('⚠️ Order already approved (idempotent)');
                this.sendResponse(res, payment, 'Order already approved');
                return;
            }

            // Approve order (move to processing - ready for delivery)
            await this.Order.setStatus(payment.order_id, 'processing');

            console.log('✅ COD order approved, ready for delivery');

            this.sendResponse(res, payment, 'COD order approved successfully');
        });
    }

    // POST /api/payments/:id/collect - Mark COD as collected (after delivery)
    async collectCod(req, res) {
        return this.handleRequest(req, res, async () => {
            // Authorization: Only sellers can collect COD
            const user = this.requireRole(req, ['seller']);
            const { id } = req.params;
            const { collected_by } = req.body || {};

            console.log('💵 Marking COD collected:', id, 'by', user.email);

            const payment = await this.Payment.findById(parseInt(id));
            if (!payment) {
                this.sendError(res, 'Payment not found', constants.HTTP_STATUS.NOT_FOUND);
                return;
            }

            // Only allow for COD
            if (payment.payment_method !== constants.PAYMENT_METHODS.CASH) {
                this.sendError(res, 'Only COD payments can be marked collected', constants.HTTP_STATUS.BAD_REQUEST);
                return;
            }

            if (payment.status === constants.PAYMENT_STATUS.COMPLETED) {
                console.log('⚠️ COD already collected (idempotent)');
                const latest = await this.Payment.findLatestByOrderId(payment.order_id);
                this.sendResponse(res, latest, 'COD already collected');
                return;
            }

            // Mark as collected
            const updatedPayment = await this.Payment.markCompleted(parseInt(id), {
                collected: true,
                collected_by: collected_by || req.user.id
            });

            // ⭐ AUTO-COMPLETE ORDER (COD collected = order delivered)
            await this.Order.setStatus(payment.order_id, 'delivered');

            console.log('✅ COD marked as collected and order completed');

            this.sendResponse(res, updatedPayment, 'COD collected successfully');
        });
    }
}

export default PaymentController;
