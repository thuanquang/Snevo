# 📡 API Documentation

## Authentication Endpoints

### POST /api/auth/login
Login user with email and password.

### POST /api/auth/register
Register new user.

### POST /api/auth/logout
Logout current user.

## Product Endpoints

### GET /api/products
Get all products with optional filtering.

### GET /api/products/:id
Get specific product by ID.

### POST /api/products
Create new product (admin only).

## Order Endpoints

### GET /api/orders
Get user's orders.

### POST /api/orders
Create new order.

### PUT /api/orders/:id/status
Update order status.

## User Endpoints

### GET /api/profiles
Get user profile.

### PUT /api/profiles
Update user profile.

## Admin Endpoints

### GET /api/admin/dashboard
Get admin dashboard data.

### GET /api/admin/statistics
Get system statistics.
