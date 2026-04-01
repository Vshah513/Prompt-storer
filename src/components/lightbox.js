// PromptVault — Image Lightbox

let currentImages = [];
let currentIndex = 0;

export function openLightbox(images, startIndex = 0) {
  currentImages = images;
  currentIndex = startIndex;

  const overlay = document.getElementById('lightbox-overlay');
  overlay.classList.remove('hidden');
  renderLightbox();

  const escHandler = (e) => {
    if (e.key === 'Escape') { closeLightbox(); document.removeEventListener('keydown', escHandler); }
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  };
  document.addEventListener('keydown', escHandler);
}

function renderLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  overlay.innerHTML = `
    <button class="lightbox-close" id="lb-close">✕</button>
    ${currentImages.length > 1 ? `
      <button class="lightbox-nav prev" id="lb-prev">◀</button>
      <button class="lightbox-nav next" id="lb-next">▶</button>
    ` : ''}
    <img class="lightbox-image" src="${currentImages[currentIndex]}" alt="Image ${currentIndex + 1}" />
    ${currentImages.length > 1 ? `
      <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:13px;">
        ${currentIndex + 1} / ${currentImages.length}
      </div>
    ` : ''}
  `;

  document.getElementById('lb-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lb-prev')?.addEventListener('click', () => navigateLightbox(-1));
  document.getElementById('lb-next')?.addEventListener('click', () => navigateLightbox(1));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });
}

function navigateLightbox(dir) {
  currentIndex = (currentIndex + dir + currentImages.length) % currentImages.length;
  renderLightbox();
}

export function closeLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
}
