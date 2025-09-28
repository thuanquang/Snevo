// 🛒 Order Routes - /api/orders/*
// Order management routes

const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');

const orderController = new OrderController();

// Order routes
router.get('/', orderController.getOrders.bind(orderController));
router.get('/:id', orderController.getOrder.bind(orderController));
router.post('/', orderController.createOrder.bind(orderController));
router.put('/:id/status', orderController.updateOrderStatus.bind(orderController));
router.put('/:id/cancel', orderController.cancelOrder.bind(orderController));

module.exports = router;