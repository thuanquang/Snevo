// 🏠 Main Router - Collects all routes
// Main router that combines all API routes

import express from 'express';
const router = express.Router();

// Import all route modules
import authRoutes from './auth.js';
import userRoutes from './users.js';
import profileRoutes from './profiles.js';
import addressRoutes from './addresses.js';
import categoryRoutes from './categories.js';
import productRoutes from './products.js';
import colorRoutes from './colors.js';
import sizeRoutes from './sizes.js';
import variantRoutes from './variants.js';
import importRoutes from './imports.js';
import orderRoutes from './orders.js';
import paymentRoutes from './payments.js';
import reviewRoutes from './reviews.js';
import adminRoutes from './admin.js';

// Mount all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);
router.use('/addresses', addressRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/colors', colorRoutes);
router.use('/sizes', sizeRoutes);
router.use('/variants', variantRoutes);
router.use('/imports', importRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
