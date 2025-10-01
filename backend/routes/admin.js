// 👑 Admin Routes - /api/admin/*
// Admin dashboard and management routes

import express from 'express';
const router = express.Router();
import AdminController from '../controllers/AdminController.js';

const adminController = new AdminController();

// Admin routes
router.get('/dashboard', adminController.getDashboard.bind(adminController));
router.get('/statistics', adminController.getStatistics.bind(adminController));
router.get('/users', adminController.getUserManagement.bind(adminController));
router.get('/inventory', adminController.getInventoryManagement.bind(adminController));
router.get('/orders', adminController.getOrderManagement.bind(adminController));

module.exports = router;
