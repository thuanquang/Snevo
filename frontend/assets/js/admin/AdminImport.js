// frontend/assets/js/admin/AdminImport.js
/**
 * AdminImport - Handles product import workflow
 * ✅ Removed SKU column from import table
 */
class AdminImport {
    constructor(core, productRenderer) {
        this.core = core;
        this.productRenderer = productRenderer;
        this._isSubmitting = false;
    }
    
    /**
     * Setup import button listeners
     */
    setupImportButtonListeners() {
        const container = document.getElementById("shoesTableContainer");
        if (container) {
            container.addEventListener("click", (e) => {
                const importBtn = e.target.closest(".import-btn");
                if (importBtn) {
                    const shoeId = parseInt(importBtn.dataset.shoeId);
                    console.log("📦 Import button clicked for shoe:", shoeId);
                    this.handleImport(shoeId);
                }
            });
        }
    }
    
    /**
     * Handle Import button click
     */
    async handleImport(shoeId) {
        try {
            console.log("📦 Starting import for shoe:", shoeId);
            
            this.core.currentShoe = this.core.shoes.find((s) => s.shoe_id === shoeId);
            if (!this.core.currentShoe) {
                this.showToast("Error", "Shoe not found", "error");
                return;
            }
            
            this.core.importState = {
                shoeId: shoeId,
                currentShoe: this.core.currentShoe,
                variants: [],
                selectedVariants: new Set(),
                importData: [],
            };
            
            const response = await this.core.api.getProductVariants(shoeId);
            
            if (response?.success && response.data) {
                this.core.importState.variants = response.data;
                console.log(`✅ Loaded ${response.data.length} variants for shoe ${shoeId}`);
            } else {
                this.core.importState.variants = [];
                console.log("⚠️ No variants yet for shoe", shoeId);
            }
            
            this.showImportModal();
        } catch (error) {
            console.error("❌ Import init error:", error);
            this.showToast("Error", "Failed to initialize import", "error");
        }
    }
    
    /**
     * Show import modal with data
     */
    showImportModal() {
        document.getElementById("importShoeName").textContent = this.core.currentShoe.shoe_name;
        document.getElementById("importShoeImage").src = 
            this.core.currentShoe.image_url || "/assets/images/placeholder.png";
        document.getElementById("importCurrentStock").textContent = 
            this.core.currentShoe.stock_info?.total_stock || 0;
        document.getElementById("importShoeInfo").textContent = 
            `Product ID: ${this.core.currentShoe.shoe_id} | Category: ${this.getCategoryName(this.core.currentShoe.category_id)}`;
        
        this.renderImportVariantsTable();
        
        document.getElementById("importNotes").value = "";
        document.getElementById("selectAllVariants").checked = false;
        
        this.updateImportSummary();
        
        const modal = new bootstrap.Modal(document.getElementById("importModal"));
        modal.show();
        
        document.getElementById("importHistoryContainer").innerHTML = `
            <p class="text-muted text-center py-4">
                <i class="bi bi-clock-history fs-1 d-block mb-2"></i>
                Switch to this tab to view import history
            </p>
        `;
    }
    
    /**
     * Render variants table for import
     * ✅ FIXED: Removed SKU column
     */
    renderImportVariantsTable() {
        const tbody = document.getElementById("importVariantsTable");
        
        if (!this.core.importState.variants || this.core.importState.variants.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <p class="text-muted">No variants available yet</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.core.importState.variants
            .map((variant) => {
                const color = this.core.colors.find((c) => c.color_id === variant.color_id);
                const size = this.core.sizes.find((s) => s.size_id === variant.size_id);
                const currentStock = variant.stock_quantity || 0;
                const hexCode = color?.hex_code || color?.color_code || '#ccc';
                
                return `
                    <tr>
                        <td class="text-center">
                            <input type="checkbox" 
                                   class="form-check-input variant-checkbox" 
                                   data-variant-id="${variant.variant_id}"
                                   onchange="adminManager.handleVariantCheckbox(${variant.variant_id}, this.checked)">
                        </td>
                        <td>
                            <span class="d-inline-block rounded-circle me-2" 
                                  style="width: 20px; height: 20px; background: ${hexCode}; border: 1px solid #ddd; vertical-align: middle;">
                            </span>
                            ${color?.color_name || 'N/A'}
                        </td>
                        <td>
                            <strong>${size?.size_value || 'N/A'}</strong>
                            ${size?.size_type ? `<small class="text-muted d-block">${size.size_type}</small>` : ''}
                        </td>
                        <td>
                            <span class="badge ${
                                currentStock > 10 ? 'bg-success' : 
                                currentStock > 0 ? 'bg-warning text-dark' : 'bg-danger'
                            }">
                                ${currentStock}
                            </span>
                        </td>
                        <td>
                            <input type="number" 
                                   class="form-control form-control-sm" 
                                   id="qty-${variant.variant_id}" 
                                   value="0" 
                                   min="0"
                                   onchange="adminManager.updateImportSummary()">
                        </td>
                        <td>
                            <input type="number" 
                                   class="form-control form-control-sm" 
                                   id="price-${variant.variant_id}" 
                                   value="${variant.variant_price || variant.price || 0}" 
                                   min="0"
                                   step="1000"
                                   onchange="adminManager.updateImportSummary()">
                        </td>
                    </tr>
                `;
            })
            .join("");
    }
    
    /**
     * Handle variant checkbox change
     */
    handleVariantCheckbox(variantId, checked) {
        if (checked) {
            this.core.importState.selectedVariants.add(variantId);
        } else {
            this.core.importState.selectedVariants.delete(variantId);
        }
        this.updateImportSummary();
    }
    
    /**
     * Toggle all variants
     */
    toggleAllVariants(checked) {
        const checkboxes = document.querySelectorAll('.variant-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const variantId = parseInt(cb.dataset.variantId);
            if (checked) {
                this.core.importState.selectedVariants.add(variantId);
            } else {
                this.core.importState.selectedVariants.delete(variantId);
            }
        });
        this.updateImportSummary();
    }
    
    /**
     * Update import summary
     */
    updateImportSummary() {
        let totalQty = 0;
        let totalCost = 0;
        let selectedCount = 0;
        
        this.core.importState.selectedVariants.forEach((variantId) => {
            const qtyInput = document.getElementById(`qty-${variantId}`);
            const priceInput = document.getElementById(`price-${variantId}`);
            
            if (qtyInput && priceInput) {
                const qty = parseInt(qtyInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                totalQty += qty;
                totalCost += qty * price;
                selectedCount++;
            }
        });
        
        document.getElementById("summaryVariants").textContent = selectedCount;
        document.getElementById("summaryQuantity").textContent = totalQty;
        document.getElementById("summaryCost").textContent = totalCost.toFixed(2);
    }
    
    /**
     * Submit batch import
     */
    async submitBatchImport() {
        if (this._isSubmitting) {
            console.log("⚠️ Import already in progress, skipping...");
            return;
        }
        
        try {
            this._isSubmitting = true;
            
            if (this.core.importState.selectedVariants.size === 0) {
                this.showToast("Warning", "Please select at least one variant to import", "warning");
                return;
            }
            
            const imports = [];
            this.core.importState.selectedVariants.forEach((variantId) => {
                const qtyInput = document.getElementById(`qty-${variantId}`);
                const priceInput = document.getElementById(`price-${variantId}`);
                
                const quantity = parseInt(qtyInput.value);
                const price = parseFloat(priceInput.value);
                
                if (quantity > 0 && price >= 0) {
                    imports.push({
                        variant_id: variantId,
                        quantity_imported: quantity,
                        import_price: price,
                    });
                }
            });
            
            if (imports.length === 0) {
                this.showToast("Warning", "No valid imports to submit", "warning");
                return;
            }
            
            const notes = document.getElementById("importNotes").value.trim();
            
            if (!confirm(`Import ${imports.length} variant${imports.length !== 1 ? 's' : ''}?`)) {
                return;
            }
            
            this.showToast("Info", "Importing stock...", "info");
            
            console.log("📤 Submitting batch import:", imports);
            
            const response = await window.importsAPI.createBatchImport({
                imports: imports,
                notes: notes || null,
            });
            
            console.log("📦 Import Response:", response);
            
            if (response.success) {
                this.showToast(
                    "Success", 
                    `Successfully imported ${imports.length} variant${imports.length !== 1 ? 's' : ''}!`,
                    "success"
                );
                
                const modalEl = document.getElementById("importModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) {
                    modal.hide();
                }
                
                setTimeout(() => {
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }, 300);
                
                await this.core.loadShoes();
                this.productRenderer.renderShoesTable();
            } else {
                this.showToast("Error", response.message || "Import failed", "error");
            }
        } catch (error) {
            console.error("❌ Submit import error:", error);
            this.showToast("Error", "Failed to submit import: " + error.message, "error");
        } finally {
            this._isSubmitting = false;
        }
    }
    
    /**
     * Get category name by ID
     */
    getCategoryName(categoryId) {
        const category = this.core.categories.find((c) => c.category_id === categoryId);
        return category?.category_name || "N/A";
    }
    
    /**
     * Show toast notification
     */
    showToast(title, message, type = "info") {
        AdminUtils.showToast(title, message, type);
    }
}
