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
      
      // ⭐ NEW: Fetch enhanced metrics from backend (includes 30-day analytics)
      await this.fetchDashboardMetrics();
      
      // Still fetch orders for recent orders table
      await this.fetchOrdersData();
      
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
   * ⭐ Fetch enhanced dashboard metrics from backend
   * Includes: totalShoes, totalVariants, totalOrders, revenue, top-selling 30-day products
   */
  async fetchDashboardMetrics() {
    try {
      console.log('📊 Fetching enhanced dashboard metrics from backend...');
      
      // ⭐ Ensure AdminAPI is initialized
      if (!this.core.ensureAdminAPI()) {
        throw new Error('AdminAPI not available');
      }
      
      const metricsData = await this.core.adminAPI.getDashboardMetrics();
      
      console.log('✅ Dashboard metrics:', metricsData);
      
      // Store metrics for rendering
      this.metrics = {
        totalShoes: metricsData.totalMetrics?.totalShoes || 0,
        totalVariants: metricsData.totalMetrics?.totalVariants || 0,
        totalOrders: metricsData.totalMetrics?.totalOrders || 0,
        totalRevenue: metricsData.totalMetrics?.totalRevenue || 0,
        lowStockItems: metricsData.totalMetrics?.lowStockItems || 0,
        pendingOrders: metricsData.totalMetrics?.pendingOrders || 0,
        approvedOrders: metricsData.totalMetrics?.approvedOrders || 0,
        cancelledOrders: metricsData.totalMetrics?.cancelledOrders || 0,
        topSelling30Days: metricsData.topSelling?.products || []
      };
      
      return this.metrics;
    } catch (error) {
      console.error('❌ Failed to fetch dashboard metrics:', error);
      
      // Fallback to empty metrics
      this.metrics = {
        totalShoes: 0,
        totalVariants: 0,
        totalOrders: 0,
        totalRevenue: 0,
        lowStockItems: 0,
        pendingOrders: 0,
        approvedOrders: 0,
        cancelledOrders: 0,
        topSelling30Days: []
      };
      
      throw error;
    }
  }

  /**
   * Fetch orders data from API (for recent orders table only)
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
   * Render complete dashboard
   */
  renderDashboard() {
    this.renderStatCards();
    this.renderRecentOrders();
    this.renderCharts();
  }

  /**
   * ⭐ Render stat cards with NEW metrics from backend
   */
  renderStatCards() {
    // ⭐ Update stat card values with BACKEND metrics
    const updates = {
      'dashTotalShoes': this.metrics.totalShoes || 0,
      'dashTotalVariants': this.metrics.totalVariants || 0,
      'dashPendingCount': this.metrics.pendingOrders || 0,
      'dashApprovedCount': this.metrics.approvedOrders || 0,
      'dashCancelledCount': this.metrics.cancelledOrders || 0,
      'dashTotalOrders': this.metrics.totalOrders || 0,
      'dashLowStockItems': this.metrics.lowStockItems || 0,
      'dashTotalRevenue': '₫' + new Intl.NumberFormat('vi-VN').format(Math.round(this.metrics.totalRevenue || 0))
    };
    
    Object.entries(updates).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value;
      } else {
        console.warn(`⚠️ Element #${id} not found in DOM`);
      }
    });
    
    // Update sidebar badge
    const badgeElement = document.getElementById('pendingOrdersCount');
    if (badgeElement) {
      badgeElement.textContent = this.metrics.pendingOrders || 0;
      badgeElement.style.display = (this.metrics.pendingOrders || 0) > 0 ? 'inline-block' : 'none';
    }
    
    console.log('✅ Stat cards updated with backend metrics');
  }

  /**
   * Render recent orders table
   */
  renderRecentOrders() {
    const tbody = document.getElementById('dashRecentOrdersBody');
    if (!tbody) return;
    
    // Take first 5 orders from ordersData
    const recentOrders = this.ordersData
      .sort((a, b) => new Date(b.created_at || b.order_date) - new Date(a.created_at || a.order_date))
      .slice(0, 5);
    
    if (recentOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No orders yet</td></tr>';
      return;
    }
    
    const rows = recentOrders.map(order => {
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
    console.log('✅ Recent orders rendered:', recentOrders.length);
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
    this.createTopSellingChart(); // ⭐ NEW: Top-selling products chart
    
    console.log('✅ Charts rendered');
  }

  /**
   * Create order status doughnut chart
   */
  createOrderStatusChart() {
    const canvas = document.getElementById('orderStatusChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Calculate order status counts from ordersData
    const statusCounts = {
      pending: 0,
      processing: 0,
      delivered: 0,
      cancelled: 0
    };
    
    this.ordersData.forEach(order => {
      const status = order.status || 'pending';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });
    
    this.charts.orderStatus = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Chờ Xử Lý', 'Đang Xử Lý', 'Đã Giao', 'Đã Hủy'],
        datasets: [{
          data: [
            statusCounts.pending,
            statusCounts.processing,
            statusCounts.delivered,
            statusCounts.cancelled
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
            text: 'Trạng Thái Đơn Hàng'
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
            text: 'Doanh Thu (7 Ngày Qua)'
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
   * ⭐ Create top-selling products bar chart (Last 30 days)
   */
  createTopSellingChart() {
    const canvas = document.getElementById('topSellingChart');
    if (!canvas) {
      console.warn('⚠️ #topSellingChart canvas not found in DOM');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    const topProducts = this.metrics.topSelling30Days || [];
    
    // ⭐ DEBUG: Log metrics data
    console.log('📊 Top-selling chart - Full metrics:', this.metrics);
    console.log('📊 Top-selling chart - Products array:', topProducts);
    console.log('📊 Top-selling chart - Array length:', topProducts.length);
    console.log('📊 Top-selling chart - Array type:', Array.isArray(topProducts));
    
    if (topProducts.length === 0) {
      console.log('ℹ️ No top-selling products data available');
      // Show placeholder
      ctx.font = '14px Arial';
      ctx.fillStyle = '#6c757d';
      ctx.textAlign = 'center';
      ctx.fillText('No sales data in last 30 days', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    // Extract data for chart
    const labels = topProducts.map(p => p.shoe_name.length > 20 ? p.shoe_name.substring(0, 20) + '...' : p.shoe_name);
    const revenueData = topProducts.map(p => Math.round(p.revenue));
    const unitsData = topProducts.map(p => p.units_sold);
    
    console.log('📊 Chart data prepared:', { labels, revenueData, unitsData });
    
    this.charts.topSelling = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (₫)',
          data: revenueData,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          yAxisID: 'y'
        }, {
          label: 'Units Sold',
          data: unitsData,
          backgroundColor: 'rgba(255, 159, 64, 0.6)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 2,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top'
          },
          title: {
            display: true,
            text: 'Sản Phẩm Bán Chạy (30 Ngày Qua)'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const datasetLabel = context.dataset.label;
                const value = context.parsed.y;
                
                if (datasetLabel === 'Revenue (₫)') {
                  const product = topProducts[context.dataIndex];
                  return [
                    'Revenue: ₫' + new Intl.NumberFormat('vi-VN').format(value),
                    'Share: ' + product.percentage_of_revenue + '%'
                  ];
                } else {
                  return 'Units: ' + value;
                }
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₫' + (value / 1000000).toFixed(1) + 'M';
              }
            },
            title: {
              display: true,
              text: 'Doanh Thu'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            grid: {
              drawOnChartArea: false
            },
            title: {
              display: true,
              text: 'Số Lượng'
            }
          }
        }
      }
    });
    
    console.log('✅ Top-selling chart created with', topProducts.length, 'products');
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
      'pending': 'Chờ Xử Lý',
      'processing': 'Đã Duyệt',
      'delivered': 'Hoàn Thành',
      'cancelled': 'Đã Hủy',
      'refunded': 'Hoàn Tiền'
    };
    return labelMap[status?.toLowerCase()] || status;
  }
}

// Export globally
window.AdminDashboard = AdminDashboard;
