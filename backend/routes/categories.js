// 📂 Category Routes - /api/categories/*
// Shoe category management routes

const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');

const categoryController = new CategoryController();

// Category routes
router.get('/', categoryController.getCategories.bind(categoryController));
router.get('/:id', categoryController.getCategory.bind(categoryController));
router.post('/', categoryController.createCategory.bind(categoryController));
router.put('/:id', categoryController.updateCategory.bind(categoryController));
router.delete('/:id', categoryController.deleteCategory.bind(categoryController));

module.exports = router;
