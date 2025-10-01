// 📏 Size Routes - /api/sizes/*
// Size management routes

import express from 'express';
const router = express.Router();
import SizeController from '../controllers/SizeController.js';

const sizeController = new SizeController();

// Size routes
router.get('/', sizeController.getSizes.bind(sizeController));
router.get('/:id', sizeController.getSize.bind(sizeController));
router.post('/', sizeController.createSize.bind(sizeController));
router.put('/:id', sizeController.updateSize.bind(sizeController));
router.delete('/:id', sizeController.deleteSize.bind(sizeController));

module.exports = router;
