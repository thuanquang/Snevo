/**
 * Login Page JavaScript
 * Handles login, registration, and password reset functionality
 */

import { authManager } from './AuthManager.js';

class LoginPage {
    constructor() {
        this.loginForm = null;
        this.registerForm = null;
        this.forgotPasswordForm = null;
        this.registerModal = null;
        this.forgotPasswordModal = null;
        
        this.init();
    }

    /**
     * Initialize login page
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Get form elements
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.forgotPasswordForm = document.getElementById('forgotPasswordForm');
        
        // Get modal elements
        this.registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        this.forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));

        // Login form submission
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form submission
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Forgot password form submission
        if (this.forgotPasswordForm) {
            this.forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        // Google login button
        const googleLoginButton = document.getElementById('googleLoginButton');
        if (googleLoginButton) {
            googleLoginButton.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Show register form
        const showRegisterForm = document.getElementById('showRegisterForm');
        if (showRegisterForm) {
            showRegisterForm.addEventListener('click', (e) => {
                e.preventDefault();
                this.registerModal.show();
            });
        }

        // Show forgot password form
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.forgotPasswordModal.show();
            });
        }

        // Password visibility toggles
        this.setupPasswordToggle('togglePassword', 'password', 'togglePasswordIcon');
        this.setupPasswordToggle('toggleRegisterPassword', 'registerPassword', 'toggleRegisterPasswordIcon');

        // Form validation
        this.setupFormValidation();

        // Check if user is already logged in
        this.checkAuthStatus();

        // Add animations
        this.addAnimations();
    }

    /**
     * Setup password visibility toggle
     */
    setupPasswordToggle(buttonId, inputId, iconId) {
        const toggleButton = document.getElementById(buttonId);
        const passwordInput = document.getElementById(inputId);
        const toggleIcon = document.getElementById(iconId);

        if (toggleButton && passwordInput && toggleIcon) {
            toggleButton.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                toggleIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        // Custom validation for password confirmation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const registerPasswordInput = document.getElementById('registerPassword');

        if (confirmPasswordInput && registerPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                if (confirmPasswordInput.value !== registerPasswordInput.value) {
                    confirmPasswordInput.setCustomValidity('Passwords do not match');
                } else {
                    confirmPasswordInput.setCustomValidity('');
                }
            });

            registerPasswordInput.addEventListener('input', () => {
                if (confirmPasswordInput.value && confirmPasswordInput.value !== registerPasswordInput.value) {
                    confirmPasswordInput.setCustomValidity('Passwords do not match');
                } else {
                    confirmPasswordInput.setCustomValidity('');
                }
            });
        }

        // Bootstrap validation styles
        const forms = document.querySelectorAll('.needs-validation');
        forms.forEach(form => {
            form.addEventListener('submit', (event) => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();
        
        if (!this.loginForm.checkValidity()) {
            return;
        }

        const submitButton = document.getElementById('loginButton');
        const originalText = submitButton.textContent;
        
        try {
            // Show loading state
            submitButton.textContent = 'Signing In...';
            submitButton.disabled = true;
            
            // Clear previous errors
            this.clearErrors();

            // Get form data
            const formData = new FormData(this.loginForm);
            const email = formData.get('email');
            const password = formData.get('password');

            // Attempt login
            const result = await authManager.login(email, password);

            if (result.success) {
                // Success - redirect
                this.showSuccess('Login successful! Redirecting...');
                
                // Redirect after a short delay
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('return');
                    window.location.href = returnUrl ? decodeURIComponent(returnUrl) : '/';
                }, 1500);
            } else {
                this.showError(result.error || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('An unexpected error occurred. Please try again.');
        } finally {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle registration form submission
     */
    async handleRegister(event) {
        event.preventDefault();
        
        if (!this.registerForm.checkValidity()) {
            return;
        }

        const submitButton = document.getElementById('registerButton');
        const originalText = submitButton.textContent;
        
        try {
            // Show loading state
            submitButton.textContent = 'Creating Account...';
            submitButton.disabled = true;
            
            // Get form data
            const formData = new FormData(this.registerForm);
            const userData = {
                email: formData.get('email'),
                password: formData.get('password'),
                full_name: formData.get('full_name'),
                username: formData.get('username'),
                role: 'customer'
            };

            // Attempt registration
            const result = await authManager.register(userData);

            if (result.success) {
                // Success
                this.showSuccess('Account created successfully! Please check your email for verification.');
                
                // Close modal and redirect
                setTimeout(() => {
                    this.registerModal.hide();
                    window.location.href = '/';
                }, 2000);
            } else {
                this.showError(result.error || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('An unexpected error occurred. Please try again.');
        } finally {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle forgot password form submission
     */
    async handleForgotPassword(event) {
        event.preventDefault();
        
        if (!this.forgotPasswordForm.checkValidity()) {
            return;
        }

        const submitButton = document.getElementById('forgotPasswordButton');
        const originalText = submitButton.textContent;
        
        try {
            // Show loading state
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            // Get form data
            const formData = new FormData(this.forgotPasswordForm);
            const email = formData.get('email');

            // Attempt password reset
            const result = await authManager.forgotPassword(email);

            if (result.success) {
                this.showSuccess('Password reset link sent to your email!');
                
                // Close modal after delay
                setTimeout(() => {
                    this.forgotPasswordModal.hide();
                }, 2000);
            } else {
                this.showError(result.error || 'Failed to send reset email. Please try again.');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showError('An unexpected error occurred. Please try again.');
        } finally {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle Google login
     */
    async handleGoogleLogin() {
        const googleButton = document.getElementById('googleLoginButton');
        const originalText = googleButton.textContent;
        
        try {
            // Show loading state
            googleButton.textContent = 'Connecting...';
            googleButton.disabled = true;
            
            // Attempt Google login
            const result = await authManager.loginWithGoogle();

            if (result.success) {
                this.showSuccess('Redirecting to Google...');
                // Google OAuth will handle the redirect
            } else {
                this.showError(result.error || 'Google login failed. Please try again.');
            }
        } catch (error) {
            console.error('Google login error:', error);
            this.showError('Google login failed. Please try again.');
        } finally {
            // Reset button state after delay
            setTimeout(() => {
                googleButton.textContent = originalText;
                googleButton.disabled = false;
            }, 2000);
        }
    }

    /**
     * Check authentication status
     */
    checkAuthStatus() {
        if (authManager.isAuthenticated()) {
            // User is already logged in, redirect to home
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('return');
            window.location.href = returnUrl ? decodeURIComponent(returnUrl) : '/';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorContainer = document.getElementById('authError');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const errorContainer = document.getElementById('authError');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle me-2"></i>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    }

    /**
     * Clear error messages
     */
    clearErrors() {
        const errorContainer = document.getElementById('authError');
        if (errorContainer) {
            errorContainer.innerHTML = '';
        }
    }

    /**
     * Add animations to the page
     */
    addAnimations() {
        // Fade in animation for the form container
        const formContainer = document.querySelector('.login-form-container');
        if (formContainer) {
            formContainer.style.opacity = '0';
            formContainer.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                formContainer.style.transition = 'all 0.6s ease';
                formContainer.style.opacity = '1';
                formContainer.style.transform = 'translateY(0)';
            }, 300);
        }

        // Add hover effects to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
            });
        });

        // Add focus effects to form inputs
        const inputs = document.querySelectorAll('.form-control');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.style.transform = 'scale(1.02)';
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.style.transform = 'scale(1)';
            });
        });
    }
}

// Initialize login page when DOM is ready
const loginPage = new LoginPage();

// Export for global use
window.LoginPage = LoginPage;
window.loginPage = loginPage;

export default LoginPage;

