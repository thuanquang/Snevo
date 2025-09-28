// 📏 Size Routes - /api/sizes/*
// Size management routes

const express = require('express');
const router = express.Router();
const SizeController = require('../controllers/SizeController');

const sizeController = new SizeController();

// Size routes
router.get('/', sizeController.getSizes.bind(sizeController));
router.get('/:id', sizeController.getSize.bind(sizeController));
router.post('/', sizeController.createSize.bind(sizeController));
router.put('/:id', sizeController.updateSize.bind(sizeController));
router.delete('/:id', sizeController.deleteSize.bind(sizeController));

module.exports = router;
