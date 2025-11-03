// frontend/assets/js/admin/AdminVariantRenderer.js
/**
 * AdminVariantRenderer - Handles variant display and shoe details modal
 * ✅ Copy y nguyên logic từ AdminManager.js gốc
 */
class AdminVariantRenderer {
  constructor(core, productRenderer) {
    this.core = core;
    this.productRenderer = productRenderer;
  }
  /**
   * View shoe details with variants
   * ✅ Y nguyên logic: Hiển thị modal với đầy đủ thông tin
   */
  async viewShoeDetails(shoeId) {
    try {
      console.log("📋 Viewing shoe details:", shoeId);
      const shoe = this.core.shoes.find((s) => s.shoe_id === shoeId);

      if (!shoe) {
        this.showToast("Error", "Shoe not found", "error");
        return;
      }

      // ✅ Set currentShoe
      this.core.currentShoe = shoe;

      // ✅ ADD THIS: Set importState for consistency
      this.core.importState = {
        shoeId: shoeId,
        currentShoe: shoe,
        variants: [],
        selectedVariants: new Set(),
        importData: [],
      };

      // Load variants
      console.log("📦 Loading variants for shoe:", shoeId);
      const variantsResponse = await this.core.api.getProductVariants(shoeId);

      if (variantsResponse?.success) {
        this.core.currentVariants = variantsResponse.data;
        this.core.importState.variants = variantsResponse.data; // ✅ Also set in importState
        console.log(`✅ Loaded ${this.core.currentVariants.length} variants`);
      } else {
        this.core.currentVariants = [];
        this.core.importState.variants = [];
        console.log("⚠️ No variants found");
      }

      // Render modal
      this.renderShoeDetailsModal();
      this.showShoeDetailsModal();
    } catch (error) {
      console.error("❌ View details error:", error);
      this.showToast("Error", "Failed to load shoe details", "error");
    }
  }
  /**
   * Render shoe details modal content
   * ✅ Y nguyên giao diện từ AdminManager.js gốc
   */
  renderShoeDetailsModal() {
    const shoe = this.core.currentShoe;
    const variants = this.core.currentVariants;

    // Find category
    const category = this.core.categories.find(
      (c) => c.category_id === shoe.category_id
    );

    // Calculate total stock
    const totalStock = variants.reduce(
      (sum, v) => sum + (v.stock_quantity || 0),
      0
    );

    // ✅ Create modal HTML (vì HTML không có sẵn shoeDetailsModal)
    const modalHTML = `
            <div class="modal fade" id="shoeDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-info-circle me-2"></i>
                                Product Details
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <!-- Product Image -->
                                <div class="col-md-4">
                                    <img src="${
                                      shoe.image_url ||
                                      "/assets/images/placeholder.png"
                                    }" 
                                         class="img-fluid rounded shadow-sm" 
                                         alt="${shoe.shoe_name}"
                                         style="width: 100%; object-fit: cover;">
                                </div>
                                
                                <!-- Product Info -->
                                <div class="col-md-8">
                                    <h3 class="mb-3">${shoe.shoe_name}</h3>
                                    
                                    ${
                                      variants.length === 0
                                        ? `
                                        <div class="alert alert-warning">
                                            <i class="bi bi-exclamation-triangle me-2"></i>
                                            This shoe has no variants yet.
                                        </div>
                                    `
                                        : ""
                                    }
                                    
                                    <p class="text-muted">
                                        ${
                                          shoe.description ||
                                          "No description available"
                                        }
                                    </p>
                                    
                                    <!-- Product Stats -->
                                    <div class="row g-3 mb-4">
                                        <div class="col-6">
                                            <div class="card border-0 bg-light">
                                                <div class="card-body">
                                                    <small class="text-muted d-block">Base Price</small>
                                                    <h5 class="mb-0">${this.productRenderer.formatPrice(
                                                      shoe.base_price
                                                    )}</h5>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="card border-0 bg-light">
                                                <div class="card-body">
                                                    <small class="text-muted d-block">Category</small>
                                                    <h5 class="mb-0">${
                                                      category?.category_name ||
                                                      "N/A"
                                                    }</h5>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="card border-0 bg-light">
                                                <div class="card-body">
                                                    <small class="text-muted d-block">Total Stock</small>
                                                    <h5 class="mb-0">
                                                        <span class="badge ${
                                                          totalStock > 20
                                                            ? "bg-success"
                                                            : totalStock > 0
                                                            ? "bg-warning"
                                                            : "bg-danger"
                                                        } fs-5">
                                                            ${totalStock} units
                                                        </span>
                                                    </h5>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="card border-0 bg-light">
                                                <div class="card-body">
                                                    <small class="text-muted d-block">Variants</small>
                                                    <h5 class="mb-0">${
                                                      variants.length
                                                    }</h5>
                                                </div>
                                            </div>
                                        </div>
                                    </div>    
                                      <!-- Action Buttons -->
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-primary" 
                                                onclick="adminManager.openVariantGenerator(adminManager.currentShoe)">
                                            <i class="bi bi-plus-circle me-2"></i>
                                            Generate Variants
                                        </button>
                                        <button class="btn btn-info" 
                                                onclick="adminManager.handleImport(${
                                                  shoe.shoe_id
                                                })">
                                            <i class="bi bi-box-arrow-in-down me-2"></i>
                                            Import Stock
                                        </button>
                                    </div>
                                </div>                               
                                </div>
                            </div>
                            
                            <!-- Variants Table -->
                            <hr class="my-4">
                            <h5 class="mb-3">
                                <i class="bi bi-grid-3x3 me-2"></i>
                                Variants
                            </h5>
                            ${this.renderVariantsTable()}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // ✅ Remove old modal if exists
    const oldModal = document.getElementById("shoeDetailsModal");
    if (oldModal) {
      oldModal.remove();
    }

    // ✅ Append new modal to body
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  /**
   * Render variants table
   * ✅ Y nguyên giao diện từ AdminManager.js gốc
   */
  renderVariantsTable() {
    if (!this.core.currentVariants || this.core.currentVariants.length === 0) {
      return `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No variants available yet
                    <button class="btn btn-sm btn-primary ms-3" 
                            onclick="adminManager.openVariantGenerator(adminManager.currentShoe)">
                        <i class="bi bi-plus me-1"></i>
                        Add Variants
                    </button>
                </div>
            `;
    }

    return `
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 80px">SKU</th>
                            <th>Color</th>
                            <th>Size</th>
                            <th>Stock</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th style="width: 150px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.core.currentVariants
                          .map((variant) => this.renderVariantRow(variant))
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  }

  /**
   * Render a single variant row
   * ✅ Y nguyên giao diện
   */
  renderVariantRow(variant) {
    const stock = variant.stock_quantity || 0;
    const statusClass = stock > 0 ? "success" : "danger";
    const statusText = stock > 0 ? "Available" : "Out";

    const color = this.core.colors.find((c) => c.color_id === variant.color_id);
    const size = this.core.sizes.find((s) => s.size_id === variant.size_id);
    const hexCode = color?.hex_code || color?.color_code || "#ccc";

    return `
    <tr data-variant-id="${variant.variant_id}">
      <td><code class="text-muted">${variant.sku || "N/A"}</code></td>
      <td>
        <span class="d-inline-block rounded-circle me-2" 
              style="width: 20px; height: 20px; background: ${hexCode}; border: 1px solid #ddd; vertical-align: middle;"></span>
        ${color?.color_name || "N/A"}
      </td>
      <td>
        <strong>${size?.size_value || "N/A"}</strong>
        ${
          size?.size_type
            ? `<small class="text-muted"> (${size.size_type})</small>`
            : ""
        }
      </td>
      <td>
        <span class="badge ${
          stock > 10 ? "bg-success" : stock > 0 ? "bg-warning" : "bg-danger"
        }">
          ${stock}
        </span>
      </td>
      <td>${this.productRenderer.formatPrice(
        variant.variant_price || variant.price
      )}</td>
      <td><span class="badge bg-${statusClass}">${statusText}</span></td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" 
                  onclick="adminManager.editVariant(${variant.variant_id})" 
                  title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <!-- ✅ FIX: Pass 'this' to get row element -->
          <button class="btn btn-outline-danger" 
                    onclick="adminManager.deleteVariant(${
                      variant.variant_id
                    }, this)" 
                    title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
  }

  /**
   * Show shoe details modal
   * ✅ Display modal
   */
  showShoeDetailsModal() {
    const modalEl = document.getElementById("shoeDetailsModal");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();

      // ✅ Clean up when modal is hidden
      modalEl.addEventListener(
        "hidden.bs.modal",
        () => {
          modalEl.remove();
        },
        { once: true }
      );
    }
  }

  /**
   * Show toast notification
   * ✅ Y nguyên logic từ AdminManager
   */
  showToast(title, message, type = "info") {
    const toastEl = document.getElementById("notificationToast");
    if (!toastEl) {
      console.log(`${type.toUpperCase()}: ${title} - ${message}`);
      return;
    }

    const toastTitle = document.getElementById("toastTitle");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    // Set icon
    const icons = {
      success: "bi-check-circle-fill text-success",
      error: "bi-x-circle-fill text-danger",
      warning: "bi-exclamation-triangle-fill text-warning",
      info: "bi-info-circle-fill text-primary",
    };

    if (toastIcon) {
      toastIcon.className = `bi ${icons[type] || icons.info} me-2`;
    }

    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }
}
