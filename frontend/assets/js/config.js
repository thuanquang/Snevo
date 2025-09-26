/**
 * Frontend Configuration - Development Version
 * 
 * ⚠️  IMPORTANT: This file is replaced during production build!
 * 
 * For development:
 * 1. Copy env.example to .env
 * 2. Fill in your actual Supabase credentials
 * 3. Run `npm run dev:config` to generate config from .env
 * 4. Or run `npm run build` for production build with env injection
 * 
 * This development version uses placeholder values and will show warnings.
 */

// Development Configuration
// These will be replaced with actual environment variables during build
console.warn('🔧 Using development configuration. Run "npm run dev:config" or "npm run build" to use your .env values.');

// Supabase Configuration (Development placeholders)
window.SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
window.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// API Configuration
window.API_BASE_URL = process.env.API_BASE_URL || window.location.origin;

// Google OAuth Configuration
window.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Validate configuration and determine feature availability
const isValidSupabaseUrl = window.SUPABASE_URL && !window.SUPABASE_URL.includes('your-project-id') && window.SUPABASE_URL.startsWith('https://');
const isValidSupabaseKey = window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes('your-anon-key') && window.SUPABASE_ANON_KEY.length > 50;
const isValidGoogleClientId = window.GOOGLE_CLIENT_ID && window.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com');

// App Configuration with dynamic feature detection
window.APP_CONFIG = {
    name: 'Snevo',
    version: '1.0.0',
    environment: 'development',
    buildTime: new Date().toISOString(),
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

// Development warnings and guidance
if (!isValidSupabaseUrl || !isValidSupabaseKey) {
    console.error('❌ Supabase Configuration Issues:');
    if (!isValidSupabaseUrl) {
        console.error('   • SUPABASE_URL is missing or invalid');
    }
    if (!isValidSupabaseKey) {
        console.error('   • SUPABASE_ANON_KEY is missing or invalid');
    }
    console.error('');
    console.error('📝 Setup Instructions:');
    console.error('   1. Copy env.example to .env');
    console.error('   2. Fill in your actual Supabase project credentials');
    console.error('   3. Run "npm run dev:config" to generate config from .env');
    console.error('');
}

if (!isValidGoogleClientId) {
    console.warn('⚠️  Google OAuth not configured:');
    console.warn('   • GOOGLE_CLIENT_ID is missing or invalid');
    console.warn('   • Google authentication will be disabled');
    console.warn('   • Add your Google Client ID to .env to enable Google OAuth');
} else {
    console.log('✅ Google OAuth configured and enabled');
}

if (window.APP_CONFIG.features.supabaseAuth) {
    console.log('✅ Supabase authentication configured and enabled');
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
