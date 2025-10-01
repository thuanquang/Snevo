// 👟 Product Routes - /api/products/*
// Shoe product management routes

import express from 'express';
const router = express.Router();
import ProductController from '../controllers/productController.js';

const productController = new ProductController();

// Product routes
router.get('/', productController.getProducts.bind(productController));
router.get('/search', productController.searchProducts.bind(productController));
router.get('/:id', productController.getProduct.bind(productController));
router.post('/', productController.createProduct.bind(productController));
router.put('/:id', productController.updateProduct.bind(productController));
router.delete('/:id', productController.deleteProduct.bind(productController));

module.exports = router;