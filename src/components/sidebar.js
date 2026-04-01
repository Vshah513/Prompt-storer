// PromptVault — Sidebar Component

import { getCategories, getPrompts, addCategory } from '../store.js';
import { generateId, showToast } from '../utils/helpers.js';

let activeCategory = 'all';
let activeView = 'dashboard';

export function renderSidebar(onCategoryChange, onViewChange) {
  const sidebar = document.getElementById('sidebar');
  const categories = getCategories();
  const prompts = getPrompts();

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
    el.addEventListener('click', () => {
      activeView = el.dataset.view;
      activeCategory = 'all';
      onViewChange(activeView);
      renderSidebar(onCategoryChange, onViewChange);
    });
  });

  sidebar.querySelectorAll('[data-category]').forEach(el => {
    el.addEventListener('click', () => {
      activeCategory = el.dataset.category;
      activeView = 'prompts';
      onCategoryChange(activeCategory);
      renderSidebar(onCategoryChange, onViewChange);
    });
  });

  document.getElementById('add-category-btn')?.addEventListener('click', () => {
    const name = prompt('Category name:');
    if (!name?.trim()) return;
    const icon = prompt('Emoji icon (e.g. 🔧):') || '📁';
    addCategory({
      id: generateId(),
      name: name.trim(),
      icon,
      color: 'cat-default'
    });
    showToast(`Category "${name.trim()}" created`, 'success');
    renderSidebar(onCategoryChange, onViewChange);
  });

  document.getElementById('export-btn')?.addEventListener('click', () => {
    exportData();
  });

  document.getElementById('import-btn')?.addEventListener('click', () => {
    importData();
  });
}

export function setActiveCategory(cat) { activeCategory = cat; }
export function setActiveView(view) { activeView = view; }
export function getActiveCategory() { return activeCategory; }
export function getActiveView() { return activeView; }

function exportData() {
  const data = {
    prompts: JSON.parse(localStorage.getItem('pv_prompts') || '[]'),
    categories: JSON.parse(localStorage.getItem('pv_categories') || '[]'),
    canvas: JSON.parse(localStorage.getItem('pv_canvas_positions') || '{}'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `promptvault-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully', 'success');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.prompts) localStorage.setItem('pv_prompts', JSON.stringify(data.prompts));
        if (data.categories) localStorage.setItem('pv_categories', JSON.stringify(data.categories));
        if (data.canvas) localStorage.setItem('pv_canvas_positions', JSON.stringify(data.canvas));
        showToast('Data imported! Refreshing…', 'success');
        setTimeout(() => location.reload(), 1000);
      } catch {
        showToast('Invalid file format', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
