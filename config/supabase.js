// 🗄️ Supabase Configuration
// Supabase client configuration and setup

import { createClient } from '@supabase/supabase-js';

class SupabaseConfig {
    constructor() {
        this.url = process.env.SUPABASE_URL;
        this.anonKey = process.env.SUPABASE_ANON_KEY;
        this.serviceKey = process.env.SUPABASE_SERVICE_KEY;
        
        this.client = null;
        this.adminClient = null;
    }

    // Initialize Supabase client
    init() {
        if (!this.url || !this.anonKey) {
            throw new Error('Supabase configuration missing');
        }

        this.client = createClient(this.url, this.anonKey);
        
        if (this.serviceKey) {
            this.adminClient = createClient(this.url, this.serviceKey);
        }

        return this.client;
    }

    // Get client instance
    getClient() {
        if (!this.client) {
            this.init();
        }
        return this.client;
    }

    // Get admin client instance
    getAdminClient() {
        if (!this.adminClient) {
            throw new Error('Admin client not configured');
        }
        return this.adminClient;
    }
}

const supabaseConfig = new SupabaseConfig();
export default supabaseConfig;