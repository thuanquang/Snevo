// 💳 Payment Controller - CRUD payments
// Handles payment processing and management

import BaseController from '../utils/BaseController.js';
import constants from '../../config/constants.js';

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

    // POST /api/payments { order_id, payment_method, payment_amount }
    async createPayment(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);
            const { order_id, payment_method, payment_amount } = req.body || {};

            console.log('💳 Create payment request:', { order_id, payment_method, payment_amount });
            console.log('💳 Parsed values:', { 
                order_id: parseInt(order_id), 
                payment_method, 
                payment_amount: Number(payment_amount) 
            });

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

            // Create payment record
            const payment = await this.Payment.createPayment({
                order_id: parseInt(order_id),
                payment_method,
                payment_amount: Number(payment_amount),
                status: constants.PAYMENT_STATUS.PENDING
            });

            console.log('✅ Payment created:', payment);

            this.sendResponse(res, payment, 'Payment created', constants.HTTP_STATUS.CREATED);
        });
    }

    // POST /api/payments/process { payment_id, provider?, payload? }
    async processPayment(req, res) {
        return this.handleRequest(req, res, async () => {
            this.requireAuth(req);
            const { payment_id, provider, payload } = req.body || {};

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
                this.sendResponse(res, payment, 'Payment already completed');
                return;
            }

            // ⭐ If payment failed, allow retry
            if (payment.status === constants.PAYMENT_STATUS.FAILED) {
                console.log('🔄 Retrying failed payment:', payment_id);
            }

            // Mock payment processing
            // In real implementation, integrate with payment gateway (VNPAY, Stripe, etc)
            const mockSuccess = Math.random() > 0.1; // 90% success rate for mock
            const newStatus = mockSuccess ? constants.PAYMENT_STATUS.COMPLETED : constants.PAYMENT_STATUS.FAILED;
            const transactionId = mockSuccess ? `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;

            console.log('💳 Processing payment:', { payment_id, newStatus, transactionId });
            const updatedPayment = await this.Payment.updateStatus(parseInt(payment_id), newStatus, transactionId);

            if (mockSuccess) {
                // Clear user's cart after successful payment (order remains pending for admin approval)
                try {
                    await this.Cart.clearUserCart(req.user.id);
                    console.log('✅ Cart cleared after successful payment');
                } catch (e) {
                    console.warn('⚠️ Failed to clear cart after payment success:', e?.message || e);
                    // Non-blocking: don't fail payment if cart clear fails
                }
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
}

export default PaymentController;
