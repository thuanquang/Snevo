// 📥 Import Routes - /api/imports/*
// Inventory import management routes

const express = require('express');
const router = express.Router();
const ImportController = require('../controllers/ImportController');

const importController = new ImportController();

// Import routes
router.get('/', importController.getImports.bind(importController));
router.get('/:id', importController.getImport.bind(importController));
router.post('/', importController.createImport.bind(importController));
router.put('/:id', importController.updateImport.bind(importController));
router.delete('/:id', importController.deleteImport.bind(importController));

module.exports = router;
