// Small lazy image helper with IntersectionObserver fallback
// This script sets `src` from `data-src` if present and ensures images have loading set.
(function(){
  function supportsLoadingAttr() {
    return 'loading' in HTMLImageElement.prototype;
  }

  function ensureAttributes(img){
    try {
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding','async');
      if (!img.hasAttribute('loading')) img.setAttribute('loading','lazy');
      if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority','low');
    } catch(e){/* noop */}
  }

  function onIntersect(entries, observer){
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset && img.dataset.src) img.src = img.dataset.src;
        ensureAttributes(img);
        observer.unobserve(img);
      }
    });
  }

  function init(){
    const imgs = Array.from(document.querySelectorAll('img.product-img, img.brand-img'));

    // For images that already have src, ensure attributes
    imgs.forEach(img => ensureAttributes(img));

    // For browsers that don't support loading attr, lazy-load using IntersectionObserver
    if (!supportsLoadingAttr() && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(onIntersect, {rootMargin: '200px 0px', threshold: 0.01});
      imgs.forEach(img => {
        // If developer wanted to defer src, they can set data-src; otherwise OBS still ensures attributes
        if (img.dataset && img.dataset.src) {
          io.observe(img);
        }
      });
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
