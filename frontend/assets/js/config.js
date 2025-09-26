/**
 * Frontend Configuration - Development Version
 * 
 * ⚠️  IMPORTANT: This file is replaced during production build!
 * 
 * For development:
 * 1. Copy env.example to .env
 * 2. Fill in your actual Supabase credentials
 * 3. Run `npm run build` to inject environment variables
 * 
 * This development version uses placeholder values.
 */

// Development Configuration
// These will be replaced with actual environment variables during build
console.warn('🔧 Using development configuration. Run "npm run build" for production.');

// Supabase Configuration (Development placeholders)
window.SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
window.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// API Configuration
window.API_BASE_URL = window.location.origin;

// App Configuration
window.APP_CONFIG = {
    name: 'Snevo',
    version: '1.0.0',
    environment: 'development',
    buildTime: new Date().toISOString(),
    features: {
        googleAuth: false, // Disabled in development without proper keys
        emailVerification: true,
        passwordReset: true
    }
};

// Google OAuth Configuration
window.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Development warnings
if (window.SUPABASE_URL.includes('your-project-id')) {
    console.warn('⚠️  Please set up your Supabase credentials in .env file');
    console.warn('📝 Copy env.example to .env and fill in your values');
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
