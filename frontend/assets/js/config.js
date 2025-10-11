/**
 * Frontend Configuration - Development with Environment Variables (Injected)
 * Generated from .env for development use by scripts/dev-config.js
 */

// Supabase Configuration
window.SUPABASE_URL = 'https://dmvtnumichfheaduijzh.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnRudW1pY2hmaGVhZHVpanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTQxNjcsImV4cCI6MjA3MjM3MDE2N30.UlEoRUSX2v67-KUji5rp_SX3PHHvav7bWWXG0ikYWII';

// API Configuration
window.API_BASE_URL = 'http://localhost:3001';

// Google OAuth Configuration
window.GOOGLE_CLIENT_ID = '19098760843-j6ilk2t1o27f0mvujrqinqf90ojsuajf.apps.googleusercontent.com';

// Validate configuration and determine feature availability
const isValidSupabaseUrl = 'https://dmvtnumichfheaduijzh.supabase.co' && !'https://dmvtnumichfheaduijzh.supabase.co'.includes('your-project-id') && 'https://dmvtnumichfheaduijzh.supabase.co'.startsWith('https://');
const isValidSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnRudW1pY2hmaGVhZHVpanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTQxNjcsImV4cCI6MjA3MjM3MDE2N30.UlEoRUSX2v67-KUji5rp_SX3PHHvav7bWWXG0ikYWII' && !'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnRudW1pY2hmaGVhZHVpanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTQxNjcsImV4cCI6MjA3MjM3MDE2N30.UlEoRUSX2v67-KUji5rp_SX3PHHvav7bWWXG0ikYWII'.includes('your-anon-key') && 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnRudW1pY2hmaGVhZHVpanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTQxNjcsImV4cCI6MjA3MjM3MDE2N30.UlEoRUSX2v67-KUji5rp_SX3PHHvav7bWWXG0ikYWII'.length > 50;
const isValidGoogleClientId = '19098760843-j6ilk2t1o27f0mvujrqinqf90ojsuajf.apps.googleusercontent.com' && '19098760843-j6ilk2t1o27f0mvujrqinqf90ojsuajf.apps.googleusercontent.com'.includes('.apps.googleusercontent.com');

// App Configuration with dynamic feature detection
window.APP_CONFIG = {
    name: 'Snevo',
    version: '1.0.0',
    environment: 'development',
    buildTime: '2025-10-11T07:53:58.382Z',
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
