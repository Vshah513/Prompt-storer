// PromptVault — Canvas View (FigJam-style Infinite Canvas)

import { getCanvasPositions, saveCanvasPosition, getCategoryById } from '../store.js';
import { truncate } from '../utils/helpers.js';

let panX = 0, panY = 0, zoom = 1;
let isPanning = false, startPanX = 0, startPanY = 0;
let dragCard = null, dragOffX = 0, dragOffY = 0;
let surface = null;

export function renderCanvas(container, prompts, onCardClick) {
  container.style.padding = '0';
  container.style.overflow = 'hidden';

  const positions = getCanvasPositions();

  container.innerHTML = `
    <div class="canvas-container" id="canvas-container">
      <div class="canvas-surface" id="canvas-surface"></div>
    </div>
    <div class="canvas-controls">
      <button id="canvas-zoom-in" title="Zoom in">＋</button>
      <span class="canvas-zoom-level" id="canvas-zoom-label">${Math.round(zoom * 100)}%</span>
      <button id="canvas-zoom-out" title="Zoom out">－</button>
      <button id="canvas-fit" title="Fit to view">⊡</button>
      <button id="canvas-reset" title="Reset view">↻</button>
    </div>
  `;

  surface = document.getElementById('canvas-surface');
  const canvasContainer = document.getElementById('canvas-container');

  // Create cards on canvas
  prompts.forEach((prompt, i) => {
    const cat = getCategoryById(prompt.category);
    const pos = positions[prompt.id] || { x: 100 + (i % 5) * 320, y: 100 + Math.floor(i / 5) * 250 };

    const card = document.createElement('div');
    card.className = 'canvas-card';
    card.dataset.id = prompt.id;
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;

    card.innerHTML = `
      <div class="cc-category">${cat.icon} ${cat.name}</div>
      <div class="cc-title">${prompt.title || 'Untitled'}</div>
      <div class="cc-preview">${truncate(prompt.promptContent || prompt.description || '', 120).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      ${prompt.tags?.length ? `
        <div class="card-tags" style="margin-top: 8px;">
          ${prompt.tags.slice(0, 3).map(t => `<span class="card-tag">${t}</span>`).join('')}
        </div>
      ` : ''}
    `;

    // Card drag
    card.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      dragCard = card;
      dragOffX = e.clientX - card.getBoundingClientRect().left;
      dragOffY = e.clientY - card.getBoundingClientRect().top;
      card.classList.add('dragging');
      card.style.zIndex = 1000;
    });

    // Card double-click to view
    card.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (onCardClick) onCardClick(prompt, 'view');
    });

    surface.appendChild(card);

    // Save initial position if not saved
    if (!positions[prompt.id]) {
      saveCanvasPosition(prompt.id, pos.x, pos.y);
    }
  });

  // Apply initial transform
  updateTransform();

  // Panning
  canvasContainer.addEventListener('mousedown', (e) => {
    if (dragCard) return;
    if (e.button !== 0) return;
    isPanning = true;
    startPanX = e.clientX - panX;
    startPanY = e.clientY - panY;
    canvasContainer.classList.add('grabbing');
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
      updateTransform();
    }
    if (dragCard) {
      const surfaceRect = surface.getBoundingClientRect();
      const x = (e.clientX - surfaceRect.left) / zoom - dragOffX / zoom;
      const y = (e.clientY - surfaceRect.top) / zoom - dragOffY / zoom;
      dragCard.style.left = `${Math.max(0, x)}px`;
      dragCard.style.top = `${Math.max(0, y)}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      canvasContainer.classList.remove('grabbing');
    }
    if (dragCard) {
      dragCard.classList.remove('dragging');
      dragCard.style.zIndex = '';
      // Save position
      const x = parseInt(dragCard.style.left);
      const y = parseInt(dragCard.style.top);
      saveCanvasPosition(dragCard.dataset.id, x, y);
      dragCard = null;
    }
  });

  // Zoom with scroll
  canvasContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoom = Math.max(0.2, Math.min(3, zoom + delta));
    updateTransform();
    document.getElementById('canvas-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  }, { passive: false });

  // Controls
  document.getElementById('canvas-zoom-in')?.addEventListener('click', () => {
    zoom = Math.min(3, zoom + 0.15);
    updateTransform();
    document.getElementById('canvas-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  });
  document.getElementById('canvas-zoom-out')?.addEventListener('click', () => {
    zoom = Math.max(0.2, zoom - 0.15);
    updateTransform();
    document.getElementById('canvas-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  });
  document.getElementById('canvas-fit')?.addEventListener('click', () => fitToView(prompts));
  document.getElementById('canvas-reset')?.addEventListener('click', () => {
    panX = 0; panY = 0; zoom = 1;
    updateTransform();
    document.getElementById('canvas-zoom-label').textContent = '100%';
  });
}

function updateTransform() {
  if (surface) {
    surface.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
}

function fitToView(prompts) {
  const positions = getCanvasPositions();
  if (!prompts.length) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  prompts.forEach(p => {
    const pos = positions[p.id] || { x: 0, y: 0 };
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + 280);
    maxY = Math.max(maxY, pos.y + 200);
  });

  const container = document.getElementById('canvas-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const contentW = maxX - minX + 100;
  const contentH = maxY - minY + 100;

  zoom = Math.min(1.5, Math.min(rect.width / contentW, rect.height / contentH));
  panX = (rect.width - contentW * zoom) / 2 - minX * zoom + 50;
  panY = (rect.height - contentH * zoom) / 2 - minY * zoom + 50;

  updateTransform();
  document.getElementById('canvas-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
}

export function resetCanvasView() {
  panX = 0; panY = 0; zoom = 1;
}
