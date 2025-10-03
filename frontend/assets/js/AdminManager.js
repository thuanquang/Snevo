// Admin Manager
class AdminManager {
    constructor() {
        this.sb = null;
        this.schema = 'db_nike';
        this.modals = {};
        this.state = {
            categories: [],
            shoes: [],
            colors: [],
            sizes: [],
            variants: [],
            variantsJoined: []
        };

        document.addEventListener('DOMContentLoaded', () => this.initialize());
    }

    async initialize() {
        // Require auth and seller role
        if (!window.authManager) return alert('Auth not available');

        // Revalidate/refresh session before checks
        try {
            if (window.authManager && typeof window.authManager.validateAndRefreshSession === 'function') {
                await window.authManager.validateAndRefreshSession();
            }
        } catch (e) {
            console.warn('Session revalidation failed:', e);
        }

        if (!window.authManager.isAuthenticated()) {
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `login.html?return=${returnUrl}`;
            return;
        }
        let user = window.authManager.getCurrentUser();

        // Ensure role is attached before enforcing seller-only access
        if (user && !user.role && window.authManager.supabaseClient) {
            try {
                await window.authManager.fetchAndAttachProfileRole(user.id);
                user = window.authManager.getCurrentUser();
            } catch (e) {
                console.warn('Failed to attach profile role:', e);
            }
        }

        if (!user || user.role !== 'seller') {
            alert('Access denied. Seller role required.');
            window.location.href = 'index.html';
            return;
        }

        this.sb = window.authManager.supabaseClient;
        if (!this.sb) {
            alert('Supabase not initialized. Refresh the page.');
            return;
        }

        this.bindUI();
        this.initModals();
        await this.preloadData();
        await Promise.all([this.loadCategories(), this.loadVariants()]);
    }

    bindUI() {
        const newCatBtn = document.getElementById('btnNewCategory');
        if (newCatBtn) newCatBtn.addEventListener('click', () => this.openCategoryModal());
        // Fallback: also bind by class name if present
        document.querySelectorAll('.btnNewCategory').forEach(btn => {
            btn.addEventListener('click', () => this.openCategoryModal());
        });

        const newVarBtn = document.getElementById('btnNewVariant');
        if (newVarBtn) newVarBtn.addEventListener('click', () => this.openVariantModal());
        // Fallback: also bind by class name if present
        document.querySelectorAll('.btnNewVariant').forEach(btn => {
            btn.addEventListener('click', () => this.openVariantModal());
        });

        const search = document.getElementById('variantSearch');
        if (search) search.addEventListener('input', () => this.renderVariants());

        const catForm = document.getElementById('categoryForm');
        if (catForm) catForm.addEventListener('submit', (e) => this.submitCategory(e));

        const varForm = document.getElementById('variantForm');
        if (varForm) varForm.addEventListener('submit', (e) => this.submitVariant(e));

        const stockForm = document.getElementById('stockForm');
        if (stockForm) stockForm.addEventListener('submit', (e) => this.submitStock(e));
    }

    initModals() {
        try {
            this.modals.category = new bootstrap.Modal(document.getElementById('categoryModal'));
            this.modals.variant = new bootstrap.Modal(document.getElementById('variantModal'));
            this.modals.stock = new bootstrap.Modal(document.getElementById('stockModal'));
        } catch (e) {
            console.warn('Bootstrap modal not available', e);
        }
    }

    async preloadData() {
        // Load lookup tables
        const client = this.sb.schema(this.schema);
        const [shoes, colors, sizes] = await Promise.all([
            client.from('shoes').select('shoe_id, shoe_name').order('shoe_name'),
            client.from('colors').select('color_id, color_name').order('color_name'),
            client.from('sizes').select('size_id, size_value, size_type').order('size_value')
        ]);

        this.state.shoes = shoes.data || [];
        this.state.colors = colors.data || [];
        this.state.sizes = sizes.data || [];

        // Fill selects
        const shoeSel = document.getElementById('variant_shoe');
        const colorSel = document.getElementById('variant_color');
        const sizeSel = document.getElementById('variant_size');
        if (shoeSel) shoeSel.innerHTML = this.state.shoes.map(s => `<option value="${s.shoe_id}">${s.shoe_name}</option>`).join('');
        if (colorSel) colorSel.innerHTML = this.state.colors.map(c => `<option value="${c.color_id}">${c.color_name}</option>`).join('');
        if (sizeSel) sizeSel.innerHTML = this.state.sizes.map(s => `<option value="${s.size_id}">${s.size_value} ${s.size_type}</option>`).join('');
    }

    // Categories
    async loadCategories() {
        const { data, error } = await this.sb.schema(this.schema).from('categories').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Load categories error:', error);
            this.toast(error.message || 'Failed to load categories', 'error');
            return;
        }
        this.state.categories = data || [];
        this.renderCategories();
    }

    renderCategories() {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;
        tbody.innerHTML = this.state.categories.map(c => `
            <tr>
                <td>${c.category_id}</td>
                <td>${this.escapeHtml(c.category_name)}</td>
                <td>${this.escapeHtml(c.description || '')}</td>
                <td>
                    <span class="badge ${c.is_active ? 'bg-success' : 'bg-secondary'}">${c.is_active ? 'Yes' : 'No'}</span>
                </td>
                <td class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${c.category_id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${c.category_id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.getAttribute('data-id'));
            const cat = this.state.categories.find(x => x.category_id === id);
            if (cat) this.openCategoryModal(cat);
        }));

        tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.getAttribute('data-id'));
            this.deleteCategory(id);
        }));
    }

    openCategoryModal(category = null) {
        const title = document.getElementById('categoryModalTitle');
        const idEl = document.getElementById('category_id');
        const nameEl = document.getElementById('category_name');
        const descEl = document.getElementById('category_description');
        const actEl = document.getElementById('category_active');

        if (category) {
            title.textContent = 'Edit Category';
            idEl.value = category.category_id;
            nameEl.value = category.category_name || '';
            descEl.value = category.description || '';
            actEl.checked = !!category.is_active;
        } else {
            title.textContent = 'New Category';
            idEl.value = '';
            nameEl.value = '';
            descEl.value = '';
            actEl.checked = true;
        }
        this.modals.category?.show();
    }

    async submitCategory(e) {
        e.preventDefault();
        const id = Number(document.getElementById('category_id').value || 0);
        const name = (document.getElementById('category_name').value || '').trim();
        const description = (document.getElementById('category_description').value || '').trim();
        const is_active = document.getElementById('category_active').checked;
        if (!name) return this.toast('Name is required', 'error');

        let result;
        if (id > 0) {
            result = await this.sb.schema(this.schema).from('categories').update({ category_name: name, description, is_active }).eq('category_id', id).select('*').single();
        } else {
            result = await this.sb.schema(this.schema).from('categories').insert({ category_name: name, description, is_active }).select('*').single();
        }

        if (result.error) {
            console.error('Save category error:', result.error);
            this.toast(result.error.message || 'Failed to save category', 'error');
            return;
        }
        this.modals.category?.hide();
        await this.loadCategories();
        this.toast('Category saved', 'success');
    }

    async deleteCategory(id) {
        if (!confirm('Delete this category?')) return;
        const { error } = await this.sb.schema(this.schema).from('categories').delete().eq('category_id', id);
        if (error) {
            console.error('Delete category error:', error);
            this.toast(error.message || 'Failed to delete category', 'error');
            return;
        }
        await this.loadCategories();
        this.toast('Category deleted', 'success');
    }

    // Variants
    async loadVariants() {
        const client = this.sb.schema(this.schema);
        const { data, error } = await client.from('shoe_variants').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Load variants error:', error);
            this.toast(error.message || 'Failed to load variants', 'error');
            return;
        }
        this.state.variants = data || [];
        // join
        const shoeMap = new Map(this.state.shoes.map(s => [s.shoe_id, s]));
        const colorMap = new Map(this.state.colors.map(c => [c.color_id, c]));
        const sizeMap = new Map(this.state.sizes.map(s => [s.size_id, s]));
        this.state.variantsJoined = this.state.variants.map(v => ({
            ...v,
            shoe: shoeMap.get(v.shoe_id) || null,
            color: colorMap.get(v.color_id) || null,
            size: sizeMap.get(v.size_id) || null
        }));
        this.renderVariants();
    }

    renderVariants() {
        const tbody = document.getElementById('variantsTableBody');
        if (!tbody) return;
        const q = (document.getElementById('variantSearch')?.value || '').toLowerCase();
        const filtered = this.state.variantsJoined.filter(v =>
            (v.shoe?.shoe_name || '').toLowerCase().includes(q) ||
            (v.sku || '').toLowerCase().includes(q)
        );
        tbody.innerHTML = filtered.map(v => `
            <tr>
                <td>${v.variant_id}</td>
                <td>${this.escapeHtml(v.shoe?.shoe_name || '')}</td>
                <td>${this.escapeHtml(v.color?.color_name || '')}</td>
                <td>${this.escapeHtml(v.size?.size_value || '')}</td>
                <td>${this.escapeHtml(v.sku || '')}</td>
                <td>${Number(v.variant_price || 0).toFixed(2)}</td>
                <td>${Number(v.stock_quantity || 0)}</td>
                <td><span class="badge ${v.is_active ? 'bg-success' : 'bg-secondary'}">${v.is_active ? 'Yes' : 'No'}</span></td>
                <td class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary" data-action="edit-variant" data-id="${v.variant_id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-secondary" data-action="stock-variant" data-id="${v.variant_id}"><i class="fas fa-plus"></i></button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete-variant" data-id="${v.variant_id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('button[data-action="edit-variant"]').forEach(btn => btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.getAttribute('data-id'));
            const v = this.state.variants.find(x => x.variant_id === id);
            if (v) this.openVariantModal(v);
        }));

        tbody.querySelectorAll('button[data-action="stock-variant"]').forEach(btn => btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.getAttribute('data-id'));
            this.openStockModal(id);
        }));

        tbody.querySelectorAll('button[data-action="delete-variant"]').forEach(btn => btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.getAttribute('data-id'));
            this.deleteVariant(id);
        }));
    }

    openVariantModal(variant = null) {
        const title = document.getElementById('variantModalTitle');
        const idEl = document.getElementById('variant_id');
        const shoeEl = document.getElementById('variant_shoe');
        const colorEl = document.getElementById('variant_color');
        const sizeEl = document.getElementById('variant_size');
        const skuEl = document.getElementById('variant_sku');
        const priceEl = document.getElementById('variant_price');
        const initStockEl = document.getElementById('variant_initial_stock');
        const importPriceEl = document.getElementById('variant_import_price');
        const actEl = document.getElementById('variant_active');

        if (variant) {
            title.textContent = 'Edit Variant';
            idEl.value = variant.variant_id;
            shoeEl.value = String(variant.shoe_id);
            colorEl.value = String(variant.color_id);
            sizeEl.value = String(variant.size_id);
            skuEl.value = variant.sku || '';
            priceEl.value = variant.variant_price ?? '';
            initStockEl.value = '';
            importPriceEl.value = '';
            actEl.checked = !!variant.is_active;
        } else {
            title.textContent = 'New Variant';
            idEl.value = '';
            shoeEl.value = shoeEl.options[0]?.value || '';
            colorEl.value = colorEl.options[0]?.value || '';
            sizeEl.value = sizeEl.options[0]?.value || '';
            skuEl.value = '';
            priceEl.value = '';
            initStockEl.value = '';
            importPriceEl.value = '';
            actEl.checked = true;
        }
        this.modals.variant?.show();
    }

    async submitVariant(e) {
        e.preventDefault();
        const id = Number(document.getElementById('variant_id').value || 0);
        const shoe_id = Number(document.getElementById('variant_shoe').value);
        const color_id = Number(document.getElementById('variant_color').value);
        const size_id = Number(document.getElementById('variant_size').value);
        const sku = (document.getElementById('variant_sku').value || '').trim();
        const variant_price = Number(document.getElementById('variant_price').value || 0);
        const initial_stock = Number(document.getElementById('variant_initial_stock').value || 0);
        const import_price = Number(document.getElementById('variant_import_price').value || 0);
        const is_active = document.getElementById('variant_active').checked;

        if (!shoe_id || !color_id || !size_id || !sku || variant_price < 0) {
            return this.toast('Please fill all required fields and valid price', 'error');
        }

        const client = this.sb.schema(this.schema).from('shoe_variants');
        let result;
        if (id > 0) {
            result = await client.update({ shoe_id, color_id, size_id, sku, variant_price, is_active }).eq('variant_id', id).select('*').single();
        } else {
            result = await client.insert({ shoe_id, color_id, size_id, sku, variant_price, is_active, stock_quantity: 0 }).select('*').single();
        }

        if (result.error) {
            console.error('Save variant error:', result.error);
            this.toast(result.error.message || 'Failed to save variant', 'error');
            return;
        }

        const variant = result.data;
        // Handle initial stock via imports
        if (!id && initial_stock > 0) {
            await this.createImport(variant.variant_id, initial_stock, import_price);
        }

        this.modals.variant?.hide();
        await this.loadVariants();
        this.toast('Variant saved', 'success');
    }

    async openStockModal(variant_id) {
        document.getElementById('stock_variant_id').value = String(variant_id);
        document.getElementById('stock_quantity').value = '';
        document.getElementById('stock_import_price').value = '';
        this.modals.stock?.show();
    }

    async submitStock(e) {
        e.preventDefault();
        const variant_id = Number(document.getElementById('stock_variant_id').value);
        const quantity = Number(document.getElementById('stock_quantity').value || 0);
        const import_price = Number(document.getElementById('stock_import_price').value || 0);
        if (quantity <= 0) return this.toast('Quantity must be > 0', 'error');
        await this.createImport(variant_id, quantity, import_price);
        this.modals.stock?.hide();
        await this.loadVariants();
        this.toast('Stock added', 'success');
    }

    async createImport(variant_id, quantity, import_price) {
        const user = window.authManager.getCurrentUser();
        const payload = {
            user_id: user?.id,
            variant_id,
            quantity_imported: quantity,
            import_price: import_price,
            import_date: new Date().toISOString()
        };
        const { error } = await this.sb.schema(this.schema).from('imports').insert(payload);
        if (error) {
            console.error('Create import error:', error);
            this.toast(error.message || 'Failed to add stock', 'error');
        }
    }

    async deleteVariant(id) {
        if (!confirm('Delete this variant?')) return;
        const { error } = await this.sb.schema(this.schema).from('shoe_variants').delete().eq('variant_id', id);
        if (error) {
            console.error('Delete variant error:', error);
            this.toast(error.message || 'Failed to delete variant', 'error');
            return;
        }
        await this.loadVariants();
        this.toast('Variant deleted', 'success');
    }

    // Utils
    toast(message, type = 'info') {
        if (window.showToast) return window.showToast(message, type);
        // fallback
        if (type === 'error') alert(message); else console.log(message);
    }

    escapeHtml(str) {
        return String(str).replace(/[&<>"]+/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
    }
}

// Create global instance so it initializes and handlers are active
const adminManager = new AdminManager();
window.AdminManager = AdminManager;
window.adminManager = adminManager;
