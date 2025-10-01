// ⭐ Review Routes - /api/reviews/*
// Product review management routes

import express from 'express';
const router = express.Router();

// TODO: Implement review routes
router.get('/', (req, res) => {
    res.status(501).json({ message: 'Review routes not implemented yet' });
});

module.exports = router;
