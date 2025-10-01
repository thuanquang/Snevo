// 🗄️ Supabase Configuration
// Supabase client configuration and setup

import { createClient } from '@supabase/supabase-js';

class SupabaseConfig {
    constructor() {
        this.url = null;
        this.anonKey = null;
        this.serviceKey = null;

        this.client = null;
        this.adminClient = null;
        this.initialized = false;
    }

    // Initialize Supabase client
    init() {
        // Load environment variables if not already loaded
        if (!this.url || !this.anonKey) {
            this.url = process.env.SUPABASE_URL;
            this.anonKey = process.env.SUPABASE_ANON_KEY;
            this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        }

        if (!this.url || !this.anonKey) {
            console.warn('Supabase configuration missing - environment variables not set');
            return null;
        }

        // Get schema from environment or default to db_nike
        const schema = process.env.DB_SCHEMA || 'db_nike';

        this.client = createClient(this.url, this.anonKey, {
            db: {
                schema: schema
            }
        });

        if (this.serviceKey) {
            this.adminClient = createClient(this.url, this.serviceKey, {
                db: {
                    schema: schema
                }
            });
        }

        this.initialized = true;
        return this.client;
    }

    // Get client instance
    getClient() {
        if (!this.initialized) {
            this.init();
        }
        return this.client; // May be null if environment variables are not set
    }

    // Get admin client instance
    getAdminClient() {
        if (!this.initialized) {
            this.init();
        }
        if (!this.adminClient) {
            throw new Error('Admin client not configured');
        }
        return this.adminClient;
    }
}

// Export a function that returns a new instance instead of a singleton
export default function() {
    return new SupabaseConfig();
}