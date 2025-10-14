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

  let currentSlide = 3;
  const delay = 3500;
  setInterval(() => {
    currentSlide++;
    if (currentSlide > totalSlides) currentSlide = 1;
    inputs[currentSlide - 1].checked = true;
  }, delay);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        // Slider visible
        if (isCollapsed) {
          updateCollapsedState(false);
          isCollapsed = false;
        }
      } else {
    
        if (!isCollapsed) {
          updateCollapsedState(true);
          isCollapsed = true;
          inputs.forEach(i => i.checked = false);
          inputs[2].checked = true;
        }
      }
    });
  }, { threshold: 0.6 });

  observer.observe(slider);
});
