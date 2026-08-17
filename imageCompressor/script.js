'use strict';

/**
 * Image Compressor — 100% client-side.
 * Loads the chosen image into an off-screen <canvas> at its natural
 * size, then re-encodes it via canvas.toBlob() at an adjustable
 * quality/format. Nothing is ever sent to a server.
 */

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  warningState: document.getElementById('warningState'),
  filePanel: document.getElementById('filePanel'),
  fileName: document.getElementById('fileName'),
  fileOriginalSize: document.getElementById('fileOriginalSize'),
  dimsNote: document.getElementById('dimsNote'),
  qualityRange: document.getElementById('qualityRange'),
  qualityValue: document.getElementById('qualityValue'),
  formatSelect: document.getElementById('formatSelect'),
  compressBtn: document.getElementById('compressBtn'),
  resetBtn: document.getElementById('resetBtn'),
  progressNote: document.getElementById('progressNote'),
  resultPanel: document.getElementById('resultPanel'),
  resultImg: document.getElementById('resultImg'),
  statOriginal: document.getElementById('statOriginal'),
  statCompressed: document.getElementById('statCompressed'),
  statReduction: document.getElementById('statReduction'),
  downloadBtn: document.getElementById('downloadBtn'),
};

/** Current working state */
const state = {
  file: null,          // the original File
  img: null,            // loaded HTMLImageElement
  sourceObjectUrl: null, // object URL for the source image (revoked on cleanup)
  resultObjectUrl: null, // object URL for the compressed blob (revoked on cleanup)
  canvas: document.createElement('canvas'),
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[unitIndex]}`;
}

function extForMime(mime) {
  return mime === 'image/webp' ? 'webp' : 'jpg';
}

function stripExtension(name) {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

function revokeUrl(url) {
  if (url) {
    try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
  }
}

function resetWarning() {
  els.warningState.hidden = true;
  els.warningState.textContent = '';
}

function showWarning(message) {
  els.warningState.hidden = false;
  els.warningState.textContent = message;
}

function resetAll() {
  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);
  state.file = null;
  state.img = null;
  state.sourceObjectUrl = null;
  state.resultObjectUrl = null;

  els.fileInput.value = '';
  els.filePanel.hidden = true;
  els.resultPanel.hidden = true;
  els.progressNote.hidden = true;
  els.emptyState.hidden = false;
  resetWarning();
  els.compressBtn.disabled = false;
  els.compressBtn.textContent = 'Compress Image';
}

function handleFile(file) {
  resetWarning();

  if (!file) return;

  if (!file.type || !file.type.startsWith('image/')) {
    showWarning(`"${file.name}" doesn't look like an image file. Please choose a JPEG, PNG, WebP or GIF.`);
    return;
  }

  // Clean up any previous state before loading the new file.
  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);
  state.resultObjectUrl = null;
  els.resultPanel.hidden = true;

  state.file = file;
  els.fileName.textContent = file.name;
  els.fileOriginalSize.textContent = formatBytes(file.size);
  els.emptyState.hidden = true;
  els.filePanel.hidden = false;
  els.dimsNote.textContent = 'Loading image…';

  let objectUrl;
  try {
    objectUrl = URL.createObjectURL(file);
  } catch (err) {
    showWarning('Could not read that file. Please try a different image.');
    els.filePanel.hidden = true;
    els.emptyState.hidden = false;
    return;
  }
  state.sourceObjectUrl = objectUrl;

  const image = new Image();
  image.onload = () => {
    state.img = image;
    const w = image.naturalWidth;
    const h = image.naturalHeight;

    if (!w || !h) {
      showWarning('This image could not be decoded (it may be corrupt). Please try a different file.');
      els.dimsNote.textContent = '';
      return;
    }

    els.dimsNote.textContent = `${w} × ${h}px`;
    if (Math.max(w, h) > 8000) {
      els.dimsNote.textContent += ' — very large image, compression may take a moment.';
    }
  };
  image.onerror = () => {
    showWarning('This image could not be loaded. It may be corrupt or in an unsupported format. Please try a different file.');
    els.dimsNote.textContent = '';
    els.filePanel.hidden = true;
    els.emptyState.hidden = false;
  };
  image.src = objectUrl;
}

function compress() {
  if (!state.file || !state.img) {
    showWarning('Please choose an image first.');
    return;
  }

  resetWarning();
  els.compressBtn.disabled = true;
  els.progressNote.hidden = false;
  els.resultPanel.hidden = true;

  // Let the UI paint the "Compressing…" state before the (potentially
  // heavy, synchronous) draw + encode work runs. setTimeout (rather than
  // requestAnimationFrame) is used deliberately: rAF callbacks are fully
  // suspended in background/non-visible tabs, which would leave the tool
  // stuck on "Compressing…" if the tab loses focus right after the click.
  setTimeout(() => {
    try {
      const img = state.img;
      const canvas = state.canvas;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mimeType = els.formatSelect.value;
      const quality = Math.min(100, Math.max(10, parseInt(els.qualityRange.value, 10) || 75)) / 100;

      canvas.toBlob((blob) => {
        els.progressNote.hidden = true;
        els.compressBtn.disabled = false;

        if (!blob) {
          showWarning('Compression failed — your browser could not encode this image. Please try a different file or format.');
          return;
        }

        revokeUrl(state.resultObjectUrl);
        const resultUrl = URL.createObjectURL(blob);
        state.resultObjectUrl = resultUrl;

        els.resultImg.src = resultUrl;

        const originalSize = state.file.size;
        const compressedSize = blob.size;
        const reduction = originalSize > 0
          ? Math.round((1 - compressedSize / originalSize) * 100)
          : 0;

        els.statOriginal.textContent = formatBytes(originalSize);
        els.statCompressed.textContent = formatBytes(compressedSize);
        els.statReduction.textContent = reduction >= 0
          ? `${reduction}% smaller`
          : `${Math.abs(reduction)}% larger`;

        const ext = extForMime(mimeType);
        const baseName = stripExtension(state.file.name) || 'image';
        els.downloadBtn.href = resultUrl;
        els.downloadBtn.setAttribute('download', `compressed-${baseName}.${ext}`);

        els.resultPanel.hidden = false;

        if (typeof showToast === 'function') showToast('Image compressed');
      }, mimeType, quality);
    } catch (err) {
      els.progressNote.hidden = true;
      els.compressBtn.disabled = false;
      showWarning('Something went wrong while compressing this image. It may be corrupt or too large for your browser to process.');
    }
  });
}

/* ── Drop zone events ────────────────────────────────────────── */
els.dropZone.addEventListener('click', () => els.fileInput.click());
els.dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.fileInput.click();
  }
});

['dragenter', 'dragover'].forEach((evt) => {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.dropZone.classList.add('drag-over');
  });
});
['dragleave', 'dragend'].forEach((evt) => {
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

/* ── Controls ────────────────────────────────────────────────── */
els.qualityRange.addEventListener('input', () => {
  els.qualityValue.textContent = els.qualityRange.value;
});

els.compressBtn.addEventListener('click', compress);
els.resetBtn.addEventListener('click', resetAll);

/* ── Cleanup on unload to avoid leaking blob URLs ──────────────── */
window.addEventListener('beforeunload', () => {
  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);
});

document.addEventListener('DOMContentLoaded', () => {
  els.qualityValue.textContent = els.qualityRange.value;
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
});
