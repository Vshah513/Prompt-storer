// PromptVault — Main Entry Point

import './style.css';
import { getPrompts, deletePrompt as storeDeletePrompt } from './store.js';
import { searchPrompts, filterByCategory } from './utils/search.js';
import { showToast } from './utils/helpers.js';
import { renderSidebar, setActiveCategory, setActiveView, getActiveCategory, getActiveView } from './components/sidebar.js';
import { renderHeader, setViewMode, getViewMode } from './components/header.js';
import { renderDashboard } from './components/dashboard.js';
import { renderGallery } from './components/gallery.js';
import { renderTable } from './components/table.js';
import { renderCanvas } from './components/canvas.js';
import { openModal } from './components/modal.js';
import { openViewer } from './components/viewer.js';

let currentQuery = '';

function init() {
  renderSidebar(handleCategoryChange, handleViewChange);
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
  renderCurrentView();
}

function renderCurrentView() {
  const container = document.getElementById('view-container');
  const view = getActiveView();
  const viewMode = getViewMode();

  // Reset container styles for canvas
  container.style.padding = '24px';
  container.style.overflow = 'auto';
  container.style.position = 'relative';

  if (view === 'dashboard') {
    renderDashboard(container, handleDashboardNav, handleAddPrompt);
    return;
  }

  // Get filtered prompts
  let prompts = getPrompts();
  const category = getActiveCategory();
  prompts = filterByCategory(prompts, category);
  if (currentQuery) {
    prompts = searchPrompts(currentQuery, prompts);
  }

  switch (viewMode) {
    case 'gallery':
      renderGallery(container, prompts, handleCardAction, handleFavoriteToggle);
      break;
    case 'table':
      renderTable(container, prompts, handleCardAction);
      break;
    case 'canvas':
      container.style.padding = '0';
      container.style.overflow = 'hidden';
      renderCanvas(container, prompts, handleCardAction);
      break;
    default:
      renderGallery(container, prompts, handleCardAction, handleFavoriteToggle);
  }
}

function handleSearch(query) {
  currentQuery = query;
  if (getActiveView() === 'dashboard' && query) {
    setActiveView('prompts');
    setViewMode('gallery');
  }
  renderCurrentView();
}

function handleCategoryChange(category) {
  setActiveCategory(category);
  setActiveView('prompts');
  renderCurrentView();
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
}

function handleViewChange(view) {
  setActiveView(view);
  renderCurrentView();
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
}

function handleViewModeChange(mode) {
  setViewMode(mode);
  renderCurrentView();
}

function handleAddPrompt() {
  openModal(null, () => {
    renderCurrentView();
    renderSidebar(handleCategoryChange, handleViewChange);
  });
}

function handleCardAction(prompt, action) {
  switch (action) {
    case 'view':
      openViewer(
        prompt,
        (p) => handleEditPrompt(p),
        (p) => handleDeletePrompt(p)
      );
      break;
    case 'edit':
      handleEditPrompt(prompt);
      break;
    case 'delete':
      handleDeletePrompt(prompt);
      break;
  }
}

function handleEditPrompt(prompt) {
  openModal(prompt, () => {
    renderCurrentView();
    renderSidebar(handleCategoryChange, handleViewChange);
  });
}

async function handleDeletePrompt(prompt) {
  if (!confirm(`Delete "${prompt.title || 'Untitled'}"? This cannot be undone.`)) return;
  await storeDeletePrompt(prompt.id);
  showToast('Prompt deleted', 'info');
  renderCurrentView();
  renderSidebar(handleCategoryChange, handleViewChange);
}

function handleFavoriteToggle() {
  renderSidebar(handleCategoryChange, handleViewChange);
}

function handleDashboardNav(target, prompt) {
  if (target === 'view' && prompt) {
    openViewer(
      prompt,
      (p) => handleEditPrompt(p),
      (p) => handleDeletePrompt(p)
    );
    return;
  }
  setActiveCategory(target);
  setActiveView('prompts');
  setViewMode('gallery');
  renderCurrentView();
  renderSidebar(handleCategoryChange, handleViewChange);
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Also handle paste on the global app for convenience
document.addEventListener('paste', (e) => {
  // Only handle if modal is open (handled by modal.js)
});
