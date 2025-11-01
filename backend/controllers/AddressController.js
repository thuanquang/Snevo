// 🏠 Address Controller - CRUD addresses for users
// Handles user address management

class AddressController {
    constructor(models) {
        this.models = models;
    }

    // Helper method to send JSON response
    sendJson(res, data, statusCode = 200) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify(data));
    }

    // Get all addresses for user
    async getAddresses(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const addresses = await this.models.Address.findByUserId(req.user.id);

            return this.sendJson(res, {
                success: true,
                addresses: addresses,
                count: addresses.length
            });
        } catch (error) {
            console.error('Error getting addresses:', error);
            return this.sendJson(res, {
                success: false,
                message: 'Failed to fetch addresses',
                error: error.message
            }, 500);
        }
    }

    // Get specific address
    async getAddress(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const addressId = req.params.id;
            if (!addressId) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Address ID is required'
                }, 400);
            }

            const address = await this.models.Address.findById(addressId);

            if (!address) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Address not found'
                }, 404);
            }

            // Verify the address belongs to the user
            if (address.user_id !== req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Unauthorized access to address'
                }, 403);
            }

            return this.sendJson(res, {
                success: true,
                address: address
            });
        } catch (error) {
            console.error('Error getting address:', error);
            return this.sendJson(res, {
                success: false,
                message: 'Failed to fetch address',
                error: error.message
            }, 500);
        }
    }

    // Create new address
    async createAddress(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const { recipient_name, phone_number, street, ward, district, city, state, zip_code, country, is_default } = req.body;

            // Validate required fields
            if (!recipient_name || !phone_number || !street || !ward || !district || !city || !state) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Missing required fields: recipient_name, phone_number, street, ward, district, city, state'
                }, 400);
            }

            const addressData = {
                recipient_name,
                phone_number,
                street,
                ward,
                district,
                city,
                state,
                zip_code: zip_code || null,
                country: country || 'Vietnam',
                is_default: is_default === true || is_default === 'true'
            };

            const newAddress = await this.models.Address.createForUser(req.user.id, addressData);

            return this.sendJson(res, {
                success: true,
                message: 'Address created successfully',
                address: newAddress
            }, 201);
        } catch (error) {
            console.error('Error creating address:', error);
            return this.sendJson(res, {
                success: false,
                message: 'Failed to create address',
                error: error.message
            }, 500);
        }
    }

    // Update address
    async updateAddress(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const addressId = req.params.id;
            if (!addressId) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Address ID is required'
                }, 400);
            }

            // Verify the address exists and belongs to the user
            const existingAddress = await this.models.Address.findById(addressId);
            if (!existingAddress) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Address not found'
                }, 404);
            }

            if (existingAddress.user_id !== req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Unauthorized access to address'
                }, 403);
            }

            // Build update data from request body
            const updateData = {};
            const allowedFields = ['recipient_name', 'phone_number', 'street', 'ward', 'district', 'city', 'state', 'zip_code', 'country', 'is_default'];
            
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    if (field === 'is_default') {
                        updateData[field] = req.body[field] === true || req.body[field] === 'true';
                    } else {
                        updateData[field] = req.body[field];
                    }
                }
            }

            if (Object.keys(updateData).length === 0) {
                return this.sendJson(res, {
                    success: false,
                    message: 'No valid fields to update'
                }, 400);
            }

            const updatedAddress = await this.models.Address.updateForUser(req.user.id, addressId, updateData);

            return this.sendJson(res, {
                success: true,
                message: 'Address updated successfully',
                address: updatedAddress
            });
        } catch (error) {
            console.error('Error updating address:', error);
            return this.sendJson(res, {
                success: false,
                message: 'Failed to update address',
                error: error.message
            }, 500);
        }
    }

    // Delete address
    async deleteAddress(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const addressId = req.params.id;
            if (!addressId) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Address ID is required'
                }, 400);
            }

            // Verify the address exists and belongs to the user
            const existingAddress = await this.models.Address.findById(addressId);
            if (!existingAddress) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Address not found'
                }, 404);
            }

            if (existingAddress.user_id !== req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Unauthorized access to address'
                }, 403);
            }

            await this.models.Address.deleteForUser(req.user.id, addressId);

            return this.sendJson(res, {
                success: true,
                message: 'Address deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting address:', error);
            return this.sendJson(res, {
                success: false,
                message: 'Failed to delete address',
                error: error.message
            }, 500);
        }
    }
}

export default AddressController;
