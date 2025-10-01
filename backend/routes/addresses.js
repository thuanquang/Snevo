// 🏠 Address Routes - /api/addresses/*
// User address management routes

import express from 'express';
const router = express.Router();
import AddressController from '../controllers/AddressController.js';

const addressController = new AddressController();

// Address routes
router.get('/', addressController.getAddresses.bind(addressController));
router.get('/:id', addressController.getAddress.bind(addressController));
router.post('/', addressController.createAddress.bind(addressController));
router.put('/:id', addressController.updateAddress.bind(addressController));
router.delete('/:id', addressController.deleteAddress.bind(addressController));

module.exports = router;
