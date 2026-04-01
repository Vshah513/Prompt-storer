// PromptVault — Immersive Full-Page Prompt Viewer

import { getCategoryById, getImage } from '../store.js';
import { formatDateFull, showToast } from '../utils/helpers.js';
import { renderMarkdown } from '../utils/markdown.js';
import { openLightbox } from './lightbox.js';

export async function openViewer(prompt, onEdit, onDelete) {
  const overlay = document.getElementById('viewer-overlay');
  overlay.classList.remove('hidden');

  const cat = await getCategoryById(prompt.category);
  const hasOutput = !!prompt.outputText;
  const hasImages = !!(prompt.imageIds?.length);
  const charCount = (prompt.promptContent || '').length;
  const wordCount = (prompt.promptContent || '').split(/\s+/).filter(Boolean).length;
  const lineCount = (prompt.promptContent || '').split('\n').length;

  // Hide the main app chrome
  document.getElementById('app').style.display = 'none';

  overlay.innerHTML = `
    <div class="fp-viewer" id="fp-viewer">
      <!-- Ambient background -->
      <div class="fp-ambient fp-ambient-1"></div>
      <div class="fp-ambient fp-ambient-2"></div>
      <div class="fp-ambient fp-ambient-3"></div>

      <!-- Fixed top nav -->
      <nav class="fp-nav">
        <button class="fp-back" id="fp-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Back to library</span>
        </button>
        <div class="fp-nav-actions">
          <button class="fp-nav-btn" id="fp-copy" title="Copy prompt">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy
          </button>
          <button class="fp-nav-btn" id="fp-edit" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="fp-nav-btn fp-nav-danger" id="fp-delete" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </nav>

      <!-- Scrollable content -->
      <div class="fp-scroll">
        <!-- Hero section -->
        <header class="fp-hero">
          <div class="fp-hero-meta">
            <span class="fp-badge ${cat.color}">${cat.icon} ${cat.name}</span>
            ${prompt.favorite ? '<span class="fp-badge fp-badge-fav">★ Favorite</span>' : ''}
          </div>
          <h1 class="fp-title">${prompt.title || 'Untitled'}</h1>
          ${prompt.description ? `<p class="fp-subtitle">${prompt.description}</p>` : ''}
          <div class="fp-tags-row">
            ${(prompt.tags || []).map(t => `<span class="fp-tag">#${t}</span>`).join('')}
          </div>
          <div class="fp-date-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>${formatDateFull(prompt.createdAt)}</span>
            ${prompt.updatedAt && prompt.updatedAt !== prompt.createdAt ? `<span class="fp-dot">·</span><span>Updated ${formatDateFull(prompt.updatedAt)}</span>` : ''}
            ${prompt.fileName ? `<span class="fp-dot">·</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><span>${prompt.fileName}</span>` : ''}
          </div>
        </header>

        <!-- Stats ribbon -->
        <div class="fp-stats">
          <div class="fp-stat">
            <div class="fp-stat-val">${wordCount.toLocaleString()}</div>
            <div class="fp-stat-lbl">Words</div>
          </div>
          <div class="fp-stat-sep"></div>
          <div class="fp-stat">
            <div class="fp-stat-val">${charCount.toLocaleString()}</div>
            <div class="fp-stat-lbl">Characters</div>
          </div>
          <div class="fp-stat-sep"></div>
          <div class="fp-stat">
            <div class="fp-stat-val">${lineCount}</div>
            <div class="fp-stat-lbl">Lines</div>
          </div>
          <div class="fp-stat-sep"></div>
          <div class="fp-stat">
            <div class="fp-stat-val">${prompt.imageIds?.length || 0}</div>
            <div class="fp-stat-lbl">Images</div>
          </div>
        </div>

        <!-- Content sections -->
        <div class="fp-sections">

          <!-- Prompt content -->
          <section class="fp-section">
            <div class="fp-section-head">
              <div class="fp-section-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Prompt Content
              </div>
              <button class="fp-section-copy" id="fp-inline-copy">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy
              </button>
            </div>
            <div class="fp-code">
              <div class="fp-line-nums" id="fp-line-nums"></div>
              <pre class="fp-code-text" id="fp-code-text"></pre>
            </div>
          </section>

          <!-- Output -->
          ${hasOutput ? `
          <section class="fp-section">
            <div class="fp-section-head">
              <div class="fp-section-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Output
              </div>
            </div>
            <div class="fp-output">${renderMarkdown(prompt.outputText)}</div>
          </section>
          ` : ''}

          <!-- Images -->
          ${hasImages ? `
          <section class="fp-section">
            <div class="fp-section-head">
              <div class="fp-section-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Images
                <span class="fp-count">${prompt.imageIds.length}</span>
              </div>
            </div>
            <div class="fp-images" id="fp-images"></div>
          </section>
          ` : ''}

        </div>
      </div>
    </div>
  `;

  // Populate line numbers + code
  const codeEl = document.getElementById('fp-code-text');
  const lineNumsEl = document.getElementById('fp-line-nums');
  const lines = (prompt.promptContent || '').split('\n');
  codeEl.textContent = prompt.promptContent || '';
  lineNumsEl.innerHTML = lines.map((_, i) => `<span>${i + 1}</span>`).join('');

  // Load images
  if (hasImages) {
    const grid = document.getElementById('fp-images');
    const allUrls = [];
    for (const imgId of prompt.imageIds) {
      const dataUrl = await getImage(imgId);
      if (dataUrl) {
        allUrls.push(dataUrl);
        const idx = allUrls.length - 1;
        const card = document.createElement('div');
        card.className = 'fp-img-card';
        card.innerHTML = `
          <img src="${dataUrl}" alt="Output image" loading="lazy" />
          <div class="fp-img-hover">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span>View full size</span>
          </div>
        `;
        card.addEventListener('click', () => openLightbox(allUrls, idx));
        grid.appendChild(card);
      }
    }
  }

  // Animate entrance
  requestAnimationFrame(() => {
    document.getElementById('fp-viewer')?.classList.add('open');
  });

  // --- Events ---
  document.getElementById('fp-back').addEventListener('click', closeViewer);

  document.getElementById('fp-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(prompt.promptContent || '').then(() => showToast('Prompt copied!', 'success'));
  });

  document.getElementById('fp-inline-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(prompt.promptContent || '').then(() => {
      const btn = document.getElementById('fp-inline-copy');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
      }, 2000);
      showToast('Prompt copied!', 'success');
    });
  });

  document.getElementById('fp-edit').addEventListener('click', () => {
    closeViewer();
    if (onEdit) onEdit(prompt);
  });

  document.getElementById('fp-delete').addEventListener('click', () => {
    closeViewer();
    if (onDelete) onDelete(prompt);
  });

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
  const viewer = document.getElementById('fp-viewer');
  if (viewer) viewer.classList.remove('open');

  // Show app chrome again
  document.getElementById('app').style.display = '';

  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  }, 250);
}
