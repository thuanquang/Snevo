// frontend/assets/js/admin/AdminProduct.js
// 🎯 AdminProduct - Handle Add/Edit Product Form

class AdminProduct {
  constructor(core, productRenderer) {
    this.core = core;
    this.productRenderer = productRenderer;
    this.currentEditingShoeId = null;
    this.selectedImageFile = null;
    this.productsAPI = window.productsAPI;
  }

  /**
   * 🆕 Open Add/Edit Product Form
   */
  openProductForm(shoeId = null) {
    this.currentEditingShoeId = shoeId;
    this.selectedImageFile = null;

    const modal = new bootstrap.Modal(
      document.getElementById("productFormModal")
    );
    const modalTitle = document.getElementById("productFormModalTitle");
    const submitBtn = document.getElementById("submitProductBtn");

    this.populateCategoryDropdown();

    if (shoeId) {
      // Edit Mode
      modalTitle.textContent = "Edit Product";
      submitBtn.innerHTML = '<i class="bi bi-save me-2"></i> Update Product';
      this.populateEditForm(shoeId);
    } else {
      // Add Mode
      modalTitle.textContent = "Add New Product";
      submitBtn.innerHTML =
        '<i class="bi bi-plus-circle me-2"></i> Add Product';
      this.resetProductForm();
    }

    modal.show();
  }

  /**
   * 📝 Populate form for editing
   */
  populateEditForm(shoeId) {
    const shoe = this.core.shoes.find((s) => s.shoe_id === shoeId);
    if (!shoe) {
      AdminUtils.showError("Product not found");
      return;
    }

    // Populate form fields
    document.getElementById("productName").value = shoe.shoe_name || "";
    document.getElementById("productCategory").value = shoe.category_id || "";
    document.getElementById("productPrice").value = shoe.base_price || "";
    document.getElementById("productDescription").value =
      shoe.description || "";

    // Show existing image preview
    if (shoe.image_url) {
      const preview = document.getElementById("productImagePreview");
      preview.src = shoe.image_url;
      preview.style.display = "block";
    }
  }

  /**
   * 🔽 Populate Category Dropdown
   */
  populateCategoryDropdown() {
    const select = document.getElementById("productCategory");
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Category --</option>';

    this.core.categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.category_id;
      option.textContent = cat.category_name;
      select.appendChild(option);
    });
  }

  /**
   * 🖼️ Handle Image Selection
   */
  handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif", "image/avif"];
    if (!validTypes.includes(file.type)) {
      AdminUtils.showError("Please select a valid image (JPG, PNG, WEBP, GIF, AVIF)");
      event.target.value = "";
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      AdminUtils.showError("Image size must be less than 5MB");
      event.target.value = "";
      return;
    }

    this.selectedImageFile = file;

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById("productImagePreview");
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);

    console.log("✅ Image selected:", file.name);
  }

  /**
   * 💾 Submit Product Form (Create or Update)
   */
  async submitProductForm() {
    try {
      // Get form data
      const formData = this.getProductFormData();

      // Validate
      if (!this.validateProductForm(formData)) {
        return;
      }

      const submitBtn = document.getElementById("submitProductBtn");
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';

      if (this.currentEditingShoeId) {
        // Update existing product
        await this.updateProduct(this.currentEditingShoeId, formData);
      } else {
        // Create new product
        await this.createProduct(formData);
      }

      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("productFormModal")
      );
      modal.hide();

      // Reload data
      await this.core.loadShoes();
      this.productRenderer.applySortByStock();
    } catch (error) {
      console.error("❌ Submit error:", error);
      AdminUtils.showError(error.message || "Failed to save product");
    } finally {
      const submitBtn = document.getElementById("submitProductBtn");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = this.currentEditingShoeId
          ? '<i class="bi bi-save me-2"></i> Update Product'
          : '<i class="bi bi-plus-circle me-2"></i> Add Product';
      }
    }
  }

  /**
   * ➕ Create New Product
   */
  async createProduct(formData) {
    const requestBody = new FormData();
    requestBody.append("shoe_name", formData.shoe_name);
    requestBody.append("category_id", formData.category_id);
    requestBody.append("base_price", formData.base_price);
    requestBody.append("description", formData.description);

    if (this.selectedImageFile) {
      requestBody.append("image", this.selectedImageFile);
    }

    // ✅ Use ProductsAPI method
    const response = await this.productsAPI.createProduct(requestBody);

    AdminUtils.showSuccess("Product created successfully!");
    console.log("✅ Product created:", response);
  }

  /**
   * ✏️ Update Existing Product
   */
  async updateProduct(shoeId, formData) {
    const requestBody = new FormData();
    requestBody.append("shoe_name", formData.shoe_name);
    requestBody.append("category_id", formData.category_id);
    requestBody.append("base_price", formData.base_price);
    requestBody.append("description", formData.description);

    if (this.selectedImageFile) {
      requestBody.append("image", this.selectedImageFile);
    }

    // ✅ Use ProductsAPI method
    const response = await this.productsAPI.updateProduct(shoeId, requestBody);

    AdminUtils.showSuccess("Product updated successfully!");
    console.log("✅ Product updated:", response);
  }
  /**
   * 🗑️ Delete Product (Soft Delete)
   */
  async deleteProduct(shoeId) {
    try {
      console.log("🗑️ Soft deleting product:", shoeId);

      // Call API
      const response = await this.productsAPI.deleteProduct(shoeId);

      if (response.success) {
        AdminUtils.showSuccess("Product deleted successfully!");
        console.log("✅ Product deleted:", response);

        // Reload products
        await this.core.loadShoes();
        this.productRenderer.applySortByStock();

        return response;
      } else {
        throw new Error(response.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("❌ Delete error:", error);
      AdminUtils.showError(error.message || "Failed to delete product");
      throw error;
    }
  }
  /**
   * 📋 Get Form Data
   */
  getProductFormData() {
    return {
      shoe_name: document.getElementById("productName")?.value?.trim(),
      category_id: parseInt(document.getElementById("productCategory")?.value),
      base_price: parseFloat(document.getElementById("productPrice")?.value),
      description: document.getElementById("productDescription")?.value?.trim(),
    };
  }

  /**
   * ✅ Validate Form
   */
  validateProductForm(data) {
    if (!data.shoe_name || data.shoe_name.length < 2) {
      AdminUtils.showError("Product name must be at least 2 characters");
      return false;
    }

    if (!data.category_id || isNaN(data.category_id)) {
      AdminUtils.showError("Please select a category");
      return false;
    }

    if (!data.base_price || data.base_price <= 0) {
      AdminUtils.showError("Price must be greater than 0");
      return false;
    }

    // Check if image is required for new product
    if (!this.currentEditingShoeId && !this.selectedImageFile) {
      AdminUtils.showError("Please select a product image");
      return false;
    }

    return true;
  }

  /**
   * 🔄 Reset Form
   */
  resetProductForm() {
    document.getElementById("productFormForm")?.reset();

    const preview = document.getElementById("productImagePreview");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }

    this.selectedImageFile = null;
    this.currentEditingShoeId = null;
  }

  /**
   * 🎯 Setup Event Listeners
   */
  setupProductFormListeners() {
    // Image input
    const imageInput = document.getElementById("productImage");
    if (imageInput) {
      imageInput.addEventListener("change", (e) => this.handleImageSelect(e));
    }

    // Submit button
    const submitBtn = document.getElementById("submitProductBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => this.submitProductForm());
    }

    // Cancel/Close - reset form
    const modal = document.getElementById("productFormModal");
    if (modal) {
      modal.addEventListener("hidden.bs.modal", () => this.resetProductForm());
    }
  }
}
