// frontend/assets/js/admin/AdminActions.js
/**
 * AdminActions - Handles CRUD operations
 */
class AdminActions {
  constructor(core) {
    this.core = core;
  }
  addShoe() {
    return this.productManager.openProductForm();
  }

  /**
   * Edit shoe
   */
  editShoe(shoeId) {
    return this.productManager.openProductForm(shoeId);
  }

  /**
   * Delete shoe
   */
  async deleteShoe(shoeId) {
    const shoe = this.core.shoes.find((s) => s.shoe_id === shoeId);
    if (!shoe) {
      AdminUtils.showError("Product not found");
      return;
    }

    // Show confirmation modal
    const confirmed = await this.showDeleteConfirmation(shoe);
    if (!confirmed) {
      console.log("❌ Delete cancelled by user");
      return;
    }

    // Delegate to ProductManager
    try {
      await this.productManager.deleteProduct(shoeId);
    } catch (error) {
      // Error already handled in ProductManager
      console.error("Delete failed:", error);
    }
  }
  /**
   * ♻️ Restore deleted shoe (with confirmation)
   */
  async restoreShoe(shoeId) {
    // ✅ Get shoe from historyManager's deletedProducts list
    const shoe = window.adminManager?.historyManager?.deletedProducts.find(
      (s) => s.shoe_id === shoeId
    );

    if (!shoe) {
      AdminUtils.showError("Product not found in deleted products");
      console.error("❌ Product not found:", shoeId);
      return;
    }

    // Show confirmation modal
    const confirmed = await this.showRestoreConfirmation(shoe);
    if (!confirmed) {
      console.log("❌ Restore cancelled by user");
      return;
    }

    // ✅ Delegate to HistoryManager (not ProductManager)
    try {
      if (window.adminManager?.historyManager) {
        await window.adminManager.historyManager.restoreProduct(shoeId);
      } else {
        throw new Error("HistoryManager not initialized");
      }
    } catch (error) {
      // Error already handled in HistoryManager
      console.error("Restore failed:", error);
    }
  }
  /**
   * 📦 Show Delete Confirmation Modal
   */
  showDeleteConfirmation(shoe) {
    return new Promise((resolve) => {
      const modalHtml = `
            <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Confirm Delete
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-3">
                    <i class="bi bi-trash3 text-danger" style="font-size: 3rem;"></i>
                    </div>
                    <h6 class="text-center mb-3">Are you sure you want to delete this product?</h6>
                    <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                        ${
                          shoe.image_url
                            ? `<img src="${shoe.image_url}" alt="${shoe.shoe_name}" class="me-3" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">`
                            : ""
                        }
                        <div>
                            <h6 class="mb-1">${shoe.shoe_name}</h6>
                            <p class="text-muted mb-0 small">ID: ${
                              shoe.shoe_id
                            }</p>
                        </div>
                        </div>
                    </div>
                    </div>
                    <div class="alert alert-warning mt-3 mb-0">
                    <i class="bi bi-info-circle me-2"></i>
                    <small>This product will be soft deleted and can be restored later.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="bi bi-x-circle me-1"></i>Cancel
                    </button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                    <i class="bi bi-trash3 me-1"></i>Delete Product
                    </button>
                </div>
                </div>
            </div>
            </div>
        `;

      this._showConfirmationModal("deleteConfirmModal", modalHtml, resolve);
    });
  }

  /**
   * ♻️ Show Restore Confirmation Modal
   */
  showRestoreConfirmation(shoe) {
    return new Promise((resolve) => {
      const modalHtml = `
            <div class="modal fade" id="restoreConfirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">
                    <i class="bi bi-arrow-counterclockwise me-2"></i>
                    Confirm Restore
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-3">
                    <i class="bi bi-arrow-counterclockwise text-success" style="font-size: 3rem;"></i>
                    </div>
                    <h6 class="text-center mb-3">Restore this product?</h6>
                    <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                        ${
                          shoe.image_url
                            ? `<img src="${shoe.image_url}" alt="${shoe.shoe_name}" class="me-3" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">`
                            : ""
                        }
                        <div>
                            <h6 class="mb-1">${shoe.shoe_name}</h6>
                            <p class="text-muted mb-0 small">ID: ${
                              shoe.shoe_id
                            }</p>
                        </div>
                        </div>
                    </div>
                    </div>
                    <div class="alert alert-info mt-3 mb-0">
                    <i class="bi bi-info-circle me-2"></i>
                    <small>This product will be restored and visible again.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="bi bi-x-circle me-1"></i>Cancel
                    </button>
                    <button type="button" class="btn btn-success" id="confirmRestoreBtn">
                    <i class="bi bi-arrow-counterclockwise me-1"></i>Restore Product
                    </button>
                </div>
                </div>
            </div>
            </div>
        `;

      this._showConfirmationModal("restoreConfirmModal", modalHtml, resolve);
    });
  }

  /**
   * 🛠️ Helper: Show confirmation modal
   * @private
   */
  _showConfirmationModal(modalId, modalHtml, resolve) {
    // Remove existing modal if any
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
      existingModal.remove();
    }

    // Append to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Get modal elements
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    const confirmBtnId = modalId.includes("delete")
      ? "confirmDeleteBtn"
      : "confirmRestoreBtn";
    const confirmBtn = document.getElementById(confirmBtnId);

    // Handle confirm
    confirmBtn.addEventListener("click", () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${
        modalId.includes("delete") ? "Deleting..." : "Restoring..."
      }`;
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

    // Show modal
    modal.show();
  }

  /**
   * Edit variant
   */
  editVariant(variantId) {
    console.log("✏️ Edit variant:", variantId);
    window.adminManager.variantGenerator.editVariant(variantId);
  }

  /**
   * Delete variant
   */
  async deleteVariant(variantId, buttonElement) {
    // ✅ ADD buttonElement parameter
    try {
      // Get row from button element
      const row = buttonElement.closest("tr");

      if (!row) {
        console.error("❌ Could not find variant row");
        return;
      }

      // Delegate to AdminVariantGenerator for business logic
      if (window.adminManager?.variantGenerator) {
        await window.adminManager.variantGenerator.deleteVariant(
          variantId,
          row
        );
      } else {
        throw new Error("Variant generator not initialized");
      }
    } catch (error) {
      console.error("Delete variant failed:", error);
      // Error already handled in AdminVariantGenerator
    }
  }
  /**
   * ➕ Add category
   */
  addCategory() {
    console.log("➕ Add category");
    if (window.adminManager?.categoryManager) {
      return window.adminManager.categoryManager.openCategoryForm();
    } else {
      console.error("❌ CategoryManager not initialized");
    }
  }
  /**
   * Edit category
   */
  editCategory(categoryId) {
    console.log("✏️ Edit category:", categoryId);
    if (window.adminManager?.categoryManager) {
      return window.adminManager.categoryManager.openCategoryForm(categoryId);
    } else {
      console.error("❌ CategoryManager not initialized");
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId) {
    console.log("🗑️ Delete category:", categoryId);
    if (window.adminManager?.categoryManager) {
      await window.adminManager.categoryManager.deleteCategory(categoryId);
    } else {
      console.error("❌ CategoryManager not initialized");
    }
  }
}
