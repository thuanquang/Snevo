#!/usr/bin/env node

/**
 * Frontend Build Script
 * Injects environment variables into frontend files and creates production build
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env') });

// Environment variables to inject into frontend
const FRONTEND_ENV_VARS = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    API_BASE_URL: process.env.API_BASE_URL || process.env.FRONTEND_URL || '',
    APP_NAME: process.env.APP_NAME || 'Snevo',
    APP_VERSION: process.env.APP_VERSION || '1.0.0',
    NODE_ENV: process.env.NODE_ENV || 'production',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || ''
};

console.log('🎨 Building frontend with environment variables...\n');

async function buildFrontend() {
    try {
        const frontendSrc = join(rootDir, 'frontend');
        const buildDir = join(rootDir, 'build');
        const frontendDest = join(buildDir, 'frontend');
        
        // Ensure build directory exists
        await fs.ensureDir(frontendDest);
        
        console.log('📁 Copying frontend files...');
        
        // Copy all frontend files
        await fs.copy(frontendSrc, frontendDest, {
            filter: (src) => {
                // Skip the original config.js as we'll generate a new one
                return !src.endsWith('config.js') || !src.includes('assets/js');
            }
        });
        
        console.log('⚙️  Generating configuration with environment variables...');
        
        // Generate config.js with injected environment variables
        const configContent = generateConfigFile(FRONTEND_ENV_VARS);
        const configPath = join(frontendDest, 'assets', 'js', 'config.js');
        await fs.writeFile(configPath, configContent);
        
        console.log('🔧 Processing HTML files for production...');
        
        // Process HTML files to update paths if needed
        const htmlFiles = await glob('**/*.html', { cwd: frontendDest });
        
        for (const htmlFile of htmlFiles) {
            const htmlPath = join(frontendDest, htmlFile);
            let content = await fs.readFile(htmlPath, 'utf8');
            
            // Add cache-busting for production
            const timestamp = Date.now();
            content = content.replace(
                /src="([^"]*\.js)"/g,
                `src="$1?v=${timestamp}"`
            );
            content = content.replace(
                /href="([^"]*\.css)"/g,
                `href="$1?v=${timestamp}"`
            );
            
            await fs.writeFile(htmlPath, content);
        }
        
        console.log('✅ Frontend build completed successfully!\n');
        console.log('Environment variables injected:');
        Object.keys(FRONTEND_ENV_VARS).forEach(key => {
            const value = FRONTEND_ENV_VARS[key];
            const displayValue = key.includes('KEY') || key.includes('SECRET') 
                ? (value ? '***' + value.slice(-4) : 'not set')
                : (value || 'not set');
            console.log(`  ${key}: ${displayValue}`);
        });
        
    } catch (error) {
        console.error('❌ Frontend build failed:', error.message);
        process.exit(1);
    }
}

/**
 * Generate config.js file with environment variables
 */
function generateConfigFile(envVars) {
    return `/**
 * Frontend Configuration
 * Generated automatically during build process
 * Contains environment-specific settings
 */

// Supabase Configuration
window.SUPABASE_URL = '${envVars.SUPABASE_URL}';
window.SUPABASE_ANON_KEY = '${envVars.SUPABASE_ANON_KEY}';

// API Configuration
window.API_BASE_URL = '${envVars.API_BASE_URL}';

// App Configuration
window.APP_CONFIG = {
    name: '${envVars.APP_NAME}',
    version: '${envVars.APP_VERSION}',
    environment: '${envVars.NODE_ENV}',
    buildTime: '${new Date().toISOString()}',
    features: {
        googleAuth: ${!!envVars.GOOGLE_CLIENT_ID},
        emailVerification: true,
        passwordReset: true
    }
};

// Google OAuth Configuration
window.GOOGLE_CLIENT_ID = '${envVars.GOOGLE_CLIENT_ID}';

// Validation
if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase configuration missing. Authentication features may not work properly.');
}

if (window.APP_CONFIG.environment === 'development') {
    console.log('🔧 Running in development mode');
    console.log('📊 App Config:', window.APP_CONFIG);
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
}

buildFrontend();
