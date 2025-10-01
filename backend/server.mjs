// 🚀 Server Entry Point
// Main server file that starts the application

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: path.join(process.cwd(), '.env')
});

// Import middleware and utilities
import authMiddleware from './middleware/auth.js';
import corsMiddleware from './middleware/cors.js';
import errorMiddleware from './middleware/errors.js';

// Import models
import { initializeModels } from './models/index.js';

// Import routes
import apiRoutes from './routes/index.js';
import authRoutes from './routes/auth.js';
import addressRoutes from './routes/addresses.js';

// Initialize Express app
const app = express();
const port = Number(process.env.PORT) || 3001;

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase configuration missing. Please check environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Initialize models with Supabase client
initializeModels(supabase);

// Middleware setup
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add Supabase client to request object
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

// API routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);

// Serve static files from frontend directory
const frontendRoot = path.join(__dirname, '..', 'frontend');

// Serve static assets
app.use('/assets', express.static(path.join(frontendRoot, 'assets')));

// Serve pages
app.use('/pages', express.static(path.join(frontendRoot, 'pages')));

// Serve root index.html for SPA-like behavior
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendRoot, 'pages', 'index.html'));
});

// Serve other HTML pages
app.get('/:page', (req, res) => {
    const pageName = req.params.page;
    const filePath = path.join(frontendRoot, 'pages', `${pageName}.html`);

    // Check if the specific page exists
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // Fallback to index.html for SPA-like behavior
        res.sendFile(path.join(frontendRoot, 'pages', 'index.html'));
    }
});

// Error handling middleware
app.use(errorMiddleware);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        message: 'Please check the API documentation at /api/docs'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend served from: ${frontendRoot}`);
    console.log(`🔗 API endpoints available at: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

// Export for testing
export default app;