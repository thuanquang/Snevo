# 🗃️ Database Schema Documentation

## Tables

### profiles
User profile information linked to Supabase auth.users.

### addresses
User addresses for shipping and billing.

### categories
Product categories for organization.

### shoes
Main product table with shoe information.

### colors
Available colors for shoe variants.

### sizes
Available sizes for shoe variants.

### shoe_variants
Product variants with stock and pricing.

### imports
Inventory import records.

### orders
Customer orders.

### order_items
Order line items.

### payments
Payment records.

### reviews
Product reviews and ratings.

## Relationships

- profiles → addresses (1:many)
- categories → shoes (1:many)
- shoes → shoe_variants (1:many)
- colors → shoe_variants (1:many)
- sizes → shoe_variants (1:many)
- orders → order_items (1:many)
- orders → payments (1:many)
- shoes → reviews (1:many)
