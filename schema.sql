-- Nike Database Schema Creation Script for Supabase
-- Schema: db_nike
-- Uses Supabase auth.users directly with profiles table for role management

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS db_nike;

-- Set search path to use the db_nike schema
SET search_path TO db_nike;

-- ===================================
-- 1. User Profile Management
-- ===================================

-- Profiles table for app-specific user data (linked to auth.users)
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('customer', 'seller')) DEFAULT 'customer',
    avatar_url TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses table (now references auth.users directly)
CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Vietnam',
    zip_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 2. Product Management (Shoes)
-- ===================================

-- Categories table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shoes table
CREATE TABLE shoes (
    shoe_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    shoe_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colors table
CREATE TABLE colors (
    color_id SERIAL PRIMARY KEY,
    color_name VARCHAR(50) NOT NULL UNIQUE,
    hex_code VARCHAR(7), -- e.g., #FF0000
    is_active BOOLEAN DEFAULT TRUE
);

-- Sizes table
CREATE TABLE sizes (
    size_id SERIAL PRIMARY KEY,
    size_value VARCHAR(10) NOT NULL UNIQUE,
    size_type VARCHAR(20) DEFAULT 'US', -- US, EU, UK, etc.
    is_active BOOLEAN DEFAULT TRUE
);

-- Shoe variants table
CREATE TABLE shoe_variants (
    variant_id SERIAL PRIMARY KEY,
    shoe_id INTEGER NOT NULL REFERENCES shoes(shoe_id) ON DELETE CASCADE,
    color_id INTEGER NOT NULL REFERENCES colors(color_id) ON DELETE RESTRICT,
    size_id INTEGER NOT NULL REFERENCES sizes(size_id) ON DELETE RESTRICT,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    sku VARCHAR(50) UNIQUE NOT NULL,
    variant_price DECIMAL(10,2) CHECK (variant_price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shoe_id, color_id, size_id)
);

-- ===================================
-- 3. Inventory Management (For Sellers)
-- ===================================

-- Imports table (now references auth.users directly)
CREATE TABLE imports (
    import_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    variant_id INTEGER NOT NULL REFERENCES shoe_variants(variant_id) ON DELETE RESTRICT,
    quantity_imported INTEGER NOT NULL CHECK (quantity_imported > 0),
    import_price DECIMAL(10,2) NOT NULL CHECK (import_price >= 0),
    import_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 4. Sales Management (For Customers)
-- ===================================

-- Orders table (now references auth.users directly)
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    address_id INTEGER NOT NULL REFERENCES addresses(address_id) ON DELETE RESTRICT,
    order_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    shipping_cost DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES shoe_variants(variant_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'e_wallet', 'paypal', 'stripe')) NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount >= 0),
    payment_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    transaction_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 5. Additional Features
-- ===================================

-- Reviews table (now references auth.users directly)
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    shoe_id INTEGER NOT NULL REFERENCES shoes(shoe_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    review_date TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shoe_id, user_id) -- Each user can only review a product once
);


-- ===================================
-- 6. Performance Indexes
-- ===================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Addresses indexes
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(is_default);

-- Categories indexes
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Shoes indexes
CREATE INDEX idx_shoes_category_id ON shoes(category_id);
CREATE INDEX idx_shoes_name ON shoes(shoe_name);
CREATE INDEX idx_shoes_is_active ON shoes(is_active);
CREATE INDEX idx_shoes_base_price ON shoes(base_price);

-- Shoe variants indexes
CREATE INDEX idx_variants_shoe_id ON shoe_variants(shoe_id);
CREATE INDEX idx_variants_sku ON shoe_variants(sku);
CREATE INDEX idx_variants_stock ON shoe_variants(stock_quantity);
CREATE INDEX idx_variants_is_active ON shoe_variants(is_active);

-- Imports indexes
CREATE INDEX idx_imports_user_id ON imports(user_id);
CREATE INDEX idx_imports_variant_id ON imports(variant_id);
CREATE INDEX idx_imports_date ON imports(import_date);

-- Orders indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);

-- Payments indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Reviews indexes
CREATE INDEX idx_reviews_shoe_id ON reviews(shoe_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);


-- ===================================
-- 7. Row Level Security (RLS) Policies
-- ===================================

-- Enable RLS on all user-related tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile"
ON profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Addresses policies
DROP POLICY IF EXISTS "Users can manage their own addresses" ON addresses;
CREATE POLICY "Users can manage their own addresses"
ON addresses FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public read access for product-related tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoe_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
CREATE POLICY "Anyone can view active categories"
ON categories FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view active shoes" ON shoes;
CREATE POLICY "Anyone can view active shoes"
ON shoes FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view active colors" ON colors;
CREATE POLICY "Anyone can view active colors"
ON colors FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view active sizes" ON sizes;
CREATE POLICY "Anyone can view active sizes"
ON sizes FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view active shoe variants" ON shoe_variants;
CREATE POLICY "Anyone can view active shoe variants"
ON shoe_variants FOR SELECT
USING (is_active = true);

-- Imports policies (sellers only)
DROP POLICY IF EXISTS "Sellers can manage imports" ON imports;
CREATE POLICY "Sellers can manage imports"
ON imports FOR ALL
USING (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'seller'
    )
)
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'seller'
    )
);

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
CREATE POLICY "Users can create their own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending orders" ON orders;
CREATE POLICY "Users can update their own pending orders"
ON orders FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);

-- Order items policies
DROP POLICY IF EXISTS "Users can view items from their orders" ON order_items;
CREATE POLICY "Users can view items from their orders"
ON order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.order_id = order_items.order_id 
        AND orders.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can manage items in their orders" ON order_items;
CREATE POLICY "Users can manage items in their orders"
ON order_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.order_id = order_items.order_id 
        AND orders.user_id = auth.uid()
        AND orders.status = 'pending'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.order_id = order_items.order_id 
        AND orders.user_id = auth.uid()
        AND orders.status = 'pending'
    )
);

-- Reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews"
ON reviews FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can manage their own reviews" ON reviews;
CREATE POLICY "Users can manage their own reviews"
ON reviews FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ===================================
-- Seller management policies (frontend writes)
-- ===================================

-- Allow sellers to fully manage categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers can manage categories" ON categories;
CREATE POLICY "Sellers can manage categories"
ON categories FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'seller'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'seller'
    )
);

-- Allow sellers to fully manage shoes
ALTER TABLE shoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers can manage shoes" ON shoes;
CREATE POLICY "Sellers can manage shoes"
ON shoes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'seller'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'seller'
    )
);

-- Allow sellers to fully manage variants
ALTER TABLE shoe_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers can manage variants" ON shoe_variants;
CREATE POLICY "Sellers can manage variants"
ON shoe_variants FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'seller'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'seller'
    )
);


-- ===================================
-- 8. Triggers and Functions
-- ===================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO db_nike.profiles (user_id, username, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shoes_updated_at
    BEFORE UPDATE ON shoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shoe_variants_updated_at
    BEFORE UPDATE ON shoe_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update stock when importing
CREATE OR REPLACE FUNCTION update_stock_on_import()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE shoe_variants 
    SET stock_quantity = stock_quantity + NEW.quantity_imported,
        updated_at = NOW()
    WHERE variant_id = NEW.variant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock updates on import
CREATE TRIGGER trigger_update_stock_on_import
    AFTER INSERT ON imports
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_import();

-- Function to check and update stock on order
CREATE OR REPLACE FUNCTION check_and_update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Check stock availability
    IF (SELECT stock_quantity FROM shoe_variants WHERE variant_id = NEW.variant_id) < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for variant_id: %. Available: %, Requested: %', 
            NEW.variant_id, 
            (SELECT stock_quantity FROM shoe_variants WHERE variant_id = NEW.variant_id),
            NEW.quantity;
    END IF;
    
    -- Deduct stock
    UPDATE shoe_variants 
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = NOW()
    WHERE variant_id = NEW.variant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock check and deduction on order
CREATE TRIGGER trigger_check_and_update_stock_on_order
    BEFORE INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION check_and_update_stock_on_order();

-- Function to restore stock on order cancellation
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- Only restore stock when order status changes from non-cancelled to cancelled
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE shoe_variants 
        SET stock_quantity = stock_quantity + oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE oi.order_id = NEW.order_id 
        AND shoe_variants.variant_id = oi.variant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock restoration on order cancellation
CREATE TRIGGER trigger_restore_stock_on_cancel
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION restore_stock_on_cancel();

-- ===================================
-- 9. Initial Data (Optional)
-- ===================================

-- Insert default categories
INSERT INTO categories (category_name, description) VALUES
('Running', 'Athletic shoes designed for running and jogging'),
('Basketball', 'High-performance shoes for basketball players'),
('Lifestyle', 'Casual shoes for everyday wear'),
('Training', 'Cross-training shoes for gym workouts'),
('Football', 'Soccer cleats and football boots');

-- Insert default colors
INSERT INTO colors (color_name, hex_code) VALUES
('Black', '#000000'),
('White', '#FFFFFF'),
('Red', '#FF0000'),
('Blue', '#0000FF'),
('Green', '#008000'),
('Gray', '#808080'),
('Navy', '#000080'),
('Brown', '#8B4513');

-- Insert default sizes (US sizing)
INSERT INTO sizes (size_value, size_type) VALUES
('6', 'US'), ('6.5', 'US'), ('7', 'US'), ('7.5', 'US'),
('8', 'US'), ('8.5', 'US'), ('9', 'US'), ('9.5', 'US'),
('10', 'US'), ('10.5', 'US'), ('11', 'US'), ('11.5', 'US'),
('12', 'US'), ('13', 'US'), ('14', 'US');

-- ===================================
-- 10. Completion Message
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '=== NIKE SHOE STORE DATABASE SCHEMA CREATED SUCCESSFULLY ===';
    RAISE NOTICE 'Schema: db_nike';
    RAISE NOTICE 'Uses Supabase auth.users with profiles table for role management';
    RAISE NOTICE 'Tables: profiles, addresses, categories, shoes, colors, sizes, shoe_variants,';
    RAISE NOTICE '        imports, orders, order_items, payments, reviews';
    RAISE NOTICE 'Features: RLS enabled, automatic profile creation, stock management';
    RAISE NOTICE 'Ready for e-commerce operations!';
END $$;