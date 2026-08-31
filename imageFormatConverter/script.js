'use strict';

/**
 * Image Format Converter — 100% client-side.
 * Loads the chosen image into an off-screen <canvas> at its natural
 * size, then re-encodes it via canvas.toBlob() into PNG, JPEG or
 * WebP. Nothing is ever sent to a server.
 */

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  warningState: document.getElementById('warningState'),
  filePanel: document.getElementById('filePanel'),
  fileName: document.getElementById('fileName'),
  fileOriginalMeta: document.getElementById('fileOriginalMeta'),
  formatSelect: document.getElementById('formatSelect'),
  qualityRow: document.getElementById('qualityRow'),
  qualityRange: document.getElementById('qualityRange'),
  qualityValue: document.getElementById('qualityValue'),
  bgRow: document.getElementById('bgRow'),
  bgColorInput: document.getElementById('bgColorInput'),
  bgNote: document.getElementById('bgNote'),
  convertBtn: document.getElementById('convertBtn'),
  resetBtn: document.getElementById('resetBtn'),
  progressNote: document.getElementById('progressNote'),
  resultPanel: document.getElementById('resultPanel'),
  resultImg: document.getElementById('resultImg'),
  statOriginal: document.getElementById('statOriginal'),
  statConverted: document.getElementById('statConverted'),
  statChange: document.getElementById('statChange'),
  downloadBtn: document.getElementById('downloadBtn'),
};

/** Current working state */
const state = {
  file: null,             // the original File
  img: null,              // loaded HTMLImageElement
  hasTransparency: false, // whether the source image has any non-opaque pixel
  sourceObjectUrl: null,  // object URL for the source image (revoked on cleanup)
  resultObjectUrl: null,  // object URL for the converted blob (revoked on cleanup)
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
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function labelForMime(mime) {
  if (mime === 'image/png') return 'PNG';
  if (mime === 'image/webp') return 'WebP';
  if (mime === 'image/jpeg') return 'JPEG';
  if (mime === 'image/gif') return 'GIF';
  return (mime || 'unknown').replace('image/', '').toUpperCase();
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

/**
 * Samples the image (scaled down for speed on large photos) to check
 * whether it contains any non-fully-opaque pixel. Used to decide
 * whether to surface the JPEG background-color picker. If sampling
 * fails for any reason, we fail safe and assume transparency could
 * be present so the picker still shows up.
 */
function detectTransparency(img) {
  try {
    const maxDim = 120;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return true;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch (err) {
    return true;
  }
}

function updateFormatUI() {
  const format = els.formatSelect.value;
  const isPng = format === 'image/png';
  const isJpeg = format === 'image/jpeg';

  // PNG is always lossless — there is no quality slider to show.
  els.qualityRow.hidden = isPng;

  // The background-color picker only matters when converting to JPEG
  // (no alpha channel) from a source that might actually have
  // transparent pixels.
  const showBg = isJpeg && state.hasTransparency;
  els.bgRow.hidden = !showBg;
  els.bgNote.hidden = !showBg;
}

function resetAll() {
  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);
  state.file = null;
  state.img = null;
  state.hasTransparency = false;
  state.sourceObjectUrl = null;
  state.resultObjectUrl = null;

  els.fileInput.value = '';
  els.filePanel.hidden = true;
  els.resultPanel.hidden = true;
  els.progressNote.hidden = true;
  els.emptyState.hidden = false;
  resetWarning();
  els.formatSelect.value = 'image/jpeg';
  els.qualityRange.value = 90;
  els.qualityValue.textContent = '90';
  els.bgColorInput.value = '#ffffff';
  updateFormatUI();
  els.convertBtn.disabled = false;
  els.convertBtn.textContent = 'Convert Image';
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
  state.hasTransparency = false;
  els.fileName.textContent = file.name;
  els.fileOriginalMeta.textContent = `${labelForMime(file.type)} · ${formatBytes(file.size)} · Loading…`;
  els.emptyState.hidden = true;
  els.filePanel.hidden = false;

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
      els.fileOriginalMeta.textContent = `${labelForMime(file.type)} · ${formatBytes(file.size)}`;
      return;
    }

    state.hasTransparency = detectTransparency(image);
    els.fileOriginalMeta.textContent = `${labelForMime(file.type)} · ${formatBytes(file.size)} · ${w} × ${h}px`;
    updateFormatUI();
  };
  image.onerror = () => {
    showWarning('This image could not be loaded. It may be corrupt or in an unsupported format. Please try a different file.');
    els.filePanel.hidden = true;
    els.emptyState.hidden = false;
  };
  image.src = objectUrl;
}

function convert() {
  if (!state.file || !state.img) {
    showWarning('Please choose an image first.');
    return;
  }

  resetWarning();
  els.convertBtn.disabled = true;
  els.progressNote.hidden = false;
  els.resultPanel.hidden = true;

  // Let the UI paint the "Converting…" state before the (potentially
  // heavy, synchronous) draw + encode work runs. setTimeout (rather than
  // requestAnimationFrame) is used deliberately: rAF callbacks are fully
  // suspended in background/non-visible tabs, which would leave the tool
  // stuck on "Converting…" if the tab loses focus right after the click.
  setTimeout(() => {
    try {
      const img = state.img;
      const canvas = state.canvas;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const targetMime = els.formatSelect.value;

      // JPEG has no alpha channel — fill the canvas with a solid
      // background color BEFORE drawing the image, so transparent
      // areas become that color instead of rendering as black.
      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = els.bgColorInput.value || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const quality = targetMime === 'image/png'
        ? undefined
        : Math.min(100, Math.max(0, parseInt(els.qualityRange.value, 10) || 90)) / 100;

      canvas.toBlob((blob) => {
        els.progressNote.hidden = true;
        els.convertBtn.disabled = false;

        if (!blob) {
          showWarning('Conversion failed — your browser could not encode this image in the chosen format. Please try a different format.');
          return;
        }

        // canvas.toBlob() can silently fall back to a different format
        // on browsers with incomplete WebP encoder support. Check the
        // resulting blob's actual MIME type rather than trusting the
        // format we asked for.
        if (targetMime === 'image/webp' && blob.type !== 'image/webp') {
          showWarning("Your browser doesn't fully support WebP encoding, so the file below was produced in a different format instead of WebP. Try an up-to-date version of Chrome, Firefox or Edge for real WebP output.");
        }

        revokeUrl(state.resultObjectUrl);
        const resultUrl = URL.createObjectURL(blob);
        state.resultObjectUrl = resultUrl;

        els.resultImg.src = resultUrl;

        const actualMime = blob.type || targetMime;
        const ext = extForMime(actualMime);
        const baseName = stripExtension(state.file.name) || 'image';
        els.downloadBtn.href = resultUrl;
        els.downloadBtn.setAttribute('download', `converted-${baseName}.${ext}`);

        const originalSize = state.file.size;
        const convertedSize = blob.size;
        const delta = originalSize > 0
          ? Math.round((1 - convertedSize / originalSize) * 100)
          : 0;

        els.statOriginal.textContent = `${labelForMime(state.file.type)} · ${formatBytes(originalSize)}`;
        els.statConverted.textContent = `${labelForMime(actualMime)} · ${formatBytes(convertedSize)}`;
        els.statChange.textContent = delta >= 0
          ? `${delta}% smaller`
          : `${Math.abs(delta)}% larger`;

        els.resultPanel.hidden = false;
        els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (typeof showToast === 'function') showToast('Image converted');
      }, targetMime, quality);
    } catch (err) {
      els.progressNote.hidden = true;
      els.convertBtn.disabled = false;
      showWarning('Something went wrong while converting this image. It may be corrupt or too large for your browser to process.');
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
els.formatSelect.addEventListener('change', updateFormatUI);

els.convertBtn.addEventListener('click', convert);
els.resetBtn.addEventListener('click', resetAll);

/* ── Cleanup on unload to avoid leaking blob URLs ──────────────── */
window.addEventListener('beforeunload', () => {
  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);
});

document.addEventListener('DOMContentLoaded', () => {
  els.qualityValue.textContent = els.qualityRange.value;
  updateFormatUI();
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
});
