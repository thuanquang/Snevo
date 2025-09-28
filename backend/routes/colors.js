// 🎨 Color Routes - /api/colors/*
// Color management routes

const express = require('express');
const router = express.Router();
const ColorController = require('../controllers/ColorController');

const colorController = new ColorController();

// Color routes
router.get('/', colorController.getColors.bind(colorController));
router.get('/:id', colorController.getColor.bind(colorController));
router.post('/', colorController.createColor.bind(colorController));
router.put('/:id', colorController.updateColor.bind(colorController));
router.delete('/:id', colorController.deleteColor.bind(colorController));

module.exports = router;
