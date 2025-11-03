// frontend/assets/js/admin/AdminVariantGenerator.js
/**
 * AdminVariantGenerator - Handles variant generation UI
 * ✅ Bỏ check shoe - dùng context từ shoe details modal
 */
class AdminVariantGenerator {
  constructor(core, productRenderer) {
    this.core = core;
    this.productRenderer = productRenderer;
  }

  /**
   * Setup variant generator listeners
   */
  setupVariantGeneratorListeners() {
    // ✅ Check if already setup
    if (this._listenersSetup) {
      console.log("⚠️ Variant generator listeners already setup, skipping...");
      return;
    }

    const generateBtn = document.getElementById("generateVariantsBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        this.openVariantGenerator();
      });
    }

    // ✅ Submit button - ONLY ADD ONCE
    document.addEventListener("click", (e) => {
      const modal = document.getElementById("variantGeneratorModal");
      if (modal && modal.classList.contains("show")) {
        const submitBtn = e.target.closest(
          "#variantGeneratorModal .btn-primary"
        );
        if (submitBtn && submitBtn.textContent.includes("Generate")) {
          e.preventDefault();
          this.submitGenerateVariants();
        }
      }
    });

    // ✅ Mark as setup
    this._listenersSetup = true;
    console.log("✅ Variant generator listeners setup complete");
  }

  /**
   * Open variant generator modal
   * ✅ BỎ CHECK - dùng this.core.currentShoe từ context
   */
  async openVariantGenerator() {
    try {
      // ✅ Lấy shoe từ importState (vì button trong import modal)
      const shoe = this.core.importState?.currentShoe || this.core.currentShoe;

      console.log(`📊 Opening variant generator for: ${shoe.shoe_name}`);

      // Set lại currentShoe để các function khác dùng
      this.core.currentShoe = shoe;

      // Load existing variants
      const response = await this.core.api.getProductVariants(shoe.shoe_id);
      this.core.currentVariants = response?.success ? response.data || [] : [];

      console.log(`📊 Existing variants: ${this.core.currentVariants.length}`);

      // Render form
      this.renderVariantGeneratorForm();

      // Show modal
      const modal = new bootstrap.Modal(
        document.getElementById("variantGeneratorModal")
      );
      modal.show();
    } catch (error) {
      console.error("❌ Error loading variants:", error);
      this.showToast("Error", "Failed to load variants", "error");
    }
  }

  /**
   * Render variant generator form
   */
  renderVariantGeneratorForm() {
    const shoe = this.core.currentShoe;

    // Product info
    document.getElementById("variantGen_ShoeName").textContent = shoe.shoe_name;
    document.getElementById("variantGen_ShoeID").textContent = shoe.shoe_id;
    document.getElementById("variantGen_DefaultPrice").value = shoe.base_price;

    // Render colors grid
    this.renderColorSelection();

    // Render sizes grid
    this.renderSizeSelection();

    // Update preview
    this.updateVariantPreview();
  }

  /**
   * Render color selection grid
   */
  renderColorSelection() {
    const container = document.getElementById("colorSelectionContainer");

    if (!this.core.colors || this.core.colors.length === 0) {
      container.innerHTML = '<p class="text-muted">No colors available</p>';
      return;
    }

    container.innerHTML = this.core.colors
      .map((color) => {
        const hexCode = color.hex_code || color.color_code || "#ccc";
        const hasVariants = this.core.currentVariants.some(
          (v) => v.color_id === color.color_id
        );

        return `
                <div class="form-check">
                    <input class="form-check-input color-checkbox" 
                           type="checkbox" 
                           value="${color.color_id}" 
                           id="color_${color.color_id}"
                           onchange="adminManager.variantGenerator.updateVariantPreview()">
                    <label class="form-check-label d-flex align-items-center" 
                           for="color_${color.color_id}">
                        <span class="color-swatch me-2" 
                              style="display: inline-block; width: 20px; height: 20px; background: ${hexCode}; border: 1px solid #ddd; border-radius: 3px;">
                        </span>
                        <span>${color.color_name}</span>
                        ${
                          hasVariants
                            ? '<span class="badge bg-info ms-2 small">Has variants</span>'
                            : ""
                        }
                    </label>
                </div>
            `;
      })
      .join("");
  }

  /**
   * Render size selection grid
   */
  renderSizeSelection() {
    const container = document.getElementById("sizeSelectionContainer");

    if (!this.core.sizes || this.core.sizes.length === 0) {
      container.innerHTML = '<p class="text-muted">No sizes available</p>';
      return;
    }

    container.innerHTML = this.core.sizes
      .map((size) => {
        const hasVariants = this.core.currentVariants.some(
          (v) => v.size_id === size.size_id
        );

        return `
                <div class="form-check">
                    <input class="form-check-input size-checkbox" 
                           type="checkbox" 
                           value="${size.size_id}" 
                           id="size_${size.size_id}"
                           onchange="adminManager.variantGenerator.updateVariantPreview()">
                    <label class="form-check-label" for="size_${size.size_id}">
                        <strong>${size.size_value}</strong>
                        ${
                          size.size_type
                            ? `<small class="text-muted">(${size.size_type})</small>`
                            : ""
                        }
                        ${
                          hasVariants
                            ? '<span class="badge bg-info ms-2 small">Has variants</span>'
                            : ""
                        }
                    </label>
                </div>
            `;
      })
      .join("");
  }

  /**
   * Update variant preview
   */
  updateVariantPreview() {
    const selectedColors = Array.from(
      document.querySelectorAll(".color-checkbox:checked")
    ).map((cb) => parseInt(cb.value));

    const selectedSizes = Array.from(
      document.querySelectorAll(".size-checkbox:checked")
    ).map((cb) => parseInt(cb.value));

    const totalPossible = selectedColors.length * selectedSizes.length;

    // Count existing variants
    let existingCount = 0;
    selectedColors.forEach((colorId) => {
      selectedSizes.forEach((sizeId) => {
        const exists = this.core.currentVariants.some(
          (v) => v.color_id === colorId && v.size_id === sizeId
        );
        if (exists) existingCount++;
      });
    });

    const newCount = totalPossible - existingCount;

    // Update display
    const statusEl = document.getElementById("variantGen_Status");
    if (statusEl) {
      if (totalPossible === 0) {
        statusEl.innerHTML = `
                    <div class="alert alert-info mb-0">
                        <i class="bi bi-info-circle me-2"></i>
                        Please select at least one color and one size
                    </div>
                `;
      } else if (newCount === 0) {
        statusEl.innerHTML = `
                    <div class="alert alert-warning mb-0">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        All ${totalPossible} selected combinations already exist!
                    </div>
                `;
      } else {
        statusEl.innerHTML = `
                    <div class="alert alert-success mb-0">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>${newCount} new variant${
          newCount !== 1 ? "s" : ""
        }</strong> will be created
                        ${
                          existingCount > 0
                            ? `<br><small>${existingCount} existing variant${
                                existingCount !== 1 ? "s" : ""
                              } will be skipped</small>`
                            : ""
                        }
                    </div>
                `;
      }
    }

    // Update summary
    document.getElementById("variantGen_Colors").textContent =
      selectedColors.length;
    document.getElementById("variantGen_Sizes").textContent =
      selectedSizes.length;
    document.getElementById("variantGen_Total").textContent = newCount;
  }

  /**
   * Submit generate variants
   */
  async submitGenerateVariants() {
    try {
      const selectedColors = Array.from(
        document.querySelectorAll(".color-checkbox:checked")
      ).map((cb) => parseInt(cb.value));

      const selectedSizes = Array.from(
        document.querySelectorAll(".size-checkbox:checked")
      ).map((cb) => parseInt(cb.value));

      if (selectedColors.length === 0 || selectedSizes.length === 0) {
        this.showToast(
          "Warning",
          "Please select at least one color and one size",
          "warning"
        );
        return;
      }

      // ✅ FIX: Đọc giá chính xác
      const priceInput = document.getElementById("variantGen_DefaultPrice");
      let defaultPrice = null;

      if (priceInput && priceInput.value && priceInput.value.trim() !== "") {
        const parsedPrice = parseFloat(priceInput.value);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          defaultPrice = parsedPrice;
        }
      }

      const defaultStock =
        parseInt(document.getElementById("variantGen_DefaultStock").value) || 0;

      const totalVariants = selectedColors.length * selectedSizes.length;

      console.log("🎨 Generating variants:", {
        shoe_id: this.core.currentShoe.shoe_id,
        shoe_name: this.core.currentShoe.shoe_name,
        base_price: this.core.currentShoe.base_price,
        colors: selectedColors,
        sizes: selectedSizes,
        defaultPrice: defaultPrice || `null (will use base_price)`,
        total: totalVariants,
      });

      // Confirm
      let confirmMsg = `Generate ${totalVariants} variant(s)?\n\n`;
      confirmMsg += `Price: ${
        defaultPrice
          ? defaultPrice.toLocaleString("vi-VN") + "đ (custom)"
          : this.core.currentShoe.base_price.toLocaleString("vi-VN") +
            "đ (base)"
      }\n`;
      confirmMsg += `Note: Existing variants will be skipped.`;

      if (!confirm(confirmMsg)) {
        return;
      }

      // Show loading status
      const statusEl = document.getElementById("variantGen_Status");
      if (statusEl) {
        statusEl.innerHTML =
          '<div class="text-center"><i class="spinner-border spinner-border-sm me-2"></i>Generating variants...</div>';
      }

      // Call API
      const response = await window.variantsAPI.generateSpecificVariants(
        this.core.currentShoe.shoe_id,
        selectedColors,
        selectedSizes,
        defaultStock,
        defaultPrice // ← null hoặc giá custom
      );

      console.log("📦 API Response:", response);

      if (response?.success) {
        // Parse response
        let created = 0;
        let skipped = 0;

        if (response.data) {
          if (
            typeof response.data === "object" &&
            "created_count" in response.data
          ) {
            created = response.data.created_count || 0;
            skipped = response.data.skipped_count || 0;
          } else if (
            typeof response.data === "object" &&
            "created" in response.data
          ) {
            created = Array.isArray(response.data.created)
              ? response.data.created.length
              : 0;
            skipped = Array.isArray(response.data.skipped)
              ? response.data.skipped.length
              : 0;
          } else if (Array.isArray(response.data)) {
            created = response.data.length;
            skipped = 0;
          } else if (typeof response.data === "number") {
            created = response.data;
            skipped = 0;
          }
        }

        // Show success message
        let message = `Successfully generated ${created} new variant${
          created !== 1 ? "s" : ""
        }!`;
        if (skipped > 0) {
          message += `\n${skipped} variant${
            skipped !== 1 ? "s" : ""
          } already existed and were skipped.`;
        }

        this.showToast("Success", message, "success");

        // Close modal
        const modalEl = document.getElementById("variantGeneratorModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        }

        // Clean up backdrop
        setTimeout(() => {
          document
            .querySelectorAll(".modal-backdrop")
            .forEach((b) => b.remove());
          document.body.classList.remove("modal-open");
          document.body.style.overflow = "";
          document.body.style.paddingRight = "";
        }, 300);

        // Reload data
        await this.core.loadShoes();
        this.productRenderer.renderShoesTable();
        this.core.updateStats();
      } else {
        throw new Error(response?.message || "Failed to generate variants");
      }
    } catch (error) {
      console.error("❌ Generate variants error:", error);
      this.showToast(
        "Error",
        "Failed to generate variants: " + error.message,
        "error"
      );
    }
  }

  /**
   * ✅ Delete variant (soft delete) - BUSINESS LOGIC
   */
  async deleteVariant(variantId, row) {
    try {
      // Get variant info from row for confirmation
      const sku = row.querySelector(".variant-sku")?.textContent || "Unknown";
      const stock = row.querySelector(".variant-stock")?.textContent || "0";

      // Confirmation
      const confirmMessage =
        parseInt(stock) > 0
          ? `Delete variant "${sku}"?\n\nStock will be preserved: ${stock} units\nYou can restore this variant later.`
          : `Delete variant "${sku}"?\n\nYou can restore this variant later.`;

      if (!confirm(confirmMessage)) {
        return null;
      }

      // Show loading toast
      const loadingToast = this.showToast(
        "info",
        "Deleting variant...",
        "info"
      );

      // Call API through variantsAPI
      const response = await window.variantsAPI.softDeleteVariant(variantId);

      // Remove loading toast
      if (loadingToast) loadingToast.remove();

      // Check response
      if (response?.success) {
        // Remove row from UI
        row.remove();

        // Update variant count
        this.updateVariantCount();

        // Show success message
        this.showToast(
          "Success",
          response.message || "Variant deleted successfully",
          "success"
        );

        return response;
      } else {
        throw new Error(response?.message || "Failed to delete variant");
      }
    } catch (error) {
      console.error("Error deleting variant:", error);
      this.showToast(
        "Error",
        error.message || "Failed to delete variant",
        "error"
      );
      throw error;
    }
  }
  /**
   * ✅ EDIT VARIANT - Open modal với form edit
   */
  async editVariant(variantId) {
    try {
      console.log("✏️ Opening edit modal for variant:", variantId);

      // Find variant in current variants list
      const variant = this.core.currentVariants.find(
        (v) => v.variant_id === variantId
      );

      if (!variant) {
        this.showToast("Error", "Variant not found", "error");
        return;
      }

      console.log("📝 Editing variant:", variant);

      // Store current editing variant
      this.editingVariant = variant;

      // Populate form với data hiện tại
      this.renderEditVariantForm(variant);

      // Show modal
      const modal = new bootstrap.Modal(
        document.getElementById("editVariantModal")
      );
      modal.show();
    } catch (error) {
      console.error("❌ Edit variant error:", error);
      this.showToast("Error", "Failed to open edit form", "error");
    }
  }

  /**
   * ✅ RENDER EDIT VARIANT FORM
   */
  renderEditVariantForm(variant) {
    // Variant info
    document.getElementById("edit_variant_sku").textContent = variant.sku;
    document.getElementById("edit_variant_color").textContent =
      variant.colors?.color_name || "N/A";
    document.getElementById("edit_variant_size").textContent =
      variant.sizes?.size_value || "N/A";

    // Fill current values
    document.getElementById("edit_variant_price").value =
      variant.variant_price || "";
    document.getElementById("edit_variant_stock").value =
      variant.stock_quantity || 0;

    console.log("✅ Form populated with current values:", {
      price: variant.variant_price,
      stock: variant.stock_quantity,
    });
  }

  /**
   * ✅ SUBMIT EDIT VARIANT
   */
  async submitEditVariant() {
    try {
      if (!this.editingVariant) {
        throw new Error("No variant is being edited");
      }

      const variantId = this.editingVariant.variant_id;

      // ✅ CHỈ lấy giá, KHÔNG lấy stock
      const priceInput = document.getElementById("edit_variant_price");
      const newPrice = priceInput.value ? parseFloat(priceInput.value) : null;

      // ✅ Validate price
      if (newPrice === null) {
        this.showToast("Warning", "Please enter a price to update", "warning");
        return;
      }

      if (isNaN(newPrice) || newPrice < 0) {
        this.showToast("Error", "Price must be a positive number", "error");
        return;
      }

      // ✅ Build update payload - CHỈ CÓ GIÁ
      const updateData = {
        variant_price: newPrice,
      };

      console.log("💾 Updating variant price:", { variantId, updateData });

      // Show confirmation
      const confirmMsg =
        `Update variant "${this.editingVariant.sku}"?\n\n` +
        `Price: ${
          this.editingVariant.variant_price?.toLocaleString("vi-VN") || "N/A"
        } → ${newPrice.toLocaleString("vi-VN")} VND\n\n` +
        `Note: Stock quantity remains ${this.editingVariant.stock_quantity} units (managed via Import system)`;

      if (!confirm(confirmMsg)) {
        return;
      }

      // Call API
      const response = await window.variantsAPI.updateVariant(
        variantId,
        updateData
      );

      if (response?.success) {
        this.showToast(
          "Success",
          "Variant price updated successfully",
          "success"
        );

        // Close modal
        const modalEl = document.getElementById("editVariantModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        }

        // Clean up backdrop
        setTimeout(() => {
          document
            .querySelectorAll(".modal-backdrop")
            .forEach((b) => b.remove());
          document.body.classList.remove("modal-open");
          document.body.style.overflow = "";
          document.body.style.paddingRight = "";
        }, 300);

        // ✅ Reload variants
        if (window.adminManager && window.adminManager.variantRenderer) {
          console.log("🔄 Reloading variants via variantRenderer...");
          await window.adminManager.variantRenderer.viewShoeDetails(
            this.editingVariant.shoe_id
          );
        } else {
          console.log("🔄 Reloading shoes list (fallback)...");
          await this.core.loadShoes();
          this.productRenderer.renderShoesTable();
        }

        // Clear editing variant
        this.editingVariant = null;
      } else {
        throw new Error(response?.message || "Update failed");
      }
    } catch (error) {
      console.error("❌ Submit edit error:", error);
      this.showToast(
        "Error",
        "Failed to update variant: " + error.message,
        "error"
      );
    }
  }

  /**
   * ✅ Update variant count display
   */
  updateVariantCount() {
    const container = document.querySelector(".variants-container");
    if (!container) return;

    const variantRows = container.querySelectorAll(".variant-row");
    const count = variantRows.length;

    const countElement = container.querySelector(".variant-count");
    if (countElement) {
      countElement.textContent = `${count} variant${count !== 1 ? "s" : ""}`;
    }
  }

  /**
   * Show toast notification
   */
  showToast(title, message, type = "info") {
    AdminUtils.showToast(title, message, type);
  }
}
