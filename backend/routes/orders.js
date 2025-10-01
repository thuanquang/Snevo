// 🛒 Order Routes - /api/orders/*
// Order management routes

import express from 'express';
const router = express.Router();
import OrderController from '../controllers/orderController.js';

const orderController = new OrderController();

// Order routes
router.get('/', orderController.getOrders.bind(orderController));
router.get('/:id', orderController.getOrder.bind(orderController));
router.post('/', orderController.createOrder.bind(orderController));
router.put('/:id/status', orderController.updateOrderStatus.bind(orderController));
router.put('/:id/cancel', orderController.cancelOrder.bind(orderController));

module.exports = router;