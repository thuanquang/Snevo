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
        if (!confirm("Are you sure you want to delete this shoe?")) {
            return;
        }
        
        console.log("🗑️ Delete shoe:", shoeId);
        alert("Delete shoe feature - Coming soon");
    }
    
    /**
     * Edit variant
     */
    editVariant(variantId) {
        console.log("✏️ Edit variant:", variantId);
        alert("Edit variant feature - Coming soon");
    }
    
    /**
     * Delete variant
     */
    async deleteVariant(variantId) {
        if (!confirm("Are you sure you want to delete this variant?")) {
            return;
        }
        
        console.log("🗑️ Delete variant:", variantId);
        alert("Delete variant feature - Coming soon");
    }
    
    /**
     * Edit category
     */
    editCategory(categoryId) {
        console.log("✏️ Edit category:", categoryId);
        alert("Edit category feature - Coming soon");
    }
    
    /**
     * Delete category
     */
    async deleteCategory(categoryId) {
        if (!confirm("Are you sure you want to delete this category?")) {
            return;
        }
        
        console.log("🗑️ Delete category:", categoryId);
        alert("Delete category feature - Coming soon");
    }
}
