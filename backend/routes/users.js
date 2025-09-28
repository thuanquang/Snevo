// 👤 User Routes - /api/users/*
// User management routes

const express = require('express');
const router = express.Router();

// TODO: Implement user routes
router.get('/', (req, res) => {
    res.status(501).json({ message: 'User routes not implemented yet' });
});

module.exports = router;
