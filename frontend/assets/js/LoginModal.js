/**
 * LoginModal - Standalone Google-only login modal
 * Provides a lightweight modal that can be used across all pages
 */

class LoginModal {
    constructor() {
        this.modalId = 'globalLoginModal';
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initialize the login modal
     */
    init() {
        if (this.isInitialized) return;
        
        // Avoid duplicate injection
        if (document.getElementById(this.modalId)) {
            this.isInitialized = true;
            return;
        }

        // Check if Google auth is available
        if (!this.isGoogleAuthAvailable()) {
            console.warn('Google authentication not available - modal will not be created');
            return;
        }

        this.createModal();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ LoginModal initialized');
    }

    /**
     * Check if Google authentication is available
     */
    isGoogleAuthAvailable() {
        return window.APP_CONFIG?.features?.googleAuth && 
               window.APP_CONFIG?.features?.supabaseAuth;
    }

    /**
     * Create the modal HTML and inject it into the page
     */
    createModal() {
        // Minimal styles (scoped)
        const style = document.createElement('style');
        style.id = 'globalLoginModalStyles';
        style.textContent = `
            .gl-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:1050}
            .gl-modal{background:#fff;border-radius:12px;max-width:420px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,.2)}
            .gl-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #eee}
            .gl-modal-title{font-size:18px;font-weight:600;margin:0}
            .gl-modal-close{background:none;border:0;font-size:22px;line-height:1;cursor:pointer}
            .gl-modal-body{padding:18px}
            .gl-btn{display:inline-flex;gap:10px;align-items:center;justify-content:center;width:100%;padding:12px 14px;border-radius:10px;border:1px solid #222;background:#fff;color:#222;font-weight:600;cursor:pointer}
            .gl-btn:hover{background:#f6f6f6}
            .gl-desc{font-size:13px;color:#666;margin-top:12px;text-align:center}
        `;
        document.head.appendChild(style);

        // Modal markup
        const overlay = document.createElement('div');
        overlay.id = this.modalId;
        overlay.className = 'gl-modal-overlay';
        overlay.innerHTML = `
            <div class="gl-modal" role="dialog" aria-modal="true" aria-labelledby="gl-modal-title">
                <div class="gl-modal-header">
                    <h3 id="gl-modal-title" class="gl-modal-title">Sign in</h3>
                    <button class="gl-modal-close" aria-label="Close">×</button>
                </div>
                <div class="gl-modal-body">
                    <button id="gl-google-btn" class="gl-btn">
                        <img alt="Google" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20"/>
                        Continue with Google
                    </button>
                    <div class="gl-desc">We use Google to sign you in. No passwords.</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    /**
     * Setup event listeners for the modal
     */
    setupEventListeners() {
        const overlay = document.getElementById(this.modalId);
        if (!overlay) return;

        // Close handlers
        const close = () => overlay.style.display = 'none';
        overlay.addEventListener('click', (e) => { 
            if (e.target === overlay) close(); 
        });
        overlay.querySelector('.gl-modal-close').addEventListener('click', close);

        // Google button
        const googleBtn = overlay.querySelector('#gl-google-btn');
        googleBtn.addEventListener('click', async () => {
            try {
                // Use AuthManager if available, otherwise fallback
                if (window.authManager && typeof window.authManager.loginWithGoogle === 'function') {
                    const result = await window.authManager.loginWithGoogle();
                    if (!result.success && window.showToast) {
                        window.showToast(result.error || 'Google login failed', 'error');
                    }
                } else {
                    console.error('AuthManager not available for Google login');
                    if (window.showToast) {
                        window.showToast('Authentication service not available', 'error');
                    }
                }
            } catch (err) {
                console.error('Google login error:', err);
                if (window.showToast) {
                    window.showToast('Google login failed', 'error');
                }
            }
        });

        // Intercept login.html links to open modal
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href') || '';
            if (href.includes('login.html')) {
                e.preventDefault();
                this.show();
            }
        });
    }

    /**
     * Show the modal
     */
    show() {
        const overlay = document.getElementById(this.modalId);
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        const overlay = document.getElementById(this.modalId);
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// Create global instance
const loginModal = new LoginModal();

// Expose global function
window.showLoginModal = () => {
    loginModal.show();
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginModal;
}

export default LoginModal;

