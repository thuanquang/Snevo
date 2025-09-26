/**
 * Order Controller
 * Handles order processing and management using OOP principles
 */

import constants from '../../config/constants.js';
import { orderModel } from '../models/Order.js';
import { userModel } from '../models/User.js';
import BaseController from '../utils/BaseController.js';
import { ValidationError, NotFoundError, AuthorizationError, BusinessLogicError } from '../utils/ErrorClasses.js';

class OrderController extends BaseController {
    constructor() {
        super();
        this.orderModel = orderModel;
    }

    /**
     * Create new order
     */
    async createOrder(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { address_id, items, payment_method, notes } = req.body;

            // Get user details from database
            const userDetails = await userModel.findByEmail(user.email);
            if (!userDetails) {
                throw new NotFoundError('User account');
            }

            // Validate input
            this.validateRequest(req.body, {
                address_id: { required: true, type: 'integer' },
                items: { required: true, type: 'array', minItems: 1 },
                payment_method: { 
                    required: false, 
                    type: 'string', 
                    enum: Object.values(constants.PAYMENT_METHODS) 
                },
                notes: { required: false, type: 'string', maxLength: 1000 }
            });

            // Validate each item in the items array
            for (let i = 0; i < items.length; i++) {
                this.validateRequest(items[i], {
                    variant_id: { required: true, type: 'integer' },
                    quantity: { required: true, type: 'integer', min: 1 }
                }, {
                    'variant_id.required': `Item ${i + 1}: Variant ID is required`,
                    'quantity.required': `Item ${i + 1}: Quantity is required`,
                    'quantity.min': `Item ${i + 1}: Quantity must be at least 1`
                });
            }

            // Verify that the address belongs to the user
            const userAddresses = await userModel.getAddresses(userDetails.user_id);
            const selectedAddress = userAddresses.find(addr => addr.address_id === address_id);
            
            if (!selectedAddress) {
                throw new AuthorizationError('Address does not belong to user');
            }

            const orderData = {
                user_id: userDetails.user_id,
                address_id,
                payment_method: payment_method || constants.PAYMENT_METHODS.CREDIT_CARD,
                notes,
                items
            };

            const order = await this.orderModel.create(orderData);

            this.sendResponse(res, { order }, 'Order created successfully', constants.HTTP_STATUS.CREATED);
        });
    }

    /**
     * Get user orders
     */
    async getUserOrders(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);

            // Get user details from database
            const userDetails = await userModel.findByEmail(user.email);
            if (!userDetails) {
                throw new NotFoundError('User account');
            }

            const pagination = this.getPaginationParams(req, {
                page: 1,
                limit: 20
            });

            const filters = this.getFilterParams(req, ['status', 'payment_status']);

            const result = await this.orderModel.findByUser(userDetails.user_id, pagination, filters);

            this.sendPaginatedResponse(res, result, pagination);
        });
    }

    /**
     * Get order by ID
     */
    async getOrderById(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { id } = req.params;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            const order = await this.orderModel.findById(parseInt(id));

            if (!order) {
                throw new NotFoundError('Order');
            }

            // Check if user owns the order (unless admin)
            const userDetails = await userModel.findByEmail(user.email);
            if (userDetails.role !== 'admin' && order.user_id !== userDetails.user_id) {
                throw new AuthorizationError('Access denied to this order');
            }

            this.sendResponse(res, { order });
        });
    }

    /**
     * Update order status (admin/seller only)
     */
    async updateOrderStatus(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin', 'seller']);
            const { id } = req.params;
            const { status, notes } = req.body;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            this.validateRequest(req.body, {
                status: { 
                    required: true, 
                    type: 'string', 
                    enum: Object.values(constants.ORDER_STATUS) 
                },
                notes: { required: false, type: 'string', maxLength: 1000 }
            });

            const order = await this.orderModel.updateStatus(parseInt(id), status, notes);

            this.sendResponse(res, { order }, 'Order status updated successfully');
        });
    }

    /**
     * Update payment status (admin only)
     */
    async updatePaymentStatus(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin']);
            const { id } = req.params;
            const { payment_status, payment_method } = req.body;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            this.validateRequest(req.body, {
                payment_status: { 
                    required: true, 
                    type: 'string', 
                    enum: Object.values(constants.PAYMENT_STATUS) 
                },
                payment_method: { 
                    required: false, 
                    type: 'string', 
                    enum: Object.values(constants.PAYMENT_METHODS) 
                }
            });

            const order = await this.orderModel.updatePaymentStatus(
                parseInt(id), 
                payment_status, 
                payment_method
            );

            this.sendResponse(res, { order }, 'Payment status updated successfully');
        });
    }

    /**
     * Add tracking number (admin/seller only)
     */
    async addTracking(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin', 'seller']);
            const { id } = req.params;
            const { tracking_number, shipping_method } = req.body;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            this.validateRequest(req.body, {
                tracking_number: { required: true, type: 'string', maxLength: 100 },
                shipping_method: { required: false, type: 'string', maxLength: 100 }
            });

            const order = await this.orderModel.addTracking(
                parseInt(id), 
                tracking_number, 
                shipping_method
            );

            this.sendResponse(res, { order }, 'Tracking information added successfully');
        });
    }

    /**
     * Cancel order
     */
    async cancelOrder(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { id } = req.params;
            const { reason } = req.body;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            // Get order to check ownership
            const order = await this.orderModel.findById(parseInt(id));
            if (!order) {
                throw new NotFoundError('Order');
            }

            // Check if user owns the order (unless admin)
            const userDetails = await userModel.findByEmail(user.email);
            if (userDetails.role !== 'admin' && order.user_id !== userDetails.user_id) {
                throw new AuthorizationError('Access denied to this order');
            }

            const updatedOrder = await this.orderModel.cancelOrder(parseInt(id), reason);

            this.sendResponse(res, { order: updatedOrder }, 'Order cancelled successfully');
        });
    }

    /**
     * Get all orders (admin/seller only)
     */
    async getAllOrders(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin', 'seller']);

            const pagination = this.getPaginationParams(req, {
                page: 1,
                limit: 50
            });

            const filters = this.getFilterParams(req, [
                'status', 'payment_status', 'user_id', 'date_from', 'date_to'
            ]);

            // Convert date filters if provided
            const orderFilters = {};
            if (filters.status) orderFilters.status = filters.status;
            if (filters.payment_status) orderFilters.payment_status = filters.payment_status;

            let query = supabase
                .from(constants.DATABASE_TABLES.ORDERS)
                .select(`
                    *,
                    users:user_id (
                        username,
                        full_name,
                        email
                    ),
                    addresses:address_id (
                        street,
                        city,
                        state,
                        country,
                        zip_code
                    )
                `, { count: 'exact' });

            // Apply filters
            Object.entries(orderFilters).forEach(([key, value]) => {
                if (value) {
                    const dbKey = key === 'status' ? 'order_status' : key;
                    query = query.eq(dbKey, value);
                }
            });

            if (filters.user_id) {
                query = query.eq('user_id', parseInt(filters.user_id));
            }

            if (filters.date_from) {
                query = query.gte('order_date', filters.date_from);
            }

            if (filters.date_to) {
                query = query.lte('order_date', filters.date_to);
            }

            // Apply pagination and ordering
            const offset = (pagination.page - 1) * pagination.limit;
            query = query
                .order('order_date', { ascending: false })
                .range(offset, offset + pagination.limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            const result = {
                orders: data || [],
                total: count || 0,
                page: pagination.page,
                limit: pagination.limit,
                totalPages: Math.ceil((count || 0) / pagination.limit)
            };

            this.sendPaginatedResponse(res, result, pagination);
        });
    }

    /**
     * Get order statistics
     */
    async getOrderStats(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);

            let userId = null;
            let dateRange = null;

            // If not admin, only show user's own stats
            if (user.role !== 'admin') {
                const userDetails = await userModel.findByEmail(user.email);
                userId = userDetails.user_id;
            }

            // Parse date range if provided
            if (req.query.date_from || req.query.date_to) {
                dateRange = {
                    from: req.query.date_from,
                    to: req.query.date_to
                };
            }

            const stats = await this.orderModel.getOrderStats(userId, dateRange);

            this.sendResponse(res, { stats });
        });
    }

    /**
     * Process payment (placeholder for payment integration)
     */
    async processPayment(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireAuth(req);
            const { id } = req.params;
            const { payment_method, payment_token } = req.body;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            this.validateRequest(req.body, {
                payment_method: { 
                    required: true, 
                    type: 'string', 
                    enum: Object.values(constants.PAYMENT_METHODS) 
                },
                payment_token: { required: false, type: 'string' }
            });

            // Get order to check ownership
            const order = await this.orderModel.findById(parseInt(id));
            if (!order) {
                throw new NotFoundError('Order');
            }

            // Check if user owns the order
            const userDetails = await userModel.findByEmail(user.email);
            if (order.user_id !== userDetails.user_id) {
                throw new AuthorizationError('Access denied to this order');
            }

            // Check if payment is already processed
            if (order.payment_status === constants.PAYMENT_STATUS.PAID) {
                throw new BusinessLogicError('Order payment has already been processed');
            }

            // TODO: Integrate with actual payment processor (Stripe, PayPal, etc.)
            // For now, simulate successful payment
            const paymentSuccess = true; // This would come from payment processor

            if (paymentSuccess) {
                const updatedOrder = await this.orderModel.updatePaymentStatus(
                    parseInt(id),
                    constants.PAYMENT_STATUS.PAID,
                    payment_method
                );

                // Also update order status to confirmed
                await this.orderModel.updateStatus(parseInt(id), constants.ORDER_STATUS.CONFIRMED);

                this.sendResponse(res, { order: updatedOrder }, 'Payment processed successfully');
            } else {
                await this.orderModel.updatePaymentStatus(
                    parseInt(id),
                    constants.PAYMENT_STATUS.FAILED,
                    payment_method
                );

                throw new BusinessLogicError('Payment processing failed');
            }
        });
    }

    /**
     * Refund order (admin only)
     */
    async refundOrder(req, res) {
        return this.handleRequest(req, res, async (req, res) => {
            const user = this.requireRole(req, ['admin']);
            const { id } = req.params;
            const { reason, refund_amount } = req.body;

            this.validateRequest({ id }, {
                id: { required: true, type: 'integer' }
            });

            this.validateRequest(req.body, {
                reason: { required: true, type: 'string', maxLength: 500 },
                refund_amount: { required: false, type: 'number', min: 0 }
            });

            const order = await this.orderModel.findById(parseInt(id));
            if (!order) {
                throw new NotFoundError('Order');
            }

            // Check if order can be refunded
            if (order.payment_status !== constants.PAYMENT_STATUS.PAID) {
                throw new BusinessLogicError('Only paid orders can be refunded');
            }

            // TODO: Process actual refund with payment processor
            // For now, just update the order status

            await this.orderModel.updatePaymentStatus(
                parseInt(id),
                constants.PAYMENT_STATUS.REFUNDED
            );

            await this.orderModel.updateStatus(
                parseInt(id),
                constants.ORDER_STATUS.REFUNDED,
                `Refund reason: ${reason}`
            );

            // Restore stock for refunded items
            if (order.order_items) {
                await this.orderModel.restoreStockForOrder(order.order_items);
            }

            const updatedOrder = await this.orderModel.findById(parseInt(id));

            this.sendResponse(res, { order: updatedOrder }, 'Order refunded successfully');
        });
    }
}

// Create a singleton instance for use in routes
const orderController = new OrderController();

export default OrderController;
export { orderController };
