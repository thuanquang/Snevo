// 👨‍💼 Profile Controller - Manage user profiles
// Handles user profile management and personal information

import Profile from '../models/Profile.js';

class ProfileController {
    constructor(models = {}) {
        // Initialize profile controller with models
        this.models = models;
        this.profileModel = models.Profile || new Profile();
    }

    // Set models (for dependency injection)
    setModels(models) {
        this.models = models;
        this.profileModel = models.Profile || new Profile();
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

    // Get user profile
    async getProfile(req, res) {
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const userId = req.user.id;
            console.log('📋 Fetching profile for user:', userId);

            // Get profile from database
            const profile = await this.profileModel.findByUserId(userId);

            if (!profile) {
                console.log('❌ Profile not found for user:', userId);
                return this.sendJson(res, {
                    success: false,
                    message: 'Profile not found'
                }, 404);
            }

            console.log('✅ Profile fetched successfully:', profile);

            // Return profile data
            return this.sendJson(res, {
                success: true,
                user: profile,
                message: 'Profile fetched successfully'
            }, 200);

        } catch (error) {
            console.error('❌ Error fetching profile:', error);
            return this.sendJson(res, {
                success: false,
                message: 'Failed to fetch profile',
                error: error.message
            }, 500);
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const userId = req.user.id;
            const updates = req.body || {};  // ⭐ FIX: Default to empty object if undefined

            console.log('📝 Updating profile for user:', userId);
            console.log('📝 Update data:', updates);

             // ⭐ AVATAR UPLOAD PATHS
             // This controller supports TWO update paths:
             // 1. JSON path (no file): Avatar fields omitted from request
             // 2. Multipart path (with file): Middleware converts image_url to avatar_url
            
             // Handle multipart avatar upload - map image_url to avatar_url
             if (updates && updates.image_url) {
                updates.avatar_url = updates.image_url;
                delete updates.image_url;
                console.log('📤 Avatar uploaded from multipart, URL:', updates.avatar_url);
            }

            // Validate update data
            if (!updates || Object.keys(updates).length === 0) {
                return this.sendJson(res, {
                    success: false,
                    message: 'No update data provided'
                }, 400);
            }

            // Fields that are allowed to be updated
            // ⭐ avatar_url is OPTIONAL - can be updated or omitted
            const allowedFields = [
                'username', 'full_name', 'phone', 
                'date_of_birth', 'gender', 'avatar_url'
            ];

            // Filter to only allowed fields
            const filteredUpdates = {};
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    filteredUpdates[field] = updates[field];
                }
            }

            // Validate that there are fields to update
            if (Object.keys(filteredUpdates).length === 0) {
                return this.sendJson(res, {
                    success: false,
                    message: 'No valid fields to update'
                }, 400);
            }

            // Validate required fields if they are being updated
            if (filteredUpdates.full_name !== undefined && (!filteredUpdates.full_name || filteredUpdates.full_name.trim().length < 2)) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Full name must be at least 2 characters long'
                }, 400);
            }

            if (filteredUpdates.username !== undefined && (!filteredUpdates.username || filteredUpdates.username.trim().length < 3)) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Username must be at least 3 characters long'
                }, 400);
            }

            // Validate phone format if provided
            if (filteredUpdates.phone && filteredUpdates.phone !== '' && !/^[0-9+\-\s()]{10,20}$/.test(filteredUpdates.phone)) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Invalid phone number format'
                }, 400);
            }

             // Validate avatar URL - support Supabase Storage URLs + external URLs
             if (filteredUpdates.avatar_url && filteredUpdates.avatar_url !== '') {
                const isSupabaseUrl = filteredUpdates.avatar_url.includes('supabase.co') || 
                                    filteredUpdates.avatar_url.includes('storage');
                const isExternalUrl = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|webp\?.*|googleusercontent\.com.*|gravatar\.com.*|github\.com.*|facebook\.com.*)$/i
                                    .test(filteredUpdates.avatar_url);
                
                if (!isSupabaseUrl && !isExternalUrl) {
                    return this.sendJson(res, {
                        success: false,
                        message: 'Invalid avatar URL format'
                    }, 400);
                }
            }

            // Update profile in database
            const updatedProfile = await this.profileModel.updateByUserId(userId, filteredUpdates);

            console.log('✅ Profile updated successfully:', updatedProfile);

            // Return updated profile
            return this.sendJson(res, {
                success: true,
                profile: updatedProfile,
                message: 'Profile updated successfully'
            }, 200);

        } catch (error) {
            console.error('❌ Error updating profile:', error);
            
            // Check for specific database errors
            if (error.message && error.message.includes('duplicate key')) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Username already taken'
                }, 409);
            }

            return this.sendJson(res, {
                success: false,
                message: 'Failed to update profile',
                error: error.message
            }, 500);
        }
    }

    // Delete user profile
    async deleteProfile(req, res) {
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                return this.sendJson(res, {
                    success: false,
                    message: 'Authentication required'
                }, 401);
            }

            const userId = req.user.id;
            console.log('🗑️ Deleting profile for user:', userId);

            // Delete profile from database
            await this.profileModel.deleteByUserId(userId);

            console.log('✅ Profile deleted successfully');

            // Return success response
            return this.sendJson(res, {
                success: true,
                message: 'Profile deleted successfully'
            }, 200);

        } catch (error) {
            console.error('❌ Error deleting profile:', error);
            return this.sendJson(res, {
                success: false,
                message: 'Failed to delete profile',
                error: error.message
            }, 500);
        }
    }
}

export default ProfileController;
