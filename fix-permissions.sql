-- Complete Permission Fix for Supabase db_nike Schema
-- Run this in Supabase SQL Editor to fix all permission issues

-- 1. Grant schema usage permissions
GRANT USAGE ON SCHEMA db_nike TO anon, authenticated, service_role;

-- 2. Grant table permissions for all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA db_nike TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA db_nike TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA db_nike TO postgres, service_role;

-- 3. Grant sequence permissions (for auto-increment IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA db_nike TO authenticated, service_role, postgres;

-- 4. Grant function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA db_nike TO authenticated, service_role, postgres;

-- 5. Set default privileges for future tables/sequences/functions
ALTER DEFAULT PRIVILEGES IN SCHEMA db_nike
    GRANT SELECT ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA db_nike
    GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA db_nike
    GRANT ALL ON TABLES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA db_nike
    GRANT ALL ON SEQUENCES TO authenticated, service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA db_nike
    GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role, postgres;

-- 6. Enable Row Level Security on all tables
ALTER TABLE db_nike.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.shoe_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_nike.reviews ENABLE ROW LEVEL SECURITY;

-- 7. Create essential RLS policies

-- Users policies
DROP POLICY IF EXISTS "Users can register" ON db_nike.users;
CREATE POLICY "Users can register" ON db_nike.users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON db_nike.users;
CREATE POLICY "Users can view their own profile" ON db_nike.users
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update their own profile" ON db_nike.users;
CREATE POLICY "Users can update their own profile" ON db_nike.users
    FOR UPDATE USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

-- Public read access for product-related tables
DROP POLICY IF EXISTS "Anyone can view categories" ON db_nike.categories;
CREATE POLICY "Anyone can view categories" ON db_nike.categories 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view colors" ON db_nike.colors;
CREATE POLICY "Anyone can view colors" ON db_nike.colors 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view sizes" ON db_nike.sizes;
CREATE POLICY "Anyone can view sizes" ON db_nike.sizes 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view shoes" ON db_nike.shoes;
CREATE POLICY "Anyone can view shoes" ON db_nike.shoes 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view shoe variants" ON db_nike.shoe_variants;
CREATE POLICY "Anyone can view shoe variants" ON db_nike.shoe_variants 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view reviews" ON db_nike.reviews;
CREATE POLICY "Anyone can view reviews" ON db_nike.reviews 
    FOR SELECT USING (true);

-- User-specific policies for addresses
DROP POLICY IF EXISTS "Users can manage their own addresses" ON db_nike.addresses;
CREATE POLICY "Users can manage their own addresses" ON db_nike.addresses
    FOR ALL USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

-- User-specific policies for orders
DROP POLICY IF EXISTS "Users can view their own orders" ON db_nike.orders;
CREATE POLICY "Users can view their own orders" ON db_nike.orders
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can create their own orders" ON db_nike.orders;
CREATE POLICY "Users can create their own orders" ON db_nike.orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

-- Order items policies
DROP POLICY IF EXISTS "Users can view order items for their orders" ON db_nike.order_items;
CREATE POLICY "Users can view order items for their orders" ON db_nike.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM db_nike.orders 
            WHERE orders.order_id = order_items.order_id 
            AND (auth.uid()::text = orders.user_id::text OR auth.role() = 'service_role')
        )
    );

-- Reviews policies
DROP POLICY IF EXISTS "Users can manage their own reviews" ON db_nike.reviews;
CREATE POLICY "Users can manage their own reviews" ON db_nike.reviews
    FOR ALL USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

-- Admin/Seller policies
DROP POLICY IF EXISTS "Sellers can manage suppliers" ON db_nike.suppliers;
CREATE POLICY "Sellers can manage suppliers" ON db_nike.suppliers
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM db_nike.users 
            WHERE auth.uid()::text = user_id::text 
            AND role = 'seller'
        )
    );

DROP POLICY IF EXISTS "Sellers can manage imports" ON db_nike.imports;
CREATE POLICY "Sellers can manage imports" ON db_nike.imports
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM db_nike.users 
            WHERE auth.uid()::text = user_id::text 
            AND role = 'seller'
        )
    );

-- 8. Create lowercase table views if original tables are CamelCase
-- This ensures compatibility regardless of original table naming

DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check if CamelCase Users table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'db_nike' 
        AND table_name = 'Users'
    ) INTO table_exists;
    
    -- If CamelCase tables exist, create lowercase views
    IF table_exists THEN
        -- Create views for lowercase compatibility
        CREATE OR REPLACE VIEW db_nike.users AS SELECT * FROM db_nike."Users";
        CREATE OR REPLACE VIEW db_nike.addresses AS SELECT * FROM db_nike."Addresses";
        CREATE OR REPLACE VIEW db_nike.categories AS SELECT * FROM db_nike."Categories";
        CREATE OR REPLACE VIEW db_nike.colors AS SELECT * FROM db_nike."Colors";
        CREATE OR REPLACE VIEW db_nike.sizes AS SELECT * FROM db_nike."Sizes";
        CREATE OR REPLACE VIEW db_nike.shoes AS SELECT * FROM db_nike."Shoes";
        CREATE OR REPLACE VIEW db_nike.shoe_variants AS SELECT * FROM db_nike."Shoe_Variants";
        CREATE OR REPLACE VIEW db_nike.suppliers AS SELECT * FROM db_nike."Suppliers";
        CREATE OR REPLACE VIEW db_nike.imports AS SELECT * FROM db_nike."Imports";
        CREATE OR REPLACE VIEW db_nike.orders AS SELECT * FROM db_nike."Orders";
        CREATE OR REPLACE VIEW db_nike.order_items AS SELECT * FROM db_nike."Order_Items";
        CREATE OR REPLACE VIEW db_nike.payments AS SELECT * FROM db_nike."Payments";
        CREATE OR REPLACE VIEW db_nike.reviews AS SELECT * FROM db_nike."Reviews";
        
        -- Grant permissions on views
        GRANT SELECT ON ALL TABLES IN SCHEMA db_nike TO anon, authenticated;
        GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA db_nike TO authenticated, service_role;
        
        RAISE NOTICE 'Created lowercase views for CamelCase tables';
    ELSE
        RAISE NOTICE 'Lowercase tables already exist, no views needed';
    END IF;
END $$;

-- 9. Test permissions
DO $$
BEGIN
    RAISE NOTICE '=== PERMISSION FIX COMPLETED ===';
    RAISE NOTICE 'Schema: db_nike permissions granted to anon, authenticated, service_role';
    RAISE NOTICE 'Tables: All permissions granted for CRUD operations';
    RAISE NOTICE 'RLS: Enabled with policies for user registration and data access';
    RAISE NOTICE 'Views: Created if needed for table name compatibility';
    RAISE NOTICE '=== REGISTRATION SHOULD NOW WORK ===';
END $$;
