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

  // Tự động đổi slide
  let currentSlide = 3;
  const delay = 3500;
  setInterval(() => {
    currentSlide++;
    if (currentSlide > totalSlides) currentSlide = 1;
    inputs[currentSlide - 1].checked = true;
  }, delay);

  // Kiểm tra visibility với Intersection Observer
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        // Slider visible
        if (isCollapsed) {
          updateCollapsedState(false);
          isCollapsed = false;
        }
      } else {
        // Slider out of viewport
        if (!isCollapsed) {
          updateCollapsedState(true);
          isCollapsed = true;
          // Optionally reset all transforms to center
          inputs.forEach(i => i.checked = false);
          inputs[2].checked = true; // Ví dụ chọn slide 3 làm center mặc định
        }
      }
    });
  }, { threshold: 0.6 });

  observer.observe(slider);
});
