-- Nike Database Schema Creation Script for Supabase
-- Schema: Db_nike

-- Tạo schema nếu chưa tồn tại
CREATE SCHEMA IF NOT EXISTS db_nike;

-- Set search path to use the Db_nike schema
SET search_path TO db_nike;

-- 1. Nhóm Bảng Quản Lý Người Dùng

-- Bảng Users
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('customer', 'seller')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Addresses
CREATE TABLE Addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Vietnam',
    zip_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 2. Nhóm Bảng Quản Lý Sản Phẩm (Giày)

-- Bảng Categories
CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Bảng Shoes
CREATE TABLE Shoes (
    shoe_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    shoe_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    image_url VARCHAR(255),
    FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE RESTRICT
);

-- Bảng Colors
CREATE TABLE Colors (
    color_id SERIAL PRIMARY KEY,
    color_name VARCHAR(50) NOT NULL UNIQUE
);

-- Bảng Sizes
CREATE TABLE Sizes (
    size_id SERIAL PRIMARY KEY,
    size_value VARCHAR(10) NOT NULL UNIQUE
);

-- Bảng Shoe_Variants
CREATE TABLE Shoe_Variants (
    variant_id SERIAL PRIMARY KEY,
    shoe_id INTEGER NOT NULL,
    color_id INTEGER NOT NULL,
    size_id INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    sku VARCHAR(50) UNIQUE NOT NULL,
    variant_price DECIMAL(10,2) CHECK (variant_price >= 0),
    FOREIGN KEY (shoe_id) REFERENCES Shoes(shoe_id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES Colors(color_id) ON DELETE RESTRICT,
    FOREIGN KEY (size_id) REFERENCES Sizes(size_id) ON DELETE RESTRICT,
    UNIQUE(shoe_id, color_id, size_id)
);

-- 3. Nhóm Bảng Quản Lý Nhập Hàng (Cho Người Bán)

-- Bảng Suppliers
CREATE TABLE Suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100),
    phone VARCHAR(20)
);

-- Bảng Imports
CREATE TABLE Imports (
    import_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    quantity_imported INTEGER NOT NULL CHECK (quantity_imported > 0),
    import_price DECIMAL(10,2) NOT NULL CHECK (import_price >= 0),
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES Shoe_Variants(variant_id) ON DELETE RESTRICT
);

-- 4. Nhóm Bảng Quản Lý Bán Hàng (Cho Khách Hàng)

-- Bảng Orders
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    address_id INTEGER NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (address_id) REFERENCES Addresses(address_id) ON DELETE RESTRICT
);

-- Bảng Order_Items
CREATE TABLE Order_Items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit >= 0),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES Shoe_Variants(variant_id) ON DELETE RESTRICT
);

-- Bảng Payments
CREATE TABLE Payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'e_wallet')) NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount >= 0),
    payment_date TIMESTAMP NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE RESTRICT
);

-- 5. Nhóm Bảng Bổ Sung (Tùy Chọn)

-- Bảng Reviews
CREATE TABLE Reviews (
    review_id SERIAL PRIMARY KEY,
    shoe_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shoe_id) REFERENCES Shoes(shoe_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE(shoe_id, user_id) -- Mỗi user chỉ có thể review 1 lần cho 1 sản phẩm
);

-- Tạo các Index để tối ưu hiệu suất truy vấn

-- Index cho bảng Users
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_role ON Users(role);

-- Index cho bảng Addresses
CREATE INDEX idx_addresses_user_id ON Addresses(user_id);
CREATE INDEX idx_addresses_is_default ON Addresses(is_default);

-- Index cho bảng Shoes
CREATE INDEX idx_shoes_category_id ON Shoes(category_id);
CREATE INDEX idx_shoes_name ON Shoes(shoe_name);

-- Index cho bảng Shoe_Variants
CREATE INDEX idx_variants_shoe_id ON Shoe_Variants(shoe_id);
CREATE INDEX idx_variants_sku ON Shoe_Variants(sku);
CREATE INDEX idx_variants_stock ON Shoe_Variants(stock_quantity);

-- Index cho bảng Imports
CREATE INDEX idx_imports_user_id ON Imports(user_id);
CREATE INDEX idx_imports_supplier_id ON Imports(supplier_id);
CREATE INDEX idx_imports_variant_id ON Imports(variant_id);
CREATE INDEX idx_imports_date ON Imports(import_date);

-- Index cho bảng Orders
CREATE INDEX idx_orders_user_id ON Orders(user_id);
CREATE INDEX idx_orders_status ON Orders(status);
CREATE INDEX idx_orders_date ON Orders(order_date);

-- Index cho bảng Order_Items
CREATE INDEX idx_order_items_order_id ON Order_Items(order_id);
CREATE INDEX idx_order_items_variant_id ON Order_Items(variant_id);

-- Index cho bảng Payments
CREATE INDEX idx_payments_order_id ON Payments(order_id);
CREATE INDEX idx_payments_status ON Payments(status);
CREATE INDEX idx_payments_date ON Payments(payment_date);

-- Index cho bảng Reviews
CREATE INDEX idx_reviews_shoe_id ON Reviews(shoe_id);
CREATE INDEX idx_reviews_user_id ON Reviews(user_id);
CREATE INDEX idx_reviews_rating ON Reviews(rating);

-- Trigger function để tự động cập nhật stock khi nhập hàng
CREATE OR REPLACE FUNCTION update_stock_on_import()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Shoe_Variants 
    SET stock_quantity = stock_quantity + NEW.quantity_imported
    WHERE variant_id = NEW.variant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
CREATE TRIGGER trigger_update_stock_on_import
    AFTER INSERT ON Imports
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_import();

-- Trigger function để kiểm tra và trừ stock khi đặt hàng
CREATE OR REPLACE FUNCTION check_and_update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra tồn kho
    IF (SELECT stock_quantity FROM Shoe_Variants WHERE variant_id = NEW.variant_id) < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for variant_id: %. Available: %, Requested: %', 
            NEW.variant_id, 
            (SELECT stock_quantity FROM Shoe_Variants WHERE variant_id = NEW.variant_id),
            NEW.quantity;
    END IF;
    
    -- Trừ tồn kho
    UPDATE Shoe_Variants 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE variant_id = NEW.variant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho việc đặt hàng
CREATE TRIGGER trigger_check_and_update_stock_on_order
    BEFORE INSERT ON Order_Items
    FOR EACH ROW
    EXECUTE FUNCTION check_and_update_stock_on_order();

-- Function để hoàn lại tồn kho khi hủy đơn hàng
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ hoàn lại stock khi đơn hàng chuyển từ trạng thái khác sang 'cancelled'
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE Shoe_Variants 
        SET stock_quantity = stock_quantity + oi.quantity
        FROM Order_Items oi
        WHERE oi.order_id = NEW.order_id 
        AND Shoe_Variants.variant_id = oi.variant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho việc hủy đơn hàng
CREATE TRIGGER trigger_restore_stock_on_cancel
    AFTER UPDATE ON Orders
    FOR EACH ROW
    EXECUTE FUNCTION restore_stock_on_cancel();
