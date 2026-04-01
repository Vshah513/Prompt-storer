// PromptVault — Header Component

import { debounce } from '../utils/helpers.js';

let currentViewMode = 'gallery';

export function renderHeader(onSearch, onViewModeChange, onAddClick) {
  const header = document.getElementById('header');

  header.innerHTML = `
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="search-input" placeholder="Search prompts, tags, content…" autocomplete="off" />
    </div>

    <div class="header-actions">
      <div class="view-toggle">
        <button class="view-toggle-btn ${currentViewMode === 'gallery' ? 'active' : ''}" data-mode="gallery" title="Gallery View">
          ⊞
        </button>
        <button class="view-toggle-btn ${currentViewMode === 'table' ? 'active' : ''}" data-mode="table" title="Table View">
          ☰
        </button>
        <button class="view-toggle-btn ${currentViewMode === 'canvas' ? 'active' : ''}" data-mode="canvas" title="Canvas View">
          ◇
        </button>
      </div>
      <button class="btn-primary" id="add-prompt-btn">
        <span>＋</span>
        <span>New Prompt</span>
      </button>
    </div>
  `;

  // Search listener
  const searchInput = document.getElementById('search-input');
  const debouncedSearch = debounce((q) => onSearch(q), 200);
  searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // View toggle
  header.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentViewMode = btn.dataset.mode;
      header.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onViewModeChange(currentViewMode);
    });
  });

  // Add prompt
  document.getElementById('add-prompt-btn')?.addEventListener('click', onAddClick);
}

export function setViewMode(mode) {
  currentViewMode = mode;
}

export function getViewMode() {
  return currentViewMode;
}
