// 👨‍💼 Profile Routes - /api/profiles/*
// User profile management routes

import express from 'express';
const router = express.Router();
import ProfileController from '../controllers/ProfileController.js';

const profileController = new ProfileController();

// Profile routes
router.get('/', profileController.getProfile.bind(profileController));
router.put('/', profileController.updateProfile.bind(profileController));
router.delete('/', profileController.deleteProfile.bind(profileController));

module.exports = router;
