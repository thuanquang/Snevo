const footerHTML = `
<footer class="footer bg-white border-top py-5">
    <div class="container">
        <div class="row gy-4">
            <!-- Logo & Description -->
            <div class="col-lg-4 col-md-6">
                <img src="../assets/images/ui/logo.svg" alt="Snevo Logo" class="footer-logo mb-3">
                <p class="text-muted small mb-0">Premium athletic footwear for champions. Just Do It.</p>
            </div>

            <!-- Quick Links -->
            <div class="col-lg-2 col-md-6">
                <h6 class="fw-semibold text-dark mb-3">Quick Links</h6>
                <ul class="list-unstyled footer-links">
                    <li><a href="index.html" class="text-muted text-decoration-none">Home</a></li>
                    <li><a href="products.html" class="text-muted text-decoration-none">Products</a></li>
                    <li><a href="#about" class="text-muted text-decoration-none">About</a></li>
                    <li><a href="#contact" class="text-muted text-decoration-none">Contact</a></li>
                </ul>
            </div>

            <!-- Customer Service -->
            <div class="col-lg-3 col-md-6">
                <h6 class="fw-semibold text-dark mb-3">Customer Service</h6>
                <ul class="list-unstyled footer-links">
                    <li><a href="#help" class="text-muted text-decoration-none">Help Center</a></li>
                    <li><a href="#returns" class="text-muted text-decoration-none">Returns</a></li>
                    <li><a href="#shipping" class="text-muted text-decoration-none">Shipping</a></li>
                    <li><a href="#size-guide" class="text-muted text-decoration-none">Size Guide</a></li>
                </ul>
            </div>

            <!-- Follow Us -->
            <div class="col-lg-3 col-md-6">
                <h6 class="fw-semibold text-dark mb-3">Follow Us</h6>
                <div class="social-links d-flex gap-3">
                    <a href="#" class="text-dark" aria-label="Facebook">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="#" class="text-dark" aria-label="Twitter">
                        <i class="fab fa-twitter"></i>
                    </a>
                    <a href="#" class="text-dark" aria-label="Instagram">
                        <i class="fab fa-instagram"></i>
                    </a>
                    <a href="#" class="text-dark" aria-label="YouTube">
                        <i class="fab fa-youtube"></i>
                    </a>
                </div>
            </div>
        </div>

        <!-- Divider -->
        <hr class="my-4 border-secondary-subtle">

        <!-- Bottom Row -->
        <div class="row align-items-center">
            <div class="col-md-6">
                <p class="mb-0 text-muted small">&copy; 2024 Snevo. All rights reserved.</p>
            </div>
            <div class="col-md-6 text-md-end">
                <a href="#privacy" class="text-muted text-decoration-none small me-3">Privacy Policy</a>
                <a href="#terms" class="text-muted text-decoration-none small">Terms of Service</a>
            </div>
        </div>
    </div>
</footer>
`;

document.addEventListener("DOMContentLoaded", () => {
  const footerRoot = document.getElementById("footerRoot");
  if (footerRoot) {
    footerRoot.innerHTML = footerHTML;
  }
});
