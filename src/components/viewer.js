// PromptVault — Premium Prompt Viewer (Immersive Full-Screen Experience)

import { getCategoryById, getImage } from '../store.js';
import { formatDateFull, showToast } from '../utils/helpers.js';
import { renderMarkdown } from '../utils/markdown.js';
import { openLightbox } from './lightbox.js';

let activeTab = 'prompt';

export async function openViewer(prompt, onEdit, onDelete) {
  const overlay = document.getElementById('viewer-overlay');
  overlay.classList.remove('hidden');
  activeTab = 'prompt';

  const cat = await getCategoryById(prompt.category);
  const hasOutput = !!prompt.outputText;
  const hasImages = !!(prompt.imageIds?.length);
  const charCount = (prompt.promptContent || '').length;
  const wordCount = (prompt.promptContent || '').split(/\s+/).filter(Boolean).length;
  const lineCount = (prompt.promptContent || '').split('\n').length;

  overlay.innerHTML = `
    <div class="viewer-backdrop" id="viewer-backdrop-el"></div>
    <div class="vw-panel" id="vw-panel">
      <!-- Ambient glow -->
      <div class="vw-ambient"></div>
      <div class="vw-ambient-2"></div>

      <!-- Sticky top bar -->
      <div class="vw-topbar">
        <div class="vw-topbar-left">
          <span class="vw-cat-badge ${cat.color}">${cat.icon} ${cat.name}</span>
          ${prompt.favorite ? '<span class="vw-fav-badge">★ Favorite</span>' : ''}
        </div>
        <div class="vw-topbar-right">
          <button class="vw-action-btn" id="vw-copy-btn" title="Copy prompt content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <span>Copy</span>
          </button>
          <button class="vw-action-btn" id="vw-edit-btn" title="Edit prompt">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Edit</span>
          </button>
          <button class="vw-action-btn vw-action-danger" id="vw-delete-btn" title="Delete prompt">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
          <div class="vw-divider"></div>
          <button class="vw-close-btn" id="vw-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Hero -->
      <div class="vw-hero">
        <h1 class="vw-title">${prompt.title || 'Untitled'}</h1>
        ${prompt.description ? `<p class="vw-description">${prompt.description}</p>` : ''}
        <div class="vw-meta-row">
          ${prompt.tags?.length ? prompt.tags.map(t => `<span class="vw-tag">${t}</span>`).join('') : ''}
          <span class="vw-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${formatDateFull(prompt.createdAt)}
          </span>
          ${prompt.fileName ? `<span class="vw-meta-item">📄 ${prompt.fileName}</span>` : ''}
        </div>
      </div>

      <!-- Stats bar -->
      <div class="vw-stats">
        <div class="vw-stat">
          <span class="vw-stat-value">${wordCount.toLocaleString()}</span>
          <span class="vw-stat-label">Words</span>
        </div>
        <div class="vw-stat">
          <span class="vw-stat-value">${charCount.toLocaleString()}</span>
          <span class="vw-stat-label">Characters</span>
        </div>
        <div class="vw-stat">
          <span class="vw-stat-value">${lineCount}</span>
          <span class="vw-stat-label">Lines</span>
        </div>
        <div class="vw-stat">
          <span class="vw-stat-value">${prompt.imageIds?.length || 0}</span>
          <span class="vw-stat-label">Images</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="vw-tabs">
        <button class="vw-tab active" data-tab="prompt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Prompt
        </button>
        ${hasOutput ? `
        <button class="vw-tab" data-tab="output">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          Output
        </button>
        ` : ''}
        ${hasImages ? `
        <button class="vw-tab" data-tab="images">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Images
        </button>
        ` : ''}
      </div>

      <!-- Tab Content -->
      <div class="vw-content">
        <div class="vw-tab-panel active" id="vw-tab-prompt">
          <div class="vw-code-container">
            <div class="vw-code-toolbar">
              <span class="vw-code-lang">PROMPT</span>
              <button class="vw-code-copy" id="vw-inline-copy">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy
              </button>
            </div>
            <div class="vw-code-body">
              <div class="vw-line-numbers" id="vw-line-numbers"></div>
              <pre class="vw-code-text" id="vw-code-text"></pre>
            </div>
          </div>
        </div>

        ${hasOutput ? `
        <div class="vw-tab-panel" id="vw-tab-output">
          <div class="vw-output-rendered">${renderMarkdown(prompt.outputText)}</div>
        </div>
        ` : ''}

        ${hasImages ? `
        <div class="vw-tab-panel" id="vw-tab-images">
          <div class="vw-image-grid" id="vw-image-grid"></div>
        </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div class="vw-footer">
        ${prompt.updatedAt && prompt.updatedAt !== prompt.createdAt
          ? `<span>Last updated ${formatDateFull(prompt.updatedAt)}</span>`
          : `<span>Created ${formatDateFull(prompt.createdAt)}</span>`
        }
      </div>
    </div>
  `;

  // Populate code block with line numbers
  const codeText = document.getElementById('vw-code-text');
  const lineNums = document.getElementById('vw-line-numbers');
  const lines = (prompt.promptContent || '').split('\n');
  codeText.textContent = prompt.promptContent || '';
  lineNums.innerHTML = lines.map((_, i) => `<span>${i + 1}</span>`).join('');

  // Load images
  if (hasImages) {
    const grid = document.getElementById('vw-image-grid');
    const allUrls = [];
    for (const imgId of prompt.imageIds) {
      const dataUrl = await getImage(imgId);
      if (dataUrl) {
        allUrls.push(dataUrl);
        const wrap = document.createElement('div');
        wrap.className = 'vw-img-card';
        const idx = allUrls.length - 1;
        wrap.innerHTML = `
          <img src="${dataUrl}" alt="Output image" loading="lazy" />
          <div class="vw-img-overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </div>
        `;
        wrap.addEventListener('click', () => openLightbox(allUrls, idx));
        grid.appendChild(wrap);
      }
    }
  }

  // Tab switching
  overlay.querySelectorAll('.vw-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.vw-tab').forEach(t => t.classList.remove('active'));
      overlay.querySelectorAll('.vw-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById(`vw-tab-${target}`)?.classList.add('active');
    });
  });

  // Action buttons
  document.getElementById('vw-close-btn').addEventListener('click', closeViewer);
  document.getElementById('viewer-backdrop-el')?.addEventListener('click', closeViewer);

  document.getElementById('vw-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(prompt.promptContent || '').then(() => {
      showToast('Prompt copied to clipboard!', 'success');
    });
  });

  document.getElementById('vw-inline-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(prompt.promptContent || '').then(() => {
      const btn = document.getElementById('vw-inline-copy');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
      }, 2000);
      showToast('Prompt copied!', 'success');
    });
  });

  document.getElementById('vw-edit-btn').addEventListener('click', () => {
    closeViewer();
    if (onEdit) onEdit(prompt);
  });

  document.getElementById('vw-delete-btn').addEventListener('click', () => {
    closeViewer();
    if (onDelete) onDelete(prompt);
  });

  // Escape to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeViewer();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Animate panel entrance
  requestAnimationFrame(() => {
    const panel = document.getElementById('vw-panel');
    if (panel) panel.classList.add('open');
  });
}

export function closeViewer() {
  const overlay = document.getElementById('viewer-overlay');
  const panel = document.getElementById('vw-panel');
  if (panel) panel.classList.remove('open');
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  }, 280);
}
