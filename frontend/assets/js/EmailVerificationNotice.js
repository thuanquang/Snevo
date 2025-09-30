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
        // Debug logging to understand verification state
        console.log('EmailVerificationNotice: Checking verification status', {
            isAuthenticated: authManager.isAuthenticated(),
            currentUser: authManager.currentUser,
            requiresEmailVerification: authManager.requiresEmailVerification(),
            emailVerified: authManager.currentUser?.email_verified
        });

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
            // Animate out
            this.notice.classList.remove('show');

            // Remove after animation completes
            setTimeout(() => {
                if (this.notice && this.notice.parentNode) {
                    this.notice.remove();
                    this.notice = null;
                }
            }, 300);
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
                <div class="row align-items-center py-3">
                    <div class="col-md-8 col-sm-12">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-envelope text-primary me-2"></i>
                            <span class="me-2 text-dark">
                                <strong>Email Verification Required:</strong>
                                Please check <strong class="text-primary">${userEmail}</strong> and verify your account to access all features.
                            </span>
                        </div>
                    </div>
                    <div class="col-md-4 col-sm-12 text-end">
                        <button class="btn btn-outline-primary btn-sm me-2" onclick="emailVerificationNotice.resendEmail()">
                            <i class="fas fa-paper-plane me-1"></i>Resend Email
                        </button>
                        <button class="btn btn-link btn-sm text-muted" onclick="emailVerificationNotice.dismiss()" title="Dismiss">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Styles are now handled by CSS classes

        // Insert before navbar or at top of body if navbar not found
        const navbar = document.querySelector('.navbar, nav');
        if (navbar) {
            document.body.insertBefore(this.notice, navbar);
        } else {
            document.body.insertBefore(this.notice, document.body.firstChild);
        }

        // Animate in after a brief delay to ensure DOM insertion
        setTimeout(() => {
            this.notice.classList.add('show');
        }, 10);
    }

    async resendEmail() {
        const userEmail = authManager.currentUser?.email;
        if (!userEmail) {
            this.showErrorMessage('No email address found. Please log in again.');
            return;
        }

        // Disable button and show loading state
        const resendButton = this.notice.querySelector('button[onclick*="resendEmail"]');
        if (resendButton) {
            resendButton.disabled = true;
            resendButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sending...';
        }

        try {
            console.log('EmailVerificationNotice: Resending verification email to', userEmail);
            const result = await authManager.resendVerification(userEmail);

            if (result.success) {
                this.showSuccessMessage('Verification email sent! Please check your inbox and spam folder.');
                console.log('EmailVerificationNotice: Verification email sent successfully');
            } else {
                this.showErrorMessage(result.error || 'Failed to resend verification email. Please try again later.');
                console.error('EmailVerificationNotice: Failed to resend verification email:', result.error);
            }
        } catch (error) {
            console.error('EmailVerificationNotice: Error resending verification email:', error);
            this.showErrorMessage('Failed to resend verification email. Please check your connection and try again.');
        } finally {
            // Re-enable button after 3 seconds
            if (resendButton) {
                setTimeout(() => {
                    resendButton.disabled = false;
                    resendButton.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Resend Email';
                }, 3000);
            }
        }
    }


    dismiss() {
        console.log('EmailVerificationNotice: Dismissing notification');
        this.hideNotice();

        // Remember dismissal for this session with timestamp
        const dismissalData = {
            dismissed: true,
            timestamp: Date.now(),
            userEmail: authManager.currentUser?.email
        };
        sessionStorage.setItem('emailVerificationNoticeDismissed', JSON.stringify(dismissalData));

        // Show brief feedback that it was dismissed
        this.showInfoMessage('Notification dismissed. Refresh page to show again if needed.');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'danger');
    }

    showInfoMessage(message) {
        this.showMessage(message, 'info');
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
    // Check if notification was dismissed this session
    const dismissalData = sessionStorage.getItem('emailVerificationNoticeDismissed');
    if (dismissalData) {
        try {
            const parsed = JSON.parse(dismissalData);
            if (parsed.dismissed && parsed.userEmail === authManager?.currentUser?.email) {
                console.log('EmailVerificationNotice: Notification was dismissed this session');
                return;
            }
        } catch (error) {
            console.error('EmailVerificationNotice: Error parsing dismissal data:', error);
            // Clear corrupted data
            sessionStorage.removeItem('emailVerificationNoticeDismissed');
        }
    }

    emailVerificationNotice = new EmailVerificationNotice();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailVerificationNotice;
}
