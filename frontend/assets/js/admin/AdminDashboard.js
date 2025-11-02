// frontend/assets/js/admin/AdminDashboard.js

/**
 * AdminDashboard - Dashboard Statistics & Visualization
 * Handles dashboard metrics calculation, rendering, and chart management
 */
class AdminDashboard {
  constructor(core, adminManager) {
    this.core = core;
    this.adminManager = adminManager;
    this.ordersData = [];
    this.metrics = {};
    this.charts = {};
    this.sectionElement = null;
    this.isLoaded = false; // ✅ Cache flag to avoid reloading
    
    console.log('✅ AdminDashboard initialized');
  }

  /**
   * Attach to dashboard section element
   */
  attachToSection(sectionId) {
    this.sectionElement = document.getElementById(sectionId);
    if (!this.sectionElement) {
      console.error(`❌ Dashboard section "${sectionId}" not found`);
      return false;
    }
    console.log('✅ Dashboard attached to section:', sectionId);
    return true;
  }

  /**
   * Load and render dashboard
   */
  async loadAndRender(forceRefresh = false) {
    try {
      // ✅ OPTIMIZATION: Skip reload if already loaded (unless forced)
      if (this.isLoaded && !forceRefresh) {
        console.log('📊 Dashboard already loaded, skipping reload');
        return;
      }
      
      console.log('📊 Loading dashboard data...');
      
      // Show loading state
      this.showLoadingState();
      
      // Fetch orders data
      await this.fetchOrdersData();
      
      // Calculate metrics
      this.calculateMetrics();
      
      // Render all dashboard components
      this.renderDashboard();
      
      this.isLoaded = true; // Mark as loaded
      console.log('✅ Dashboard loaded successfully');
    } catch (error) {
      console.error('❌ Dashboard load error:', error);
      this.showErrorState(error.message);
    }
  }

  /**
   * Force refresh dashboard (called by refresh button)
   */
  async refresh() {
    this.isLoaded = false;
    await this.loadAndRender(true);
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const statsCards = document.querySelectorAll('#dashboardSection .section-card h3, #dashboardSection .section-card h2');
    statsCards.forEach(card => {
      if (card.id && (card.id.startsWith('dash') || card.id === 'dashTotalRevenue')) {
        card.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
      }
    });
    
    const tbody = document.getElementById('dashRecentOrdersBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-dark" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Show error state
   */
  showErrorState(message) {
    const tbody = document.getElementById('dashRecentOrdersBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger py-3">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${AdminUtils.escapeHtml(message)}
          </td>
        </tr>
      `;
    }
  }

  /**
   * Fetch orders data from API
   */
  async fetchOrdersData() {
    try {
      // ✅ OPTIMIZATION: Fetch only recent 100 orders for dashboard (faster query)
      // Dashboard only shows recent 5 orders, so no need to fetch all 1000
      const response = await window.adminOrdersAPI.getOrders({ limit: 100 });
      console.log('📦 Orders data fetched:', response);
      
      // Extract orders array
      this.ordersData = Array.isArray(response?.data) ? response.data : [];
      
      if (!Array.isArray(this.ordersData)) {
        console.error('❌ Invalid orders data format:', typeof this.ordersData);
        throw new Error('Invalid orders data format');
      }
      
      console.log(`✅ Fetched ${this.ordersData.length} orders`);
      return this.ordersData;
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      
      // Check if auth issue
      if (error.message && error.message.includes('401')) {
        console.log('ℹ️ User not authenticated, using empty dataset');
        this.ordersData = [];
        return this.ordersData;
      }
      
      throw error;
    }
  }

  /**
   * Calculate dashboard metrics
   */
  calculateMetrics() {
    console.log('🔢 Calculating metrics from', this.ordersData.length, 'orders');
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Basic counts by status
    const pendingOrders = this.ordersData.filter(o => o.status === 'pending');
    const processingOrders = this.ordersData.filter(o => o.status === 'processing');
    const deliveredOrders = this.ordersData.filter(o => o.status === 'delivered');
    const cancelledOrders = this.ordersData.filter(o => o.status === 'cancelled');
    
    // Revenue calculations (processing + delivered = completed)
    const completedOrders = [...processingOrders, ...deliveredOrders];
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    // Last 30 days metrics
    const recent30DaysOrders = this.ordersData.filter(o => {
      const orderDate = new Date(o.created_at || o.order_date);
      return orderDate >= thirtyDaysAgo;
    });
    const revenue30Days = recent30DaysOrders
      .filter(o => o.status === 'processing' || o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    // Average order value (completed orders only)
    const avgOrderValue = completedOrders.length > 0 
      ? totalRevenue / completedOrders.length 
      : 0;
    
    // Unique customers
    const uniqueCustomers = new Set(this.ordersData.map(o => o.user_id)).size;
    
    // Store metrics
    this.metrics = {
      totalOrders: this.ordersData.length,
      pendingCount: pendingOrders.length,
      processingCount: processingOrders.length,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      totalRevenue,
      revenue30Days,
      avgOrderValue,
      uniqueCustomers,
      recentOrders: this.ordersData
        .sort((a, b) => new Date(b.created_at || b.order_date) - new Date(a.created_at || a.order_date))
        .slice(0, 5)
    };
    
    console.log('✅ Metrics calculated:', this.metrics);
    return this.metrics;
  }

  /**
   * Render complete dashboard
   */
  renderDashboard() {
    this.renderStatCards();
    this.renderRecentOrders();
    this.renderCharts();
  }

  /**
   * Render stat cards
   */
  renderStatCards() {
    // Update stat card values
    const updates = {
      'dashPendingCount': this.metrics.pendingCount,
      'dashApprovedCount': this.metrics.processingCount,
      'dashCancelledCount': this.metrics.cancelledCount,
      'dashTotalRevenue': '₫' + new Intl.NumberFormat('vi-VN').format(Math.round(this.metrics.totalRevenue))
    };
    
    Object.entries(updates).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value;
      }
    });
    
    // Update sidebar badge
    const badgeElement = document.getElementById('pendingOrdersCount');
    if (badgeElement) {
      badgeElement.textContent = this.metrics.pendingCount;
      badgeElement.style.display = this.metrics.pendingCount > 0 ? 'inline-block' : 'none';
    }
    
    console.log('✅ Stat cards updated');
  }

  /**
   * Render recent orders table
   */
  renderRecentOrders() {
    const tbody = document.getElementById('dashRecentOrdersBody');
    if (!tbody) return;
    
    const orders = this.metrics.recentOrders || [];
    
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No orders yet</td></tr>';
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
      
      const statusColors = {
        'pending': 'bg-warning',
        'processing': 'bg-info',
        'delivered': 'bg-success',
        'cancelled': 'bg-danger'
      };
      const statusColor = statusColors[status] || 'bg-secondary';
      const statusLabel = status === 'processing' ? 'Approved' : status.charAt(0).toUpperCase() + status.slice(1);
      
      const customerName = order.profiles?.username || 'Unknown Customer';
      
      return `
        <tr>
          <td><strong>#${order.order_id}</strong></td>
          <td>${customerName}</td>
          <td>₫${new Intl.NumberFormat('vi-VN').format(Math.round(totalAmount))}</td>
          <td><span class="badge ${statusColor}">${statusLabel}</span></td>
          <td><small class="text-muted">${formattedDate}</small></td>
        </tr>
      `;
    }).join('');
    
    tbody.innerHTML = rows;
    console.log('✅ Recent orders rendered:', orders.length);
  }

  /**
   * Render charts (if Chart.js available)
   */
  renderCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('⚠️ Chart.js not loaded, skipping charts');
      return;
    }
    
    // Destroy existing charts
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};
    
    // Create charts
    this.createOrderStatusChart();
    this.createRevenueChart();
    
    console.log('✅ Charts rendered');
  }

  /**
   * Create order status doughnut chart
   */
  createOrderStatusChart() {
    const canvas = document.getElementById('orderStatusChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    this.charts.orderStatus = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Approved', 'Delivered', 'Cancelled'],
        datasets: [{
          data: [
            this.metrics.pendingCount,
            this.metrics.processingCount,
            this.metrics.deliveredCount,
            this.metrics.cancelledCount
          ],
          backgroundColor: [
            'rgba(255, 193, 7, 0.8)',   // warning
            'rgba(13, 202, 240, 0.8)',  // info
            'rgba(25, 135, 84, 0.8)',   // success
            'rgba(220, 53, 69, 0.8)'    // danger
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Orders by Status'
          }
        }
      }
    });
  }

  /**
   * Create revenue line chart (last 7 days)
   */
  createRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Calculate daily revenue for last 7 days
    const today = new Date();
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(dayLabel);
      
      // Sum revenue for this day (processing + delivered)
      const dayRevenue = this.ordersData
        .filter(o => {
          const orderDate = new Date(o.created_at || o.order_date);
          return orderDate >= date && orderDate < nextDate && 
                 (o.status === 'processing' || o.status === 'delivered');
        })
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      data.push(Math.round(dayRevenue));
    }
    
    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (₫)',
          data,
          borderColor: 'rgba(25, 135, 84, 1)',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Revenue (Last 7 Days)'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '₫' + new Intl.NumberFormat('vi-VN').format(context.parsed.y);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₫' + (value / 1000).toFixed(0) + 'K';
              }
            }
          }
        }
      }
    });
  }

  /**
   * Refresh dashboard (reload data and re-render)
   */
  async refresh() {
    console.log('🔄 Refreshing dashboard...');
    await this.loadAndRender();
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status) {
    const statusMap = {
      'pending': 'bg-warning',
      'processing': 'bg-success',
      'delivered': 'bg-success',
      'cancelled': 'bg-danger',
      'refunded': 'bg-secondary'
    };
    return statusMap[status?.toLowerCase()] || 'bg-secondary';
  }

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labelMap = {
      'pending': 'Pending',
      'processing': 'Approved',
      'delivered': 'Completed',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    return labelMap[status?.toLowerCase()] || status;
  }
}

// Export globally
window.AdminDashboard = AdminDashboard;
