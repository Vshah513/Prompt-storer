// PromptVault — Create/Edit Modal Component

import { getCategories, addPrompt, updatePrompt, saveImage } from '../store.js';
import { generateId, showToast, fileToDataUrl, readFileAsText, formatBytes } from '../utils/helpers.js';

let currentImages = []; // { id, dataUrl }
let mdFile = null;
let editingPrompt = null;

export function openModal(prompt = null, onSave) {
  editingPrompt = prompt;
  currentImages = [];
  mdFile = null;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');

  const categories = getCategories();

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${prompt ? 'Edit Prompt' : 'New Prompt'}</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="form-input" id="modal-title" placeholder="e.g. 3D WebGL Scene Generator" value="${prompt?.title || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" id="modal-category">
              ${categories.map(c => `<option value="${c.id}" ${prompt?.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <input type="text" class="form-input" id="modal-description" placeholder="Brief description of what this prompt does" value="${prompt?.description || ''}" />
        </div>

        <div class="form-group">
          <label class="form-label">Tags</label>
          <div class="tags-input-wrapper" id="tags-wrapper">
            <input type="text" class="tags-input" id="tags-input" placeholder="Type and press Enter…" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Prompt Content</label>
          <div class="upload-area" id="md-upload-area">
            <div class="upload-icon">📄</div>
            <div class="upload-text">Drop a <strong>.md</strong> or <strong>.txt</strong> file here, or click to upload</div>
            <div class="upload-hint">Or paste/type your prompt below</div>
          </div>
          <div id="md-file-display"></div>
          <textarea class="form-textarea" id="modal-prompt" placeholder="Paste your prompt content here... (supports markdown)" rows="8">${prompt?.promptContent || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Output Text (optional)</label>
          <textarea class="form-textarea" id="modal-output" placeholder="Paste the output/response here…" rows="5">${prompt?.outputText || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Output Images (optional)</label>
          <div class="upload-area" id="image-upload-area">
            <div class="upload-icon">🖼️</div>
            <div class="upload-text">Drop images here, click to upload, or <strong>paste from clipboard</strong></div>
            <div class="upload-hint">PNG, JPG, WebP, GIF supported</div>
          </div>
          <div class="image-previews" id="image-previews"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn-primary" id="modal-save-btn">
          ${prompt ? '💾 Save Changes' : '✨ Create Prompt'}
        </button>
      </div>
    </div>
  `;

  // Init tags
  const tagsWrapper = document.getElementById('tags-wrapper');
  const tagsInput = document.getElementById('tags-input');
  let tags = [...(prompt?.tags || [])];
  renderTags(tagsWrapper, tagsInput, tags);

  tagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagsInput.value.trim().replace(/,/g, '');
      if (val && !tags.includes(val)) {
        tags.push(val);
        renderTags(tagsWrapper, tagsInput, tags);
      }
      tagsInput.value = '';
    } else if (e.key === 'Backspace' && !tagsInput.value && tags.length) {
      tags.pop();
      renderTags(tagsWrapper, tagsInput, tags);
    }
  });

  tagsWrapper.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-tag')) {
      const idx = parseInt(e.target.dataset.idx);
      tags.splice(idx, 1);
      renderTags(tagsWrapper, tagsInput, tags);
    } else {
      tagsInput.focus();
    }
  });

  // MD file upload
  const mdUploadArea = document.getElementById('md-upload-area');
  const hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.accept = '.md,.txt,.markdown';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);

  mdUploadArea.addEventListener('click', () => hiddenFileInput.click());
  mdUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); mdUploadArea.classList.add('drag-over'); });
  mdUploadArea.addEventListener('dragleave', () => mdUploadArea.classList.remove('drag-over'));
  mdUploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    mdUploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.markdown'))) {
      await loadMdFile(file);
    }
  });
  hiddenFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await loadMdFile(file);
  });

  // Image upload
  const imgUploadArea = document.getElementById('image-upload-area');
  const hiddenImgInput = document.createElement('input');
  hiddenImgInput.type = 'file';
  hiddenImgInput.accept = 'image/*';
  hiddenImgInput.multiple = true;
  hiddenImgInput.style.display = 'none';
  document.body.appendChild(hiddenImgInput);

  imgUploadArea.addEventListener('click', () => hiddenImgInput.click());
  imgUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); imgUploadArea.classList.add('drag-over'); });
  imgUploadArea.addEventListener('dragleave', () => imgUploadArea.classList.remove('drag-over'));
  imgUploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    imgUploadArea.classList.remove('drag-over');
    await addImagesFromFiles(e.dataTransfer.files);
  });
  hiddenImgInput.addEventListener('change', async (e) => {
    await addImagesFromFiles(e.target.files);
  });

  // Clipboard paste for images
  document.addEventListener('paste', handlePaste);

  // Close
  document.getElementById('modal-close-btn').addEventListener('click', () => closeModal());
  document.getElementById('modal-cancel-btn').addEventListener('click', () => closeModal());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save
  document.getElementById('modal-save-btn').addEventListener('click', async () => {
    await savePromptFromModal(tags, onSave);
  });

  // Escape to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function renderTags(wrapper, input, tags) {
  // Remove old chips
  wrapper.querySelectorAll('.tag-chip').forEach(c => c.remove());
  // Re-insert chips before input
  tags.forEach((t, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${t}<span class="remove-tag" data-idx="${i}">×</span>`;
    wrapper.insertBefore(chip, input);
  });
}

async function loadMdFile(file) {
  const text = await readFileAsText(file);
  document.getElementById('modal-prompt').value = text;
  mdFile = { name: file.name, size: file.size };
  document.getElementById('md-file-display').innerHTML = `
    <div class="md-file-indicator">
      <span class="md-icon">📄</span>
      <span class="md-name">${file.name}</span>
      <span class="md-size">(${formatBytes(file.size)})</span>
      <span class="md-remove" id="remove-md-file">✕</span>
    </div>
  `;
  document.getElementById('remove-md-file')?.addEventListener('click', () => {
    mdFile = null;
    document.getElementById('md-file-display').innerHTML = '';
  });
  showToast(`Loaded ${file.name}`, 'success');
}

async function addImagesFromFiles(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    const dataUrl = await fileToDataUrl(file);
    currentImages.push({ id: generateId(), dataUrl });
  }
  renderImagePreviews();
}

async function handlePaste(e) {
  const overlay = document.getElementById('modal-overlay');
  if (overlay.classList.contains('hidden')) return;

  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const blob = item.getAsFile();
      const dataUrl = await fileToDataUrl(blob);
      currentImages.push({ id: generateId(), dataUrl });
      renderImagePreviews();
      showToast('Image pasted from clipboard!', 'success');
    }
  }
}

function renderImagePreviews() {
  const container = document.getElementById('image-previews');
  if (!container) return;
  container.innerHTML = currentImages.map((img, i) => `
    <div class="image-preview-item">
      <img src="${img.dataUrl}" alt="Preview" />
      <button class="remove-image" data-idx="${i}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.remove-image').forEach(btn => {
    btn.addEventListener('click', () => {
      currentImages.splice(parseInt(btn.dataset.idx), 1);
      renderImagePreviews();
    });
  });
}

async function savePromptFromModal(tags, onSave) {
  const title = document.getElementById('modal-title').value.trim();
  const category = document.getElementById('modal-category').value;
  const description = document.getElementById('modal-description').value.trim();
  const promptContent = document.getElementById('modal-prompt').value;
  const outputText = document.getElementById('modal-output').value;

  if (!title) {
    showToast('Please enter a title', 'error');
    return;
  }
  if (!promptContent) {
    showToast('Please enter prompt content', 'error');
    return;
  }

  // Save images to IndexedDB
  const imageIds = [];
  for (const img of currentImages) {
    await saveImage(img.id, img.dataUrl);
    imageIds.push(img.id);
  }

  if (editingPrompt) {
    // Keep existing images that weren't removed
    const allImageIds = [...(editingPrompt.imageIds || []), ...imageIds];
    const updated = updatePrompt(editingPrompt.id, {
      title, category, description, tags, promptContent, outputText,
      imageIds: allImageIds,
      fileName: mdFile?.name || editingPrompt.fileName,
    });
    showToast('Prompt updated!', 'success');
    closeModal();
    if (onSave) onSave(updated);
  } else {
    const prompt = {
      id: generateId(),
      title, category, description, tags, promptContent, outputText,
      imageIds,
      fileName: mdFile?.name || null,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addPrompt(prompt);
    showToast('Prompt created!', 'success');
    closeModal();
    if (onSave) onSave(prompt);
  }
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
  document.removeEventListener('paste', handlePaste);
  // Clean up hidden inputs
  document.querySelectorAll('input[type="file"][style*="display: none"]').forEach(el => el.remove());
}
