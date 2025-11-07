// frontend/assets/js/admin/AdminOrderManagement.js

/**
 * AdminOrderManagement - Order Management Module
 * Handles order listing, filtering, pagination, and actions (approve/cancel/view)
 */
class AdminOrderManagement {
  constructor(core, adminManager) {
    this.core = core;
    this.adminManager = adminManager;
    this.currentState = {
      status: '',
      search: '',
      currentPage: 1
    };
    
    console.log('✅ AdminOrderManagement initialized');
  }

  /**
   * Initialize and setup event listeners
   */
  init() {
    // Store global reference for inline onclick handlers
    window.adminLoadOrders = (page) => this.loadOrders(page);
    window.adminRenderOrders = (orders) => this.renderOrders(orders);
    window.adminRenderPagination = (pagination) => this.renderPagination(pagination);
    window.adminViewOrderDetail = (orderId) => this.viewOrderDetail(orderId);
    window.adminApproveOrder = (orderId) => this.approveOrder(orderId);
    window.adminCancelOrder = (orderId, buttonElement) => this.cancelOrder(orderId, buttonElement);
    
    console.log('✅ Order management global functions registered');
  }

  /**
   * Update pending orders badge with total count from all orders
   */
  async updatePendingBadge() {
    try {
      // ✅ OPTIMIZATION: Only fetch count, not full data
      // Use pagination.total from a minimal query
      const response = await window.adminOrdersAPI.getOrders({ 
        status: 'pending',
        limit: 1 // Only need count, not actual data
      });
      
      const pendingCount = response?.pagination?.total || 0;
      
      const badgeElement = document.getElementById('pendingOrdersCount');
      if (badgeElement) {
        badgeElement.textContent = pendingCount;
        badgeElement.style.display = pendingCount > 0 ? 'inline-block' : 'none';
      }
      
      console.log(`✅ Pending badge updated: ${pendingCount} pending orders`);
    } catch (error) {
      console.error('❌ Failed to update pending badge:', error);
      // Don't throw - badge update is not critical
    }
  }

  /**
   * Load orders with current filters
   */
  async loadOrders(page = 1) {
    try {
      // ✅ FIX: Always prioritize UI values over stored state
      const statusFilterElement = document.getElementById('orderStatusFilter');
      const searchInputElement = document.getElementById('orderSearchInput');
      
      // Get values directly from UI (use empty string for "All Status")
      const statusFilter = statusFilterElement ? statusFilterElement.value : '';
      const searchId = searchInputElement ? searchInputElement.value.trim() : '';
      
      // Store state for persistence
      this.currentState = {
        status: statusFilter,
        search: searchId,
        currentPage: page
      };
      
      console.log('📦 Loading orders page', page, 'with filters:', { statusFilter, searchId });
      
      // ✅ OPTIMIZATION: Single API call with Promise.all for parallel execution
      const [ordersResponse, pendingResponse] = await Promise.all([
        // Main orders query with filters
        window.adminOrdersAPI.getOrders({ 
          status: statusFilter, 
          search: searchId,
          page: page,
          limit: 10
        }),
        // Pending count query (only if not already filtering by pending)
        statusFilter !== 'pending' 
          ? window.adminOrdersAPI.getOrders({ status: 'pending', limit: 1 })
          : Promise.resolve(null)
      ]);
      
      console.log('📦 Raw API response:', ordersResponse);
      
      // Extract pagination metadata
      const pagination = ordersResponse?.pagination || {};
      const ordersList = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
      
      console.log('📦 Extracted ordersList:', ordersList.length, 'items | Pagination:', pagination);
      
      if (!Array.isArray(ordersList)) {
        console.error('❌ ordersList is not an array:', typeof ordersList, ordersList);
        throw new Error('Invalid orders data format - not an array');
      }
      
      // Update pending badge
      const badgeElement = document.getElementById('pendingOrdersCount');
      if (badgeElement) {
        let pendingCount;
        if (statusFilter === 'pending') {
          // If filtering by pending, use the main query's total
          pendingCount = pagination.total || 0;
        } else {
          // Use the separate pending query result
          pendingCount = pendingResponse?.pagination?.total || 0;
        }
        badgeElement.textContent = pendingCount;
        badgeElement.style.display = pendingCount > 0 ? 'inline-block' : 'none';
      }
      
      console.log('📦 Rendering', ordersList.length, 'orders...');
      
      // Render orders table
      this.renderOrders(ordersList);
      
      // Render pagination controls
      this.renderPagination(pagination);
      
      console.log('✅ Orders loaded and rendered successfully');
    } catch (err) {
      console.error('❌ Failed to load orders:', err);
      document.getElementById('ordersTableBody').innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-circle me-2"></i>
            Failed to load orders: ${err.message}
          </td>
        </tr>
      `;
      // Clear pagination on error
      const paginationContainer = document.getElementById('ordersPagination');
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
      }
    }
  }

  /**
   * Render orders in table
   */
  renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="fas fa-inbox me-2"></i>
            Không tìm thấy đơn hàng nào
          </td>
        </tr>
      `;
      return;
    }
    
    const rows = orders.map(order => {
      const totalAmount = order.total_amount || 0;
      const status = order.status || 'pending';
      const orderDate = new Date(order.created_at || order.order_date);
      const formattedDate = orderDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Status badge colors
      const statusColors = {
        'pending': 'bg-warning',
        'processing': 'bg-info',
        'delivered': 'bg-success',
        'cancelled': 'bg-danger',
        'refunded': 'bg-secondary'
      };
      const statusColor = statusColors[status] || 'bg-secondary';
      
      // Status labels
      const statusLabels = {
        'pending': 'Chờ Xác Nhận',
        'processing': 'Đã Xác Nhận',
        'delivered': 'Hoàn Thành',
        'cancelled': 'Đã Hủy'
      };
      const statusLabel = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
      
      // Payment info
      const payment = order.payment || null;
      const paymentMethodDisplay = payment ? this.getPaymentMethodDisplay(payment.payment_method) : 'N/A';
      const paymentStatusBadge = payment ? this.getPaymentStatusBadge(payment.status) : '<span class="badge bg-secondary">N/A</span>';
      
      // Can approve (pending) or cancel (pending/processing)
      const canApprove = status === 'pending';
      const canCancel = status === 'pending' || status === 'processing';
      
      return `
        <tr>
          <td><strong>#${order.order_id}</strong></td>
          <td>${order.profiles?.username || 'Unknown Customer'}</td>
          <td><strong>₫${new Intl.NumberFormat('vi-VN').format(Math.round(totalAmount))}</strong></td>
          <td>
            <span class="badge ${statusColor}">
              ${statusLabel}
            </span>
          </td>
          <td><small>${paymentMethodDisplay}</small><br>${paymentStatusBadge}</td>
          <td><small class="text-muted">${formattedDate}</small></td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn btn-outline-primary" onclick="window.adminViewOrderDetail(${order.order_id})" title="View Details">
                <i class="fas fa-eye"></i>
              </button>
              ${canApprove ? `
                <button type="button" class="btn btn-outline-success" onclick="window.adminApproveOrder(${order.order_id})" title="Approve">
                  <i class="fas fa-check"></i>
                </button>
              ` : ''}
              ${canCancel ? `
                <button type="button" class="btn btn-outline-danger" onclick="window.adminCancelOrder(${order.order_id})" title="Cancel">
                  <i class="fas fa-times"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    tbody.innerHTML = rows;
  }

  /**
   * Render pagination controls
   */
  renderPagination(pagination) {
    const container = document.getElementById('ordersPagination');
    if (!container) return;
    
    if (!pagination || pagination.total === 0) {
      container.innerHTML = '';
      return;
    }
    
    const { page, totalPages, hasNext, hasPrev } = pagination;
    
    // Build page numbers array
    let pages = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis and first/last if needed
    if (startPage > 1) {
      pages.unshift('...');
      pages.unshift(1);
    }
    if (endPage < totalPages) {
      pages.push('...');
      pages.push(totalPages);
    }
    
    // Build HTML
    let html = '<nav aria-label="Orders pagination"><ul class="pagination pagination-sm justify-content-center mb-0">';
    
    // First button
    html += `
      <li class="page-item ${!hasPrev ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="window.adminLoadOrders(1); return false;">
          <i class="fas fa-angle-double-left"></i>
        </a>
      </li>
    `;
    
    // Previous button
    html += `
      <li class="page-item ${!hasPrev ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="window.adminLoadOrders(${page - 1}); return false;">
          <i class="fas fa-angle-left"></i>
        </a>
      </li>
    `;
    
    // Page numbers
    pages.forEach(p => {
      if (p === '...') {
        html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      } else {
        html += `
          <li class="page-item ${p === page ? 'active' : ''}">
            <a class="page-link" href="#" onclick="window.adminLoadOrders(${p}); return false;">${p}</a>
          </li>
        `;
      }
    });
    
    // Next button
    html += `
      <li class="page-item ${!hasNext ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="window.adminLoadOrders(${page + 1}); return false;">
          <i class="fas fa-angle-right"></i>
        </a>
      </li>
    `;
    
    // Last button
    html += `
      <li class="page-item ${!hasNext ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="window.adminLoadOrders(${totalPages}); return false;">
          <i class="fas fa-angle-double-right"></i>
        </a>
      </li>
    `;
    
    html += '</ul></nav>';
    
    // Add page info
    html += `<div class="text-center mt-2"><small class="text-muted">Page ${page} of ${totalPages} (${pagination.total} total orders)</small></div>`;
    
    container.innerHTML = html;
  }

  /**
   * View order details in modal
   */
  async viewOrderDetail(orderId) {
    try {
      const response = await window.adminOrdersAPI.getOrder(orderId);
      console.log('📦 Order details:', response);
      
      const orderData = response?.data || response;
      const items = orderData.order_items || [];
      const address = orderData.address || {};
      const payment = orderData.payment || orderData.payments?.[0] || null;
      const totalAmount = orderData.total_amount || 0;
      const status = orderData.status || 'pending';
      const orderDate = new Date(orderData.created_at || orderData.order_date);
      const formattedDate = orderDate.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit'
      });
      
      const statusColors = {
        'pending': 'warning',
        'processing': 'success',
        'delivered': 'success',
        'cancelled': 'danger',
        'refunded': 'secondary'
      };
      const statusColor = statusColors[status] || 'secondary';
      const statusLabel = status === 'processing' ? 'Approved' : status.charAt(0).toUpperCase() + status.slice(1);
      
      let itemsHtml = items.map(item => `
        <tr>
          <td>${item.shoe_variants?.shoes?.shoe_name || 'Product'}</td>
          <td>${item.quantity}</td>
          <td>₫${new Intl.NumberFormat('vi-VN').format(Math.round(item.price_per_unit))}</td>
          <td>₫${new Intl.NumberFormat('vi-VN').format(Math.round(item.quantity * item.price_per_unit))}</td>
        </tr>
      `).join('');
      
      // Payment section with admin actions
      let paymentSection = '';
      if (payment) {
        const paymentMethodDisplay = this.getPaymentMethodDisplay(payment.payment_method);
        const paymentStatusBadge = this.getPaymentStatusBadge(payment.status);
        const paymentDetailsHtml = this.renderPaymentDetails(payment);
        
        // Admin action buttons based on order status and payment method
        let actionButtons = '';
        
        // Bank Transfer: Confirm payment when pending
        if (payment.payment_method === 'bank_transfer' && payment.status === 'pending') {
          actionButtons = `
            <button class="btn btn-success btn-sm mt-2" onclick="window.adminManager.confirmPayment(${payment.payment_id}); bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();">
              <i class="fas fa-check-circle"></i> Confirm Payment
            </button>
          `;
        } 
        // COD: Different buttons for different stages
        else if (payment.payment_method === 'cash') {
          if (status === 'pending') {
            actionButtons = `
              <button class="btn btn-success btn-sm mt-2" onclick="window.adminManager.approveCod(${payment.payment_id}); bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();">
                <i class="fas fa-check-circle"></i> Approve Order
              </button>
            `;
          } else if (status === 'processing' && payment.status === 'pending') {
            actionButtons = `
              <button class="btn btn-primary btn-sm mt-2" onclick="window.adminManager.collectCod(${payment.payment_id}); bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();">
                <i class="fas fa-money-bill-wave"></i> Mark as Collected
              </button>
            `;
          }
        }
        
        paymentSection = `
          <hr>
          <h6 class="fw-bold mb-3">Thông Tin Thanh Toán</h6>
          <div class="card bg-light mb-2">
            <div class="card-body">
              <div class="row mb-2">
                <div class="col-6">
                  <p class="mb-1"><strong>Phương Thức:</strong></p>
                  <p class="mb-0">${paymentMethodDisplay}</p>
                </div>
                <div class="col-6">
                  <p class="mb-1"><strong>Trạng Thái:</strong></p>
                  <p class="mb-0">${paymentStatusBadge}</p>
                </div>
              </div>
              <hr class="my-2">
              <p class="mb-1"><strong>Chi Tiết:</strong></p>
              ${paymentDetailsHtml}
              ${actionButtons}
            </div>
          </div>
        `;
      } else {
        paymentSection = `
          <hr>
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Không có thông tin thanh toán
          </div>
        `;
      }
      
      const detailHtml = `
        <div class="row mb-3">
          <div class="col-md-6">
            <h6 class="text-muted">Mã Đơn Hàng</h6>
            <p class="fs-5 fw-bold">#${orderData.order_id}</p>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted">Trạng Thái</h6>
            <p><span class="badge bg-${statusColor} fs-6">${statusLabel}</span></p>
          </div>
        </div>
        
        <div class="row mb-3">
          <div class="col-md-6">
            <h6 class="text-muted">Ngày Đặt</h6>
            <p>${formattedDate}</p>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted">Khách Hàng</h6>
            <p>${address.recipient_name || 'Không Xác Định'}</p>
          </div>
        </div>
        
        <hr>
        
        <h6 class="fw-bold mb-3">Địa Chỉ Giao Hàng</h6>
        <div class="card bg-light mb-3">
          <div class="card-body">
            <p class="mb-1"><strong>${address.recipient_name || 'N/A'}</strong></p>
            <p class="mb-1">📞 ${address.phone_number || 'N/A'}</p>
            <p class="mb-0">📍 ${[address.street, address.ward, address.district, address.city, address.zip_code].filter(Boolean).join(', ')}</p>
          </div>
        </div>
        
        <h6 class="fw-bold mb-3">Chi Tiết Đơn Hàng</h6>
        <table class="table table-sm table-hover">
          <thead class="table-light">
            <tr>
              <th>Sản Phẩm</th>
              <th>SL</th>
              <th>Đơn Giá</th>
              <th>Tổng</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="4" class="text-center text-muted">Không có sản phẩm</td></tr>'}
          </tbody>
        </table>
        
        <hr>
        
        <h6 class="fw-bold mb-3">Tổng Thanh Toán</h6>
        <div class="row text-end">
          <div class="col-md-6 offset-md-6">
            <p class="mb-1"><strong>Tạm Tính:</strong> ₫${new Intl.NumberFormat('vi-VN').format(Math.round(totalAmount - (orderData.shipping_cost || 0) - (orderData.tax_amount || 0)))}</p>
            <p class="mb-1"><strong>Phí Vận Chuyển:</strong> ₫${new Intl.NumberFormat('vi-VN').format(Math.round(orderData.shipping_cost || 0))}</p>
            <p class="mb-3"><strong>Thuế:</strong> ₫${new Intl.NumberFormat('vi-VN').format(Math.round(orderData.tax_amount || 0))}</p>
            <p class="mb-0 fs-5"><strong>Tổng Cộng:</strong> ₫${new Intl.NumberFormat('vi-VN').format(Math.round(totalAmount))}</p>
          </div>
        </div>
        
        ${paymentSection}
        
        ${orderData.notes ? `
          <hr>
          <h6 class="fw-bold mb-2">Ghi Chú</h6>
          <div class="alert alert-secondary small mb-0">${orderData.notes}</div>
        ` : ''}
      `;
      
      document.getElementById('orderDetailContent').innerHTML = detailHtml;
      const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
      modal.show();
    } catch (err) {
      console.error('❌ Failed to load order:', err);
      alert('Failed to load order details: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Approve order (change status from pending to processing)
   */
  async approveOrder(orderId) {
    if (!confirm(`Xác nhận đơn hàng #${orderId}?`)) {
      return;
    }
    
    try {
      const response = await window.adminOrdersAPI.updateOrderStatus(orderId, 'processing');
      console.log('✅ Order approved:', response);
      alert('Order approved successfully.');
      
      // Invalidate dashboard cache since order status changed
      if (this.adminManager?.dashboard) {
        this.adminManager.dashboard.isLoaded = false;
      }
      
      // Reload current page
      await this.loadOrders(this.currentState.currentPage);
    } catch (err) {
      console.error('❌ Failed to approve order:', err);
      alert('Failed to approve order: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, buttonElement) {
    // Prompt for reason
    const reason = prompt('Lý do hủy đơn:', 'Admin hủy đơn');
    
    if (reason === null) {
      return;
    }

    if (!confirm(`Hủy đơn hàng #${orderId}? Tiền sẽ được hoàn lại nếu có thể.`)) {
      return;
    }

    try {
      const response = await window.adminOrdersAPI.cancelOrder(orderId, { reason });
      
      console.log('✅ Order cancelled by seller:', response);
      alert('Order cancelled successfully.');
      
      // Invalidate dashboard cache since order status changed
      if (this.adminManager?.dashboard) {
        this.adminManager.dashboard.isLoaded = false;
      }
      
      // Reload current page
      await this.loadOrders(this.currentState.currentPage);
    } catch (err) {
      console.error('❌ Failed to cancel order:', err);
      alert('Failed to cancel order: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Get payment method display
   */
  getPaymentMethodDisplay(method) {
    const methodMap = {
      'cash': '<i class="fas fa-money-bill-wave me-1"></i>Thanh Toán Khi Nhận Hàng',
      'credit_card': '<i class="fas fa-credit-card me-1"></i>Thẻ Tín Dụng',
      'bank_transfer': '<i class="fas fa-university me-1"></i>Chuyển Khoản',
      'stripe': '<i class="fab fa-stripe me-1"></i>Stripe'
    };
    return methodMap[method?.toLowerCase()] || `<i class="fas fa-question-circle me-1"></i>${method}`;
  }

  /**
   * Get payment status badge
   */
  getPaymentStatusBadge(status) {
    const statusMap = {
      'pending': '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Đang Chờ</span>',
      'completed': '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Đã Hoàn Thành</span>',
      'failed': '<span class="badge bg-danger"><i class="fas fa-times-circle me-1"></i>Thất Bại</span>',
      'refunded': '<span class="badge bg-secondary"><i class="fas fa-undo me-1"></i>Đã Hoàn Tiền</span>'
    };
    return statusMap[status?.toLowerCase()] || `<span class="badge bg-secondary">${status}</span>`;
  }

  /**
   * Render payment details
   */
  renderPaymentDetails(payment) {
    if (!payment || !payment.details) {
      return '<p class="text-muted">Không có chi tiết thanh toán</p>';
    }

    const details = payment.details;
    let html = '';

    if (details.type === 'card' && details.card_number) {
      html = `
        <p class="mb-1"><strong>Số Thẻ:</strong> ${details.card_number}</p>
        ${details.processed_at ? `<p class="mb-0 text-muted"><small>Xử Lý: ${details.processed_at}</small></p>` : ''}
      `;
    } else if (details.type === 'bank' && details.bank_code) {
      html = `
        <p class="mb-1"><strong>Ngân Hàng:</strong> ${details.bank_code}</p>
        <p class="mb-1"><strong>Số Tài Khoản:</strong> ${details.account_number}</p>
        ${details.submitted_at ? `<p class="mb-1 text-muted"><small>Đã Chuyển: ${details.submitted_at}</small></p>` : ''}
        ${details.verified_by ? `<p class="mb-0 text-success"><small><i class="fas fa-check-circle"></i> Xác Nhận bởi Admin #${details.verified_by} lúc ${details.verified_at}</small></p>` : ''}
      `;
    } else if (details.type === 'stripe' && details.stripe_payment_intent_id) {
      html = `
        <p class="mb-1"><strong>Payment Intent:</strong> <code>${details.stripe_payment_intent_id}</code></p>
        ${details.processed_at ? `<p class="mb-0 text-muted"><small>Processed: ${details.processed_at}</small></p>` : ''}
      `;
    } else if (details.type === 'cash') {
      const collectionStatus = details.collection_status || 'pending';
      html = `
        <p class="mb-1"><strong>Collection Status:</strong> 
          ${collectionStatus === 'collected' 
            ? '<span class="badge bg-success"><i class="fas fa-check"></i> Collected</span>' 
            : '<span class="badge bg-warning text-dark"><i class="fas fa-clock"></i> Pending</span>'}
        </p>
        ${details.collected_by ? `<p class="mb-0 text-success"><small><i class="fas fa-user-check"></i> Collected by ${details.collected_by} on ${details.collected_at}</small></p>` : ''}
      `;
    } else if (details.type === 'legacy') {
      html = `<p class="mb-0 text-muted"><small>Transaction ID: ${details.transaction_id}</small></p>`;
    } else {
      html = '<p class="text-muted">Payment details not available</p>';
    }

    return html;
  }
}

// Export globally
window.AdminOrderManagement = AdminOrderManagement;
