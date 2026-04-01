// PromptVault — Dashboard View

import { getPrompts, getCategories } from '../store.js';

export async function renderDashboard(container, onNavigate, onAddClick) {
  const prompts = await getPrompts();
  const categories = await getCategories();

  const countByCategory = {};
  categories.forEach(c => { countByCategory[c.id] = 0; });
  prompts.forEach(p => {
    countByCategory[p.category] = (countByCategory[p.category] || 0) + 1;
  });
  const favCount = prompts.filter(p => p.favorite).length;
  const recentPrompts = prompts.slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  container.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-greeting">
        <h1>${greeting} ⚡</h1>
        <p>Your prompt library at a glance</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${prompts.length}</div>
          <div class="stat-label">Total Prompts</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-value">${categories.length}</div>
          <div class="stat-label">Categories</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-value">${favCount}</div>
          <div class="stat-label">Favorites</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🖼️</div>
          <div class="stat-value">${prompts.reduce((sum, p) => sum + (p.imageIds?.length || 0), 0)}</div>
          <div class="stat-label">Images</div>
        </div>
      </div>

      ${prompts.length === 0 ? `
        <div class="quick-add-area" id="dash-quick-add">
          <div class="qa-icon">✨</div>
          <div class="qa-text">Create your first prompt to get started</div>
        </div>
      ` : `
        <div class="dashboard-section">
          <div class="dashboard-section-header">
            <h2>📊 Categories Overview</h2>
          </div>
          <div class="stats-grid">
            ${categories.map(cat => `
              <div class="stat-card cat-nav-card" data-cat="${cat.id}" style="cursor:pointer;">
                <div class="stat-icon">${cat.icon}</div>
                <div class="stat-value" style="font-size: 24px;">${countByCategory[cat.id] || 0}</div>
                <div class="stat-label">${cat.name}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="dashboard-section">
          <div class="dashboard-section-header">
            <h2>🕐 Recently Added</h2>
            <span class="see-all" id="dash-see-all">View all →</span>
          </div>
          <div class="gallery-grid" style="columns: 3;">
            ${recentPrompts.map(p => {
              const cat = categories.find(c => c.id === p.category) || { icon: '📁', name: p.category, color: 'cat-default' };
              return `
                <div class="prompt-card" data-id="${p.id}" style="cursor:pointer;">
                  <div class="card-header">
                    <span class="card-category ${cat.color}">${cat.icon} ${cat.name}</span>
                  </div>
                  <div class="card-body">
                    <div class="card-title">${p.title || 'Untitled'}</div>
                    ${p.description ? `<div class="card-description">${p.description}</div>` : ''}
                  </div>
                  ${p.tags?.length ? `
                    <div class="card-tags">
                      ${p.tags.slice(0, 3).map(t => `<span class="card-tag">${t}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="quick-add-area" id="dash-quick-add" style="margin-top: 16px;">
          <div class="qa-icon">＋</div>
          <div class="qa-text">Add another prompt</div>
        </div>
      `}
    </div>
  `;

  // Event listeners
  document.getElementById('dash-quick-add')?.addEventListener('click', onAddClick);
  document.getElementById('dash-see-all')?.addEventListener('click', () => onNavigate('all'));

  container.querySelectorAll('.cat-nav-card').forEach(el => {
    el.addEventListener('click', () => onNavigate(el.dataset.cat));
  });

  container.querySelectorAll('.prompt-card[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      const prompt = prompts.find(p => p.id === el.dataset.id);
      if (prompt) onNavigate('view', prompt);
    });
  });
}
