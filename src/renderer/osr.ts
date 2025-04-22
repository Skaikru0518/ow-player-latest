document.addEventListener('DOMContentLoaded', () => {
  const exitBtn = document.getElementById('exitBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', async () => {
      try {
        // @ts-ignore
        await window.overlay.toggle(); // Use window.overlay instead of window.osr
      } catch (error) {
        console.error('Error toggling overlay:', error);
      }
    });
  }
});
