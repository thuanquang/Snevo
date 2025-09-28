// 👨‍💼 Profile Routes - /api/profiles/*
// User profile management routes

const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/ProfileController');

const profileController = new ProfileController();

// Profile routes
router.get('/', profileController.getProfile.bind(profileController));
router.put('/', profileController.updateProfile.bind(profileController));
router.delete('/', profileController.deleteProfile.bind(profileController));

module.exports = router;
