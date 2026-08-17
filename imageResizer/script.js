'use strict';

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  imageMeta: document.getElementById('imageMeta'),
  metaFileName: document.getElementById('metaFileName'),
  metaDimensions: document.getElementById('metaDimensions'),
  metaFileSize: document.getElementById('metaFileSize'),
  resetBtn: document.getElementById('resetBtn'),
  resizeControls: document.getElementById('resizeControls'),
  presetRow: document.getElementById('presetRow'),
  widthInput: document.getElementById('widthInput'),
  heightInput: document.getElementById('heightInput'),
  lockBtn: document.getElementById('lockBtn'),
  lockAspect: document.getElementById('lockAspect'),
  formatSelect: document.getElementById('formatSelect'),
  resizeBtn: document.getElementById('resizeBtn'),
  resultBox: document.getElementById('resultBox'),
  resultPreview: document.getElementById('resultPreview'),
  resultDimensions: document.getElementById('resultDimensions'),
  resultFileSize: document.getElementById('resultFileSize'),
  downloadBtn: document.getElementById('downloadBtn'),
};

// ── State ─────────────────────────────────────────────────────
const state = {
  image: null,          // loaded HTMLImageElement
  originalWidth: 0,
  originalHeight: 0,
  originalFileSize: 0,
  originalFileName: '',
  sourceObjectUrl: null, // object URL for the loaded source image
  resultObjectUrl: null, // object URL for the resized output blob
};

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function baseName(name) {
  const withoutExt = name.replace(/\.[^./\\]+$/, '');
  return withoutExt.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'image';
}

function revokeSourceUrl() {
  if (state.sourceObjectUrl) {
    URL.revokeObjectURL(state.sourceObjectUrl);
    state.sourceObjectUrl = null;
  }
}
function revokeResultUrl() {
  if (state.resultObjectUrl) {
    URL.revokeObjectURL(state.resultObjectUrl);
    state.resultObjectUrl = null;
  }
}

// ── File loading ──────────────────────────────────────────────
function handleFile(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    window.showToast('Please choose a valid image file');
    return;
  }

  revokeSourceUrl();
  revokeResultUrl();

  let objectUrl;
  try {
    objectUrl = URL.createObjectURL(file);
  } catch (err) {
    window.showToast('Could not read that file');
    return;
  }

  const img = new Image();
  img.onload = () => {
    try {
      state.image = img;
      state.originalWidth = img.naturalWidth;
      state.originalHeight = img.naturalHeight;
      state.originalFileSize = file.size;
      state.originalFileName = file.name || 'image';
      state.sourceObjectUrl = objectUrl;

      els.metaFileName.textContent = state.originalFileName;
      els.metaDimensions.textContent = `${state.originalWidth} × ${state.originalHeight}px`;
      els.metaFileSize.textContent = formatBytes(state.originalFileSize);
      els.imageMeta.hidden = false;

      els.widthInput.value = state.originalWidth;
      els.heightInput.value = state.originalHeight;
      els.resizeControls.hidden = false;
      els.resultBox.hidden = true;
      clearActivePreset();

      window.showToast('Image loaded');
    } catch (err) {
      window.showToast('Something went wrong reading that image');
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    window.showToast('Could not load that image — try a different file');
  };
  try {
    img.src = objectUrl;
  } catch (err) {
    window.showToast('Could not load that image');
  }
}

// ── Drop zone interactions ───────────────────────────────────
els.dropZone.addEventListener('click', () => els.fileInput.click());
els.dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.fileInput.click();
  }
});
['dragenter', 'dragover'].forEach(evt => {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.dropZone.classList.add('drag-over');
  });
});
['dragleave', 'dragend'].forEach(evt => {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.dropZone.classList.remove('drag-over');
  });
});
els.dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  els.dropZone.classList.remove('drag-over');
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});
els.fileInput.addEventListener('change', () => {
  const file = els.fileInput.files && els.fileInput.files[0];
  if (file) handleFile(file);
});

// ── Aspect ratio lock ─────────────────────────────────────────
function syncLockButton() {
  els.lockBtn.classList.toggle('locked', els.lockAspect.checked);
  els.lockBtn.textContent = els.lockAspect.checked ? '🔗' : '⛓️‍💥';
}
els.lockBtn.addEventListener('click', () => {
  els.lockAspect.checked = !els.lockAspect.checked;
  syncLockButton();
});
els.lockAspect.addEventListener('change', syncLockButton);
syncLockButton();

els.widthInput.addEventListener('input', () => {
  clearActivePreset();
  if (!els.lockAspect.checked || !state.originalWidth || !state.originalHeight) return;
  const w = parseInt(els.widthInput.value, 10);
  if (!w || w <= 0) return;
  const ratio = state.originalHeight / state.originalWidth;
  els.heightInput.value = Math.max(1, Math.round(w * ratio));
});
els.heightInput.addEventListener('input', () => {
  clearActivePreset();
  if (!els.lockAspect.checked || !state.originalWidth || !state.originalHeight) return;
  const h = parseInt(els.heightInput.value, 10);
  if (!h || h <= 0) return;
  const ratio = state.originalWidth / state.originalHeight;
  els.widthInput.value = Math.max(1, Math.round(h * ratio));
});

// ── Presets ───────────────────────────────────────────────────
function clearActivePreset() {
  els.presetRow.querySelectorAll('.preset-btn.active').forEach(b => b.classList.remove('active'));
}
els.presetRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  const w = parseInt(btn.dataset.w, 10);
  const h = parseInt(btn.dataset.h, 10);
  els.widthInput.value = w;
  els.heightInput.value = h;
  clearActivePreset();
  btn.classList.add('active');
});

// ── Resize ────────────────────────────────────────────────────
function extFor(mimeType) {
  return mimeType === 'image/jpeg' ? 'jpg' : 'png';
}

els.resizeBtn.addEventListener('click', () => {
  if (!state.image) {
    window.showToast('Load an image first');
    return;
  }
  const width = parseInt(els.widthInput.value, 10);
  const height = parseInt(els.heightInput.value, 10);
  if (!width || !height || width <= 0 || height <= 0) {
    window.showToast('Enter a valid width and height');
    return;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const mimeType = els.formatSelect.value;

    // JPEG has no alpha channel — fill white first so transparent
    // areas don't render as black in the exported file.
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(state.image, 0, 0, width, height);

    const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;
    els.resizeBtn.disabled = true;
    canvas.toBlob((blob) => {
      els.resizeBtn.disabled = false;
      if (!blob) {
        window.showToast('Resize failed — try a different format');
        return;
      }
      revokeResultUrl();
      const url = URL.createObjectURL(blob);
      state.resultObjectUrl = url;

      els.resultPreview.src = url;
      els.resultDimensions.textContent = `${width} × ${height}px`;
      els.resultFileSize.textContent = formatBytes(blob.size);

      const ext = extFor(mimeType);
      els.downloadBtn.href = url;
      els.downloadBtn.setAttribute('download', `resized-${baseName(state.originalFileName)}.${ext}`);

      els.resultBox.hidden = false;
      els.resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      window.showToast('Image resized');
    }, mimeType, quality);
  } catch (err) {
    els.resizeBtn.disabled = false;
    window.showToast('Something went wrong resizing that image');
  }
});

// ── Reset ─────────────────────────────────────────────────────
function resetTool() {
  revokeSourceUrl();
  revokeResultUrl();
  state.image = null;
  state.originalWidth = 0;
  state.originalHeight = 0;
  state.originalFileSize = 0;
  state.originalFileName = '';

  els.fileInput.value = '';
  els.imageMeta.hidden = true;
  els.resizeControls.hidden = true;
  els.resultBox.hidden = true;
  els.widthInput.value = '';
  els.heightInput.value = '';
  els.formatSelect.value = 'image/png';
  els.lockAspect.checked = true;
  syncLockButton();
  clearActivePreset();
}
els.resetBtn.addEventListener('click', resetTool);

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
});
