// ✅ Validation Schemas (Joi)
// Handles request validation schemas using Joi

import Joi from 'joi';

class ValidationSchemas {
    constructor() {
        // Initialize validation schemas
    }

    // User registration schema
    get userRegistration() {
        return Joi.object({
            username: Joi.string().alphanum().min(3).max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            full_name: Joi.string().min(2).max(100).required()
        });
    }

    // User login schema
    get userLogin() {
        return Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required()
        });
    }

    // Product creation schema
    get productCreation() {
        return Joi.object({
            category_id: Joi.number().integer().positive().required(),
            shoe_name: Joi.string().min(2).max(100).required(),
            description: Joi.string().max(1000),
            base_price: Joi.number().positive().required(),
            image_url: Joi.string().uri()
        });
    }

    // Order creation schema
    get orderCreation() {
        return Joi.object({
            address_id: Joi.number().integer().positive().required(),
            items: Joi.array().items(
                Joi.object({
                    variant_id: Joi.number().integer().positive().required(),
                    quantity: Joi.number().integer().positive().required()
                })
            ).min(1).required()
        });
    }
}

export default new ValidationSchemas();
