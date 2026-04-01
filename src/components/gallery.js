// PromptVault — Gallery (Masonry Grid) View

import { createCard } from './card.js';

export async function renderGallery(container, prompts, onCardClick, onFavoriteToggle) {
  if (!prompts.length) {
    container.innerHTML = `
      <div class="gallery-empty">
        <div class="empty-icon">📭</div>
        <h3>No prompts found</h3>
        <p>Create your first prompt or adjust your search filters.</p>
      </div>
    `;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gallery-grid';

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const card = await createCard(prompt, onCardClick, onFavoriteToggle);
    card.style.animationDelay = `${i * 50}ms`;
    grid.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(grid);
}
