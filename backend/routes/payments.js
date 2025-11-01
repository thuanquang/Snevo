// 💳 Payment Routes - /api/payments/*
// Payment management routes

import express from 'express';
const router = express.Router();
import PaymentController from '../controllers/PaymentController.js';

const paymentController = new PaymentController();

// Payment routes
router.get('/', paymentController.getPayments.bind(paymentController));
router.get('/:id', paymentController.getPayment.bind(paymentController));
router.post('/', paymentController.createPayment.bind(paymentController));
router.post('/process', paymentController.processPayment.bind(paymentController));
router.put('/:id/status', paymentController.updatePaymentStatus.bind(paymentController));

// Admin routes
router.post('/:id/confirm', paymentController.confirmPayment.bind(paymentController));
router.post('/:id/collect', paymentController.collectCod.bind(paymentController));

export default router;
