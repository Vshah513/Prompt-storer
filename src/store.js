// PromptVault — Data Store (IndexedDB + localStorage)

const DB_NAME = 'promptvault';
const DB_VERSION = 1;
const STORE_IMAGES = 'images';
const LS_KEY_PROMPTS = 'pv_prompts';
const LS_KEY_CATEGORIES = 'pv_categories';
const LS_KEY_CANVAS = 'pv_canvas_positions';
const LS_KEY_SETTINGS = 'pv_settings';

const DEFAULT_CATEGORIES = [
  { id: 'coding', name: 'Coding', icon: '💻', color: 'cat-coding' },
  { id: '3d', name: '3D / Animations', icon: '🎨', color: 'cat-3d' },
  { id: 'immersive', name: 'Immersive', icon: '🌐', color: 'cat-immersive' },
  { id: 'api', name: 'API / Backend', icon: '⚡', color: 'cat-api' },
  { id: 'claude', name: 'Claude / AI', icon: '🤖', color: 'cat-claude' },
  { id: 'ui', name: 'UI / Design', icon: '🎯', color: 'cat-ui' },
];

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_IMAGES)) {
        d.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

// ---- Image storage (IndexedDB) ----

export async function saveImage(id, dataUrl) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_IMAGES, 'readwrite');
    tx.objectStore(STORE_IMAGES).put({ id, dataUrl, createdAt: Date.now() });
    tx.oncomplete = () => resolve(id);
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getImage(id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_IMAGES, 'readonly');
    const req = tx.objectStore(STORE_IMAGES).get(id);
    req.onsuccess = () => resolve(req.result?.dataUrl || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteImage(id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_IMAGES, 'readwrite');
    tx.objectStore(STORE_IMAGES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllImages(ids) {
  const d = await openDB();
  return Promise.all(ids.map(id => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_IMAGES, 'readonly');
    const req = tx.objectStore(STORE_IMAGES).get(id);
    req.onsuccess = () => resolve({ id, dataUrl: req.result?.dataUrl || null });
    req.onerror = (e) => reject(e.target.error);
  })));
}

// ---- Prompts (localStorage) ----

export function getPrompts() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_PROMPTS) || '[]');
  } catch { return []; }
}

export function savePrompts(prompts) {
  localStorage.setItem(LS_KEY_PROMPTS, JSON.stringify(prompts));
}

export function addPrompt(prompt) {
  const prompts = getPrompts();
  prompts.unshift(prompt);
  savePrompts(prompts);
  return prompt;
}

export function updatePrompt(id, updates) {
  const prompts = getPrompts();
  const idx = prompts.findIndex(p => p.id === id);
  if (idx !== -1) {
    prompts[idx] = { ...prompts[idx], ...updates, updatedAt: Date.now() };
    savePrompts(prompts);
    return prompts[idx];
  }
  return null;
}

export async function deletePrompt(id) {
  const prompts = getPrompts();
  const prompt = prompts.find(p => p.id === id);
  if (prompt) {
    // Clean up images
    if (prompt.imageIds?.length) {
      for (const imgId of prompt.imageIds) {
        await deleteImage(imgId);
      }
    }
    savePrompts(prompts.filter(p => p.id !== id));
  }
}

export function toggleFavorite(id) {
  const prompts = getPrompts();
  const idx = prompts.findIndex(p => p.id === id);
  if (idx !== -1) {
    prompts[idx].favorite = !prompts[idx].favorite;
    savePrompts(prompts);
    return prompts[idx].favorite;
  }
  return false;
}

// ---- Categories (localStorage) ----

export function getCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY_CATEGORIES));
    if (stored && stored.length) return stored;
  } catch {}
  saveCategories(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
}

export function saveCategories(categories) {
  localStorage.setItem(LS_KEY_CATEGORIES, JSON.stringify(categories));
}

export function addCategory(cat) {
  const cats = getCategories();
  cats.push(cat);
  saveCategories(cats);
  return cat;
}

export function deleteCategory(id) {
  const cats = getCategories().filter(c => c.id !== id);
  saveCategories(cats);
  return cats;
}

// ---- Canvas positions (localStorage) ----

export function getCanvasPositions() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_CANVAS) || '{}');
  } catch { return {}; }
}

export function saveCanvasPosition(promptId, x, y) {
  const positions = getCanvasPositions();
  positions[promptId] = { x, y };
  localStorage.setItem(LS_KEY_CANVAS, JSON.stringify(positions));
}

export function saveAllCanvasPositions(positions) {
  localStorage.setItem(LS_KEY_CANVAS, JSON.stringify(positions));
}

// ---- Settings ----

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_SETTINGS) || '{}');
  } catch { return {}; }
}

export function saveSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  localStorage.setItem(LS_KEY_SETTINGS, JSON.stringify(s));
}

// ---- Export for category helpers ----
export function getCategoryById(id) {
  return getCategories().find(c => c.id === id) || { id, name: id, icon: '📁', color: 'cat-default' };
}
