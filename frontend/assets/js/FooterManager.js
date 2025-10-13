// FooterManager.js
class FooterManager {
    constructor() {
        this.footerRoot = document.getElementById('footerRoot');
        this.init();
    }

    async init() {
        try {
            const response = await fetch('../components/footer.html');
            const html = await response.text();
            this.footerRoot.innerHTML = html;
        } catch (error) {
            console.error('Error loading footer:', error);
        }
    }
}

// Initialize footer
document.addEventListener('DOMContentLoaded', () => {
    new FooterManager();
});

export default FooterManager;