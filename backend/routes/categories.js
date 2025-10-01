// 📂 Category Routes - /api/categories/*
// Shoe category management routes

import express from 'express';
const router = express.Router();
import CategoryController from '../controllers/CategoryController.js';

const categoryController = new CategoryController();

// Category routes
router.get('/', categoryController.getCategories.bind(categoryController));
router.get('/:id', categoryController.getCategory.bind(categoryController));
router.post('/', categoryController.createCategory.bind(categoryController));
router.put('/:id', categoryController.updateCategory.bind(categoryController));
router.delete('/:id', categoryController.deleteCategory.bind(categoryController));

module.exports = router;
