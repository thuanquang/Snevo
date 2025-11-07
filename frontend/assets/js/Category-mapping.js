/**
 * Category Mapping
 * Maps sport names to category IDs
 */

const CATEGORY_MAPPING = {
  'running': 'Running',      // hoặc ID số nếu cần
  'football': 'Football',
  'basketball': 'Basketball',
  'training': 'Training',
  'lifestyle': 'Lifestyle'
};

// Export for use
if (typeof window !== 'undefined') {
  window.CATEGORY_MAPPING = CATEGORY_MAPPING;
}
