// PromptVault — Full Prompt Viewer (Slide-in Panel)

import { getCategoryById, getImage } from '../store.js';
import { formatDateFull, showToast } from '../utils/helpers.js';
import { renderMarkdown } from '../utils/markdown.js';
import { openLightbox } from './lightbox.js';

export async function openViewer(prompt, onEdit, onDelete) {
  const overlay = document.getElementById('viewer-overlay');
  overlay.classList.remove('hidden');

  const cat = await getCategoryById(prompt.category);

  overlay.innerHTML = `
    <ul class="viewer-backdrop"></ul>
    <div class="viewer-panel">
      <div class="viewer-header">
        <h2>${prompt.title || 'Untitled'}</h2>
        <div class="viewer-header-actions">
          <button class="btn-icon" id="viewer-copy-btn" title="Copy prompt">📋</button>
          <button class="btn-icon" id="viewer-edit-btn" title="Edit">✏️</button>
          <button class="btn-icon" id="viewer-delete-btn" title="Delete">🗑️</button>
          <button class="btn-icon" id="viewer-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="viewer-body">
        <div class="viewer-meta">
          <span class="card-category ${cat.color}">${cat.icon} ${cat.name}</span>
          ${prompt.tags?.map(t => `<span class="card-tag">${t}</span>`).join('') || ''}
        </div>

        ${prompt.description ? `
          <div class="viewer-section">
            <div class="viewer-section-title">Description</div>
            <p style="color: var(--text-secondary); line-height: 1.6;">${prompt.description}</p>
          </div>
        ` : ''}

        <div class="viewer-section">
          <div class="viewer-section-title">Prompt Content</div>
          <div class="viewer-prompt-content">${escapeViewerHtml(prompt.promptContent || '')}</div>
        </div>

        ${prompt.outputText ? `
          <div class="viewer-section">
            <div class="viewer-section-title">Output</div>
            <div class="viewer-output-content">${renderMarkdown(prompt.outputText)}</div>
          </div>
        ` : ''}

        <div class="viewer-section" id="viewer-images-section" style="display:none;">
          <div class="viewer-section-title">Output Images</div>
          <div class="viewer-images" id="viewer-images"></div>
        </div>

        <div class="viewer-section" style="margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
          <p style="font-size: 11px; color: var(--text-muted);">
            Created ${formatDateFull(prompt.createdAt)}
            ${prompt.updatedAt && prompt.updatedAt !== prompt.createdAt ? ` · Updated ${formatDateFull(prompt.updatedAt)}` : ''}
            ${prompt.fileName ? ` · Source: ${prompt.fileName}` : ''}
          </p>
        </div>
      </div>
    </div>
  `;

  // Load images
  if (prompt.imageIds?.length) {
    const section = document.getElementById('viewer-images-section');
    const container = document.getElementById('viewer-images');
    section.style.display = 'block';

    const allImgDataUrls = [];
    for (const imgId of prompt.imageIds) {
      const dataUrl = await getImage(imgId);
      if (dataUrl) {
        allImgDataUrls.push(dataUrl);
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Output image';
        const idx = allImgDataUrls.length - 1;
        img.addEventListener('click', () => openLightbox(allImgDataUrls, idx));
        container.appendChild(img);
      }
    }
  }

  // Events
  document.getElementById('viewer-close-btn').addEventListener('click', closeViewer);
  overlay.querySelector('.viewer-backdrop')?.addEventListener('click', closeViewer);

  document.getElementById('viewer-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(prompt.promptContent || '').then(() => {
      showToast('Prompt copied!', 'success');
    });
  });

  document.getElementById('viewer-edit-btn').addEventListener('click', () => {
    closeViewer();
    if (onEdit) onEdit(prompt);
  });

  document.getElementById('viewer-delete-btn').addEventListener('click', () => {
    closeViewer();
    if (onDelete) onDelete(prompt);
  });

  // Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeViewer();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function closeViewer() {
  const overlay = document.getElementById('viewer-overlay');
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
}

function escapeViewerHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '\n');
}
