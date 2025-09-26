/**
 * Supabase Configuration
 * Handles Supabase client initialization and configuration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables. Please check your .env file.');
}

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
    }
};

// Export configuration object
export const supabaseConfig = {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceKey: supabaseServiceKey,
    schema: process.env.DB_SCHEMA || 'db_nike'
};

export default supabase;

