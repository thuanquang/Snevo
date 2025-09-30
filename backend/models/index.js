// 🗃️ Models Index - Initialize all models with Supabase client
// Central place to initialize and export all models

// Import all models
const Profile = require('./Profile');
const Address = require('./Address');
const Category = require('./Category');
const Color = require('./Color');
const Product = require('./Product');
const Shoe = require('./Shoe');
const ShoeVariant = require('./ShoeVariant');
const Size = require('./Size');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const Review = require('./Review');
const Import = require('./Import');

// Initialize models with Supabase client
let models = {};

function initializeModels(supabaseClient) {
    if (!supabaseClient) {
        throw new Error('Supabase client is required to initialize models');
    }

    models = {
        Profile: new Profile(supabaseClient),
        Address: new Address(supabaseClient),
        Category: new Category(supabaseClient),
        Color: new Color(supabaseClient),
        Product: new Product(supabaseClient),
        Shoe: new Shoe(supabaseClient),
        ShoeVariant: new ShoeVariant(supabaseClient),
        Size: new Size(supabaseClient),
        Order: new Order(supabaseClient),
        OrderItem: new OrderItem(supabaseClient),
        Payment: new Payment(supabaseClient),
        Review: new Review(supabaseClient),
        Import: new Import(supabaseClient)
    };

    console.log('✅ All models initialized with Supabase client');
    return models;
}

// Get initialized models (throws error if not initialized)
function getModels() {
    if (Object.keys(models).length === 0) {
        throw new Error('Models not initialized. Call initializeModels(supabaseClient) first.');
    }
    return models;
}

// Export individual models (will throw if not initialized)
module.exports = {
    initializeModels,
    getModels,
    // Export model classes for direct use if needed
    Profile,
    Address,
    Category,
    Color,
    Product,
    Shoe,
    ShoeVariant,
    Size,
    Order,
    OrderItem,
    Payment,
    Review,
    Import
};

