// 🔐 Auth Routes - /api/auth/*
// Authentication and authorization routes

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth');

const authController = new AuthController();

// Authentication routes (public)
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));

// Protected routes (require authentication)
router.post('/logout', authMiddleware.authenticate, authController.logout.bind(authController));
router.get('/profile', authMiddleware.authenticate, authMiddleware.requireAuth, authController.getProfile.bind(authController));
router.put('/profile', authMiddleware.authenticate, authMiddleware.requireAuth, authController.updateProfile.bind(authController));

module.exports = router;