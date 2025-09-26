-- Supabase Database Schema Creation Script for db_nike
-- Nike-inspired E-commerce Platform
-- Schema: db_nike (with lowercase table names for PostgreSQL compatibility)

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS db_nike;

-- Set search path to use the db_nike schema
SET search_path TO db_nike, public;

-- Enable Row Level Security (RLS) for Supabase
ALTER DEFAULT PRIVILEGES IN SCHEMA db_nike REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 1. User Management Tables

-- Users table (lowercase)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('customer', 'seller')) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table (lowercase)
CREATE TABLE IF NOT EXISTS addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Vietnam',
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Management Tables

-- Categories table (lowercase)
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colors table (lowercase)
CREATE TABLE IF NOT EXISTS colors (
    color_id SERIAL PRIMARY KEY,
    color_name VARCHAR(50) UNIQUE NOT NULL,
    hex_code VARCHAR(7)
);

-- Sizes table (lowercase)
CREATE TABLE IF NOT EXISTS sizes (
    size_id SERIAL PRIMARY KEY,
    size_value DECIMAL(3,1) UNIQUE NOT NULL
);

-- Shoes table (lowercase) - main products
CREATE TABLE IF NOT EXISTS shoes (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(category_id),
    brand VARCHAR(100),
    product_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shoe Variants table (lowercase) - for different color/size combinations
CREATE TABLE IF NOT EXISTS shoe_variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES shoes(product_id) ON DELETE CASCADE,
    color_id INTEGER NOT NULL REFERENCES colors(color_id),
    size_id INTEGER NOT NULL REFERENCES sizes(size_id),
    variant_price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, color_id, size_id)
);

-- 3. Supplier and Inventory Management

-- Suppliers table (lowercase)
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Imports table (lowercase)
CREATE TABLE IF NOT EXISTS imports (
    import_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(supplier_id),
    variant_id INTEGER NOT NULL REFERENCES shoe_variants(variant_id),
    import_quantity INTEGER NOT NULL,
    import_price DECIMAL(10,2) NOT NULL,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 4. Order Management Tables

-- Orders table (lowercase)
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    total_amount DECIMAL(12,2) NOT NULL,
    order_status VARCHAR(20) DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address_id INTEGER REFERENCES addresses(address_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_date TIMESTAMP,
    delivered_date TIMESTAMP,
    tracking_number VARCHAR(100),
    notes TEXT
);

-- Order Items table (lowercase)
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES shoe_variants(variant_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Payments table (lowercase)
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'e_wallet')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    payment_amount DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(255),
    payment_details JSONB
);

-- 5. Review System

-- Reviews table (lowercase)
CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    product_id INTEGER NOT NULL REFERENCES shoes(product_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 6. Indexes for Performance

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Addresses indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default);

-- Shoes indexes
CREATE INDEX IF NOT EXISTS idx_shoes_category ON shoes(category_id);
CREATE INDEX IF NOT EXISTS idx_shoes_brand ON shoes(brand);
CREATE INDEX IF NOT EXISTS idx_shoes_created_at ON shoes(created_at);

-- Shoe_Variants indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON shoe_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_color ON shoe_variants(color_id);
CREATE INDEX IF NOT EXISTS idx_variants_size ON shoe_variants(size_id);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON shoe_variants(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON shoe_variants(sku);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);

-- Order_Items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- 7. Triggers for Auto-updating Timestamps

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION db_nike.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION db_nike.update_updated_at_column();

CREATE TRIGGER update_shoes_updated_at BEFORE UPDATE ON shoes
    FOR EACH ROW EXECUTE FUNCTION db_nike.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION db_nike.update_updated_at_column();

-- 8. Trigger for Automatic Stock Management

-- Function to update stock when order items are created
CREATE OR REPLACE FUNCTION db_nike.update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Decrease stock when order item is created
        UPDATE shoe_variants 
        SET stock_quantity = stock_quantity - NEW.quantity 
        WHERE variant_id = NEW.variant_id;
        
        -- Check if stock is sufficient
        IF (SELECT stock_quantity FROM shoe_variants WHERE variant_id = NEW.variant_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for variant_id %', NEW.variant_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Increase stock when order item is deleted (order cancelled)
        UPDATE shoe_variants 
        SET stock_quantity = stock_quantity + OLD.quantity 
        WHERE variant_id = OLD.variant_id;
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust stock based on quantity change
        UPDATE shoe_variants 
        SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity 
        WHERE variant_id = NEW.variant_id;
        
        -- Check if stock is sufficient
        IF (SELECT stock_quantity FROM shoe_variants WHERE variant_id = NEW.variant_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for variant_id %', NEW.variant_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply stock management trigger
CREATE TRIGGER manage_stock_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION db_nike.update_stock_on_order();

-- 9. Trigger for Automatic Stock Increase on Import

-- Function to update stock when imports are added
CREATE OR REPLACE FUNCTION db_nike.update_stock_on_import()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase stock when import is created
    UPDATE shoe_variants 
    SET stock_quantity = stock_quantity + NEW.import_quantity 
    WHERE variant_id = NEW.variant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply import stock trigger
CREATE TRIGGER import_stock_trigger
    AFTER INSERT ON imports
    FOR EACH ROW EXECUTE FUNCTION db_nike.update_stock_on_import();

-- 10. Insert Sample Data

-- Insert sample categories
INSERT INTO categories (category_name, description) VALUES
('Running Shoes', 'Athletic shoes designed for running and jogging'),
('Basketball Shoes', 'High-performance shoes for basketball players'),
('Casual Shoes', 'Comfortable everyday footwear'),
('Training Shoes', 'Cross-training and gym workout shoes')
ON CONFLICT DO NOTHING;

-- Insert sample colors
INSERT INTO colors (color_name, hex_code) VALUES
('Black', '#000000'),
('White', '#FFFFFF'),
('Red', '#FF0000'),
('Blue', '#0000FF'),
('Green', '#00FF00'),
('Gray', '#808080'),
('Navy', '#000080'),
('Brown', '#8B4513')
ON CONFLICT DO NOTHING;

-- Insert sample sizes
INSERT INTO sizes (size_value) VALUES
(6.0), (6.5), (7.0), (7.5), (8.0), (8.5), (9.0), (9.5), (10.0), (10.5), (11.0), (11.5), (12.0), (12.5), (13.0)
ON CONFLICT DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (supplier_name, contact_email, contact_phone, address) VALUES
('Nike Supplier Co.', 'supplier@nike-supplier.com', '+1-555-0123', '123 Supplier Street, Supply City, SC 12345'),
('Adidas Distribution', 'orders@adidas-dist.com', '+1-555-0124', '456 Distribution Ave, Dist Town, DT 67890'),
('Jordan Wholesale', 'wholesale@jordan-supply.com', '+1-555-0125', '789 Wholesale Blvd, Wholesale City, WC 54321')
ON CONFLICT DO NOTHING;

-- 11. Row Level Security (RLS) Policies for Supabase

-- Enable RLS on all tables in db_nike schema
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoe_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Allow user registration (insert)
CREATE POLICY "Anyone can register" ON users
    FOR INSERT WITH CHECK (true);

-- Public read access for product-related tables
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view colors" ON colors FOR SELECT USING (true);
CREATE POLICY "Anyone can view sizes" ON sizes FOR SELECT USING (true);
CREATE POLICY "Anyone can view shoes" ON shoes FOR SELECT USING (true);
CREATE POLICY "Anyone can view shoe variants" ON shoe_variants FOR SELECT USING (true);
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);

-- User-specific policies for addresses
CREATE POLICY "Users can manage their own addresses" ON addresses
    FOR ALL USING (auth.uid()::text = user_id::text);

-- User-specific policies for orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Order items policies
CREATE POLICY "Users can view order items for their orders" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.order_id = order_items.order_id 
            AND auth.uid()::text = orders.user_id::text
        )
    );

-- Reviews policies
CREATE POLICY "Users can manage their own reviews" ON reviews
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Admin policies (for sellers and admins)
CREATE POLICY "Sellers can manage suppliers" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth.uid()::text = user_id::text 
            AND role = 'seller'
        )
    );

CREATE POLICY "Sellers can manage imports" ON imports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth.uid()::text = user_id::text 
            AND role = 'seller'
        )
    );

-- Grant necessary permissions for db_nike schema
GRANT USAGE ON SCHEMA db_nike TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA db_nike TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA db_nike TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA db_nike TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA db_nike TO postgres, authenticated, service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Snevo database schema created successfully in db_nike schema!';
    RAISE NOTICE 'Tables created with lowercase names: users, addresses, categories, colors, sizes, shoes, shoe_variants, suppliers, imports, orders, order_items, payments, reviews';
    RAISE NOTICE 'RLS policies applied for Supabase security';
    RAISE NOTICE 'Sample data inserted for categories, colors, sizes, and suppliers';
    RAISE NOTICE 'User registration enabled with proper permissions';
END $$;
