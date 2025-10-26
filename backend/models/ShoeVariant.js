// backend/models/ShoeVariant.js
// ⭐ Shoe Variant Model - shoe_variants table (CORE)

import createSupabaseConfig from "../../config/supabase.js";
import BaseModel from "../utils/BaseModel.js";
import constants from "../../config/constants.js";

const supabaseConfig = createSupabaseConfig();

class ShoeVariant extends BaseModel {
  constructor() {
    super(
      constants.DATABASE_TABLES.SHOE_VARIANTS || "shoe_variants",
      "variant_id"
    );

    this.fillable = [
      "shoe_id",
      "color_id",
      "size_id",
      "stock_quantity",
      "sku",
      "variant_price",
      "is_active",
    ];

    this.validationRules = {
      shoe_id: {
        required: true,
        type: "integer",
      },
      color_id: {
        required: true,
        type: "integer",
      },
      size_id: {
        required: true,
        type: "integer",
      },
      stock_quantity: {
        required: false,
        type: "integer",
        min: 0,
      },
      sku: {
        required: true,
        type: "string",
        maxLength: 50,
      },
      variant_price: {
        required: false,
        type: "number",
        min: 0,
      },
      is_active: {
        required: false,
        type: "boolean",
      },
    };
  }

  async findByShoeId(shoeId) {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select(
          `
          *,
          shoes (shoe_id, shoe_name, base_price, image_url),
          colors (color_id, color_name, hex_code),
          sizes (size_id, size_value, size_type)
        `
        )
        .eq("shoe_id", shoeId)
        .eq("is_active", true)
        .order("color_id")
        .order("size_id");

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch variants by shoe ID: ${error.message}`);
    }
  }

  async findBySku(sku) {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select(
          `
          *,
          shoes (shoe_name, base_price),
          colors (color_name, hex_code),
          sizes (size_value, size_type)
        `
        )
        .eq("sku", sku)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch variant by SKU: ${error.message}`);
    }
  }

  async findByComposite(shoeId, colorId, sizeId) {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select(
          `
          *,
          shoes (shoe_name, image_url),
          colors (color_name, hex_code),
          sizes (size_value)
        `
        )
        .eq("shoe_id", shoeId)
        .eq("color_id", colorId)
        .eq("size_id", sizeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to find variant by composite: ${error.message}`);
    }
  }

  async updateStock(variantId, quantity, operation = "set") {
    try {
      let newQuantity;

      if (operation === "set") {
        newQuantity = quantity;
      } else {
        const variant = await this.findById(variantId);
        if (!variant) throw new Error("Variant not found");

        if (operation === "add") {
          newQuantity = (variant.stock_quantity || 0) + quantity;
        } else if (operation === "subtract") {
          newQuantity = Math.max(0, (variant.stock_quantity || 0) - quantity);
        } else {
          throw new Error("Invalid operation");
        }
      }

      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .update({
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("variant_id", variantId)
        .select()
        .single();

      if (error) throw error;

      await this._checkLowStockAlert(variantId, newQuantity);
      return data;
    } catch (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }
  }

  async checkStock(variantId, requestedQuantity) {
    try {
      const variant = await this.findById(variantId);
      if (!variant) throw new Error("Variant not found");

      const available = variant.stock_quantity >= requestedQuantity;

      return {
        available,
        current_stock: variant.stock_quantity,
        requested_quantity: requestedQuantity,
        shortfall: available ? 0 : requestedQuantity - variant.stock_quantity,
      };
    } catch (error) {
      throw new Error(`Failed to check stock: ${error.message}`);
    }
  }

  async findLowStock(threshold = 10) {
    try {
      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .select(
          `
          *,
          shoes (shoe_name, image_url),
          colors (color_name),
          sizes (size_value)
        `
        )
        .lte("stock_quantity", threshold)
        .eq("is_active", true)
        .order("stock_quantity", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch low stock variants: ${error.message}`);
    }
  }

  async bulkCreate(variantsData) {
    try {
      for (const variant of variantsData) {
        this.validate(variant);

        const existing = await this.findByComposite(
          variant.shoe_id,
          variant.color_id,
          variant.size_id
        );

        if (existing) {
          throw new Error(
            `Variant already exists: Shoe ${variant.shoe_id}, Color ${variant.color_id}, Size ${variant.size_id}`
          );
        }
      }

      const { data, error } = await supabaseConfig
        .getAdminClient()
        .from(this.tableName)
        .insert(variantsData)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to bulk create variants: ${error.message}`);
    }
  }

  async _checkLowStockAlert(variantId, currentStock) {
    const LOW_STOCK_THRESHOLD = 10;
    if (currentStock <= LOW_STOCK_THRESHOLD) {
      console.warn(
        `⚠️ LOW STOCK ALERT: Variant ${variantId} has only ${currentStock} units remaining`
      );
    }
  }
  /**
   * ⭐ GENERATE ALL VARIANTS for a shoe
   * Creates all possible combinations of colors × sizes
   */
  async generateAllVariants(shoeId, options = {}) {
    try {
      console.log("🎨 Generating all variants for shoe:", shoeId);

      // Validation
      if (!shoeId || isNaN(parseInt(shoeId))) {
        throw new ValidationError("Invalid shoe ID");
      }

      // Step 1: Check if shoe exists
      const { data: shoe, error: shoeError } = await supabaseConfig
        .getAdminClient()
        .from("shoes")
        .select("shoe_id, shoe_name")
        .eq("shoe_id", shoeId)
        .single();

      if (shoeError || !shoe) {
        throw new NotFoundError(`Shoe with ID ${shoeId} not found`);
      }

      console.log("✅ Shoe found:", shoe.shoe_name);

      // Step 2: Get all active colors
      const { data: colors, error: colorError } = await supabaseConfig
        .getAdminClient()
        .from("colors")
        .select("color_id, color_name")
        .order("color_name");

      if (colorError) throw colorError;

      // Step 3: Get all active sizes
      const { data: sizes, error: sizeError } = await supabaseConfig
        .getAdminClient()
        .from("sizes")
        .select("size_id, size_value")
        .order("size_value");

      if (sizeError) throw sizeError;

      if (!colors || colors.length === 0) {
        throw new ValidationError(
          "No colors available. Please add colors first."
        );
      }

      if (!sizes || sizes.length === 0) {
        throw new ValidationError(
          "No sizes available. Please add sizes first."
        );
      }

      console.log(`📊 Found ${colors.length} colors and ${sizes.length} sizes`);

      // Step 4: Get existing variants to avoid duplicates
      const { data: existingVariants } = await supabaseConfig
        .getAdminClient()
        .from("shoe_variants")
        .select("color_id, size_id")
        .eq("shoe_id", shoeId);

      const existingSet = new Set(
        existingVariants?.map((v) => `${v.color_id}-${v.size_id}`) || []
      );

      console.log("🔍 Existing variants:", existingSet.size);

      // Step 5: Generate all combinations
      const variantsToCreate = [];

      for (const color of colors) {
        for (const size of sizes) {
          const key = `${color.color_id}-${size.size_id}`;

          // Skip if already exists
          if (existingSet.has(key)) {
            console.log(
              `⏭️ Skipping existing variant: ${color.color_name} / ${size.size_value}`
            );
            continue;
          }

          // Generate SKU
          const sku = this.generateSKU(
            shoe.shoe_name,
            color.color_id,
            size.size_id
          );

          variantsToCreate.push({
            shoe_id: shoeId,
            color_id: color.color_id,
            size_id: size.size_id,
            sku: sku,
            stock_quantity: options.defaultStock || 0,
            created_at: new Date().toISOString(),
          });
        }
      }

      if (variantsToCreate.length === 0) {
        return {
          success: true,
          message: "All variants already exist",
          created: 0,
          skipped: existingSet.size,
        };
      }

      console.log(`📦 Creating ${variantsToCreate.length} new variants...`);

      // Step 6: Bulk insert variants
      const { data: createdVariants, error: insertError } = await supabaseConfig
        .getAdminClient()
        .from("shoe_variants")
        .insert(variantsToCreate)
        .select();

      if (insertError) {
        console.error("❌ Insert error:", insertError);
        throw insertError;
      }

      console.log(`✅ Created ${createdVariants.length} variants successfully`);

      return {
        success: true,
        message: `Created ${createdVariants.length} variants`,
        created: createdVariants.length,
        skipped: existingSet.size,
        variants: createdVariants,
      };
    } catch (error) {
      console.error("❌ Generate variants error:", error);
      throw error;
    }
  }

  /**
   * ⭐ GENERATE SPECIFIC VARIANTS
   * Create variants for selected colors and sizes only
   */
  async generateSpecificVariants(shoeId, colorIds, sizeIds, options = {}) {
    try {
      console.log("🎯 Generating specific variants for shoe:", shoeId);
      console.log("Colors:", colorIds);
      console.log("Sizes:", sizeIds);
      console.log("Options:", options); // ⭐ ADD THIS DEBUG
      const { defaultStock = 0, defaultPrice = null } = options;
      // Validation
      if (!shoeId || isNaN(parseInt(shoeId))) {
        throw new ValidationError("Invalid shoe ID");
      }

      if (!Array.isArray(colorIds) || colorIds.length === 0) {
        throw new ValidationError("At least one color must be selected");
      }

      if (!Array.isArray(sizeIds) || sizeIds.length === 0) {
        throw new ValidationError("At least one size must be selected");
      }

      // Get shoe info
      const { data: shoe } = await supabaseConfig
        .getAdminClient()
        .from("shoes")
        .select("shoe_id, shoe_name, base_price")
        .eq("shoe_id", shoeId)
        .single();

      if (!shoe) {
        throw new NotFoundError(`Shoe with ID ${shoeId} not found`);
      }

      // Get selected colors
      const { data: colors } = await supabaseConfig
        .getAdminClient()
        .from("colors")
        .select("color_id, color_name")
        .in("color_id", colorIds);

      // Get selected sizes
      const { data: sizes } = await supabaseConfig
        .getAdminClient()
        .from("sizes")
        .select("size_id, size_value")
        .in("size_id", sizeIds);

      // Get existing variants
      const { data: existingVariants } = await supabaseConfig
        .getAdminClient()
        .from("shoe_variants")
        .select("color_id, size_id")
        .eq("shoe_id", shoeId);

      const existingSet = new Set(
        existingVariants?.map((v) => `${v.color_id}-${v.size_id}`) || []
      );

      // Generate combinations
      const variantsToCreate = [];

      for (const color of colors) {
        for (const size of sizes) {
          const key = `${color.color_id}-${size.size_id}`;

          if (existingSet.has(key)) continue;

          const sku = this.generateSKU(
            shoe.shoe_name,
            color.color_name,
            size.size_value
          );

          variantsToCreate.push({
            shoe_id: shoeId,
            color_id: color.color_id,
            size_id: size.size_id,
            sku: sku,
            stock_quantity: options.defaultStock || 0,
            variant_price:
              defaultPrice !== null ? defaultPrice : shoe.base_price, // ⭐ USE PROVIDED PRICE OR SHOE BASE_PRICE
            created_at: new Date().toISOString(),
          });
        }
      }

      if (variantsToCreate.length === 0) {
        return {
          success: true,
          message: "All selected variants already exist",
          created: 0,
          skipped: existingSet.size,
        };
      }

      // Insert variants
      const { data: createdVariants, error } = await supabaseConfig
        .getAdminClient()
        .from("shoe_variants")
        .insert(variantsToCreate)
        .select();

      if (error) throw error;

      console.log(`✅ Created ${createdVariants.length} specific variants`);

      return {
        success: true,
        message: `Created ${createdVariants.length} variants`,
        created: createdVariants.length,
        skipped: existingSet.size,
        variants: createdVariants,
      };
    } catch (error) {
      console.error("❌ Generate specific variants error:", error);
      throw error;
    }
  }
  /**
   * ⭐ Alternative: Generate SKU with color & size names
   * Example: VOMERO-PLUS-BLACK-42 (Nike Vomero Plus, Black, Size 42)
   */
  generateSKU(shoeName, colorId, sizeId) {
    // Step 1: Clean shoe name
    // - Convert to uppercase
    // - Remove special characters (keep alphanumeric + spaces)
    // - Replace spaces with hyphens
    // - Remove trailing/leading hyphens
    const cleanName = shoeName
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9\s-]/g, "") // Remove special chars, keep letters, numbers, spaces, hyphens
      .replace(/\s+/g, "-") // Replace spaces with single hyphen
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

    // Step 2: Format SKU
    // Format: {SHOE-NAME}-C{colorId}-S{sizeId}
    return `${cleanName}-C${colorId}-S${sizeId}`;
  }


/**
 * ✅ Soft delete variant (preserve stock)
 */
async softDeleteVariant(variantId) {
  try {
    const { data, error } = await supabaseConfig
      .getAdminClient()
      .from(this.tableName)
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('variant_id', variantId)
      .select()
      .single();

    if (error) throw error;
    
    if (!data) {
      throw new Error(`Variant ${variantId} not found`);
    }

    console.log(`✅ Variant ${variantId} soft deleted, stock preserved: ${data.stock_quantity}`);
    return data;
  } catch (error) {
    console.error('Error in softDeleteVariant:', error);
    throw new Error(`Failed to soft delete variant: ${error.message}`);
  }
}

/**
 * ✅ Restore deleted variant
 */
async restoreVariant(variantId) {
  try {
    console.log(`♻️ [RESTORE] Attempting to restore variant ${variantId}...`);
    
    // Step 1: Get variant với full info (including shoe info)
    const { data: variant, error: variantError } = await supabaseConfig
      .getAdminClient()
      .from(this.tableName)
      .select(`
        *,
        shoes!inner (
          shoe_id,
          shoe_name,
          is_active,
          deleted_at
        )
      `)
      .eq('variant_id', variantId)
      .single();
    
    if (variantError || !variant) {
      throw new Error(`Variant ${variantId} not found`);
    }
    
    // Step 2: Validate - Variant phải đang bị xóa
    if (variant.is_active) {
      throw new Error(`Variant ${variantId} is already active`);
    }
    
    // Step 3: CHECK SHOE STATUS - Shoe phải ĐANG ACTIVE
    const shoe = variant.shoes;
    if (!shoe.is_active) {
      throw new Error(
        `Cannot restore variant: Shoe "${shoe.shoe_name}" (ID: ${shoe.shoe_id}) is deleted. ` +
        `Please restore the shoe first before restoring its variants.`
      );
    }
    
    // Step 4: CHECK DELETION TIMESTAMP
    // Chỉ restore variants bị xóa CÙNG hoặc SAU shoe
    // Variants xóa TRƯỚC shoe = xóa riêng lẻ = KHÔNG restore
    if (shoe.deleted_at && variant.deleted_at) {
      const shoeDeletedTime = new Date(shoe.deleted_at);
      const variantDeletedTime = new Date(variant.deleted_at);
      
      if (variantDeletedTime < shoeDeletedTime) {
        throw new Error(
          `Cannot restore variant: This variant was deleted individually BEFORE the shoe was deleted. ` +
          `Variant deleted at: ${variant.deleted_at}, Shoe deleted at: ${shoe.deleted_at}. ` +
          `This variant must be restored manually if needed.`
        );
      }
    }
    
    // Step 5: All checks passed - Restore variant
    const { data: restoredVariant, error: updateError } = await supabaseConfig
      .getAdminClient()
      .from(this.tableName)
      .update({
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('variant_id', variantId)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    console.log(`✅ [RESTORE] Variant ${variantId} restored successfully, stock: ${restoredVariant.stock_quantity}`);
    
    return restoredVariant;
    
  } catch (error) {
    console.error('❌ [RESTORE] Error:', error.message);
    throw error;
  }
}

/**
 * ✅ Get deleted variants với shoe info
 */
async getDeletedVariants(shoeId) {
  try {
    const { data, error } = await supabaseConfig
      .getAdminClient()
      .from(this.tableName)
      .select(`
        *,
        colors (color_id, color_name, hex_code),
        sizes (size_id, size_value, size_type),
        shoes!inner (
          shoe_id,
          shoe_name,
          is_active,
          deleted_at
        )
      `)
      .eq('shoe_id', shoeId)
      .eq('is_active', false)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (error) throw error;
    
    // Thêm metadata về khả năng restore
    const enrichedData = (data || []).map(variant => {
      const shoe = variant.shoes;
      const canRestore = shoe.is_active && 
        (!shoe.deleted_at || new Date(variant.deleted_at) >= new Date(shoe.deleted_at));
      
      return {
        ...variant,
        can_restore: canRestore,
        restore_blocker: !canRestore 
          ? (!shoe.is_active 
              ? 'Shoe is deleted' 
              : 'Deleted before shoe deletion')
          : null
      };
    });
    
    console.log(`✅ Found ${enrichedData.length} deleted variants for shoe ${shoeId}`);
    return enrichedData;
    
  } catch (error) {
    console.error('Error in getDeletedVariants:', error);
    throw new Error(`Failed to get deleted variants: ${error.message}`);
  }
}
/**
 * ✅ Get ALL shoes with their deleted variants
 * Trả về danh sách shoes (bao gồm cả deleted) kèm deleted variants
 */
async getAllShoesWithDeletedVariants() {
  try {
    console.log('🔍 Getting all shoes with deleted variants...');
    
    // Step 1: Get all shoes (both active and deleted)
    const { data: allShoes, error: shoeError } = await supabaseConfig
      .getAdminClient()
      .from('shoes')
      .select('shoe_id, shoe_name, base_price, image_url, is_active, deleted_at')
      .order('shoe_id', { ascending: false });
    
    if (shoeError) throw shoeError;
    
    // Step 2: Get ALL deleted variants for these shoes
    const shoeIds = allShoes.map(s => s.shoe_id);
    
    const { data: deletedVariants, error: variantError } = await supabaseConfig
      .getAdminClient()
      .from(this.tableName)
      .select(`
        *,
        colors (color_id, color_name, hex_code),
        sizes (size_id, size_value, size_type),
        shoes!inner (shoe_id, shoe_name, is_active, deleted_at)
      `)
      .in('shoe_id', shoeIds)
      .eq('is_active', false)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (variantError) throw variantError;
    
    // Step 3: Group variants by shoe
    const result = allShoes
      .map(shoe => {
        // Get deleted variants for this shoe
        const shoeDeletedVariants = (deletedVariants || [])
          .filter(v => v.shoe_id === shoe.shoe_id)
          .map(variant => {
            // Add restore metadata
            const canRestore = shoe.is_active && 
              (!shoe.deleted_at || new Date(variant.deleted_at) >= new Date(shoe.deleted_at));
            
            return {
              ...variant,
              can_restore: canRestore,
              restore_blocker: !canRestore
                ? (!shoe.is_active
                    ? 'Shoe is deleted'
                    : 'Deleted before shoe deletion')
                : null
            };
          });
        
        return {
          shoe,
          deleted_variants: shoeDeletedVariants,
          deleted_count: shoeDeletedVariants.length
        };
      })
      .filter(item => item.deleted_count > 0);  // CHỈ trả về shoes có deleted variants
    
    console.log(`✅ Found ${result.length} shoes with deleted variants`);
    return result;
    
  } catch (error) {
    console.error('Error in getAllShoesWithDeletedVariants:', error);
    throw new Error(`Failed to get shoes with deleted variants: ${error.message}`);
  }
}


}
// Export CLASS - OOP standard
export default ShoeVariant;
