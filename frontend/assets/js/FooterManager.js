document.addEventListener('DOMContentLoaded', async function() {
  try {
    const response = await fetch('../components/footer.html'); // Đường dẫn tương đối đúng với project
    if (!response.ok) throw new Error('Failed to load footer.html');

    const footerHTML = await response.text();

    const footerRoot = document.getElementById('footerRoot');
    if (footerRoot) {
      footerRoot.innerHTML = footerHTML;
    }
  } catch (error) {
    console.error('Error loading footer:', error);
  }
});
