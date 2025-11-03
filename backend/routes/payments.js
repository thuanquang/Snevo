// 💳 Payment Routes - /api/payments/*
// Payment management routes

import authMiddleware from '../middleware/auth.js';

/**
 * Handle payment routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} paymentController - Payment controller instance
 * @param {String} pathname - Request pathname
 * @param {Function} sendError - Error sender function
 */
export default async function handlePaymentRoutes(req, res, paymentController, pathname, sendError) {
    const paymentPath = pathname.replace('/api/payments', '');

    // Check authentication for protected routes
    const authResult = await authMiddleware.authenticate(req, res);
    if (!authResult || !authResult.success) {
        return;
    }
    req.user = authResult.user;

    try {
        if (paymentPath === '/' || paymentPath === '') {
            if (req.method === 'GET') {
                await paymentController.getPayments(req, res);
            } else if (req.method === 'POST') {
                await paymentController.createPayment(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (paymentPath === '/process' && req.method === 'POST') {
            await paymentController.processPayment(req, res);
        } else if (paymentPath.match(/^\/\d+$/)) {
            const id = paymentPath.substring(1);
            req.params = { id };
            
            if (req.method === 'GET') {
                await paymentController.getPayment(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (paymentPath.match(/^\/\d+\/status$/)) {
            const id = paymentPath.replace('/status', '').substring(1);
            req.params = { id };
            
            if (req.method === 'PUT') {
                await paymentController.updatePaymentStatus(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (paymentPath.match(/^\/\d+\/confirm$/)) {
            const id = paymentPath.replace('/confirm', '').substring(1);
            req.params = { id };
            
            if (req.method === 'POST') {
                await paymentController.confirmPayment(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else if (paymentPath.match(/^\/\d+\/collect$/)) {
            const id = paymentPath.replace('/collect', '').substring(1);
            req.params = { id };
            
            if (req.method === 'POST') {
                await paymentController.collectCod(req, res);
            } else {
                sendError(res, 'Method not allowed', 405);
            }
        } else {
            sendError(res, 'Payment endpoint not found', 404);
        }
    } catch (error) {
        console.error('Payment route error:', error);
        sendError(res, 'Internal server error', 500);
    }
}

