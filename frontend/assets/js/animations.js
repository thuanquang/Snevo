/**
 * Animation Controller - Nike-inspired smooth animations
 * Manages all animations and transitions for the Snevo E-commerce Platform
 */

class AnimationController {
    constructor(options = {}) {
        this.options = {
            enableScrollAnimations: true,
            enableHoverAnimations: true,
            enableLoadAnimations: true,
            animationSpeed: 'normal',
            ...options
        };
        
        this.isInitialized = false;
        this.observers = new Map();
        this.animatedElements = new Set();
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.initialize);
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize animation controller
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🎬 Initializing Animation Controller...');
            
            // Setup intersection observers for scroll animations
            if (this.options.enableScrollAnimations) {
                this.setupScrollAnimations();
            }
            
            // Setup hover animations
            if (this.options.enableHoverAnimations) {
                this.setupHoverAnimations();
            }
            
            // Setup load animations
            if (this.options.enableLoadAnimations) {
                this.setupLoadAnimations();
            }
            
            // Setup parallax effects
            this.setupParallaxEffects();
            
            // Setup page transition animations
            this.setupPageTransitions();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Animation Controller initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Animation Controller:', error);
        }
    }

    /**
     * Setup scroll-triggered animations using Intersection Observer
     */
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        // Create intersection observer for fade-in animations
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target, 'fadeIn');
                    fadeInObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Create intersection observer for slide-up animations
        const slideUpObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target, 'slideUp');
                    slideUpObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Create intersection observer for scale animations
        const scaleObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target, 'scaleIn');
                    scaleObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements for animations
        const fadeElements = document.querySelectorAll('.animate-fade, .section-title, .section-subtitle');
        const slideElements = document.querySelectorAll('.animate-slide, .product-card, .animate-on-scroll');
        const scaleElements = document.querySelectorAll('.animate-scale, .category-card');

        fadeElements.forEach(el => {
            el.style.opacity = '0';
            fadeInObserver.observe(el);
        });

        slideElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            slideUpObserver.observe(el);
        });

        scaleElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'scale(0.9)';
            scaleObserver.observe(el);
        });

        // Store observers for cleanup
        this.observers.set('fadeIn', fadeInObserver);
        this.observers.set('slideUp', slideUpObserver);
        this.observers.set('scaleIn', scaleObserver);
    }

    /**
     * Setup hover animations
     */
    setupHoverAnimations() {
        // Product cards hover effects
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            this.setupProductCardAnimation(card);
        });

        // Category cards hover effects
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            this.setupCategoryCardAnimation(card);
        });

        // Button hover effects
        const buttons = document.querySelectorAll('.btn:not(.btn-no-animation)');
        buttons.forEach(button => {
            this.setupButtonAnimation(button);
        });
    }

    /**
     * Setup product card animations
     */
    setupProductCardAnimation(card) {
        const image = card.querySelector('.product-image img');
        const overlay = card.querySelector('.product-overlay');
        const actions = card.querySelectorAll('.product-actions .btn');

        card.addEventListener('mouseenter', () => {
            this.animateProductCard(card, image, overlay, actions, true);
        });

        card.addEventListener('mouseleave', () => {
            this.animateProductCard(card, image, overlay, actions, false);
        });
    }

    /**
     * Animate product card on hover
     */
    animateProductCard(card, image, overlay, actions, isHover) {
        const duration = this.getAnimationDuration('normal');
        
        if (isHover) {
            // Card lift animation
            card.style.transform = 'translateY(-8px)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
            
            // Image zoom
            if (image) {
                image.style.transform = 'scale(1.1)';
            }
            
            // Show overlay
            if (overlay) {
                overlay.style.opacity = '1';
            }
            
            // Animate action buttons
            actions.forEach((btn, index) => {
                setTimeout(() => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.opacity = '1';
                }, index * 100);
            });
        } else {
            // Reset animations
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'var(--shadow)';
            
            if (image) {
                image.style.transform = 'scale(1)';
            }
            
            if (overlay) {
                overlay.style.opacity = '0';
            }
            
            actions.forEach(btn => {
                btn.style.transform = 'translateY(20px)';
                btn.style.opacity = '0';
            });
        }
    }

    /**
     * Setup category card animations
     */
    setupCategoryCardAnimation(card) {
        const image = card.querySelector('.category-image');
        const title = card.querySelector('.category-title');

        card.addEventListener('mouseenter', () => {
            card.style.transform = 'scale(1.05) translateY(-5px)';
            if (image) {
                image.style.transform = 'scale(1.15)';
            }
            if (title) {
                title.style.transform = 'translateY(0)';
                title.style.opacity = '1';
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'scale(1) translateY(0)';
            if (image) {
                image.style.transform = 'scale(1)';
            }
            if (title) {
                title.style.transform = 'translateY(20px)';
                title.style.opacity = '0';
            }
        });
    }

    /**
     * Setup button animations
     */
    setupButtonAnimation(button) {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });

        button.addEventListener('mousedown', () => {
            button.style.transform = 'translateY(0)';
        });
    }

    /**
     * Setup load animations
     */
    setupLoadAnimations() {
        // Animate navigation items on load
        const navItems = document.querySelectorAll('.navbar-nav .nav-item');
        navItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100 + 200);
        });

        // Animate hero content
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            this.animateHeroContent(heroContent);
        }
    }

    /**
     * Animate hero content on load
     */
    animateHeroContent(heroContent) {
        const title = heroContent.querySelector('.hero-title');
        const subtitle = heroContent.querySelector('.hero-subtitle');
        const buttons = heroContent.querySelector('.hero-buttons');

        // Reset initial states
        if (title) {
            title.style.opacity = '0';
            title.style.transform = 'translateY(30px)';
        }
        if (subtitle) {
            subtitle.style.opacity = '0';
            subtitle.style.transform = 'translateY(30px)';
        }
        if (buttons) {
            buttons.style.opacity = '0';
            buttons.style.transform = 'translateY(30px)';
        }

        // Animate in sequence
        setTimeout(() => {
            if (title) {
                title.style.transition = 'all 1s cubic-bezier(0.4, 0.0, 0.2, 1)';
                title.style.opacity = '1';
                title.style.transform = 'translateY(0)';
            }
        }, 500);

        setTimeout(() => {
            if (subtitle) {
                subtitle.style.transition = 'all 1s cubic-bezier(0.4, 0.0, 0.2, 1)';
                subtitle.style.opacity = '1';
                subtitle.style.transform = 'translateY(0)';
            }
        }, 700);

        setTimeout(() => {
            if (buttons) {
                buttons.style.transition = 'all 1s cubic-bezier(0.4, 0.0, 0.2, 1)';
                buttons.style.opacity = '1';
                buttons.style.transform = 'translateY(0)';
            }
        }, 900);
    }

    /**
     * Setup parallax effects
     */
    setupParallaxEffects() {
        const parallaxElements = document.querySelectorAll('.parallax-element');
        
        if (parallaxElements.length === 0) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;

            parallaxElements.forEach(element => {
                element.style.transform = `translateY(${rate}px)`;
            });
        });
    }

    /**
     * Setup page transition animations
     */
    setupPageTransitions() {
        // Add page enter animation to body
        document.body.classList.add('page-enter');
        
        // Setup link click animations
        const links = document.querySelectorAll('a[href]:not([href^="#"]):not([target="_blank"])');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                    this.animatePageExit(() => {
                        window.location.href = href;
                    });
                }
            });
        });
    }

    /**
     * Animate page exit
     */
    animatePageExit(callback) {
        document.body.classList.add('page-exit');
        setTimeout(callback, 300);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', this.handleResize);
        
        // Scroll handler for performance optimizations
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(this.handleScroll);
                ticking = true;
            }
        });
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        // Implement scroll-based animations here
        // This method is called on scroll for performance optimizations
    }

    /**
     * Handle resize events
     */
    handleResize() {
        // Recalculate animations on resize if needed
    }

    /**
     * Animate element with specified animation type
     */
    animateElement(element, animationType, options = {}) {
        if (this.animatedElements.has(element)) return;
        
        const duration = this.getAnimationDuration(options.speed || 'normal');
        const delay = options.delay || 0;
        
        setTimeout(() => {
            switch (animationType) {
                case 'fadeIn':
                    element.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
                    element.style.opacity = '1';
                    break;
                    
                case 'slideUp':
                    element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                    break;
                    
                case 'scaleIn':
                    element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
                    element.style.opacity = '1';
                    element.style.transform = 'scale(1)';
                    break;
                    
                case 'slideInLeft':
                    element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
                    element.style.opacity = '1';
                    element.style.transform = 'translateX(0)';
                    break;
                    
                case 'slideInRight':
                    element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
                    element.style.opacity = '1';
                    element.style.transform = 'translateX(0)';
                    break;
            }
            
            element.classList.add('animate-in');
            this.animatedElements.add(element);
        }, delay);
    }

    /**
     * Get animation duration based on speed setting
     */
    getAnimationDuration(speed) {
        const durations = {
            fast: 200,
            normal: 300,
            slow: 500,
            'very-slow': 1000
        };
        
        return durations[speed] || durations.normal;
    }

    /**
     * Add stagger animation to elements
     */
    staggerAnimation(elements, animationType, options = {}) {
        const staggerDelay = options.staggerDelay || 100;
        
        elements.forEach((element, index) => {
            this.animateElement(element, animationType, {
                ...options,
                delay: index * staggerDelay
            });
        });
    }

    /**
     * Animate cart item addition
     */
    animateCartAddition(element) {
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    /**
     * Animate cart item removal
     */
    animateCartRemoval(element, callback) {
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'translateX(100%)';
        element.style.opacity = '0';
        element.style.height = '0';
        element.style.margin = '0';
        element.style.padding = '0';
        
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }

    /**
     * Show loading animation
     */
    showLoading(container) {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        
        container.innerHTML = '';
        container.appendChild(loader);
        
        // Animate in
        loader.style.opacity = '0';
        loader.style.transform = 'scale(0.8)';
        
        requestAnimationFrame(() => {
            loader.style.transition = 'all 0.3s ease';
            loader.style.opacity = '1';
            loader.style.transform = 'scale(1)';
        });
    }

    /**
     * Hide loading animation
     */
    hideLoading(container, newContent) {
        const loader = container.querySelector('.loading-spinner');
        if (!loader) return;
        
        loader.style.transition = 'all 0.3s ease';
        loader.style.opacity = '0';
        loader.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            container.innerHTML = newContent;
            
            // Animate in new content
            const newElements = container.querySelectorAll('.animate-on-load');
            this.staggerAnimation(newElements, 'fadeIn', { staggerDelay: 50 });
        }, 300);
    }

    /**
     * Destroy animation controller and cleanup
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('scroll', this.handleScroll);
        
        // Disconnect observers
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        // Clear sets and maps
        this.observers.clear();
        this.animatedElements.clear();
        
        this.isInitialized = false;
        console.log('🎬 Animation Controller destroyed');
    }
}

// Create global animation controller instance
const animationController = new AnimationController();

// Export for global use
window.AnimationController = AnimationController;
window.animationController = animationController;

export default AnimationController;
export { animationController };
