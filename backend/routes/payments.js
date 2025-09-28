// 💳 Payment Routes - /api/payments/*
// Payment management routes

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');

const paymentController = new PaymentController();

// Payment routes
router.get('/', paymentController.getPayments.bind(paymentController));
router.get('/:id', paymentController.getPayment.bind(paymentController));
router.post('/', paymentController.createPayment.bind(paymentController));
router.post('/process', paymentController.processPayment.bind(paymentController));
router.put('/:id/status', paymentController.updatePaymentStatus.bind(paymentController));

module.exports = router;
