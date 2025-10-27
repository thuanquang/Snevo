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
     * Render categories table
     */
    renderCategoriesTable() {
        const container = document.getElementById("categoriesTableContainer");
        if (!container) return;
        
        if (!this.core.categories || this.core.categories.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }
        
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 80px">Image</th>
                            <th>Category Name</th>
                            <th>Description</th>
                            <th>Products</th>
                            <th>Status</th>
                            <th style="width: 150px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.core.categories
                            .map((cat) => this.renderCategoryRow(cat))
                            .join("")}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    /**
     * Render a single category row
     */
    renderCategoryRow(category) {
        const statusClass = category.is_active ? "success" : "secondary";
        const statusText = category.is_active ? "Active" : "Inactive";
        
        return `
            <tr>
                <td>
                    <img src="${category.image_url || '/assets/images/placeholder.png'}" 
                         alt="${category.category_name}" 
                         class="img-thumbnail"
                         style="width: 60px; height: 60px; object-fit: cover">
                </td>
                <td>
                    <strong>${category.category_name}</strong>
                    <br>
                    <small class="text-muted">ID: ${category.category_id}</small>
                </td>
                <td>${category.description || "N/A"}</td>
                <td>
                    <span class="badge bg-primary fs-6">
                        ${category.product_count || 0} products
                    </span>
                </td>
                <td>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-warning" 
                                onclick="adminManager.editCategory(${category.category_id})"
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="adminManager.deleteCategory(${category.category_id})"
                                title="Delete">
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
                <p class="text-muted mt-3">Click "Add" button to create new item</p>
            </div>
        `;
    }
}
