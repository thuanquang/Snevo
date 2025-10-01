// 👤 User Routes - /api/users/*
// User management routes

import express from 'express';
const router = express.Router();

// TODO: Implement user routes
router.get('/', (req, res) => {
    res.status(501).json({ message: 'User routes not implemented yet' });
});

module.exports = router;
