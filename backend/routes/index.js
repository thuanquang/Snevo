// 🏠 Main Router - Collects all routes
// Main router that combines all API routes

const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const profileRoutes = require('./profiles');
const addressRoutes = require('./addresses');
const categoryRoutes = require('./categories');
const productRoutes = require('./products');
const colorRoutes = require('./colors');
const sizeRoutes = require('./sizes');
const variantRoutes = require('./variants');
const importRoutes = require('./imports');
const orderRoutes = require('./orders');
const paymentRoutes = require('./payments');
const reviewRoutes = require('./reviews');
const adminRoutes = require('./admin');

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
