// PromptVault — Prompt Card Component

import { getCategoryById, toggleFavorite, getImage } from '../store.js';
import { formatDate, truncate, showToast } from '../utils/helpers.js';

export async function createCard(prompt, onClick, onFavoriteToggle) {
  const cat = await getCategoryById(prompt.category);
  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;

  const previewText = truncate(prompt.promptContent || prompt.description || '', 200);

  card.innerHTML = `
    <div class="card-header">
      <span class="card-category ${cat.color}">${cat.icon} ${cat.name}</span>
      <button class="card-favorite ${prompt.favorite ? 'active' : ''}" data-action="favorite" title="Toggle favorite">
        ${prompt.favorite ? '★' : '☆'}
      </button>
    </div>
    <div class="card-body">
      <div class="card-title">${prompt.title || 'Untitled'}</div>
      ${prompt.description ? `<div class="card-description">${prompt.description}</div>` : ''}
    </div>
    ${previewText ? `<div class="card-prompt-preview">${escapeForHtml(previewText)}</div>` : ''}
    <div class="card-images-container" data-id="${prompt.id}"></div>
    ${prompt.tags?.length ? `
      <div class="card-tags">
        ${prompt.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}
      </div>
    ` : ''}
    <div class="card-footer">
      <span class="card-date">${formatDate(prompt.createdAt)}</span>
      <div class="card-actions">
        <button class="card-action-btn" data-action="copy" title="Copy prompt">📋</button>
        <button class="card-action-btn" data-action="edit" title="Edit">✏️</button>
        <button class="card-action-btn" data-action="delete" title="Delete">🗑️</button>
      </div>
    </div>
  `;

  // Load images asynchronously
  if (prompt.imageIds?.length) {
    loadCardImages(card.querySelector('.card-images-container'), prompt.imageIds);
  }

  // Event delegation
  card.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'favorite') {
      e.stopPropagation();
      const isFav = await toggleFavorite(prompt.id);
      const btn = card.querySelector('.card-favorite');
      btn.textContent = isFav ? '★' : '☆';
      btn.classList.toggle('active', isFav);
      if (onFavoriteToggle) onFavoriteToggle(prompt.id, isFav);
    } else if (action === 'copy') {
      e.stopPropagation();
      navigator.clipboard.writeText(prompt.promptContent || '').then(() => {
        showToast('Prompt copied to clipboard!', 'success');
      });
    } else if (action === 'edit') {
      e.stopPropagation();
      if (onClick) onClick(prompt, 'edit');
    } else if (action === 'delete') {
      e.stopPropagation();
      if (onClick) onClick(prompt, 'delete');
    } else {
      if (onClick) onClick(prompt, 'view');
    }
  });

  return card;
}

async function loadCardImages(container, imageIds) {
  if (!imageIds?.length || !container) return;

  const showIds = imageIds.slice(0, 4);
  const extraCount = imageIds.length - 4;

  const imagesGrid = document.createElement('div');
  imagesGrid.className = `card-images ${showIds.length === 1 ? 'single' : ''}`;

  for (let i = 0; i < showIds.length; i++) {
    if (i === 3 && extraCount > 0) {
      const more = document.createElement('div');
      more.className = 'more-images';
      more.textContent = `+${extraCount + 1}`;
      imagesGrid.appendChild(more);
    } else {
      const dataUrl = await getImage(showIds[i]);
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Output';
        img.loading = 'lazy';
        imagesGrid.appendChild(img);
      }
    }
  }

  container.appendChild(imagesGrid);
}

function escapeForHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
