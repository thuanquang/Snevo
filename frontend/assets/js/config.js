/**
 * Frontend Configuration - Development with Environment Variables (Injected)
 * Generated from .env for development use by scripts/dev-config.js
 */

// Supabase Configuration
window.SUPABASE_URL = 'https://your-project-id.supabase.co';
window.SUPABASE_ANON_KEY = 'your-supabase-anon-key-here';

// API Configuration
window.API_BASE_URL = 'http://localhost:3001';

// Google OAuth Configuration
window.GOOGLE_CLIENT_ID = 'your-google-client-id.apps.googleusercontent.com';

// Validate configuration and determine feature availability
const isValidSupabaseUrl = 'https://your-project-id.supabase.co' && !'https://your-project-id.supabase.co'.includes('your-project-id') && 'https://your-project-id.supabase.co'.startsWith('https://');
const isValidSupabaseKey = 'your-supabase-anon-key-here' && !'your-supabase-anon-key-here'.includes('your-anon-key') && 'your-supabase-anon-key-here'.length > 50;
const isValidGoogleClientId = 'your-google-client-id.apps.googleusercontent.com' && 'your-google-client-id.apps.googleusercontent.com'.includes('.apps.googleusercontent.com');

// App Configuration with dynamic feature detection
window.APP_CONFIG = {
    name: 'Snevo',
    version: '1.0.0',
    environment: 'development',
    buildTime: '2025-10-03T12:52:33.736Z',
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
