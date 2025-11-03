/**
 * ReviewManager - Manages product reviews UI and interactions
 * Handles review display, creation, editing, and deletion
 */
class ReviewManager {
  constructor(productId, options = {}) {
    this.productId = productId;
    this.currentPage = 1;
    this.currentFilter = "all";
    this.modal = null;
    this.editingReviewId = null;
    this.userReview = null;
    this.options = {
      loadStats: true,
      loadReviews: true,
      checkUserReview: true,
      setupWriteButton: true, // Whether to setup write review button listener
      ...options
    };

    console.log("✅ ReviewManager initialized for product:", productId, "with options:", this.options);
  }

  /**
   * Initialize the review manager
   */
  async init() {
    try {
      // Wait for Bootstrap to be ready
      if (typeof bootstrap === 'undefined') {
        console.warn('⏳ Bootstrap not loaded yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Initialize modal
      const modalElement = document.getElementById("reviewModal");
      if (modalElement) {
        // Ensure Bootstrap Modal is available
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
          this.modal = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
          });
          console.log('✅ Modal initialized successfully');
        } else {
          console.error('❌ Bootstrap Modal not available');
        }
      }

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data (conditionally based on options)
      if (this.options.loadStats) {
        await this.loadReviewStats();
      }
      if (this.options.loadReviews) {
        await this.loadReviews();
      }
      if (this.options.checkUserReview) {
        await this.checkUserReview();
      }
    } catch (error) {
      console.error("❌ Error initializing ReviewManager:", error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Write review button (only if option enabled)
    if (this.options.setupWriteButton) {
      const writeBtn = document.getElementById("writeReviewBtn");
      if (writeBtn) {
        writeBtn.addEventListener("click", () => this.openReviewModal());
      }
    }

    // Character count
    const commentInput = document.getElementById("reviewComment");
    if (commentInput) {
      commentInput.addEventListener("input", () => this.updateCharCount());
    }

    // Submit review
    const submitBtn = document.getElementById("submitReviewBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => this.submitReview());
    }

    // Filter buttons
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleFilterClick(e));
    });

    // Modal reset on close
    const modalElement = document.getElementById("reviewModal");
    if (modalElement) {
      modalElement.addEventListener("hidden.bs.modal", () =>
        this.resetReviewForm()
      );

      // ✅ THÊM: Setup star rating listeners khi modal được hiển thị
      modalElement.addEventListener("shown.bs.modal", () =>
        this.setupStarRating()
      );
    }

    // ✅ Thêm: Xử lý nút Cancel thủ công (fallback)
    const cancelBtns = document.querySelectorAll('[data-bs-dismiss="modal"]');
    cancelBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('🔘 Cancel button clicked');
        if (this.modal) {
          this.modal.hide();
        }
      });
    });
  }
  /**
   * Setup star rating event listeners
   */
  setupStarRating() {
    const starRating = document.getElementById("starRating");
    if (!starRating) return;

    const stars = starRating.querySelectorAll(".star");

    stars.forEach((star) => {
      star.addEventListener("click", (e) => this.handleStarClick(e));
      star.addEventListener("mouseenter", (e) => this.handleStarHover(e));
      star.addEventListener("mouseleave", (e) => this.handleStarLeave(e));
    });

    starRating.addEventListener("mouseleave", () => this.resetStarDisplay());
  }

  /**
   * Load review statistics
   */
  async loadReviewStats() {
    try {
      const stats = await window.reviewsAPI.getProductReviewStats(
        this.productId
      );
      this.renderReviewSummary(stats);
    } catch (error) {
      console.error("❌ Error loading review stats:", error);
      this.renderEmptyStats();
    }
  }

  /**
   * Load reviews with pagination and filters
   */
  async loadReviews(page = 1) {
    try {
      this.currentPage = page;
      const params = { page, limit: 10 };

      if (this.currentFilter !== "all") {
        params.rating = parseInt(this.currentFilter);
      }

      const result = await window.reviewsAPI.getProductReviews(
        this.productId,
        params
      );
      this.renderReviews(result.data);
      this.renderPagination(result);
    } catch (error) {
      console.error("❌ Error loading reviews:", error);
      this.renderEmptyReviews();
    }
  }

  /**
   * Check if current user has already reviewed this product
   */
  async checkUserReview() {
    try {
      const user = window.authManager?.getCurrentUser?.();
      if (!user) {
        document.getElementById("writeReviewBtn").style.display = "none";
        return;
      }

      // Load user's review for this specific product (optimized single query)
      this.userReview = await window.reviewsAPI.getMyReviewForProduct(
        this.productId
      );

      const writeBtn = document.getElementById("writeReviewBtn");
      if (this.userReview) {
        // User already reviewed - show edit option
        writeBtn.textContent = " Edit Your Review";
        writeBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Your Review';
      } else {
        // User hasn't reviewed - show write option
        writeBtn.innerHTML = '<i class="fas fa-pen"></i> Write a Review';
      }
      writeBtn.style.display = "block";
    } catch (error) {
      console.error("❌ Error checking user review:", error);
      document.getElementById("writeReviewBtn").style.display = "none";
    }
  }

  /**
   * Render review summary section
   */
  renderReviewSummary(stats) {
    // Defensive check - ensure stats has required properties
    if (!stats || typeof stats.average_rating === "undefined") {
      console.warn("⚠️ Invalid stats object, rendering empty stats");
      this.renderEmptyStats();
      return;
    }

    // Average rating
    const avgRating = parseFloat(stats.average_rating) || 0;
    const totalReviews = parseInt(stats.total_reviews) || 0;

    document.getElementById("avgRating").textContent = avgRating.toFixed(1);
    document.getElementById("totalReviews").textContent = `${totalReviews} ${
      totalReviews === 1 ? "review" : "reviews"
    }`;

    // Stars
    const starsContainer = document.getElementById("avgStars");
    starsContainer.innerHTML = this.generateStarHTML(avgRating);

    // Distribution bars
    const distContainer = document.getElementById("ratingDistribution");
    let distHTML = "";
    for (let i = 5; i >= 1; i--) {
      const count = (stats.distribution && stats.distribution[i]) || 0;
      const percentage =
        (stats.percentage_distribution && stats.percentage_distribution[i]) ||
        0;
      distHTML += `
                <div class="rating-bar-row">
                    <span class="rating-label">${i} ⭐</span>
                    <div class="progress" style="flex: 1;">
                        <div class="progress-bar bg-warning" role="progressbar" 
                             style="width: ${percentage}%"
                             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <span class="rating-count">${count}</span>
                </div>
            `;
    }
    distContainer.innerHTML = distHTML;
  }

  /**
   * Render empty stats when no reviews
   */
  renderEmptyStats() {
    document.getElementById("avgRating").textContent = "0.0";
    document.getElementById("totalReviews").textContent = "0 reviews";
    document.getElementById("avgStars").innerHTML = this.generateStarHTML(0);

    const distContainer = document.getElementById("ratingDistribution");
    let distHTML = "";
    for (let i = 5; i >= 1; i--) {
      distHTML += `
                <div class="rating-bar-row">
                    <span class="rating-label">${i} ⭐</span>
                    <div class="progress" style="flex: 1;">
                        <div class="progress-bar bg-warning" role="progressbar" 
                             style="width: 0%"></div>
                    </div>
                    <span class="rating-count">0</span>
                </div>
            `;
    }
    distContainer.innerHTML = distHTML;
  }

  /**
   * Render reviews list
   */
  renderReviews(reviews) {
    const listContainer = document.getElementById("reviewsList");

    if (!reviews || reviews.length === 0) {
      listContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No reviews yet. Be the first to review!</p>
                </div>
            `;
      return;
    }

    const currentUserId = window.authManager?.currentUser?.id;

    listContainer.innerHTML = reviews
      .map((review) => {
        const isOwnReview = currentUserId && review.user_id === currentUserId;
        const reviewDate = new Date(review.review_date).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );

        return `
                <div class="review-card" data-review-id="${review.review_id}">
                    <div class="review-header">
                        <div class="d-flex align-items-center">
                            <img src="${
                              review.avatar_url ||
                              "https://via.placeholder.com/40"
                            }" 
                                 alt="${review.username}" 
                                 class="review-avatar me-3">
                            <div>
                                <h6 class="mb-0">${review.username}</h6>
                                <small class="text-muted">${reviewDate}</small>
                            </div>
                        </div>
                        ${
                          isOwnReview
                            ? `
                            <div class="review-actions">
                                <button class="btn btn-sm btn-outline-primary me-2" 
                                        onclick="window.reviewManager.editReview(${
                                          review.review_id
                                        }, ${review.rating}, '${this.escapeHtml(
                                review.comment || ""
                              )}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" 
                                        onclick="window.reviewManager.deleteReview(${
                                          review.review_id
                                        })">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `
                            : ""
                        }
                    </div>
                    <div class="review-rating mb-2">
                        ${this.generateStarHTML(review.rating)}
                        ${
                          review.is_verified_purchase
                            ? '<span class="badge bg-success ms-2"><i class="fas fa-check-circle"></i> Verified Purchase</span>'
                            : ""
                        }
                    </div>
                    ${
                      review.comment
                        ? `<p class="review-comment">${this.escapeHtml(
                            review.comment
                          )}</p>`
                        : ""
                    }
                </div>
            `;
      })
      .join("");
  }

  /**
   * Render empty reviews message
   */
  renderEmptyReviews() {
    const listContainer = document.getElementById("reviewsList");
    listContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                <p class="text-muted">No reviews available.</p>
            </div>
        `;
  }

  /**
   * Render pagination controls
   */
  renderPagination(result) {
    const container = document.getElementById("reviewsPagination");

    // Normalize pagination data (handle both formats)
    const totalPages =
      result.pagination?.totalPages ||
      result.totalPages ||
      Math.ceil((result.total || 0) / (result.limit || 10));
    const currentPage = result.pagination?.page || result.page || 1;

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    let paginationHTML = '<nav><ul class="pagination">';

    // Previous button
    paginationHTML += `
            <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                <a class="page-link" href="#" onclick="window.reviewManager.loadReviews(${
                  currentPage - 1
                }); return false;">
                    Previous
                </a>
            </li>
        `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        paginationHTML += `
                    <li class="page-item ${i === currentPage ? "active" : ""}">
                        <a class="page-link" href="#" onclick="window.reviewManager.loadReviews(${i}); return false;">
                            ${i}
                        </a>
                    </li>
                `;
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        paginationHTML +=
          '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
    }

    // Next button
    paginationHTML += `
            <li class="page-item ${
              currentPage === totalPages ? "disabled" : ""
            }">
                <a class="page-link" href="#" onclick="window.reviewManager.loadReviews(${
                  currentPage + 1
                }); return false;">
                    Next
                </a>
            </li>
        `;

    paginationHTML += "</ul></nav>";
    container.innerHTML = paginationHTML;
  }

  /**
   * Generate star HTML
   */
  generateStarHTML(rating) {
    let html = "";
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        html += '<i class="fas fa-star text-warning"></i>';
      } else if (i === fullStars + 1 && hasHalfStar) {
        html += '<i class="fas fa-star-half-alt text-warning"></i>';
      } else {
        html += '<i class="far fa-star text-warning"></i>';
      }
    }
    return html;
  }

  /**
   * Open review modal for create/edit
   */
  openReviewModal(reviewId = null, rating = 0, comment = "") {
    console.log('🔓 Opening review modal...', { reviewId, rating, modal: !!this.modal });
    
    if (!this.modal) {
      console.error('❌ Modal not initialized');
      // Try to initialize modal on-demand
      const modalElement = document.getElementById("reviewModal");
      if (modalElement && typeof bootstrap !== 'undefined') {
        this.modal = new bootstrap.Modal(modalElement);
        console.log('✅ Modal initialized on-demand');
      } else {
        alert('Unable to open review form. Please refresh the page.');
        return;
      }
    }

    this.editingReviewId = reviewId || this.userReview?.review_id || null;

    // Set modal title
    const modalTitle = document.getElementById("reviewModalTitle");
    if (modalTitle) {
      modalTitle.textContent = this.editingReviewId
        ? "Edit Your Review"
        : "Write a Review";
    }

    // Populate form if editing
    if (this.editingReviewId) {
      this.setStarRating(rating || this.userReview?.rating || 0);
      const commentInput = document.getElementById("reviewComment");
      if (commentInput) {
        commentInput.value = comment || this.userReview?.comment || "";
        this.updateCharCount();
      }
    }

    try {
      this.modal.show();
      console.log('✅ Modal shown');
    } catch (error) {
      console.error('❌ Error showing modal:', error);
    }
    // Star rating listeners sẽ được setup tự động bởi 'shown.bs.modal' event
  }

  /**
   * Edit review
   */
  editReview(reviewId, rating, comment) {
    this.openReviewModal(reviewId, rating, comment);
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId) {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      await window.reviewsAPI.deleteReview(reviewId);
      this.showToast("Review deleted successfully", "success");

      // Reload data (conditionally based on options)
      if (this.options.loadStats) {
        await this.loadReviewStats();
      }
      if (this.options.loadReviews) {
        await this.loadReviews(this.currentPage);
      }
      if (this.options.checkUserReview) {
        await this.checkUserReview();
      }
    } catch (error) {
      console.error("❌ Error deleting review:", error);
      this.showToast(error.message || "Failed to delete review", "danger");
    }
  }

  /**
   * Submit review (create or update)
   */
  async submitReview() {
    const rating = parseInt(document.getElementById("ratingInput").value);
    const comment = document.getElementById("reviewComment").value.trim();

    // Validation
    if (rating < 1 || rating > 5) {
      this.showToast("Please select a rating", "warning");
      return;
    }

    try {
      const reviewData = {
        shoe_id: parseInt(this.productId),
        rating,
        comment: comment || null,
      };

      if (this.editingReviewId) {
        // Update existing review
        await window.reviewsAPI.updateReview(this.editingReviewId, {
          rating,
          comment: comment || null,
        });
        this.showToast("Review updated successfully", "success");
      } else {
        // Create new review
        await window.reviewsAPI.createReview(reviewData);
        this.showToast("Review submitted successfully", "success");
      }

      // Close modal and reload (conditionally based on options)
      if (this.modal) {
        this.modal.hide();
      }
      
      if (this.options.loadStats) {
        await this.loadReviewStats();
      }
      if (this.options.loadReviews) {
        await this.loadReviews(1); // Go to first page
      }
      if (this.options.checkUserReview) {
        await this.checkUserReview();
      }
    } catch (error) {
      console.error("❌ Error submitting review:", error);
      this.showToast(error.message || "Failed to submit review", "danger");
    }
  }

  /**
   * Handle star click in modal
   */
  handleStarClick(e) {
    const star = e.currentTarget;
    const rating = parseInt(star.dataset.rating);

    if (rating >= 1 && rating <= 5) {
      this.setStarRating(rating);
    }
  }

  /**
   * Handle star hover in modal
   */
  handleStarHover(e) {
    const star = e.currentTarget;
    const rating = parseInt(star.dataset.rating);
    const starRating = document.getElementById("starRating");
    const stars = starRating.querySelectorAll(".star");

    stars.forEach((s) => {
      const starNum = parseInt(s.dataset.rating);
      if (starNum <= rating) {
        s.classList.add("hover");
        s.classList.add("visited");
      } else {
        s.classList.remove("hover");
        s.classList.remove("visited");
      }
    });
  }
  /**
   * Handle star leave
   */
  handleStarLeave(e) {
    const starRating = document.getElementById("starRating");
    const stars = starRating.querySelectorAll(".star");

    stars.forEach((s) => {
      s.classList.remove("hover");
    });
  }

  /**
   * Reset star display to selected rating
   */
  resetStarDisplay() {
    const starRating = document.getElementById("starRating");
    const stars = starRating.querySelectorAll(".star");

    stars.forEach((star) => {
      star.classList.remove("visited");
    });
  }

  /**
   * Set star rating value
   */
  setStarRating(rating) {
    document.getElementById("ratingInput").value = rating;

    const starRating = document.getElementById("starRating");
    const stars = starRating.querySelectorAll(".star");

    stars.forEach((star) => {
      const starNum = parseInt(star.dataset.rating);
      if (starNum <= rating) {
        star.classList.add("active");
      } else {
        star.classList.remove("active");
      }
    });
  }

  /**
   * Update character count
   */
  updateCharCount() {
    const comment = document.getElementById("reviewComment").value;
    document.getElementById("charCount").textContent = comment.length;
  }

  /**
   * Handle filter button click
   */
  handleFilterClick(e) {
    const btn = e.currentTarget;
    const rating = btn.dataset.rating;

    // Update active state
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Update filter and reload
    this.currentFilter = rating;
    this.loadReviews(1);
  }

  /**
   * Reset review form
   */
  resetReviewForm() {
    this.editingReviewId = null;
    document.getElementById("reviewComment").value = "";
    document.getElementById("ratingInput").value = "0";
    this.setStarRating(0);
    this.updateCharCount();
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    // Use existing toast system if available
    if (window.showAlert) {
      window.showAlert(message, type);
    } else {
      alert(message);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for global use
if (typeof window !== "undefined") {
  window.ReviewManager = ReviewManager;
}
