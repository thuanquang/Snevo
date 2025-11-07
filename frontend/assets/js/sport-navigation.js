/**
 * Sport Navigation Handler with Dynamic Category Mapping
 */

document.addEventListener('DOMContentLoaded', async function() {
  const sportCTAButtons = document.querySelectorAll('.sport-cta[data-category]');
  
  if (sportCTAButtons.length === 0) {
    console.log('No sport CTA buttons found');
    return;
  }

  // Fetch categories from API to create mapping
  let categoryMapping = {};
  
  try {
    console.log('📂 Fetching categories for mapping...');
    const response = await window.productsAPI.getCategories({ active_only: true });
    
    if (response.success && response.data) {
      // Create mapping: category_name -> category_id
      response.data.forEach(cat => {
        const nameLower = cat.category_name.toLowerCase();
        categoryMapping[nameLower] = cat.category_id;
      });
      
      console.log('✅ Category mapping created:', categoryMapping);
    }
  } catch (error) {
    console.error('❌ Failed to fetch categories:', error);
  }

  // Add click event to sport CTA buttons
  sportCTAButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const categoryName = this.getAttribute('data-category');
      
      if (!categoryName) {
        console.warn('No category found for sport CTA button');
        return;
      }

      // Convert category name to ID using mapping
      const categoryId = categoryMapping[categoryName.toLowerCase()];
      
      if (!categoryId) {
        console.error(`No category ID found for: ${categoryName}`);
        // Fallback: navigate without filter
        window.location.href = 'products.html';
        return;
      }

      console.log(`Navigating to products with category ID: ${categoryId} (${categoryName})`);
      
      // Navigate with category_id parameter
      window.location.href = `products.html?category_id=${categoryId}`;
    });

    button.style.cursor = 'pointer';
  });

  console.log(`✅ Sport navigation initialized for ${sportCTAButtons.length} buttons`);
});
