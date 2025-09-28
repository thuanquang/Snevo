/**
 * Email Verification Notice Component
 * Shows a persistent banner for unverified users
 */

class EmailVerificationNotice {
    constructor() {
        this.notice = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        // Wait for AuthManager to be available
        this.waitForAuthManager().then(() => {
            this.setupEventListeners();
            this.checkAndShowNotice();
        });
    }

    async waitForAuthManager() {
        while (typeof authManager === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    setupEventListeners() {
        // Listen for auth events
        authManager.on('loginSuccess', () => this.checkAndShowNotice());
        authManager.on('registerSuccess', () => this.checkAndShowNotice());
        authManager.on('logout', () => this.hideNotice());
        authManager.on('emailVerificationRequired', () => this.showNotice());
        
        // Listen for profile updates (email verification)
        authManager.on('profileUpdated', () => this.checkAndShowNotice());
    }

    checkAndShowNotice() {
        if (authManager.isAuthenticated() && authManager.requiresEmailVerification()) {
            this.showNotice();
        } else {
            this.hideNotice();
        }
    }

    showNotice() {
        if (this.isVisible) return;

        // Don't show on verification page
        if (window.location.pathname.includes('verify-email')) return;

        this.createNotice();
        this.isVisible = true;
    }

    hideNotice() {
        if (this.notice) {
            this.notice.remove();
            this.notice = null;
        }
        this.isVisible = false;
    }

    createNotice() {
        // Remove existing notice
        this.hideNotice();

        const userEmail = authManager.currentUser?.email || 'your email address';

        this.notice = document.createElement('div');
        this.notice.className = 'email-verification-notice';
        this.notice.innerHTML = `
            <div class="container-fluid">
                <div class="row align-items-center py-2">
                    <div class="col-md-8 col-sm-12">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-envelope text-warning me-2"></i>
                            <span class="me-2">
                                <strong>Email Verification Required:</strong> 
                                Please check <strong>${userEmail}</strong> and verify your account to access all features.
                            </span>
                        </div>
                    </div>
                    <div class="col-md-4 col-sm-12 text-end">
                        <button class="btn btn-warning btn-sm me-2" onclick="emailVerificationNotice.goToVerificationPage()">
                            <i class="fas fa-envelope-open-text me-1"></i>Verify Now
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="emailVerificationNotice.resendEmail()">
                            <i class="fas fa-paper-plane me-1"></i>Resend
                        </button>
                        <button class="btn btn-link btn-sm text-muted" onclick="emailVerificationNotice.dismiss()" title="Dismiss">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.notice.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1050;
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border-bottom: 1px solid #ffeaa7;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-size: 14px;
        `;

        // Adjust body padding to account for notice
        document.body.style.paddingTop = '60px';

        // Insert at top of body
        document.body.insertBefore(this.notice, document.body.firstChild);
    }

    async resendEmail() {
        const userEmail = authManager.currentUser?.email;
        if (!userEmail) return;

        try {
            const result = await authManager.resendVerification(userEmail);
            if (result.success) {
                this.showSuccessMessage('Verification email sent! Please check your inbox.');
            } else {
                this.showErrorMessage(result.error || 'Failed to resend verification email');
            }
        } catch (error) {
            this.showErrorMessage('Failed to resend verification email');
        }
    }

    goToVerificationPage() {
        window.location.href = 'verify-email.html';
    }

    dismiss() {
        this.hideNotice();
        document.body.style.paddingTop = '';
        
        // Remember dismissal for this session
        sessionStorage.setItem('emailVerificationNoticeDismissed', 'true');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'danger');
    }

    showMessage(message, type) {
        // Create temporary message
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        messageDiv.style.cssText = `
            top: 70px;
            right: 20px;
            z-index: 1060;
            max-width: 400px;
        `;
        messageDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Create global instance
let emailVerificationNotice;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only show if not dismissed this session
    if (!sessionStorage.getItem('emailVerificationNoticeDismissed')) {
        emailVerificationNotice = new EmailVerificationNotice();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailVerificationNotice;
}
