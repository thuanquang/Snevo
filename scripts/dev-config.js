#!/usr/bin/env node

/**
 * Development Configuration Generator
 * Injects environment variables directly into frontend/assets/js/config.js for development
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env') });

// Environment variables to inject into frontend
const FRONTEND_ENV_VARS = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project-id.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    API_BASE_URL: process.env.API_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3001',
    APP_NAME: process.env.APP_NAME || 'Snevo',
    APP_VERSION: process.env.APP_VERSION || '1.0.0',
    NODE_ENV: 'development',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || ''
};

async function generateDevConfig() {
    try {
        console.log('🔧 Generating development configuration...');
        
        const configContent = `/**
 * Frontend Configuration - Development with Environment Variables (Injected)
 * Generated from .env for development use by scripts/dev-config.js
 */

// Supabase Configuration
window.SUPABASE_URL = '${FRONTEND_ENV_VARS.SUPABASE_URL}';
window.SUPABASE_ANON_KEY = '${FRONTEND_ENV_VARS.SUPABASE_ANON_KEY}';

// API Configuration
window.API_BASE_URL = '${FRONTEND_ENV_VARS.API_BASE_URL}';

// Google OAuth Configuration
window.GOOGLE_CLIENT_ID = '${FRONTEND_ENV_VARS.GOOGLE_CLIENT_ID}';

// Validate configuration and determine feature availability
const isValidSupabaseUrl = '${FRONTEND_ENV_VARS.SUPABASE_URL}' && !'${FRONTEND_ENV_VARS.SUPABASE_URL}'.includes('your-project-id') && '${FRONTEND_ENV_VARS.SUPABASE_URL}'.startsWith('https://');
const isValidSupabaseKey = '${FRONTEND_ENV_VARS.SUPABASE_ANON_KEY}' && !'${FRONTEND_ENV_VARS.SUPABASE_ANON_KEY}'.includes('your-anon-key') && '${FRONTEND_ENV_VARS.SUPABASE_ANON_KEY}'.length > 50;
const isValidGoogleClientId = '${FRONTEND_ENV_VARS.GOOGLE_CLIENT_ID}' && '${FRONTEND_ENV_VARS.GOOGLE_CLIENT_ID}'.includes('.apps.googleusercontent.com');

// App Configuration with dynamic feature detection
window.APP_CONFIG = {
    name: '${FRONTEND_ENV_VARS.APP_NAME}',
    version: '${FRONTEND_ENV_VARS.APP_VERSION}',
    environment: 'development',
    buildTime: '${new Date().toISOString()}',
    features: {
        googleAuth: isValidGoogleClientId && isValidSupabaseUrl && isValidSupabaseKey,
        emailVerification: isValidSupabaseUrl && isValidSupabaseKey,
        passwordReset: isValidSupabaseUrl && isValidSupabaseKey,
        supabaseAuth: isValidSupabaseUrl && isValidSupabaseKey
    },
    validation: {
        supabaseUrl: isValidSupabaseUrl,
        supabaseKey: isValidSupabaseKey,
        googleClientId: isValidGoogleClientId
    }
};

// Development info
console.log('🔧 Development configuration loaded');
console.log('📊 Supabase URL:', window.SUPABASE_URL);
console.log('🔑 Google Auth:', window.APP_CONFIG.features.googleAuth ? 'enabled' : 'disabled');

// Validation warnings
if (window.SUPABASE_URL.includes('your-project-id')) {
    console.warn('⚠️  Please set SUPABASE_URL in your .env file');
}
if (window.SUPABASE_ANON_KEY === 'your-anon-key') {
    console.warn('⚠️  Please set SUPABASE_ANON_KEY in your .env file');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_URL: window.SUPABASE_URL,
        SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY,
        API_BASE_URL: window.API_BASE_URL,
        APP_CONFIG: window.APP_CONFIG,
        GOOGLE_CLIENT_ID: window.GOOGLE_CLIENT_ID
    };
}
`;

        const configPath = join(rootDir, 'frontend', 'assets', 'js', 'config.js');
        await fs.writeFile(configPath, configContent);

        console.log('✅ Development configuration injected!');
        console.log('📁 File: frontend/assets/js/config.js');
        console.log('');
        console.log('Environment variables loaded:');
        Object.keys(FRONTEND_ENV_VARS).forEach(key => {
            const value = FRONTEND_ENV_VARS[key];
            const displayValue = key.includes('KEY') || key.includes('SECRET') 
                ? (value && value !== 'your-anon-key' ? '***' + value.slice(-4) : 'not set')
                : (value || 'not set');
            console.log(`  ${key}: ${displayValue}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to generate development config:', error.message);
        process.exit(1);
    }
}

generateDevConfig();

