// PromptVault — Table View (Notion-style)

import { getCategories } from '../store.js';
import { formatDate, showToast } from '../utils/helpers.js';

let sortField = 'createdAt';
let sortDir = 'desc';

export async function renderTable(container, prompts, onRowClick) {
  if (!prompts.length) {
    container.innerHTML = `
      <div class="gallery-empty">
        <div class="empty-icon">📭</div>
        <h3>No prompts found</h3>
        <p>Create your first prompt or adjust your search filters.</p>
      </div>
    `;
    return;
  }

  const categories = await getCategories();

  // Sort
  const sorted = [...prompts].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  container.innerHTML = `
    <div class="table-container">
      <table class="prompt-table">
        <thead>
          <tr>
            <th data-sort="title">Title <span class="sort-arrow">${sortField === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span></th>
            <th data-sort="category">Category <span class="sort-arrow">${sortField === 'category' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span></th>
            <th>Tags</th>
            <th data-sort="createdAt">Created <span class="sort-arrow">${sortField === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span></th>
            <th>Images</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(p => {
            const cat = categories.find(c => c.id === p.category) || { id: p.category, name: p.category, icon: '📁', color: 'cat-default' };
            return `
              <tr data-id="${p.id}">
                <td>
                  <span class="table-title">${p.favorite ? '⭐ ' : ''}${p.title || 'Untitled'}</span>
                </td>
                <td>
                  <span class="table-category ${cat.color}">${cat.icon} ${cat.name}</span>
                </td>
                <td>
                  <div class="table-tags">
                    ${(p.tags || []).slice(0, 3).map(t => `<span class="card-tag">${t}</span>`).join('')}
                    ${(p.tags || []).length > 3 ? `<span class="card-tag">+${p.tags.length - 3}</span>` : ''}
                  </div>
                </td>
                <td><span class="table-date">${formatDate(p.createdAt)}</span></td>
                <td style="color: var(--text-muted); font-size: 12px;">${p.imageIds?.length || 0} 🖼️</td>
                <td>
                  <div class="card-actions">
                    <button class="card-action-btn" data-action="copy" data-id="${p.id}" title="Copy">📋</button>
                    <button class="card-action-btn" data-action="delete" data-id="${p.id}" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Sort headers
  container.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', async () => {
      const field = th.dataset.sort;
      if (sortField === field) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDir = field === 'createdAt' ? 'desc' : 'asc';
      }
      await renderTable(container, prompts, onRowClick);
    });
  });

  // Row clicks
  container.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      const id = row.dataset.id;
      const prompt = prompts.find(p => p.id === id);
      if (!prompt) return;

      if (action === 'copy') {
        e.stopPropagation();
        navigator.clipboard.writeText(prompt.promptContent || '').then(() => {
          showToast('Prompt copied!', 'success');
        });
      } else if (action === 'delete') {
        e.stopPropagation();
        onRowClick(prompt, 'delete');
      } else {
        onRowClick(prompt, 'view');
      }
    });
  });
}
