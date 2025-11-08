                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    // Checkout Manager - Multi-step checkout flow
class CheckoutManager {
    constructor() {
        this.currentStep = 1;
        this.currentOrderId = null;  // Track order ID for cancellation
        this.orderData = {
            items: [],
            subtotal: 0,
            shipping_cost: 0,
            tax_amount: 0,
            total: 0,
            address_id: null,
            delivery_option: 'standard',
            payment_method: 'cash',
            notes: ''
        };
        this.addresses = [];
        this.deliveryOptions = [
            { id: 'standard', name: 'Standard (3-5 days)', cost: 0 },
            { id: 'express', name: 'Express (1-2 days)', cost: 50000 }
        ];
        this.paymentMethods = [
            { id: 'cash', name: 'Cash on Delivery', icon: 'fas fa-money-bill' },
            { id: 'credit_card', name: 'Credit/Debit Card', icon: 'fas fa-credit-card' },
            { id: 'bank_transfer', name: 'Bank Transfer', icon: 'fas fa-university' },
            { id: 'stripe', name: 'Stripe', icon: 'fas fa-credit-card' }
        ];
        this.paymentData = {
            cardNumber: '',
            cardHolder: '',
            expiryDate: '',
            cvv: '',
            bankAccount: '',
            bankCode: ''
        };
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

        // Check for pending order to resume
        await this.checkForPendingOrder();
        
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

    async checkForPendingOrder() {
        try {
            // Fetch user's orders
            const response = await window.ordersAPI.getOrders();
            
            // Extract orders array from response
            // API returns paginated format: {success: true, data: {orders: [...], total: N, page: 1, ...}}
            let orders;
            
            if (Array.isArray(response)) {
                orders = response;
            } else if (response && typeof response === 'object') {
                // Try different nested structures
                if (Array.isArray(response.data)) {
                    orders = response.data;
                } else if (response.data && Array.isArray(response.data.orders)) {
                    // ⭐ Paginated format with data.orders
                    orders = response.data.orders;
                } else if (response.data && Array.isArray(response.data.data)) {
                    orders = response.data.data;
                } else {
                    orders = [];
                }
            } else {
                orders = [];
            }
            
            if (!Array.isArray(orders) || orders.length === 0) {
                return;
            }
            
            // Find most recent pending order
            const pendingOrder = orders.find(o => o.status === 'pending');
            
            if (pendingOrder) {
                // Show modal with options
                const message = `You have an incomplete checkout from ${new Date(pendingOrder.created_at).toLocaleString()}. Would you like to resume or start fresh?`;
                
                if (confirm(message + '\n\nClick OK to Resume, Cancel to start fresh.')) {
                    // Resume: load order data
                    this.currentOrderId = pendingOrder.order_id;
                    // Skip to step 5 (review) to allow payment retry
                    // Optionally load order details
                } else {
                    // Start fresh: offer to cancel pending order
                    if (confirm('Cancel the pending order to release stock?')) {
                        try {
                            await window.ordersAPI.cancelOrder(pendingOrder.order_id);
                        } catch (e) {
                            console.warn('⚠️ Failed to cancel pending order:', e);
                        }
                    }
                }
            }
        } catch (err) {
            // Silent fail - just continue with checkout
            console.warn('⚠️ Could not check for pending orders:', err);
        }
    }

    async loadCartPreview() {
        try {
            const response = await window.ordersAPI.previewOrder();
            
            // Extract data from response (API wraps in {success, message, data})
            const preview = response.data || response;
            
            this.orderData.items = preview.items || [];
            this.orderData.subtotal = preview.subtotal || 0;
            this.orderData.tax_amount = preview.tax_amount || 0;
            this.orderData.total = preview.total || 0;
            
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
            // Handle both {data: [...]} and {addresses: [...], success, count} response formats
            this.addresses = result.data || result.addresses || [];
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
        const radios = container.querySelectorAll('input[name="payment"]');
        
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.orderData.payment_method = e.target.value;
                this.updatePaymentSelection();
                this.renderPaymentForm();
                const btn = document.getElementById('btnNextStep4');
                if (btn) btn.disabled = false;
            });
        });

        // Render payment form if non-cash method selected
        this.renderPaymentForm();

        // Enable button immediately after rendering (initial default selected)
        const btn = document.getElementById('btnNextStep4');
        if (btn) {
            btn.disabled = false;
        }
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

    renderPaymentForm() {
        const formContainer = document.getElementById('paymentFormContainer');
        if (!formContainer) {
            console.warn('⚠️ paymentFormContainer not found');
            return;
        }

        // Hide form for cash on delivery
        if (this.orderData.payment_method === 'cash') {
            formContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    You will pay cash on delivery. No advance payment required.
                </div>
            `;
            return;
        }

        let html = '<div class="payment-form mt-3">';

        if (this.orderData.payment_method === 'credit_card') {
            html += `
                <h6 class="mb-3">Credit/Debit Card Details</h6>
                <div class="mb-3">
                    <label for="cardNumber" class="form-label">Card Number</label>
                    <input type="text" class="form-control" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19">
                </div>
                <div class="mb-3">
                    <label for="cardHolder" class="form-label">Card Holder Name</label>
                    <input type="text" class="form-control" id="cardHolder" placeholder="JOHN DOE">
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="expiryDate" class="form-label">Expiry Date (MM/YY)</label>
                        <input type="text" class="form-control" id="expiryDate" placeholder="12/25" maxlength="5">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="cvv" class="form-label">CVV</label>
                        <input type="text" class="form-control" id="cvv" placeholder="123" maxlength="4">
                    </div>
                </div>
            `;
        } else if (this.orderData.payment_method === 'bank_transfer') {
            html += `
                <h6 class="mb-3">Bank Transfer Details</h6>
                <div class="mb-3">
                    <label for="bankCode" class="form-label">Select Bank</label>
                    <select class="form-control" id="bankCode">
                        <option value="">Choose a bank</option>
                        <option value="VIETCOMBANK">Vietcombank</option>
                        <option value="TECHCOMBANK">Techcombank</option>
                        <option value="BIDV">BIDV</option>
                        <option value="ACB">ACB</option>
                        <option value="MB">MB Bank</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="bankAccount" class="form-label">Account Number</label>
                    <input type="text" class="form-control" id="bankAccount" placeholder="Your account number">
                </div>
                <div class="alert alert-info small">
                    <i class="fas fa-info-circle"></i>
                    A payment link will be provided after review.
                </div>
            `;
        } else if (this.orderData.payment_method === 'stripe') {
            html += `
                <h6 class="mb-3">Stripe Payment</h6>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    You will be redirected to Stripe payment gateway after review.
                </div>
            `;
        }

        html += '</div>';
        formContainer.innerHTML = html;
    }

    renderReview() {
        const container = document.getElementById('orderSummaryReview');
        if (!container) return;

        const address = this.addresses.find(a => a.address_id === this.orderData.address_id);
        const delivery = this.deliveryOptions.find(o => o.id === this.orderData.delivery_option);
        const payment = this.paymentMethods.find(m => m.id === this.orderData.payment_method);

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

        // ⭐ Update button text based on payment method
        const btn = document.getElementById('btnConfirmOrder');
        if (this.orderData.payment_method === 'cash') {
            btn.innerHTML = '<i class="fas fa-check"></i> Confirm Order';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-success');
        } else {
            btn.innerHTML = '<i class="fas fa-credit-card"></i> Confirm & Pay';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-success');
        }
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

            // Collect payment details based on payment method
            let payment_details = null;
            if (this.orderData.payment_method === 'credit_card') {
                const cardNumber = document.getElementById('cardNumber')?.value;
                const cardHolder = document.getElementById('cardHolder')?.value;
                const expiryDate = document.getElementById('expiryDate')?.value;
                const cvv = document.getElementById('cvv')?.value;
                
                if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
                    alert('Please fill all card details');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i> Confirm & Pay';
                    return;
                }
                
                payment_details = {
                    card_number: cardNumber.replace(/\s/g, ''),
                    card_holder: cardHolder,
                    expiry_date: expiryDate,
                    cvv: cvv
                };
            } else if (this.orderData.payment_method === 'bank_transfer') {
                const bankCode = document.getElementById('bankCode')?.value;
                const bankAccount = document.getElementById('bankAccount')?.value;
                
                if (!bankCode || !bankAccount) {
                    alert('Please fill all bank transfer details');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i> Confirm & Pay';
                    return;
                }
                
                payment_details = {
                    bank_code: bankCode,
                    account_number: bankAccount
                };
            }

            // Create order with payment info
            const orderPayload = {
                address_id: this.orderData.address_id,
                notes: this.orderData.notes || null,
                shipping_cost: this.orderData.shipping_cost || 0,
                tax_amount: this.orderData.tax_amount || 0,
                payment_method: this.orderData.payment_method,
                payment_details: payment_details
            };
            const orderRes = await window.ordersAPI.createOrder(orderPayload);

            // Extract order data from nested response
            const orderData = orderRes?.data || orderRes;
            const orderId = orderData.order_id;
            const orderStatus = orderData.order_status;
            const payment = orderData.payment;

            if (!orderId) {
                throw new Error('Order created but no order_id in response');
            }

            this.currentOrderId = orderId; // Store order ID for cancellation

            // Update navbar cart count
            if (window.navbarManager && window.navbarManager.updateCartCount) {
                window.navbarManager.updateCartCount(0);
            }

            // Show appropriate message based on payment method and status
            let message = '';
            if (this.orderData.payment_method === 'cash') {
                message = 'Order placed successfully! You will pay cash on delivery.';
            } else if (this.orderData.payment_method === 'bank_transfer') {
                message = 'Order placed! Please wait for admin confirmation of your bank transfer.';
            } else if (payment?.status === 'completed') {
                message = 'Payment successful! Your order has been confirmed.';
            } else {
                message = 'Order placed! Payment is being processed.';
            }

            alert(message);
            window.location.href = `orders.html?order_id=${orderId}`;
        } catch (err) {
            console.error('❌ Order confirmation failed:', err);
            
            // Extract validation errors if available
            const serverDetails = err?.response?.data?.details;
            let errorMsg = err.message || 'Unknown error';
            if (serverDetails?.errors && Array.isArray(serverDetails.errors)) {
                errorMsg = serverDetails.errors.map(e => e.message).join(', ');
            }
            
            alert('Failed to confirm order: ' + errorMsg);
            const btn = document.getElementById('btnConfirmOrder');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirm & Pay';
        }
    }

    async cancelCheckout() {
        if (!confirm('Are you sure you want to cancel this checkout? Stock will be released and you can shop again.')) {
            return;
        }

        try {
            const btn = document.getElementById('btnCancelCheckout');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';

            // If an order was created, cancel it (which will trigger stock release via database trigger)
            if (this.currentOrderId) {
                await window.ordersAPI.cancelOrder(this.currentOrderId);
            }

            // Show success message
            alert('Checkout cancelled. Stock has been released.');
            
            // Redirect to products page
            window.location.href = 'products.html';
        } catch (err) {
            console.error('❌ Error cancelling checkout:', err);
            alert('Failed to cancel checkout: ' + (err.message || 'Unknown error'));
            const btn = document.getElementById('btnCancelCheckout');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-times"></i> Cancel Checkout';
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

        document.getElementById('btnCancelCheckout')?.addEventListener('click', () => this.cancelCheckout());

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
