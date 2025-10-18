// frontend/assets/js/admin/AdminImportHistory.js
/**
 * AdminImportHistory - Handles import history display
 */
class AdminImportHistory {
    constructor(core, productRenderer) {
        this.core = core;
        this.productRenderer = productRenderer;
    }
    
    /**
     * Setup import history tab listener
     */
    setupImportHistoryTabListener() {
        const historyTab = document.getElementById("import-history-tab");
        if (historyTab) {
            historyTab.addEventListener("shown.bs.tab", () => {
                this.loadImportHistory();
            });
        }
    }
    
    /**
     * Load import history
     */
    async loadImportHistory() {
        const container = document.getElementById("importHistoryContainer");
        
        if (!this.core.importState.shoeId) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Please select a shoe to view import history
                </div>
            `;
            return;
        }
        
        try {
            container.innerHTML = '<div class="text-center py-4">Loading...</div>';
            
            console.log(
                "📥 Loading import history for shoe:",
                this.core.importState.shoeId
            );
            
            if (!window.importsAPI) {
                throw new Error("ImportsAPI not loaded");
            }
            
            const response = await window.importsAPI.getImportsByShoe(
                this.core.importState.shoeId
            );
            
            console.log("📦 Import history response:", response);
            
            if (!response.success || !response.data || response.data.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-inbox"></i> No import history for this shoe yet
                    </div>
                `;
                document.getElementById("importHistoryCount").textContent = "0";
                return;
            }
            
            document.getElementById("importHistoryCount").textContent = response.data.length;
            
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Color</th>
                                <th>Size</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Cost</th>
                                <th>By</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${response.data
                                .map((imp) => this.renderImportHistoryRow(imp))
                                .join("")}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error("❌ Load import history error:", error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load import history
                </div>
            `;
        }
    }
    
    /**
     * Render import history row
     */
    renderImportHistoryRow(imp) {
        return `
            <tr>
                <td>${this.formatDate(imp.import_date)}</td>
                <td>${imp.variant?.color?.color_name || "N/A"}</td>
                <td>${imp.variant?.size?.size_value || "N/A"}</td>
                <td>${imp.quantity_imported}</td>
                <td>${imp.import_price.toFixed(2)}</td>
                <td>${(imp.quantity_imported * imp.import_price).toFixed(2)}</td>
                <td>${imp.profiles?.username || "N/A"}</td>
                <td>${imp.notes || "-"}</td>
            </tr>
        `;
    }
    
    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return "N/A";
        
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }
}
