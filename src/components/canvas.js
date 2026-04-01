// PromptVault — Canvas View (FigJam-style Board with Annotations, Arrows, and Text)

import { getCanvasPositions, saveCanvasPosition, saveAllCanvasPositions, getCategoryById, getImage } from '../store.js';
import { truncate, generateId, showToast } from '../utils/helpers.js';

let panX = 0, panY = 0, zoom = 1;
let isPanning = false, startPanX = 0, startPanY = 0;
let dragItem = null, dragOffX = 0, dragOffY = 0;
let surface = null;
let svgLayer = null;
let activeTool = 'select'; // select | arrow | text | sticky
let arrowState = null; // { startEl, startX, startY }
let annotations = []; // { id, type, data }
let mouseListeners = [];

export async function renderCanvas(container, prompts, onCardClick) {
  cleanup();
  container.style.padding = '0';
  container.style.overflow = 'hidden';

  const positions = await getCanvasPositions();

  container.innerHTML = `
    <div class="cv-container" id="cv-container">
      <svg class="cv-svg-layer" id="cv-svg-layer"></svg>
      <div class="cv-surface" id="cv-surface"></div>
    </div>
    <div class="cv-toolbar" id="cv-toolbar">
      <button class="cv-tool active" data-tool="select" title="Select & Move">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51z"/></svg>
      </button>
      <button class="cv-tool" data-tool="arrow" title="Draw Arrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
      <button class="cv-tool" data-tool="text" title="Add Text Note">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>
      </button>
      <button class="cv-tool" data-tool="sticky" title="Add Sticky Note">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8.5L15.5 3z"/><polyline points="14 3 14 8 21 8"/></svg>
      </button>
      <div class="cv-tool-divider"></div>
      <button class="cv-tool" id="cv-zoom-in" title="Zoom In">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <span class="cv-zoom-label" id="cv-zoom-label">${Math.round(zoom * 100)}%</span>
      <button class="cv-tool" id="cv-zoom-out" title="Zoom Out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <button class="cv-tool" id="cv-fit" title="Fit to View">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
      </button>
      <button class="cv-tool" id="cv-reset" title="Reset View">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
      </button>
      <div class="cv-tool-divider"></div>
      <button class="cv-tool cv-tool-danger" id="cv-clear-annotations" title="Clear Annotations">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
    </div>
  `;

  surface = document.getElementById('cv-surface');
  svgLayer = document.getElementById('cv-svg-layer');
  const cvContainer = document.getElementById('cv-container');

  // Create prompt cards
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const cat = await getCategoryById(prompt.category);
    const pos = positions[prompt.id] || { x: 80 + (i % 4) * 380, y: 80 + Math.floor(i / 4) * 340 };

    const card = document.createElement('div');
    card.className = 'cv-card';
    card.dataset.id = prompt.id;
    card.dataset.type = 'prompt';
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;

    // Build image preview HTML
    let imageHtml = '';
    if (prompt.imageIds?.length) {
      const previewIds = prompt.imageIds.slice(0, 2);
      const imgs = [];
      for (const imgId of previewIds) {
        const url = await getImage(imgId);
        if (url) imgs.push(url);
      }
      if (imgs.length) {
        imageHtml = `
          <div class="cv-card-images">
            ${imgs.map(u => `<img src="${u}" alt="Output" loading="lazy" />`).join('')}
            ${prompt.imageIds.length > 2 ? `<div class="cv-card-images-more">+${prompt.imageIds.length - 2}</div>` : ''}
          </div>
        `;
      }
    }

    const previewText = truncate(prompt.promptContent || prompt.description || '', 150);
    card.innerHTML = `
      <div class="cv-card-header">
        <span class="cv-card-cat ${cat.color}">${cat.icon} ${cat.name}</span>
        ${prompt.favorite ? '<span class="cv-card-fav">★</span>' : ''}
      </div>
      <div class="cv-card-title">${prompt.title || 'Untitled'}</div>
      <div class="cv-card-preview">${previewText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      ${imageHtml}
      ${prompt.tags?.length ? `
        <div class="cv-card-tags">
          ${prompt.tags.slice(0, 4).map(t => `<span class="cv-card-tag">${t}</span>`).join('')}
        </div>
      ` : ''}
      <div class="cv-card-footer">
        <span class="cv-card-stat">${(prompt.promptContent || '').split(/\s+/).filter(Boolean).length} words</span>
        ${prompt.imageIds?.length ? `<span class="cv-card-stat">🖼 ${prompt.imageIds.length}</span>` : ''}
      </div>
    `;

    // Card drag
    card.addEventListener('mousedown', (e) => {
      if (activeTool === 'arrow') {
        e.stopPropagation();
        startArrow(card, e);
        return;
      }
      if (activeTool !== 'select') return;
      if (e.button !== 0) return;
      e.stopPropagation();
      startDrag(card, e);
    });

    // Card double-click to view
    card.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (onCardClick) onCardClick(prompt, 'view');
    });

    surface.appendChild(card);

    if (!positions[prompt.id]) {
      await saveCanvasPosition(prompt.id, pos.x, pos.y);
    }
  }

  updateTransform();

  // Panning
  const onMouseDown = (e) => {
    if (activeTool === 'text' && e.target === surface) {
      e.preventDefault();
      addTextNote(e);
      return;
    }
    if (activeTool === 'sticky' && e.target === surface) {
      e.preventDefault();
      addStickyNote(e);
      return;
    }
    if (dragItem || activeTool === 'arrow') return;
    if (e.button !== 0) return;
    isPanning = true;
    startPanX = e.clientX - panX;
    startPanY = e.clientY - panY;
    cvContainer.classList.add('grabbing');
  };

  const onMouseMove = (e) => {
    if (isPanning) {
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
      updateTransform();
    }
    if (dragItem) {
      const surfaceRect = surface.getBoundingClientRect();
      const x = (e.clientX - surfaceRect.left) / zoom - dragOffX / zoom;
      const y = (e.clientY - surfaceRect.top) / zoom - dragOffY / zoom;
      dragItem.style.left = `${Math.max(0, x)}px`;
      dragItem.style.top = `${Math.max(0, y)}px`;
      updateArrows();
    }
    if (arrowState) {
      updateTempArrow(e);
    }
  };

  const onMouseUp = async () => {
    if (isPanning) {
      isPanning = false;
      cvContainer.classList.remove('grabbing');
    }
    if (dragItem) {
      dragItem.classList.remove('dragging');
      dragItem.style.zIndex = '';
      const x = parseInt(dragItem.style.left);
      const y = parseInt(dragItem.style.top);
      if (dragItem.dataset.type === 'prompt') {
        await saveCanvasPosition(dragItem.dataset.id, x, y);
      }
      dragItem = null;
    }
  };

  cvContainer.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  mouseListeners.push(
    { target: cvContainer, event: 'mousedown', handler: onMouseDown },
    { target: document, event: 'mousemove', handler: onMouseMove },
    { target: document, event: 'mouseup', handler: onMouseUp }
  );

  // Zoom with scroll
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    zoom = Math.max(0.15, Math.min(3, zoom + delta));
    updateTransform();
    document.getElementById('cv-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  };
  cvContainer.addEventListener('wheel', onWheel, { passive: false });
  mouseListeners.push({ target: cvContainer, event: 'wheel', handler: onWheel });

  // Toolbar tools
  document.querySelectorAll('.cv-tool[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      document.querySelectorAll('.cv-tool[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cvContainer.style.cursor = activeTool === 'select' ? 'grab'
        : activeTool === 'arrow' ? 'crosshair'
        : activeTool === 'text' ? 'text'
        : 'crosshair';
    });
  });

  // Zoom controls
  document.getElementById('cv-zoom-in')?.addEventListener('click', () => {
    zoom = Math.min(3, zoom + 0.15);
    updateTransform();
    document.getElementById('cv-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  });
  document.getElementById('cv-zoom-out')?.addEventListener('click', () => {
    zoom = Math.max(0.15, zoom - 0.15);
    updateTransform();
    document.getElementById('cv-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  });
  document.getElementById('cv-fit')?.addEventListener('click', async () => await fitToView(prompts));
  document.getElementById('cv-reset')?.addEventListener('click', () => {
    panX = 0; panY = 0; zoom = 1;
    updateTransform();
    document.getElementById('cv-zoom-label').textContent = '100%';
  });
  document.getElementById('cv-clear-annotations')?.addEventListener('click', () => {
    annotations = [];
    surface.querySelectorAll('.cv-annotation').forEach(el => el.remove());
    svgLayer.innerHTML = '';
    showToast('Annotations cleared', 'info');
  });
}

function startDrag(el, e) {
  dragItem = el;
  dragOffX = e.clientX - el.getBoundingClientRect().left;
  dragOffY = e.clientY - el.getBoundingClientRect().top;
  el.classList.add('dragging');
  el.style.zIndex = 1000;
}

function startArrow(fromEl, e) {
  const rect = fromEl.getBoundingClientRect();
  arrowState = {
    fromEl,
    startX: rect.left + rect.width / 2,
    startY: rect.top + rect.height / 2
  };
  // Create temp arrow SVG
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('id', 'cv-temp-arrow');
  line.setAttribute('class', 'cv-arrow-temp');
  line.setAttribute('marker-end', 'url(#cv-arrowhead)');
  ensureArrowHead();
  svgLayer.appendChild(line);

  const onUp = (e) => {
    document.removeEventListener('mouseup', onUp);
    const tempLine = document.getElementById('cv-temp-arrow');
    if (tempLine) tempLine.remove();

    // Find target card under cursor
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cv-card');
    if (target && target !== arrowState.fromEl) {
      addArrow(arrowState.fromEl, target);
    }
    arrowState = null;
  };
  document.addEventListener('mouseup', onUp);
}

function updateTempArrow(e) {
  const line = document.getElementById('cv-temp-arrow');
  if (!line || !arrowState) return;
  const svgRect = svgLayer.getBoundingClientRect();
  const fromRect = arrowState.fromEl.getBoundingClientRect();
  line.setAttribute('x1', fromRect.left + fromRect.width / 2 - svgRect.left);
  line.setAttribute('y1', fromRect.top + fromRect.height / 2 - svgRect.top);
  line.setAttribute('x2', e.clientX - svgRect.left);
  line.setAttribute('y2', e.clientY - svgRect.top);
}

function ensureArrowHead() {
  if (svgLayer.querySelector('#cv-arrowhead')) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="cv-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="rgba(124,58,237,0.8)" />
    </marker>
  `;
  svgLayer.appendChild(defs);
}

function addArrow(fromEl, toEl) {
  const id = generateId();
  annotations.push({ id, type: 'arrow', from: fromEl.dataset.id || id, to: toEl.dataset.id || id });
  ensureArrowHead();

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('class', 'cv-arrow');
  line.setAttribute('data-arrow-id', id);
  line.setAttribute('data-from', fromEl.dataset.id || '');
  line.setAttribute('data-to', toEl.dataset.id || '');
  line.setAttribute('marker-end', 'url(#cv-arrowhead)');
  svgLayer.appendChild(line);
  updateArrows();
}

function updateArrows() {
  if (!svgLayer) return;
  const svgRect = svgLayer.getBoundingClientRect();
  svgLayer.querySelectorAll('.cv-arrow').forEach(line => {
    const fromId = line.getAttribute('data-from');
    const toId = line.getAttribute('data-to');
    const fromEl = surface.querySelector(`[data-id="${fromId}"]`);
    const toEl = surface.querySelector(`[data-id="${toId}"]`);
    if (fromEl && toEl) {
      const fRect = fromEl.getBoundingClientRect();
      const tRect = toEl.getBoundingClientRect();
      line.setAttribute('x1', fRect.left + fRect.width / 2 - svgRect.left);
      line.setAttribute('y1', fRect.top + fRect.height / 2 - svgRect.top);
      line.setAttribute('x2', tRect.left + tRect.width / 2 - svgRect.left);
      line.setAttribute('y2', tRect.top + tRect.height / 2 - svgRect.top);
    }
  });
}

function addTextNote(e) {
  const surfaceRect = surface.getBoundingClientRect();
  const x = (e.clientX - surfaceRect.left) / zoom;
  const y = (e.clientY - surfaceRect.top) / zoom;

  const el = document.createElement('div');
  el.className = 'cv-annotation cv-text-note';
  el.dataset.id = generateId();
  el.dataset.type = 'text';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.setAttribute('contenteditable', 'true');
  el.textContent = 'Type here…';
  el.addEventListener('mousedown', (e) => {
    if (activeTool === 'select') {
      e.stopPropagation();
      startDrag(el, e);
    }
  });
  el.addEventListener('focus', () => {
    if (el.textContent === 'Type here…') {
      el.textContent = '';
    }
  });
  el.addEventListener('dblclick', (e) => e.stopPropagation());
  surface.appendChild(el);

  // Focus immediately
  setTimeout(() => el.focus(), 50);
  activeTool = 'select';
  document.querySelectorAll('.cv-tool[data-tool]').forEach(b => b.classList.remove('active'));
  document.querySelector('.cv-tool[data-tool="select"]')?.classList.add('active');
  document.getElementById('cv-container').style.cursor = 'grab';
}

function addStickyNote(e) {
  const surfaceRect = surface.getBoundingClientRect();
  const x = (e.clientX - surfaceRect.left) / zoom;
  const y = (e.clientY - surfaceRect.top) / zoom;

  const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const el = document.createElement('div');
  el.className = 'cv-annotation cv-sticky';
  el.dataset.id = generateId();
  el.dataset.type = 'sticky';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--sticky-color', color);

  el.innerHTML = `
    <div class="cv-sticky-header">
      <button class="cv-sticky-delete" title="Delete">✕</button>
    </div>
    <div class="cv-sticky-body" contenteditable="true">Note…</div>
  `;

  el.querySelector('.cv-sticky-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    el.remove();
  });

  el.querySelector('.cv-sticky-body').addEventListener('focus', function () {
    if (this.textContent === 'Note…') this.textContent = '';
  });

  el.addEventListener('mousedown', (e) => {
    if (e.target.closest('.cv-sticky-body')) return; // let content editable work
    if (activeTool === 'select' || activeTool === 'sticky') {
      e.stopPropagation();
      startDrag(el, e);
    }
  });

  surface.appendChild(el);
  activeTool = 'select';
  document.querySelectorAll('.cv-tool[data-tool]').forEach(b => b.classList.remove('active'));
  document.querySelector('.cv-tool[data-tool="select"]')?.classList.add('active');
  document.getElementById('cv-container').style.cursor = 'grab';
}

function updateTransform() {
  if (surface) {
    surface.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
  if (svgLayer) {
    svgLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
  updateArrows();
}

async function fitToView(prompts) {
  const positions = await getCanvasPositions();
  if (!prompts.length) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  prompts.forEach(p => {
    const pos = positions[p.id] || { x: 0, y: 0 };
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + 340);
    maxY = Math.max(maxY, pos.y + 300);
  });

  const container = document.getElementById('cv-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const contentW = maxX - minX + 120;
  const contentH = maxY - minY + 120;

  zoom = Math.min(1.5, Math.min(rect.width / contentW, rect.height / contentH));
  panX = (rect.width - contentW * zoom) / 2 - minX * zoom + 60;
  panY = (rect.height - contentH * zoom) / 2 - minY * zoom + 60;

  updateTransform();
  document.getElementById('cv-zoom-label').textContent = `${Math.round(zoom * 100)}%`;
}

function cleanup() {
  mouseListeners.forEach(({ target, event, handler }) => {
    target.removeEventListener(event, handler);
  });
  mouseListeners = [];
  dragItem = null;
  arrowState = null;
  isPanning = false;
}

export function resetCanvasView() {
  panX = 0; panY = 0; zoom = 1;
}
