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

async function init() {
  await renderSidebar(handleCategoryChange, handleViewChange);
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
  await renderCurrentView();
}

async function renderCurrentView() {
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
  let prompts = await getPrompts();
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

async function handleSearch(query) {
  currentQuery = query;
  if (getActiveView() === 'dashboard' && query) {
    setActiveView('prompts');
    setViewMode('gallery');
  }
  await renderCurrentView();
}

async function handleCategoryChange(category) {
  setActiveCategory(category);
  setActiveView('prompts');
  await renderCurrentView();
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
}

async function handleViewChange(view) {
  setActiveView(view);
  await renderCurrentView();
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
}

async function handleViewModeChange(mode) {
  setViewMode(mode);
  await renderCurrentView();
}

async function handleAddPrompt() {
  openModal(null, async () => {
    await renderCurrentView();
    await renderSidebar(handleCategoryChange, handleViewChange);
  });
}

async function handleCardAction(prompt, action) {
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

async function handleEditPrompt(prompt) {
  openModal(prompt, async () => {
    await renderCurrentView();
    await renderSidebar(handleCategoryChange, handleViewChange);
  });
}

async function handleDeletePrompt(prompt) {
  if (!confirm(`Delete "${prompt.title || 'Untitled'}"? This cannot be undone.`)) return;
  await storeDeletePrompt(prompt.id);
  showToast('Prompt deleted', 'info');
  await renderCurrentView();
  await renderSidebar(handleCategoryChange, handleViewChange);
}

async function handleFavoriteToggle() {
  await renderSidebar(handleCategoryChange, handleViewChange);
}

async function handleDashboardNav(target, prompt) {
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
  await renderCurrentView();
  await renderSidebar(handleCategoryChange, handleViewChange);
  renderHeader(handleSearch, handleViewModeChange, handleAddPrompt);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Also handle paste on the global app for convenience
document.addEventListener('paste', (e) => {
  // Only handle if modal is open (handled by modal.js)
});
