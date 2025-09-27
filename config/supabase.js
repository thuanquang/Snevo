/**
 * Supabase Configuration
 * Handles Supabase client initialization and configuration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from project root regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
dotenv.config({ path: join(rootDir, '.env') });

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Comprehensive environment variable validation
function validateSupabaseConfig() {
    const errors = [];
    
    if (!supabaseUrl) {
        errors.push('SUPABASE_URL is required');
    } else if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
        errors.push('SUPABASE_URL must be a valid Supabase URL (https://your-project-id.supabase.co)');
    }
    
    if (!supabaseAnonKey) {
        errors.push('SUPABASE_ANON_KEY is required');
    } else if (supabaseAnonKey.includes('your-anon-key') || supabaseAnonKey.length < 100) {
        errors.push('SUPABASE_ANON_KEY appears to be a placeholder or invalid');
    }
    
    if (!supabaseServiceKey) {
        console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not provided. Admin operations will be limited.');
    } else if (supabaseServiceKey.includes('your-service-role-key') || supabaseServiceKey.length < 100) {
        console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY appears to be a placeholder. Admin operations may fail.');
    }
    
    if (errors.length > 0) {
        console.error('❌ Supabase Configuration Errors:');
        errors.forEach(error => console.error(`   • ${error}`));
        console.error('');
        console.error('📝 Please check your .env file and ensure all Supabase credentials are set correctly.');
        console.error('💡 Copy env.example to .env and fill in your actual Supabase project credentials.');
        throw new Error(`Missing or invalid Supabase configuration: ${errors.join(', ')}`);
    }
    
    console.log('✅ Supabase configuration validated successfully');
}

// Validate configuration on startup
validateSupabaseConfig();

// Create Supabase client for public operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    db: {
        schema: process.env.DB_SCHEMA || 'db_nike'
    }
});

// Create Supabase admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        db: {
            schema: process.env.DB_SCHEMA || 'db_nike'
        }
    })
    : null;

// Helper functions for common operations
export const supabaseHelpers = {
    /**
     * Get user from JWT token
     */
    async getUserFromToken(token) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Error getting user from token:', error);
            return null;
        }
    },

    /**
     * Verify user session
     */
    async verifySession(accessToken) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(accessToken);
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Error verifying session:', error);
            return null;
        }
    },

    /**
     * Sign out user
     */
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            return false;
        }
    },

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle(options = {}) {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: process.env.FRONTEND_URL || 'http://localhost:3000',
                    ...options
                }
            });
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error signing in with Google:', error);
            return { success: false, error: error.message };
        }
    },

};

// Export configuration object
export const supabaseConfig = {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceKey: supabaseServiceKey,
    schema: process.env.DB_SCHEMA || 'db_nike',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

export default supabase;

