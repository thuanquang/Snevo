/**
 * Order Model
 * Handles order data operations with Supabase using OOP principles
 */

import { supabase } from '../../config/supabase.js';
import constants from '../../config/constants.js';
import BaseModel from '../utils/BaseModel.js';
import { ValidationError, NotFoundError, BusinessLogicError } from '../utils/ErrorClasses.js';

class Order extends BaseModel {
    constructor() {
        super(constants.DATABASE_TABLES.ORDERS, 'order_id');
        
        this.fillable = [
            'user_id', 'address_id', 'total_amount', 'order_status', 
            'payment_method', 'payment_status', 'shipping_method', 'tracking_number',
            'notes', 'estimated_delivery', 'actual_delivery'
        ];
        
        this.validationRules = {
            user_id: {
                required: true,
                type: 'integer'
            },
            address_id: {
                required: true,
                type: 'integer'
            },
            total_amount: {
                required: true,
                type: 'number',
                min: 0
            },
            order_status: {
                required: false,
                type: 'string',
                enum: Object.values(constants.ORDER_STATUS)
            },
            payment_method: {
                required: false,
                type: 'string',
                enum: Object.values(constants.PAYMENT_METHODS)
            },
            payment_status: {
                required: false,
                type: 'string',
                enum: Object.values(constants.PAYMENT_STATUS)
            },
            shipping_method: {
                required: false,
                type: 'string',
                maxLength: 100
            },
            tracking_number: {
                required: false,
                type: 'string',
                maxLength: 100
            },
            notes: {
                required: false,
                type: 'string',
                maxLength: 1000
            }
        };
    }

    /**
     * Override create to handle order creation with items
     */
    async create(orderData) {
        try {
            // Validate order items if provided
            if (orderData.items && Array.isArray(orderData.items)) {
                this.validateOrderItems(orderData.items);
                
                // Calculate total amount from items
                const calculatedTotal = await this.calculateOrderTotal(orderData.items);
                orderData.total_amount = calculatedTotal;
            }

            // Set default values
            orderData.order_status = orderData.order_status || constants.ORDER_STATUS.PENDING;
            orderData.payment_status = orderData.payment_status || constants.PAYMENT_STATUS.PENDING;
            orderData.order_date = new Date().toISOString();

            // Create the order
            const order = await super.create(orderData);

            // Create order items if provided
            if (orderData.items && Array.isArray(orderData.items)) {
                await this.createOrderItems(order.order_id, orderData.items);
            }

            return await this.findById(order.order_id);
        } catch (error) {
            console.error('Create order error:', error);
            throw error;
        }
    }

    /**
     * Override findById to include relationships
     */
    async findById(orderId) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
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
                    ),
                    order_items:${constants.DATABASE_TABLES.ORDER_ITEMS} (
                        order_item_id,
                        variant_id,
                        quantity,
                        unit_price,
                        total_price,
                        shoe_variants:variant_id (
                            sku,
                            variant_price,
                            shoes:shoe_id (
                                shoe_name,
                                image_url
                            ),
                            colors:color_id (
                                color_name
                            ),
                            sizes:size_id (
                                size_value
                            )
                        )
                    )
                `)
                .eq(this.primaryKey, orderId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Find order by ID error:', error);
            throw new Error(`Failed to fetch order: ${error.message}`);
        }
    }

    /**
     * Find orders by user with pagination
     */
    async findByUser(userId, pagination = {}, filters = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;

            let query = supabase
                .from(this.tableName)
                .select(`
                    *,
                    addresses:address_id (
                        street,
                        city,
                        state,
                        country,
                        zip_code
                    ),
                    order_items:${constants.DATABASE_TABLES.ORDER_ITEMS} (
                        order_item_id,
                        variant_id,
                        quantity,
                        unit_price,
                        total_price,
                        shoe_variants:variant_id (
                            shoes:shoe_id (
                                shoe_name,
                                image_url
                            )
                        )
                    )
                `, { count: 'exact' })
                .eq('user_id', userId);

            // Apply filters
            if (filters.status) {
                query = query.eq('order_status', filters.status);
            }

            if (filters.payment_status) {
                query = query.eq('payment_status', filters.payment_status);
            }

            // Apply ordering and pagination
            query = query
                .order('order_date', { ascending: false })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                orders: data || [],
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
        } catch (error) {
            console.error('Find orders by user error:', error);
            throw new Error(`Failed to fetch user orders: ${error.message}`);
        }
    }

    /**
     * Update order status
     */
    async updateStatus(orderId, status, notes = null) {
        try {
            // Validate status
            if (!Object.values(constants.ORDER_STATUS).includes(status)) {
                throw new ValidationError(`Invalid order status: ${status}`);
            }

            const updates = { 
                order_status: status,
                updated_at: new Date().toISOString()
            };

            if (notes) {
                updates.notes = notes;
            }

            // Set delivery date if status is delivered
            if (status === constants.ORDER_STATUS.DELIVERED) {
                updates.actual_delivery = new Date().toISOString();
            }

            const order = await this.updateById(orderId, updates);
            return order;
        } catch (error) {
            console.error('Update order status error:', error);
            throw error;
        }
    }

    /**
     * Update payment status
     */
    async updatePaymentStatus(orderId, paymentStatus, paymentMethod = null) {
        try {
            // Validate payment status
            if (!Object.values(constants.PAYMENT_STATUS).includes(paymentStatus)) {
                throw new ValidationError(`Invalid payment status: ${paymentStatus}`);
            }

            const updates = { 
                payment_status: paymentStatus,
                updated_at: new Date().toISOString()
            };

            if (paymentMethod) {
                updates.payment_method = paymentMethod;
            }

            const order = await this.updateById(orderId, updates);
            return order;
        } catch (error) {
            console.error('Update payment status error:', error);
            throw error;
        }
    }

    /**
     * Add tracking number to order
     */
    async addTracking(orderId, trackingNumber, shippingMethod = null) {
        try {
            const updates = { 
                tracking_number: trackingNumber,
                order_status: constants.ORDER_STATUS.SHIPPED,
                updated_at: new Date().toISOString()
            };

            if (shippingMethod) {
                updates.shipping_method = shippingMethod;
            }

            const order = await this.updateById(orderId, updates);
            return order;
        } catch (error) {
            console.error('Add tracking error:', error);
            throw error;
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId, reason = null) {
        try {
            // Get order details
            const order = await this.findById(orderId);
            if (!order) {
                throw new NotFoundError('Order');
            }

            // Check if order can be cancelled
            const cancellableStatuses = [
                constants.ORDER_STATUS.PENDING,
                constants.ORDER_STATUS.CONFIRMED,
                constants.ORDER_STATUS.PROCESSING
            ];

            if (!cancellableStatuses.includes(order.order_status)) {
                throw new BusinessLogicError('Order cannot be cancelled in current status');
            }

            // Update order status
            const updates = {
                order_status: constants.ORDER_STATUS.CANCELLED,
                updated_at: new Date().toISOString()
            };

            if (reason) {
                updates.notes = reason;
            }

            // Restore stock for order items
            if (order.order_items) {
                await this.restoreStockForOrder(order.order_items);
            }

            const updatedOrder = await this.updateById(orderId, updates);
            return updatedOrder;
        } catch (error) {
            console.error('Cancel order error:', error);
            throw error;
        }
    }

    /**
     * Get order statistics
     */
    async getOrderStats(userId = null, dateRange = null) {
        try {
            let query = supabase
                .from(this.tableName)
                .select('order_status, total_amount, order_date');

            if (userId) {
                query = query.eq('user_id', userId);
            }

            if (dateRange && dateRange.from && dateRange.to) {
                query = query
                    .gte('order_date', dateRange.from)
                    .lte('order_date', dateRange.to);
            }

            const { data, error } = await query;

            if (error) throw error;

            const orders = data || [];
            const stats = {
                total_orders: orders.length,
                total_revenue: orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0),
                status_breakdown: {}
            };

            // Count orders by status
            Object.values(constants.ORDER_STATUS).forEach(status => {
                stats.status_breakdown[status] = orders.filter(order => order.order_status === status).length;
            });

            return stats;
        } catch (error) {
            console.error('Get order stats error:', error);
            throw new Error(`Failed to get order stats: ${error.message}`);
        }
    }

    /**
     * Validate order items
     */
    validateOrderItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }

        for (const item of items) {
            if (!item.variant_id || !item.quantity) {
                throw new ValidationError('Each order item must have variant_id and quantity');
            }

            if (item.quantity <= 0) {
                throw new ValidationError('Order item quantity must be greater than 0');
            }
        }
    }

    /**
     * Calculate order total from items
     */
    async calculateOrderTotal(items) {
        try {
            let total = 0;

            for (const item of items) {
                // Get variant price
                const { data: variant, error } = await supabase
                    .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                    .select('variant_price')
                    .eq('variant_id', item.variant_id)
                    .single();

                if (error) {
                    throw new Error(`Failed to get variant price for variant ${item.variant_id}`);
                }

                const unitPrice = parseFloat(variant.variant_price);
                total += unitPrice * item.quantity;
            }

            return total;
        } catch (error) {
            console.error('Calculate order total error:', error);
            throw error;
        }
    }

    /**
     * Create order items
     */
    async createOrderItems(orderId, items) {
        try {
            const orderItems = [];

            for (const item of items) {
                // Get variant details and check stock
                const { data: variant, error } = await supabase
                    .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                    .select('variant_price, stock_quantity')
                    .eq('variant_id', item.variant_id)
                    .single();

                if (error) {
                    throw new Error(`Failed to get variant details for variant ${item.variant_id}`);
                }

                // Check stock availability
                if (variant.stock_quantity < item.quantity) {
                    throw new BusinessLogicError(`Insufficient stock for variant ${item.variant_id}. Available: ${variant.stock_quantity}, Requested: ${item.quantity}`);
                }

                const unitPrice = parseFloat(variant.variant_price);
                const totalPrice = unitPrice * item.quantity;

                orderItems.push({
                    order_id: orderId,
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice
                });

                // Update stock
                await supabase
                    .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                    .update({ 
                        stock_quantity: variant.stock_quantity - item.quantity 
                    })
                    .eq('variant_id', item.variant_id);
            }

            // Insert all order items
            const { data, error } = await supabase
                .from(constants.DATABASE_TABLES.ORDER_ITEMS)
                .insert(orderItems)
                .select();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Create order items error:', error);
            throw error;
        }
    }

    /**
     * Restore stock for cancelled order
     */
    async restoreStockForOrder(orderItems) {
        try {
            for (const item of orderItems) {
                // Get current stock
                const { data: variant, error } = await supabase
                    .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                    .select('stock_quantity')
                    .eq('variant_id', item.variant_id)
                    .single();

                if (error) {
                    console.warn(`Failed to get current stock for variant ${item.variant_id}:`, error);
                    continue;
                }

                // Restore stock
                await supabase
                    .from(constants.DATABASE_TABLES.SHOE_VARIANTS)
                    .update({ 
                        stock_quantity: variant.stock_quantity + item.quantity 
                    })
                    .eq('variant_id', item.variant_id);
            }
        } catch (error) {
            console.error('Restore stock error:', error);
            throw error;
        }
    }
}

// Create a singleton instance for static-like access
const orderModel = new Order();

// Export both the class and instance for flexibility
export default Order;
export { orderModel };
