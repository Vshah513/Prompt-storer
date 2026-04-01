// PromptVault — Sidebar Component

import { getCategories, getPrompts, addCategory } from '../store.js';
import { generateId, showToast } from '../utils/helpers.js';

let activeCategory = 'all';
let activeView = 'dashboard';

export async function renderSidebar(onCategoryChange, onViewChange) {
  const sidebar = document.getElementById('sidebar');
  const categories = await getCategories();
  const prompts = await getPrompts();

  const countByCategory = {};
  prompts.forEach(p => {
    countByCategory[p.category] = (countByCategory[p.category] || 0) + 1;
  });
  const favCount = prompts.filter(p => p.favorite).length;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">⚡</div>
      <span class="logo-text">PromptVault</span>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Navigation</div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
        <span class="item-icon">🏠</span>
        <span>Dashboard</span>
      </div>
      <div class="sidebar-item ${activeCategory === 'all' && activeView !== 'dashboard' ? 'active' : ''}" data-category="all">
        <span class="item-icon">📚</span>
        <span>All Prompts</span>
        <span class="item-count">${prompts.length}</span>
      </div>
      <div class="sidebar-item ${activeCategory === 'favorites' ? 'active' : ''}" data-category="favorites">
        <span class="item-icon">⭐</span>
        <span>Favorites</span>
        ${favCount ? `<span class="item-count">${favCount}</span>` : ''}
      </div>

      <div class="sidebar-section" style="padding: 16px 0 8px;">
        <div class="sidebar-section-title">Categories</div>
      </div>

      ${categories.map(cat => `
        <div class="sidebar-item ${activeCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
          <span class="item-icon">${cat.icon}</span>
          <span>${cat.name}</span>
          ${countByCategory[cat.id] ? `<span class="item-count">${countByCategory[cat.id]}</span>` : ''}
        </div>
      `).join('')}

      <div class="sidebar-add-category" id="add-category-btn">
        <span class="item-icon">＋</span>
        <span>Add Category</span>
      </div>
    </nav>

    <div class="sidebar-bottom">
      <div class="sidebar-item" id="export-btn">
        <span class="item-icon">📤</span>
        <span>Export Data</span>
      </div>
      <div class="sidebar-item" id="import-btn">
        <span class="item-icon">📥</span>
        <span>Import Data</span>
      </div>
    </div>
  `;

  // Event listeners
  sidebar.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', async () => {
      activeView = el.dataset.view;
      activeCategory = 'all';
      await onViewChange(activeView);
      renderSidebar(onCategoryChange, onViewChange);
    });
  });

  sidebar.querySelectorAll('[data-category]').forEach(el => {
    el.addEventListener('click', async () => {
      activeCategory = el.dataset.category;
      activeView = 'prompts';
      await onCategoryChange(activeCategory);
      renderSidebar(onCategoryChange, onViewChange);
    });
  });

  document.getElementById('add-category-btn')?.addEventListener('click', async () => {
    const name = prompt('Category name:');
    if (!name?.trim()) return;
    const icon = prompt('Emoji icon (e.g. 🔧):') || '📁';
    await addCategory({
      id: generateId(),
      name: name.trim(),
      icon,
      color: 'cat-default'
    });
    showToast(`Category "${name.trim()}" created`, 'success');
    renderSidebar(onCategoryChange, onViewChange);
  });

  document.getElementById('export-btn')?.addEventListener('click', () => {
    showToast('Export functionality is being updated for Supabase…', 'info');
  });

  document.getElementById('import-btn')?.addEventListener('click', () => {
    showToast('Import functionality is being updated for Supabase…', 'info');
  });
}

export function setActiveCategory(cat) { activeCategory = cat; }
export function setActiveView(view) { activeView = view; }
export function getActiveCategory() { return activeCategory; }
export function getActiveView() { return activeView; }
