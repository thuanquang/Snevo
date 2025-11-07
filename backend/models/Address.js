// 🏠 Address Model - addresses table
// Handles user address data management

import BaseModel from "../utils/BaseModel.js";

class Address extends BaseModel {
  constructor() {
    super("addresses", "address_id");
  }

  // Get addresses by user ID
  async findByUserId(userId) {
    try {
      const { data, error } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error finding addresses by user ID:", error);
      throw error;
    }
  }
  // Address.js - Model
  async findOne(filters) {
    try {
      const { data, error } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select("*")
        .eq("address_id", filters.address_id)
        .eq("user_id", filters.user_id)
        .single(); // ← single() cho một row

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error finding address:", error);
      throw error;
    }
  }
  // Get default address for user
  async findDefaultByUserId(userId) {
    try {
      const { data, error } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }
      return data || null;
    } catch (error) {
      console.error("Error finding default address:", error);
      throw error;
    }
  }

  // Set default address
  async setDefault(userId, addressId) {
    try {
      // First, unset all default addresses for this user
      const { error: unsetError } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .update({ is_default: false })
        .eq("user_id", userId);

      if (unsetError) throw unsetError;

      // Then set the specified address as default
      const { data, error } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .update({ is_default: true })
        .eq("address_id", addressId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error setting default address:", error);
      throw error;
    }
  }

  // Create address with user validation
  async createForUser(userId, addressData) {
    try {
      // If this is marked as default, unset other defaults first
      if (addressData.is_default) {
        await this.supabaseConfig
          .getAdminClient()
          .from(this.tableName)
          .update({ is_default: false })
          .eq("user_id", userId);
      }

      const { data, error } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .insert({
          ...addressData,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating address:", error);
      throw error;
    }
  }

  // Update address with user validation
  async updateForUser(userId, addressId, addressData) {
    try {
      // If this is being marked as default, unset other defaults first
      if (addressData.is_default) {
        await this.supabaseConfig
          .getAdminClient()
          .from(this.tableName)
          .update({ is_default: false })
          .eq("user_id", userId)
          .neq("address_id", addressId);
      }

      const { data, error } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .update(addressData)
        .eq("address_id", addressId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating address:", error);
      throw error;
    }
  }

  // Delete address with user validation
  async deleteForUser(userId, addressId) {
    try {
      const { data, error } = await this.supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .delete()
        .eq("address_id", addressId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error deleting address:", error);
      throw error;
    }
  }
}

export default Address;
