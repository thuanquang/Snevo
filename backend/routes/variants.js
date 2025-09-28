// ⭐ Variant Routes - /api/variants/*
// Shoe variant management routes

const express = require('express');
const router = express.Router();
const VariantController = require('../controllers/VariantController');

const variantController = new VariantController();

// Variant routes
router.get('/', variantController.getVariants.bind(variantController));
router.get('/:id', variantController.getVariant.bind(variantController));
router.post('/', variantController.createVariant.bind(variantController));
router.put('/:id', variantController.updateVariant.bind(variantController));
router.put('/:id/stock', variantController.updateStock.bind(variantController));
router.delete('/:id', variantController.deleteVariant.bind(variantController));

module.exports = router;
