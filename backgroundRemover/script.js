'use strict';

/**
 * Background Remover — 100% client-side chroma-key / color-distance tool.
 *
 * This is NOT AI subject segmentation. It samples a "key" background
 * color (auto-detected from the image corners, or picked by clicking
 * the preview) and zeroes the alpha channel of every pixel within a
 * tolerance-controlled color distance of that key color, with a linear
 * alpha falloff band near the threshold to avoid a hard jagged edge.
 * Everything happens on an offscreen <canvas> — nothing is uploaded.
 */

const MAX_DISTANCE = 450; // ≈ sqrt(255² * 3), the max possible RGB Euclidean distance
const SOFT_BAND = 40;     // width (in distance units) of the alpha falloff band
const DEBOUNCE_MS = 90;

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  workspacePanel: document.getElementById('workspacePanel'),
  fileName: document.getElementById('fileName'),
  fileDims: document.getElementById('fileDims'),
  toleranceRange: document.getElementById('toleranceRange'),
  toleranceValue: document.getElementById('toleranceValue'),
  keySwatch: document.getElementById('keySwatch'),
  keyColorText: document.getElementById('keyColorText'),
  autoDetectBtn: document.getElementById('autoDetectBtn'),
  previewCanvas: document.getElementById('previewCanvas'),
  downloadBtn: document.getElementById('downloadBtn'),
  resetBtn: document.getElementById('resetBtn'),
};

const previewCtx = els.previewCanvas.getContext('2d', { willReadFrequently: true });

/** Current working state */
const state = {
  file: null,
  originalFileName: '',
  sourceObjectUrl: null,   // object URL for the loaded source image
  resultObjectUrl: null,   // object URL for the processed PNG blob
  originalImageData: null, // pristine ImageData decoded from the source — never mutated
  width: 0,
  height: 0,
  keyColor: { r: 128, g: 128, b: 128 },
  debounceTimer: null,
};

function revokeUrl(url) {
  if (url) {
    try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
  }
}

function baseName(name) {
  const withoutExt = (name || 'image').replace(/\.[^./\\]+$/, '');
  return withoutExt.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'image';
}

function colorDistance(a, b) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getPixel(data, w, x, y) {
  const i = (y * w + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

/**
 * Auto-detects the background key color by sampling the 4 corner
 * pixels, clustering whichever corners agree with each other (within
 * a loose distance), and averaging that cluster. This handles the
 * common case where a subject happens to touch one corner without
 * getting thrown off by it.
 */
function detectCornerColor(imageData) {
  const { data, width: w, height: h } = imageData;
  const corners = [
    getPixel(data, w, 0, 0),
    getPixel(data, w, w - 1, 0),
    getPixel(data, w, 0, h - 1),
    getPixel(data, w, w - 1, h - 1),
  ];

  let bestCluster = [corners[0]];
  for (let i = 0; i < corners.length; i++) {
    const cluster = corners.filter((c) => colorDistance(c, corners[i]) < 40);
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }

  const sum = bestCluster.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
  const n = bestCluster.length;
  return { r: Math.round(sum.r / n), g: Math.round(sum.g / n), b: Math.round(sum.b / n) };
}

function updateSwatch() {
  const { r, g, b } = state.keyColor;
  els.keySwatch.style.background = `rgb(${r}, ${g}, ${b})`;
  els.keyColorText.textContent = `rgb(${r}, ${g}, ${b})`;
}

function setDownloadReady(ready) {
  if (ready) {
    els.downloadBtn.removeAttribute('disabled');
  } else {
    els.downloadBtn.setAttribute('disabled', 'disabled');
  }
}

/**
 * Core pixel pass: iterates the full ImageData buffer directly (not
 * per-pixel getImageData calls) and writes the alpha channel based on
 * color distance from the key color, with a linear falloff band near
 * the threshold so edges aren't a hard jagged cutoff.
 */
function processImage() {
  const original = state.originalImageData;
  if (!original) return;

  const src = original.data;
  const out = new Uint8ClampedArray(src); // clone — never mutate the pristine original
  const { r: kr, g: kg, b: kb } = state.keyColor;

  const tolerance = parseInt(els.toleranceRange.value, 10) || 0;
  const threshold = (tolerance / 100) * MAX_DISTANCE;

  for (let i = 0; i < out.length; i += 4) {
    const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
    const dr = r - kr, dg = g - kg, db = b - kb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    let alpha;
    if (dist <= threshold) {
      alpha = 0; // within the key color — fully removed
    } else if (dist < threshold + SOFT_BAND) {
      alpha = a * ((dist - threshold) / SOFT_BAND); // soft edge falloff band
    } else {
      alpha = a; // far from key color — untouched
    }
    out[i + 3] = alpha;
  }

  const processed = new ImageData(out, state.width, state.height);
  previewCtx.putImageData(processed, 0, 0);

  els.previewCanvas.toBlob((blob) => {
    if (!blob) return;
    revokeUrl(state.resultObjectUrl);
    const url = URL.createObjectURL(blob);
    state.resultObjectUrl = url;
    els.downloadBtn.href = url;
    els.downloadBtn.setAttribute('download', `background-removed-${baseName(state.originalFileName)}.png`);
    setDownloadReady(true);
  }, 'image/png');
}

/** setTimeout-based debounce (not rAF alone — rAF suspends in background tabs). */
function scheduleProcess() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(processImage, DEBOUNCE_MS);
}

/* ── File loading ────────────────────────────────────────────── */
function handleFile(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    window.showToast(`"${file && file.name ? file.name : 'That file'}" doesn't look like an image. Please choose a JPEG, PNG or WebP file.`);
    return;
  }

  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);
  state.resultObjectUrl = null;
  setDownloadReady(false);

  let objectUrl;
  try {
    objectUrl = URL.createObjectURL(file);
  } catch (err) {
    window.showToast('Could not read that file. Please try a different image.');
    return;
  }

  const img = new Image();
  img.onload = () => {
    try {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        window.showToast('This image could not be decoded (it may be corrupt). Please try a different file.');
        return;
      }

      state.file = file;
      state.originalFileName = file.name || 'image';
      state.sourceObjectUrl = objectUrl;
      state.width = w;
      state.height = h;

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = w;
      sourceCanvas.height = h;
      const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      sourceCtx.drawImage(img, 0, 0, w, h);
      state.originalImageData = sourceCtx.getImageData(0, 0, w, h);

      els.previewCanvas.width = w;
      els.previewCanvas.height = h;

      state.keyColor = detectCornerColor(state.originalImageData);
      updateSwatch();

      els.fileName.textContent = state.originalFileName;
      els.fileDims.textContent = `${w} × ${h}px`;
      els.emptyState.hidden = true;
      els.workspacePanel.hidden = false;

      els.toleranceRange.value = '35';
      els.toleranceValue.textContent = '35';

      processImage();
      window.showToast('Image loaded — background auto-detected from corners');
    } catch (err) {
      window.showToast('Something went wrong reading that image.');
    }
  };
  img.onerror = () => {
    revokeUrl(objectUrl);
    window.showToast('This image could not be loaded. It may be corrupt or in an unsupported format.');
  };
  img.src = objectUrl;
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

/* ── Tolerance slider ────────────────────────────────────────── */
els.toleranceRange.addEventListener('input', () => {
  els.toleranceValue.textContent = els.toleranceRange.value;
  scheduleProcess();
});

/* ── Click-to-pick key color on the preview ─────────────────── */
els.previewCanvas.addEventListener('click', (e) => {
  if (!state.originalImageData) return;
  const rect = els.previewCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const scaleX = els.previewCanvas.width / rect.width;
  const scaleY = els.previewCanvas.height / rect.height;
  let x = Math.floor((e.clientX - rect.left) * scaleX);
  let y = Math.floor((e.clientY - rect.top) * scaleY);
  x = Math.min(Math.max(x, 0), els.previewCanvas.width - 1);
  y = Math.min(Math.max(y, 0), els.previewCanvas.height - 1);

  state.keyColor = getPixel(state.originalImageData.data, state.width, x, y);
  updateSwatch();
  scheduleProcess();
  window.showToast('Key color updated');
});

/* ── Auto-detect button ─────────────────────────────────────── */
els.autoDetectBtn.addEventListener('click', () => {
  if (!state.originalImageData) return;
  state.keyColor = detectCornerColor(state.originalImageData);
  updateSwatch();
  scheduleProcess();
  window.showToast('Re-detected background color from corners');
});

/* ── Reset ───────────────────────────────────────────────────── */
function resetAll() {
  clearTimeout(state.debounceTimer);
  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);

  state.file = null;
  state.originalFileName = '';
  state.sourceObjectUrl = null;
  state.resultObjectUrl = null;
  state.originalImageData = null;
  state.width = 0;
  state.height = 0;
  state.keyColor = { r: 128, g: 128, b: 128 };

  els.fileInput.value = '';
  els.workspacePanel.hidden = true;
  els.emptyState.hidden = false;
  els.toleranceRange.value = '35';
  els.toleranceValue.textContent = '35';
  updateSwatch();
  setDownloadReady(false);
  els.downloadBtn.href = '#';

  const ctx = els.previewCanvas.getContext('2d');
  ctx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height);
  els.previewCanvas.width = 0;
  els.previewCanvas.height = 0;
}
els.resetBtn.addEventListener('click', resetAll);

els.downloadBtn.addEventListener('click', (e) => {
  if (els.downloadBtn.hasAttribute('disabled')) e.preventDefault();
});

/* ── Cleanup on unload to avoid leaking blob URLs ──────────────── */
window.addEventListener('beforeunload', () => {
  revokeUrl(state.sourceObjectUrl);
  revokeUrl(state.resultObjectUrl);
});

document.addEventListener('DOMContentLoaded', () => {
  updateSwatch();
  setDownloadReady(false);
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
});
