// frontend/assets/js/admin/AdminUtils.js
/**
 * AdminUtils - Utility functions
 */
class AdminUtils {
  /**
   * Show error message
   */
  static showError(message) {
    AdminUtils.showToast("Error", message, "error");
  }

  /**
   * Show success message
   */
  static showSuccess(message) {
    AdminUtils.showToast("Success", message, "success");
  }

  /**
   * Show toast notification
   * ✅ Centralized toast function
   */
  static showToast(title, message, type = "info") {
    const toastEl = document.getElementById("notificationToast");
    if (!toastEl) {
      // Fallback to alert
      alert(`${title}: ${message}`);
      return;
    }

    const toastTitle = document.getElementById("toastTitle");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    // Set icon based on type
    const icons = {
      success: "bi-check-circle-fill text-success",
      error: "bi-x-circle-fill text-danger",
      warning: "bi-exclamation-triangle-fill text-warning",
      info: "bi-info-circle-fill text-primary",
    };

    if (toastIcon) {
      toastIcon.className = `bi ${icons[type] || icons.info} me-2`;
    }

    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }
  /**
   * ✅ Format currency (VND)
   */
  static formatCurrency(amount) {
    if (amount === null || amount === undefined) return "N/A";

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date to Vietnamese format
   */
  static formatDate(dateString) {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  /**
   * ✅ Escape HTML to prevent XSS
   * Converts special characters to HTML entities
   */
  static escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
    
    // Alternative implementation:
    // return String(text)
    //   .replace(/&/g, '&amp;')
    //   .replace(/</g, '&lt;')
    //   .replace(/>/g, '&gt;')
    //   .replace(/"/g, '&quot;')
    //   .replace(/'/g, '&#039;');
  }

  /**
   * ✅ Truncate text with ellipsis
   */
  static truncate(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }


  /**
   * Setup logout button
   */
  static setupLogoutButton() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to logout?")) {
          await window.auth.signOut();
          window.location.href = "/login.html";
        }
      });
    }
  }
}
