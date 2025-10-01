// 🗃️ Models Index - Initialize all models with Supabase client
// Central place to initialize and export all models

// Import all models
import Profile from './Profile.js';
import Address from './Address.js';
import Category from './Category.js';
import Color from './Color.js';
import Product from './Product.js';
import Shoe from './Shoe.js';
import ShoeVariant from './ShoeVariant.js';
import Size from './Size.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Payment from './Payment.js';
import Review from './Review.js';
import Import from './Import.js';

// Initialize models with Supabase client
let models = {};

function initializeModels() {
    // Models now initialize their own supabase config

    models = {
        Profile: new Profile(),
        Address: new Address(),
        Category: new Category(),
        Color: new Color(),
        Product: new Product(),
        Shoe: new Shoe(),
        ShoeVariant: new ShoeVariant(),
        Size: new Size(),
        Order: new Order(),
        OrderItem: new OrderItem(),
        Payment: new Payment(),
        Review: new Review(),
        Import: new Import()
    };

    console.log('✅ All models initialized with Supabase client');
    return models;
}

// Get initialized models (throws error if not initialized)
function getModels() {
    if (Object.keys(models).length === 0) {
        throw new Error('Models not initialized. Call initializeModels() first.');
    }
    return models;
}

// Export individual models (will throw if not initialized)
export {
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

// Also export as default for compatibility
export default {
    initializeModels,
    getModels,
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

