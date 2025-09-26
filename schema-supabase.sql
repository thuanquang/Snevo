-- Supabase Database Schema Creation Script
-- Nike-inspired E-commerce Platform
-- Schema: public (Supabase default)

-- Set search path to use the public schema
SET search_path TO public;

-- Enable Row Level Security (RLS) for Supabase
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 1. User Management Tables

-- Users table
CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('customer', 'seller')) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table
CREATE TABLE IF NOT EXISTS Addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Vietnam',
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Management Tables

-- Categories table
CREATE TABLE IF NOT EXISTS Categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colors table
CREATE TABLE IF NOT EXISTS Colors (
    color_id SERIAL PRIMARY KEY,
    color_name VARCHAR(50) UNIQUE NOT NULL,
    hex_code VARCHAR(7)
);

-- Sizes table
CREATE TABLE IF NOT EXISTS Sizes (
    size_id SERIAL PRIMARY KEY,
    size_value DECIMAL(3,1) UNIQUE NOT NULL
);

-- Shoes table (main products)
CREATE TABLE IF NOT EXISTS Shoes (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES Categories(category_id),
    brand VARCHAR(100),
    product_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shoe Variants table (for different color/size combinations)
CREATE TABLE IF NOT EXISTS Shoe_Variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES Shoes(product_id) ON DELETE CASCADE,
    color_id INTEGER NOT NULL REFERENCES Colors(color_id),
    size_id INTEGER NOT NULL REFERENCES Sizes(size_id),
    variant_price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, color_id, size_id)
);

-- 3. Supplier and Inventory Management

-- Suppliers table
CREATE TABLE IF NOT EXISTS Suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Imports table
CREATE TABLE IF NOT EXISTS Imports (
    import_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES Suppliers(supplier_id),
    variant_id INTEGER NOT NULL REFERENCES Shoe_Variants(variant_id),
    import_quantity INTEGER NOT NULL,
    import_price DECIMAL(10,2) NOT NULL,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 4. Order Management Tables

-- Orders table
CREATE TABLE IF NOT EXISTS Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(user_id),
    total_amount DECIMAL(12,2) NOT NULL,
    order_status VARCHAR(20) DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address_id INTEGER REFERENCES Addresses(address_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_date TIMESTAMP,
    delivered_date TIMESTAMP,
    tracking_number VARCHAR(100),
    notes TEXT
);

-- Order Items table
CREATE TABLE IF NOT EXISTS Order_Items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES Shoe_Variants(variant_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Payments table
CREATE TABLE IF NOT EXISTS Payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES Orders(order_id),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'e_wallet')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    payment_amount DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(255),
    payment_details JSONB
);

-- 5. Review System

-- Reviews table
CREATE TABLE IF NOT EXISTS Reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(user_id),
    product_id INTEGER NOT NULL REFERENCES Shoes(product_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 6. Indexes for Performance

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role);

-- Addresses indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON Addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON Addresses(user_id, is_default);

-- Shoes indexes
CREATE INDEX IF NOT EXISTS idx_shoes_category ON Shoes(category_id);
CREATE INDEX IF NOT EXISTS idx_shoes_brand ON Shoes(brand);
CREATE INDEX IF NOT EXISTS idx_shoes_created_at ON Shoes(created_at);

-- Shoe_Variants indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON Shoe_Variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_color ON Shoe_Variants(color_id);
CREATE INDEX IF NOT EXISTS idx_variants_size ON Shoe_Variants(size_id);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON Shoe_Variants(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON Shoe_Variants(sku);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON Orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON Orders(order_date);

-- Order_Items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON Order_Items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON Order_Items(variant_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product ON Reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON Reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON Reviews(rating);

-- 7. Triggers for Auto-updating Timestamps

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON Users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shoes_updated_at BEFORE UPDATE ON Shoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON Reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Trigger for Automatic Stock Management

-- Function to update stock when order items are created
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Decrease stock when order item is created
        UPDATE Shoe_Variants 
        SET stock_quantity = stock_quantity - NEW.quantity 
        WHERE variant_id = NEW.variant_id;
        
        -- Check if stock is sufficient
        IF (SELECT stock_quantity FROM Shoe_Variants WHERE variant_id = NEW.variant_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for variant_id %', NEW.variant_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Increase stock when order item is deleted (order cancelled)
        UPDATE Shoe_Variants 
        SET stock_quantity = stock_quantity + OLD.quantity 
        WHERE variant_id = OLD.variant_id;
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust stock based on quantity change
        UPDATE Shoe_Variants 
        SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity 
        WHERE variant_id = NEW.variant_id;
        
        -- Check if stock is sufficient
        IF (SELECT stock_quantity FROM Shoe_Variants WHERE variant_id = NEW.variant_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for variant_id %', NEW.variant_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply stock management trigger
CREATE TRIGGER manage_stock_trigger
    AFTER INSERT OR UPDATE OR DELETE ON Order_Items
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_order();

-- 9. Trigger for Automatic Stock Increase on Import

-- Function to update stock when imports are added
CREATE OR REPLACE FUNCTION update_stock_on_import()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase stock when import is created
    UPDATE Shoe_Variants 
    SET stock_quantity = stock_quantity + NEW.import_quantity 
    WHERE variant_id = NEW.variant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply import stock trigger
CREATE TRIGGER import_stock_trigger
    AFTER INSERT ON Imports
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_import();

-- 10. Insert Sample Data

-- Insert sample categories
INSERT INTO Categories (category_name, description) VALUES
('Running Shoes', 'Athletic shoes designed for running and jogging'),
('Basketball Shoes', 'High-performance shoes for basketball players'),
('Casual Shoes', 'Comfortable everyday footwear'),
('Training Shoes', 'Cross-training and gym workout shoes')
ON CONFLICT DO NOTHING;

-- Insert sample colors
INSERT INTO Colors (color_name, hex_code) VALUES
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
INSERT INTO Sizes (size_value) VALUES
(6.0), (6.5), (7.0), (7.5), (8.0), (8.5), (9.0), (9.5), (10.0), (10.5), (11.0), (11.5), (12.0), (12.5), (13.0)
ON CONFLICT DO NOTHING;

-- Insert sample suppliers
INSERT INTO Suppliers (supplier_name, contact_email, contact_phone, address) VALUES
('Nike Supplier Co.', 'supplier@nike-supplier.com', '+1-555-0123', '123 Supplier Street, Supply City, SC 12345'),
('Adidas Distribution', 'orders@adidas-dist.com', '+1-555-0124', '456 Distribution Ave, Dist Town, DT 67890'),
('Jordan Wholesale', 'wholesale@jordan-supply.com', '+1-555-0125', '789 Wholesale Blvd, Wholesale City, WC 54321')
ON CONFLICT DO NOTHING;

-- 11. Row Level Security (RLS) Policies for Supabase

-- Enable RLS on all tables
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE Addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE Categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE Colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE Sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE Shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE Shoe_Variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE Suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE Imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE Orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE Order_Items ENABLE ROW LEVEL SECURITY;
ALTER TABLE Payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE Reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON Users
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own profile" ON Users
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Public read access for product-related tables
CREATE POLICY "Anyone can view categories" ON Categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view colors" ON Colors FOR SELECT USING (true);
CREATE POLICY "Anyone can view sizes" ON Sizes FOR SELECT USING (true);
CREATE POLICY "Anyone can view shoes" ON Shoes FOR SELECT USING (true);
CREATE POLICY "Anyone can view shoe variants" ON Shoe_Variants FOR SELECT USING (true);
CREATE POLICY "Anyone can view reviews" ON Reviews FOR SELECT USING (true);

-- User-specific policies for addresses
CREATE POLICY "Users can manage their own addresses" ON Addresses
    FOR ALL USING (auth.uid()::text = user_id::text);

-- User-specific policies for orders
CREATE POLICY "Users can view their own orders" ON Orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own orders" ON Orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Order items policies
CREATE POLICY "Users can view order items for their orders" ON Order_Items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM Orders 
            WHERE Orders.order_id = Order_Items.order_id 
            AND auth.uid()::text = Orders.user_id::text
        )
    );

-- Reviews policies
CREATE POLICY "Users can manage their own reviews" ON Reviews
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Admin policies (for sellers and admins)
CREATE POLICY "Sellers can manage suppliers" ON Suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM Users 
            WHERE auth.uid()::text = user_id::text 
            AND role = 'seller'
        )
    );

CREATE POLICY "Sellers can manage imports" ON Imports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM Users 
            WHERE auth.uid()::text = user_id::text 
            AND role = 'seller'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Snevo database schema created successfully in public schema!';
    RAISE NOTICE 'Tables created: Users, Addresses, Categories, Colors, Sizes, Shoes, Shoe_Variants, Suppliers, Imports, Orders, Order_Items, Payments, Reviews';
    RAISE NOTICE 'RLS policies applied for Supabase security';
    RAISE NOTICE 'Sample data inserted for categories, colors, sizes, and suppliers';
END $$;
