// frontend/assets/js/admin/AdminCategory.js

/**
 * AdminCategory - Handles category display and management
 */
class AdminCategory {
  constructor(core, productRenderer) {
    this.core = core;
    this.productRenderer = productRenderer;
  }

  /**
   * Render categories table - ONLY ACTIVE CATEGORIES
   */
  renderCategoriesTable() {
    const container = document.getElementById("categoriesTableContainer");
    if (!container) return;

    if (!this.core.categories || this.core.categories.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    // ⭐ Filter only active categories
    const activeCategories = this.core.categories.filter(
      (cat) => cat.is_active !== false
    );

    if (activeCategories.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    const categoriesHtml = activeCategories
      .map((cat) => this.renderCategoryRow(cat))
      .join("");

    container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>Category Name</th>
            <th>Description</th>
            <th style="width: 100px;">Products</th>
            <th style="width: 100px;">Status</th>
            <th style="width: 120px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${categoriesHtml}
        </tbody>
      </table>
    </div>
  `;
  }

  /**
   * Render single category row
   */
  renderCategoryRow(category) {
    const productCount = category.product_count || 0;
    const isActive = category.is_active !== false;

    return `
      <tr data-category-id="${category.category_id}">
        <td><strong>${category.category_name}</strong></td>
        <td>${
          category.description ||
          '<span class="text-muted">No description</span>'
        }</td>
        <td class="text-center">
          <span class="badge bg-info">${productCount}</span>
        </td>
        <td>
          <span class="badge ${isActive ? "bg-success" : "bg-secondary"}">
            ${isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" 
                    onclick="window.adminManager.actions.editCategory(${
                      category.category_id
                    })"
                    title="Edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" 
                    onclick="window.adminManager.actions.deleteCategory(${
                      category.category_id
                    })"
                    title="Delete"
                    ${!isActive ? "disabled" : ""}>
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    return `
      <div class="text-center py-5">
        <i class="bi bi-folder-x display-1 text-muted"></i>
        <h5 class="mt-3">No Categories Found</h5>
        <p class="text-muted">Click "Add Category" to create your first category</p>
      </div>
    `;
  }

  /**
   * ⭐ Open Add/Edit Category Modal
   * @param {number|null} categoryId - null for add, ID for edit
   */
  async openCategoryForm(categoryId = null) {
    const isEdit = categoryId !== null;
    let category = null;

    // Load category data if editing
    if (isEdit) {
      category = this.core.categories.find((c) => c.category_id === categoryId);
      if (!category) {
        AdminUtils.showError("Category not found");
        return;
      }
    }

    // Create modal HTML
    const modalHtml = this._generateCategoryFormModal(category, isEdit);

    // Remove existing modal
    const existingModal = document.getElementById("categoryFormModal");
    if (existingModal) existingModal.remove();

    // Append to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Show modal
    const modalElement = document.getElementById("categoryFormModal");
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Handle form submission
    const form = document.getElementById("categoryForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this._handleCategoryFormSubmit(categoryId, modal);
    });

    // Cleanup on close
    modalElement.addEventListener("hidden.bs.modal", () => {
      modalElement.remove();
    });
  }

  /**
   * Generate category form modal HTML
   * @private
   */
  _generateCategoryFormModal(category, isEdit) {
    return `
      <div class="modal fade" id="categoryFormModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-${isEdit ? "pencil" : "plus-circle"}"></i>
                ${isEdit ? "Edit Category" : "Add New Category"}
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="categoryForm">
              <div class="modal-body">
                <!-- Category Name -->
                <div class="mb-3">
                  <label class="form-label">
                    Category Name <span class="text-danger">*</span>
                  </label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="categoryName"
                    name="category_name"
                    value="${category?.category_name || ""}"
                    required
                    minlength="2"
                    maxlength="100"
                    placeholder="e.g., Running Shoes"
                  >
                  <div class="form-text">2-100 characters</div>
                </div>

                <!-- Description -->
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea 
                    class="form-control" 
                    id="categoryDescription"
                    name="description"
                    rows="3"
                    maxlength="500"
                    placeholder="Brief description of this category (optional)"
                  >${category?.description || ""}</textarea>
                  <div class="form-text">Maximum 500 characters</div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" id="submitCategoryBtn">
                  <i class="bi bi-${
                    isEdit ? "check-circle" : "plus-circle"
                  }"></i>
                  ${isEdit ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle category form submission
   * @private
   */
  async _handleCategoryFormSubmit(categoryId, modal) {
    const isEdit = categoryId !== null;
    const submitBtn = document.getElementById("submitCategoryBtn");
    const originalBtnText = submitBtn.innerHTML;

    try {
      // Disable button
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${
        isEdit ? "Updating..." : "Creating..."
      }`;

      // Get form data
      const formData = new FormData(document.getElementById("categoryForm"));
      const data = {
        category_name: formData.get("category_name").trim(),
        description: formData.get("description")?.trim() || null,
      };

      // Validate
      if (!data.category_name) {
        throw new Error("Category name is required");
      }

      // Call API
      let response;
      if (isEdit) {
        response = await window.productsAPI.updateCategory(categoryId, data);
      } else {
        response = await window.productsAPI.createCategory(data);
      }

      if (!response.success) {
        throw new Error(response.message || "Operation failed");
      }

      // Show success
      AdminUtils.showSuccess(
        response.message ||
          `Category ${isEdit ? "updated" : "created"} successfully`
      );

      // Reload categories
      await this.core.loadCategories();
      this.renderCategoriesTable();

      // Close modal
      modal.hide();
    } catch (error) {
      console.error(
        `❌ ${isEdit ? "Update" : "Create"} category failed:`,
        error
      );
      AdminUtils.showError(
        error.message || `Failed to ${isEdit ? "update" : "create"} category`
      );

      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }

  /**
   * ⭐ Delete category with validation
   */
  async deleteCategory(categoryId) {
    const category = this.core.categories.find(
      (c) => c.category_id === categoryId
    );
    if (!category) {
      AdminUtils.showError("Category not found");
      return;
    }

    // Show confirmation
    const confirmed = await this._showDeleteConfirmation(category);
    if (!confirmed) {
      console.log("❌ Delete cancelled by user");
      return;
    }

    try {
      const response = await window.productsAPI.deleteCategory(categoryId);

      if (!response.success) {
        throw new Error(response.message || "Delete failed");
      }

      AdminUtils.showSuccess(
        response.message || "Category deleted successfully"
      );

      // Reload categories
      await this.core.loadCategories();
      this.renderCategoriesTable();
    } catch (error) {
      console.error("❌ Delete category failed:", error);
      AdminUtils.showError(error.message || "Failed to delete category");
    }
  }

  /**
   * Show delete confirmation modal
   * @private
   */
  _showDeleteConfirmation(category) {
    return new Promise((resolve) => {
      const productCount = category.product_count || 0;

      const modalHtml = `
        <div class="modal fade" id="deleteCategoryModal" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-danger text-white">
                <h5 class="modal-title">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  Confirm Delete Category
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p>Are you sure you want to delete this category?</p>
                <div class="alert alert-info">
                  <strong>${category.category_name}</strong>
                  ${
                    category.description
                      ? `<br><small>${category.description}</small>`
                      : ""
                  }
                </div>
                ${
                  productCount > 0
                    ? `
                  <div class="alert alert-warning">
                    <i class="bi bi-info-circle"></i>
                    This category contains <strong>${productCount} product(s)</strong>.
                    Make sure all products are inactive before deleting.
                  </div>
                `
                    : ""
                }
                <p class="text-muted mb-0">
                  <small>This will set the category to inactive (soft delete).</small>
                </p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="button" class="btn btn-danger" id="confirmDeleteCategoryBtn">
                  <i class="bi bi-trash"></i> Delete Category
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Remove existing modal
      const existing = document.getElementById("deleteCategoryModal");
      if (existing) existing.remove();

      // Append to body
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Show modal
      const modalElement = document.getElementById("deleteCategoryModal");
      const modal = new bootstrap.Modal(modalElement);
      const confirmBtn = document.getElementById("confirmDeleteCategoryBtn");

      // Handle confirm
      confirmBtn.addEventListener("click", () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML =
          '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
        modal.hide();
        resolve(true);
      });

      // Handle cancel/close
      modalElement.addEventListener("hidden.bs.modal", () => {
        if (!confirmBtn.disabled) {
          resolve(false);
        }
        modalElement.remove();
      });

      modal.show();
    });
  }
}
