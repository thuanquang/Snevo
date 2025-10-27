// Checkout Manager - Multi-step checkout flow
class CheckoutManager {
    constructor() {
        this.currentStep = 1;
        this.orderData = {
            items: [],
            subtotal: 0,
            shipping_cost: 0,
            tax_amount: 0,
            total: 0,
            address_id: null,
            delivery_option: 'standard',
            payment_method: 'cash_on_delivery',
            notes: ''
        };
        this.addresses = [];
        this.deliveryOptions = [
            { id: 'standard', name: 'Standard (3-5 days)', cost: 0 },
            { id: 'express', name: 'Express (1-2 days)', cost: 50000 }
        ];
        this.paymentMethods = [
            { id: 'cash_on_delivery', name: 'Cash on Delivery', icon: 'fas fa-money-bill' },
            { id: 'credit_card', name: 'Credit/Debit Card', icon: 'fas fa-credit-card' },
            { id: 'bank_transfer', name: 'Bank Transfer', icon: 'fas fa-university' },
            { id: 'vnpay', name: 'VNPAY', icon: 'fas fa-wallet' }
        ];
    }

    async init() {
        // Wait for auth and APIs
        await this.waitForAuthAndApi();

        // Check auth
        if (!window.authService || !window.authService.isAuthenticated()) {
            if (window.showLoginModal) window.showLoginModal();
            window.location.href = 'products.html';
            return;
        }

        console.log('✅ CheckoutManager initialized');
        
        // Load initial data
        await this.loadCartPreview();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render first step
        this.renderStep(1);
    }

    async waitForAuthAndApi() {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            if (window.authService?.initialized && 
                window.cartAPI && 
                window.ordersAPI && 
                window.usersAPI && 
                window.paymentsAPI) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ Timeout waiting for auth and APIs');
        return false;
    }

    async loadCartPreview() {
        try {
            console.log('📦 Loading cart preview...');
            const response = await window.ordersAPI.previewOrder();
            console.log('✅ Cart preview loaded:', response);
            
            // Extract data from response (API wraps in {success, message, data})
            const preview = response.data || response;
            
            this.orderData.items = preview.items || [];
            this.orderData.subtotal = preview.subtotal || 0;
            this.orderData.tax_amount = preview.tax_amount || 0;
            this.orderData.total = preview.total || 0;
            
            console.log('📦 Extracted preview data:', {
                items: this.orderData.items.length,
                subtotal: this.orderData.subtotal,
                total: this.orderData.total
            });
            
            this.updateSummary();
            this.renderCartReview();
        } catch (err) {
            console.error('❌ Failed to load cart preview');
            console.error('Error details:', err);
            console.error('Error message:', err.message);
            console.error('Error response:', err.response);
            console.error('Error status:', err.status);
            
            // Log the exact issue
            if (err.message?.includes('Cart is empty')) {
                console.warn('⚠️ Cart is empty');
                alert('Your cart is empty. Please add items before checkout.');
                window.location.href = 'products.html';
            } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
                console.warn('⚠️ User not authenticated');
                alert('Your session expired. Please login again.');
                window.location.href = 'index.html';
            } else {
                console.warn('⚠️ Unknown error occurred:', err.message);
                alert('Failed to load cart: ' + (err.message || 'Unknown error'));
                window.location.href = 'cart.html';
            }
        }
    }

    async loadAddresses() {
        try {
            const result = await window.usersAPI.getAddresses();
            console.log('📍 Loaded addresses:', result);
            // Handle both {data: [...]} and {addresses: [...], success, count} response formats
            this.addresses = result.data || result.addresses || [];
            console.log('📍 Addresses list:', this.addresses);
            this.renderAddresses();
        } catch (err) {
            console.error('❌ Failed to load addresses:', err);
            alert('Failed to load addresses');
        }
    }

    renderCartReview() {
        const container = document.getElementById('cartReviewContainer');
        if (!container) return;

        let html = '';
        for (const item of this.orderData.items) {
            const itemPrice = Number(item.price_at_add) || 0;
            const itemTotal = itemPrice * item.quantity;
            html += `
                <div class="cart-item-summary">
                    <img src="${item.variant_image || '/assets/images/ui/thian.jpg'}" alt="Product">
                    <div class="flex-grow-1">
                        <h5 class="mb-1">${item.shoe_name || 'Product'}</h5>
                        <p class="text-muted small mb-0">
                            Color: ${item.color_name || 'N/A'} | Size: ${item.size_label || 'N/A'}
                        </p>
                        <p class="text-muted small mb-0">Qty: ${item.quantity}</p>
                    </div>
                    <div class="text-end">
                        <p class="fw-bold mb-0">₫${this.formatPrice(itemTotal)}</p>
                        <p class="text-muted small">₫${this.formatPrice(itemPrice)} each</p>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html || '<p>No items in cart</p>';
    }

    renderAddresses() {
        const container = document.getElementById('addressesContainer');
        if (!container) return;

        if (this.addresses.length === 0) {
            container.innerHTML = '<p class="text-muted">No saved addresses. Add a new one to continue.</p>';
            return;
        }

        console.log('🏠 Rendering addresses:', this.addresses);
        console.log('🏠 First address structure:', this.addresses[0]);

        let html = '';
        for (const addr of this.addresses) {
            const checked = this.orderData.address_id === addr.address_id ? 'checked' : '';
            // Use fallback values for any missing fields
            const recipientName = addr.recipient_name || 'N/A';
            const street = addr.street || 'N/A';
            const ward = addr.ward || '';
            const district = addr.district || '';
            const city = addr.city || '';
            const phoneNumber = addr.phone_number || 'N/A';
            
            html += `
                <label class="address-option ${checked ? 'selected' : ''}">
                    <input type="radio" name="address" value="${addr.address_id}" ${checked}>
                    <div>
                        <p class="mb-1"><strong>${recipientName}</strong></p>
                        <p class="mb-1">${street}</p>
                        <p class="mb-1">${ward}${ward && district ? ', ' : ''}${district}${(ward || district) && city ? ', ' : ''}${city}</p>
                        <p class="mb-0 text-muted">Phone: ${phoneNumber}</p>
                    </div>
                </label>
            `;
        }
        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('input[name="address"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.orderData.address_id = parseInt(e.target.value);
                this.updateAddressSelection();
                document.getElementById('btnNextStep2').disabled = false;
            });
        });
    }

    updateAddressSelection() {
        document.querySelectorAll('.address-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        const selected = document.querySelector('input[name="address"]:checked');
        if (selected) {
            selected.closest('.address-option').classList.add('selected');
        }
    }

    renderDeliveryOptions() {
        const container = document.getElementById('deliveryOptionsContainer');
        if (!container) return;

        let html = '';
        for (const opt of this.deliveryOptions) {
            const checked = this.orderData.delivery_option === opt.id ? 'checked' : '';
            html += `
                <label class="delivery-option ${checked ? 'selected' : ''}">
                    <input type="radio" name="delivery" value="${opt.id}" ${checked}>
                    <div>
                        <p class="mb-1"><strong>${opt.name}</strong></p>
                        <p class="mb-0 text-muted">Shipping: ₫${this.formatPrice(opt.cost)}</p>
                    </div>
                </label>
            `;
        }
        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('input[name="delivery"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.orderData.delivery_option = e.target.value;
                const selectedOpt = this.deliveryOptions.find(o => o.id === e.target.value);
                this.orderData.shipping_cost = selectedOpt.cost;
                this.orderData.total = this.orderData.subtotal + this.orderData.shipping_cost + this.orderData.tax_amount;
                this.updateDeliverySelection();
                this.updateSummary();
                document.getElementById('btnNextStep3').disabled = false;
            });
        });
    }

    updateDeliverySelection() {
        document.querySelectorAll('.delivery-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        const selected = document.querySelector('input[name="delivery"]:checked');
        if (selected) {
            selected.closest('.delivery-option').classList.add('selected');
        }
    }

    renderPaymentMethods() {
        const container = document.getElementById('paymentMethodsContainer');
        if (!container) return;

        let html = '';
        for (const method of this.paymentMethods) {
            const checked = this.orderData.payment_method === method.id ? 'checked' : '';
            html += `
                <label class="payment-option ${checked ? 'selected' : ''}">
                    <input type="radio" name="payment" value="${method.id}" ${checked}>
                    <div>
                        <p class="mb-0"><i class="${method.icon}"></i> <strong>${method.name}</strong></p>
                    </div>
                </label>
            `;
        }
        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('input[name="payment"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.orderData.payment_method = e.target.value;
                this.updatePaymentSelection();
                document.getElementById('btnNextStep4').disabled = false;
            });
        });
    }

    updatePaymentSelection() {
        document.querySelectorAll('.payment-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        const selected = document.querySelector('input[name="payment"]:checked');
        if (selected) {
            selected.closest('.payment-option').classList.add('selected');
        }
    }

    renderReview() {
        const container = document.getElementById('orderSummaryReview');
        if (!container) return;

        const address = this.addresses.find(a => a.address_id === this.orderData.address_id);
        const delivery = this.deliveryOptions.find(o => o.id === this.orderData.delivery_option);
        const payment = this.paymentMethods.find(m => m.id === this.orderData.payment_method);

        console.log('🔍 Review render - Address:', address);
        console.log('🔍 Review render - Items:', this.orderData.items);
        console.log('🔍 Review render - Item[0]:', this.orderData.items[0]);

        let html = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6 class="text-muted">Shipping Address</h6>
                    <p class="mb-0"><strong>${address?.recipient_name || 'N/A'}</strong></p>
                    <p class="mb-0">${address?.street || 'N/A'}</p>
                    <p class="mb-0">${address?.ward || ''}, ${address?.district || ''}, ${address?.city || ''}</p>
                    <p class="text-muted small">${address?.phone_number || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted">Delivery & Payment</h6>
                    <p class="mb-0"><strong>${delivery?.name || 'N/A'}</strong></p>
                    <p class="mb-0"><strong>${payment?.name || 'N/A'}</strong></p>
                </div>
            </div>

            <h6 class="text-muted mt-4 mb-3">Order Items</h6>
            <table class="table table-sm">
                <tbody>
        `;

        for (const item of this.orderData.items) {
            const itemPrice = Number(item.price_at_add) || 0;
            const itemTotal = itemPrice * item.quantity;
            // Handle various possible field names
            const shoeName = item.shoe_name || item.name || 'Product';
            const colorName = item.color_name || item.color || 'N/A';
            const sizeLabel = item.size_label || item.size || 'N/A';
            
            html += `
                <tr>
                    <td>${shoeName} (${colorName}, Size ${sizeLabel})</td>
                    <td class="text-end">x${item.quantity}</td>
                    <td class="text-end fw-bold">₫${this.formatPrice(itemTotal)}</td>
                </tr>
            `;
        }

        html += `
                </tbody>
            </table>

            <div class="border-top mt-4 pt-3">
                <div class="row mb-2">
                    <div class="col-6">Subtotal</div>
                    <div class="col-6 text-end">₫${this.formatPrice(this.orderData.subtotal)}</div>
                </div>
                <div class="row mb-2">
                    <div class="col-6">Shipping</div>
                    <div class="col-6 text-end">₫${this.formatPrice(this.orderData.shipping_cost)}</div>
                </div>
                <div class="row mb-2">
                    <div class="col-6">Tax</div>
                    <div class="col-6 text-end">₫${this.formatPrice(this.orderData.tax_amount)}</div>
                </div>
                <div class="row fw-bold fs-5">
                    <div class="col-6">Total</div>
                    <div class="col-6 text-end">₫${this.formatPrice(this.orderData.total)}</div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    async goToStep(step) {
        // Validate current step before moving
        if (step > this.currentStep) {
            if (!this.validateCurrentStep()) {
                return;
            }
        }

        this.currentStep = step;
        this.renderStep(step);
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.orderData.items.length > 0;
            case 2:
                return this.orderData.address_id !== null;
            case 3:
                return this.orderData.delivery_option !== null;
            case 4:
                return this.orderData.payment_method !== null;
            default:
                return true;
        }
    }

    renderStep(step) {
        // Hide all steps
        document.querySelectorAll('.checkout-step').forEach(el => {
            el.classList.remove('active');
        });

        // Show current step
        const stepEl = document.getElementById(`step-${step}`);
        if (stepEl) stepEl.classList.add('active');

        // Update step indicator
        document.querySelectorAll('.step-indicator .step').forEach(el => {
            const stepNum = parseInt(el.getAttribute('data-step'));
            el.classList.remove('active', 'completed');
            if (stepNum === step) {
                el.classList.add('active');
            } else if (stepNum < step) {
                el.classList.add('completed');
            }
        });

        // Load step-specific data
        if (step === 2 && this.addresses.length === 0) {
            this.loadAddresses();
        }
        if (step === 3) {
            this.renderDeliveryOptions();
        }
        if (step === 4) {
            this.renderPaymentMethods();
        }
        if (step === 5) {
            this.renderReview();
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateSummary() {
        document.getElementById('summarySubtotal').textContent = `₫${this.formatPrice(this.orderData.subtotal)}`;
        document.getElementById('summaryShipping').textContent = `₫${this.formatPrice(this.orderData.shipping_cost)}`;
        document.getElementById('summaryTax').textContent = `₫${this.formatPrice(this.orderData.tax_amount)}`;
        document.getElementById('summaryTotal').textContent = `₫${this.formatPrice(this.orderData.total)}`;
    }

    async confirmOrder() {
        if (!this.orderData.address_id) {
            alert('Please select a shipping address');
            return;
        }

        try {
            // Disable button
            const btn = document.getElementById('btnConfirmOrder');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            // Create order
            const orderRes = await window.ordersAPI.createOrder({
                address_id: this.orderData.address_id,
                notes: this.orderData.notes || null
            });

            const orderId = orderRes.order_id;

            // Create payment record
            const paymentRes = await window.paymentsAPI.createPayment({
                order_id: orderId,
                payment_method: this.orderData.payment_method,
                payment_amount: this.orderData.total
            });

            const paymentId = paymentRes.payment_id;

            // Process payment (mock or provider)
            const processRes = await window.paymentsAPI.processPayment({
                payment_id: paymentId,
                provider: this.orderData.payment_method === 'vnpay' ? 'vnpay' : null,
                payload: {}
            });

            // Update navbar cart count
            if (window.navbarManager && window.navbarManager.updateCartCount) {
                window.navbarManager.updateCartCount(0);
            }

            // Redirect to order confirmation or orders page
            if (processRes.status === 'completed') {
                window.location.href = `orders.html?order_id=${orderId}`;
            } else {
                alert('Payment processing failed. Please try again.');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Confirm & Pay';
            }
        } catch (err) {
            console.error('❌ Order confirmation failed:', err);
            alert('Failed to confirm order: ' + (err.message || 'Unknown error'));
            const btn = document.getElementById('btnConfirmOrder');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirm & Pay';
        }
    }

    setupEventListeners() {
        // Step buttons
        document.getElementById('btnNextStep1')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('btnNextStep2')?.addEventListener('click', () => this.goToStep(3));
        document.getElementById('btnNextStep3')?.addEventListener('click', () => this.goToStep(4));
        document.getElementById('btnNextStep4')?.addEventListener('click', () => this.goToStep(5));

        document.getElementById('btnPrevStep2')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('btnPrevStep3')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('btnPrevStep4')?.addEventListener('click', () => this.goToStep(3));
        document.getElementById('btnPrevStep5')?.addEventListener('click', () => this.goToStep(4));

        document.getElementById('btnConfirmOrder')?.addEventListener('click', () => this.confirmOrder());

        // Address add new button
        document.getElementById('btnAddNewAddress')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddAddressModal();
        });

        // Save address button
        document.getElementById('btnSaveAddress')?.addEventListener('click', () => {
            this.saveNewAddress();
        });

        // Handle Enter key on address form
        document.getElementById('addAddressForm')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveNewAddress();
            }
        });
    }

    openAddAddressModal() {
        // Clear form
        document.getElementById('addAddressForm').reset();
        document.getElementById('country').value = 'Vietnam';
        document.getElementById('isDefault').checked = false;

        // Open modal
        const modal = new bootstrap.Modal(document.getElementById('addAddressModal'));
        modal.show();
    }

    async saveNewAddress() {
        const form = document.getElementById('addAddressForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            const btn = document.getElementById('btnSaveAddress');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const addressData = {
                recipient_name: document.getElementById('recipientName').value,
                phone_number: document.getElementById('phoneNumber').value,
                street: document.getElementById('street').value,
                ward: document.getElementById('ward').value,
                district: document.getElementById('district').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zip_code: document.getElementById('zipCode').value || null,
                country: document.getElementById('country').value,
                is_default: document.getElementById('isDefault').checked
            };

            const result = await window.usersAPI.addAddress(addressData);
            
            if (result.success || result.address) {
                console.log('✅ Address saved:', result.address);
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('addAddressModal')).hide();
                
                // Reload addresses
                await this.loadAddresses();
                
                // Auto-select the new address
                const newAddressId = result.address?.address_id;
                if (newAddressId) {
                    this.orderData.address_id = newAddressId;
                    this.updateAddressSelection();
                    document.getElementById('btnNextStep2').disabled = false;
                }
                
                // Show success message
                alert('Address added successfully!');
            } else {
                console.warn('⚠️ Response not success:', result);
                alert('Failed to save address: ' + (result.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('❌ Error saving address:', err);
            alert('Failed to save address: ' + (err.message || 'Unknown error'));
        } finally {
            const btn = document.getElementById('btnSaveAddress');
            btn.disabled = false;
            btn.innerHTML = 'Save Address';
        }
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(price));
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!window.checkoutManager) {
            window.checkoutManager = new CheckoutManager();
        }
        window.checkoutManager.init();
    }, 100);
});

// Export
export default CheckoutManager;
export { CheckoutManager };
