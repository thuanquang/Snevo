// Skeleton Loading Handler
class SkeletonLoader {
    constructor() {
        this.skeletonContent = document.getElementById('skeleton-content');
        this.mainContent = document.getElementById('main-content');
        this.loaded = false;
        this.init();
    }

    init() {
        // Show skeleton immediately
        this.showSkeleton();
        
        // Listen for DOM content loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Start counting resources
            this.waitForResources();
        });
    }

    showSkeleton() {
        if (this.skeletonContent && this.mainContent) {
            this.skeletonContent.style.display = 'block';
            this.mainContent.style.display = 'none';
        }
    }

    showContent() {
        if (this.loaded) return; // Prevent multiple executions
        
        this.loaded = true;
        if (this.skeletonContent && this.mainContent) {
            // Add a small delay for smooth transition
            setTimeout(() => {
                this.skeletonContent.style.display = 'none';
                this.mainContent.style.display = 'block';
            }, 300);
        }
    }

    waitForResources() {
        // Wait for document ready (load) and for non-lazy images currently loading.
        const domReady = document.readyState === 'complete' ? Promise.resolve() : 
            new Promise(resolve => window.addEventListener('load', resolve));

        // Only wait for images that are NOT intentionally lazy-loaded.
        const imagesToWait = Array.from(document.images).filter(img => {
            const loadingAttr = img.getAttribute('loading');
            // treat missing attr or explicit eager as important
            return loadingAttr !== 'lazy' && !img.complete;
        });

        const imagesPromise = imagesToWait.length === 0 ? Promise.resolve() : Promise.all(
            imagesToWait.map(img => new Promise(resolve => {
                const cleanup = () => { img.onload = img.onerror = null; resolve(); };
                img.onload = cleanup;
                img.onerror = cleanup;
            }))
        );

        // Add a maximum timeout so skeleton can't hang indefinitely (safety fallback)
        const timeout = new Promise(resolve => setTimeout(resolve, 3000)); // 3s max wait

        Promise.all([domReady, imagesPromise, timeout]).then(() => {
            // Proceed to show content (either resources loaded or timeout reached)
            this.showContent();
        });
    }
}

// Initialize the skeleton loader
const skeletonLoader = new SkeletonLoader();