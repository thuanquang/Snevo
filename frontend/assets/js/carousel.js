// Initialize carousel as soon as DOM is ready, but respect skeleton loading
document.addEventListener('DOMContentLoaded', function() {
  const slider = document.getElementById('slider');
  const totalSlides = 5;
  const inputs = [];
  for (let i=1; i<=totalSlides; i++) {
    inputs.push(document.getElementById('s' + i));
  }

  let isCollapsed = true;

  function updateCollapsedState(collapsed) {
    if (collapsed) {
      slider.classList.add('collapsed');
    } else {
      slider.classList.remove('collapsed');
    }
  }

  // Set initial state to collapsed
  updateCollapsedState(true);
  inputs.forEach(i => i.checked = false);
  inputs[2].checked = true; // Center slide checked initially

  // Initialize automatic slide rotation
  let currentSlide = 3;
  const delay = 3500;
  const slideInterval = setInterval(() => {
    currentSlide++;
    if (currentSlide > totalSlides) currentSlide = 1;
    inputs[currentSlide - 1].checked = true;
  }, delay);

  // Handle visibility changes for subsequent scrolling
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        // Only expand if currently collapsed
        if (isCollapsed) {
          updateCollapsedState(false);
          isCollapsed = false;
        }
      } else {
        // Collapse when scrolled away
        if (!isCollapsed) {
          updateCollapsedState(true);
          isCollapsed = true;
          inputs.forEach(i => i.checked = false);
          inputs[2].checked = true;
        }
      }
    });
  }, { threshold: 0.6 });

  // Start observing for subsequent scroll interactions
  observer.observe(slider);
});
