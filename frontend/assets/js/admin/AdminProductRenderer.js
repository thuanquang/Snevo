// frontend/assets/js/admin/AdminProductRenderer.js
/**
 * AdminProductRenderer - Handles product table rendering and sorting
 */
class AdminProductRenderer {
    constructor(core) {
        this.core = core;
    }
    
    /**
     * Apply default sort after loading
     */
    applySortByStock() {
        console.log("📊 Applying default sort: stock_desc");
        this.core.shoes = [...this.core.allShoes];
        this.core.shoes.sort((a, b) => {
            const stockA = a.stock_info?.total_stock || 0;
            const stockB = b.stock_info?.total_stock || 0;
            return stockB - stockA;
        });
        this.renderShoesTable();
    }
    
    /**
     * Sort handler
     */
    handleSort() {
        const sortValue = document.getElementById("sortSelect").value;
        console.log("📊 Sorting by:", sortValue);
        
        if (!sortValue) {
            this.core.shoes = [...this.core.allShoes];
            this.renderShoesTable();
            return;
        }
        
        this.core.shoes = [...this.core.allShoes];
        
        switch (sortValue) {
            case "stock_desc":
                this.core.shoes.sort((a, b) => {
                    const stockA = a.stock_info?.total_stock || 0;
                    const stockB = b.stock_info?.total_stock || 0;
                    return stockB - stockA;
                });
                break;
            case "stock_asc":
                this.core.shoes.sort((a, b) => {
                    const stockA = a.stock_info?.total_stock || 0;
                    const stockB = b.stock_info?.total_stock || 0;
                    return stockA - stockB;
                });
                break;
            case "name_asc":
                this.core.shoes.sort((a, b) => {
                    const nameA = (a.shoe_name || "").toLowerCase();
                    const nameB = (b.shoe_name || "").toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                break;
            case "name_desc":
                this.core.shoes.sort((a, b) => {
                    const nameA = (a.shoe_name || "").toLowerCase();
                    const nameB = (b.shoe_name || "").toLowerCase();
                    return nameB.localeCompare(nameA);
                });
                break;
            case "price_asc":
                this.core.shoes.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
                break;
            case "price_desc":
                this.core.shoes.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
                break;
        }
        
        console.log("✅ Sorted:", this.core.shoes.length, "products");
        this.renderShoesTable();
    }
    
    /**
     * Render Shoes Table with Total Stock
     */
    renderShoesTable() {
        const container = document.getElementById("shoesTableContainer");
        if (!container) return;
        
        if (!this.core.shoes || this.core.shoes.length === 0) {
            container.innerHTML = this.renderEmptyState(
                "No shoes found",
                "shoe-prints"
            );
            return;
        }
        
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 80px">Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Total Stock</th>
                            <th>Status</th>
                            <th style="width: 250px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.core.shoes.map((shoe) => this.renderShoeRow(shoe)).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    /**
     * Render a single shoe row
     */
   renderShoeRow(shoe) {
        const totalStock = shoe.stock_info?.total_stock || 0;
        const variantCount = shoe.stock_info?.variant_count || 0;
        const category = this.core.categories.find((c) => c.category_id === shoe.category_id);
        const statusClass = totalStock > 0 ? "success" : "danger";
        const statusText = totalStock > 0 ? "In Stock" : "Out of Stock";
        
        return `
            <tr style="cursor: pointer;" 
                onclick="adminManager.viewShoeDetails(${shoe.shoe_id})"
                title="Click to view details">
                <td>
                    <img src="${shoe.image_url || '/assets/images/placeholder.png'}" 
                         alt="${shoe.shoe_name}" 
                         class="img-thumbnail"
                         style="width: 60px; height: 60px; object-fit: cover">
                </td>
                <td>
                    <strong>${shoe.shoe_name}</strong>
                    <br>
                    <small class="text-muted">ID: ${shoe.shoe_id}</small>
                </td>
                <td>${category?.category_name || "N/A"}</td>
                <td>${this.formatPrice(shoe.base_price)}</td>
                <td>
                    <span class="badge ${
                        totalStock > 10 ? 'bg-success' :
                        totalStock > 0 ? 'bg-warning text-dark' : 'bg-danger'
                    } fs-6">
                        ${totalStock}
                    </span>
                    ${variantCount > 0 ? `<br><small class="text-muted">${variantCount} variants</small>` : ''}
                </td>
                <td>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </td>
                <td onclick="event.stopPropagation()">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-primary" 
                                onclick="event.stopPropagation(); adminManager.handleImport(${shoe.shoe_id});"
                                title="Import Stock">
                            <i class="bi bi-box-arrow-in-down"></i>
                        </button>
                        <button class="btn btn-warning" 
                                onclick="event.stopPropagation(); adminManager.editShoe(${shoe.shoe_id});"
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" 
                                onclick="event.stopPropagation(); adminManager.deleteShoe(${shoe.shoe_id});"
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
    renderEmptyState(message, icon) {
        return `
            <div class="text-center py-5">
                <i class="bi bi-${icon} display-1 text-muted"></i>
                <p class="text-muted mt-3">${message}</p>
            </div>
        `;
    }
    
    /**
     * Format price
     */
    formatPrice(price) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(price || 0);
    }
}
