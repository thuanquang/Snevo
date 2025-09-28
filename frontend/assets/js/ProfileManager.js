/**
 * ProfileManager - OOP Profile management class
 * Handles user profile operations, address management, and settings
 */

import { apiClient } from './ApiClient.js';

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.addresses = [];
        this.notificationSettings = {};
        this.isInitialized = false;
    }

    /**
     * Initialize profile manager
     */
    async initialize() {
        try {
            await this.loadUserProfile();
            await this.loadAddresses();
            await this.loadNotificationSettings();
            this.isInitialized = true;
            console.log('ProfileManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ProfileManager:', error);
            throw error;
        }
    }

    /**
     * Load user profile data
     */
    async loadUserProfile() {
        try {
            const response = await apiClient.get('/auth/profile');
            
            if (response.success) {
                this.currentUser = response.data.user;
                return this.currentUser;
            } else {
                throw new Error(response.error || 'Failed to load profile');
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        try {
            const response = await apiClient.put('/auth/profile', updates);
            
            if (response.success) {
                this.currentUser = { ...this.currentUser, ...response.data.profile };
                return this.currentUser;
            } else {
                throw new Error(response.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    /**
     * Load user addresses
     */
    async loadAddresses() {
        try {
            const response = await apiClient.get('/auth/addresses');
            
            if (response.success) {
                this.addresses = response.data.addresses || [];
                return this.addresses;
            } else {
                throw new Error(response.error || 'Failed to load addresses');
            }
        } catch (error) {
            console.error('Error loading addresses:', error);
            throw error;
        }
    }

    /**
     * Add new address
     */
    async addAddress(addressData) {
        try {
            const response = await apiClient.post('/auth/addresses', addressData);
            
            if (response.success) {
                this.addresses.push(response.data.address);
                return response.data.address;
            } else {
                throw new Error(response.error || 'Failed to add address');
            }
        } catch (error) {
            console.error('Error adding address:', error);
            throw error;
        }
    }

    /**
     * Update address
     */
    async updateAddress(addressId, updates) {
        try {
            const response = await apiClient.put(`/auth/addresses/${addressId}`, updates);
            
            if (response.success) {
                const index = this.addresses.findIndex(addr => addr.address_id === addressId);
                if (index !== -1) {
                    this.addresses[index] = { ...this.addresses[index], ...updates };
                }
                return response.data.address;
            } else {
                throw new Error(response.error || 'Failed to update address');
            }
        } catch (error) {
            console.error('Error updating address:', error);
            throw error;
        }
    }

    /**
     * Delete address
     */
    async deleteAddress(addressId) {
        try {
            const response = await apiClient.delete(`/auth/addresses/${addressId}`);
            
            if (response.success) {
                this.addresses = this.addresses.filter(addr => addr.address_id !== addressId);
                return true;
            } else {
                throw new Error(response.error || 'Failed to delete address');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            throw error;
        }
    }

    /**
     * Change user password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await apiClient.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            
            if (response.success) {
                return true;
            } else {
                throw new Error(response.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    /**
     * Load notification settings
     */
    async loadNotificationSettings() {
        try {
            const response = await apiClient.get('/auth/notifications');
            
            if (response.success) {
                this.notificationSettings = response.data.settings || {};
                return this.notificationSettings;
            } else {
                // If no settings exist, use defaults
                this.notificationSettings = {
                    email_notifications: true,
                    order_updates: true,
                    product_recommendations: true,
                    marketing_emails: false
                };
                return this.notificationSettings;
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
            // Use defaults on error
            this.notificationSettings = {
                email_notifications: true,
                order_updates: true,
                product_recommendations: true,
                marketing_emails: false
            };
            return this.notificationSettings;
        }
    }

    /**
     * Update notification settings
     */
    async updateNotificationSettings(settings) {
        try {
            const response = await apiClient.put('/auth/notifications', settings);
            
            if (response.success) {
                this.notificationSettings = { ...this.notificationSettings, ...settings };
                return this.notificationSettings;
            } else {
                throw new Error(response.error || 'Failed to update notification settings');
            }
        } catch (error) {
            console.error('Error updating notification settings:', error);
            throw error;
        }
    }

    /**
     * Get user orders
     */
    async getOrders(page = 1, limit = 10) {
        try {
            const response = await apiClient.get(`/auth/orders?page=${page}&limit=${limit}`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to load orders');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            throw error;
        }
    }

    /**
     * Get user reviews
     */
    async getReviews(page = 1, limit = 10) {
        try {
            const response = await apiClient.get(`/auth/reviews?page=${page}&limit=${limit}`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to load reviews');
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            throw error;
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get user addresses
     */
    getAddresses() {
        return this.addresses;
    }

    /**
     * Get notification settings
     */
    getNotificationSettings() {
        return this.notificationSettings;
    }

    /**
     * Check if profile is complete
     */
    isProfileComplete() {
        if (!this.currentUser) return false;
        
        const requiredFields = ['full_name', 'username', 'email'];
        return requiredFields.every(field => this.currentUser[field]);
    }

    /**
     * Get profile completion percentage
     */
    getProfileCompletionPercentage() {
        if (!this.currentUser) return 0;
        
        const allFields = [
            'full_name', 'username', 'email', 'phone', 
            'date_of_birth', 'gender', 'avatar_url'
        ];
        
        const completedFields = allFields.filter(field => this.currentUser[field]);
        return Math.round((completedFields.length / allFields.length) * 100);
    }

    /**
     * Get default address
     */
    getDefaultAddress() {
        return this.addresses.find(addr => addr.is_default) || this.addresses[0];
    }

    /**
     * Set default address
     */
    async setDefaultAddress(addressId) {
        try {
            // First, unset all other defaults
            await Promise.all(
                this.addresses
                    .filter(addr => addr.address_id !== addressId && addr.is_default)
                    .map(addr => this.updateAddress(addr.address_id, { is_default: false }))
            );
            
            // Then set the new default
            await this.updateAddress(addressId, { is_default: true });
            
            return true;
        } catch (error) {
            console.error('Error setting default address:', error);
            throw error;
        }
    }

    /**
     * Validate address data
     */
    validateAddressData(addressData) {
        const requiredFields = ['street', 'city', 'state', 'country', 'zip_code'];
        const missingFields = requiredFields.filter(field => !addressData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        return true;
    }

    /**
     * Validate password change data
     */
    validatePasswordChangeData(passwordData) {
        const { current_password, new_password, confirm_password } = passwordData;
        
        if (!current_password) {
            throw new Error('Current password is required');
        }
        
        if (!new_password) {
            throw new Error('New password is required');
        }
        
        if (new_password.length < 8) {
            throw new Error('New password must be at least 8 characters long');
        }
        
        if (new_password !== confirm_password) {
            throw new Error('New passwords do not match');
        }
        
        return true;
    }

    /**
     * Format address for display
     */
    formatAddress(address) {
        return `${address.street}, ${address.city}, ${address.state} ${address.zip_code}, ${address.country}`;
    }

    /**
     * Get profile statistics
     */
    getProfileStats() {
        return {
            completionPercentage: this.getProfileCompletionPercentage(),
            addressCount: this.addresses.length,
            hasDefaultAddress: !!this.getDefaultAddress(),
            isProfileComplete: this.isProfileComplete()
        };
    }

    /**
     * Export profile data
     */
    async exportProfileData() {
        try {
            const [orders, reviews] = await Promise.all([
                this.getOrders(1, 1000), // Get all orders
                this.getReviews(1, 1000) // Get all reviews
            ]);
            
            return {
                profile: this.currentUser,
                addresses: this.addresses,
                notificationSettings: this.notificationSettings,
                orders: orders.data || [],
                reviews: reviews.data || [],
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error exporting profile data:', error);
            throw error;
        }
    }

    /**
     * Reset profile manager
     */
    reset() {
        this.currentUser = null;
        this.addresses = [];
        this.notificationSettings = {};
        this.isInitialized = false;
    }
}

// Create a singleton instance for use across the application
const profileManager = new ProfileManager();

// Export for global use
window.ProfileManager = ProfileManager;
window.profileManager = profileManager;

export default ProfileManager;
export { profileManager };
