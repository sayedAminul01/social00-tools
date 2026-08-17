'use strict';

/**
 * PDF to JPG Converter — 100% client-side.
 * Uses PDF.js (Mozilla's open-source PDF rendering library, loaded via
 * CDN in index.html) to render each page of a user-supplied PDF onto an
 * off-screen <canvas>, then re-encodes that canvas as a JPG via
 * canvas.toBlob(). The PDF is read locally with file.arrayBuffer() and
 * is never uploaded anywhere.
 */

// PDF.js requires an explicit worker script location or it fails silently.
// Must match the main library version loaded in index.html exactly.
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  warningState: document.getElementById('warningState'),
  filePanel: document.getElementById('filePanel'),
  fileName: document.getElementById('fileName'),
  fileSize: document.getElementById('fileSize'),
  pageCountNote: document.getElementById('pageCountNote'),
  qualitySelect: document.getElementById('qualitySelect'),
  convertBtn: document.getElementById('convertBtn'),
  resetBtn: document.getElementById('resetBtn'),
  progressNote: document.getElementById('progressNote'),
  resultPanel: document.getElementById('resultPanel'),
  pagesGrid: document.getElementById('pagesGrid'),
  downloadAllBtn: document.getElementById('downloadAllBtn'),
};

/** Current working state */
const state = {
  file: null,        // the original File
  pdfDoc: null,       // loaded PDF.js document proxy
  numPages: 0,
  pageUrls: [],        // object URLs for each rendered page JPG (revoked on reset/unload)
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

function stripExtension(name) {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

function baseName(name) {
  const withoutExt = stripExtension(name || 'document');
  return withoutExt.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'document';
}

function revokeAllPageUrls() {
  state.pageUrls.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
  });
  state.pageUrls = [];
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
  revokeAllPageUrls();
  state.file = null;
  state.pdfDoc = null;
  state.numPages = 0;

  els.fileInput.value = '';
  els.filePanel.hidden = true;
  els.resultPanel.hidden = true;
  els.progressNote.hidden = true;
  els.pagesGrid.innerHTML = '';
  els.emptyState.hidden = false;
  resetWarning();
  els.convertBtn.disabled = false;
  els.convertBtn.textContent = 'Convert to JPG';
}

async function handleFile(file) {
  resetWarning();
  if (!file) return;

  const looksLikePdf = (file.type && file.type === 'application/pdf') ||
    /\.pdf$/i.test(file.name || '');
  if (!looksLikePdf) {
    showWarning(`"${file.name}" doesn't look like a PDF file. Please choose a .pdf file.`);
    return;
  }

  if (typeof pdfjsLib === 'undefined') {
    showWarning('The PDF rendering engine failed to load. Please check your connection and reload the page.');
    return;
  }

  revokeAllPageUrls();
  els.resultPanel.hidden = true;
  els.pagesGrid.innerHTML = '';

  state.file = file;
  els.fileName.textContent = file.name;
  els.fileSize.textContent = formatBytes(file.size);
  els.emptyState.hidden = true;
  els.filePanel.hidden = false;
  els.pageCountNote.textContent = 'Loading PDF…';
  els.convertBtn.disabled = true;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    state.pdfDoc = pdfDoc;
    state.numPages = pdfDoc.numPages;
    els.pageCountNote.textContent = `${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? '' : 's'} detected.`;
    els.convertBtn.disabled = false;
  } catch (err) {
    state.pdfDoc = null;
    state.numPages = 0;
    els.pageCountNote.textContent = '';
    els.convertBtn.disabled = true;
    showWarning('This PDF could not be opened. It may be corrupted, password-protected, or not a valid PDF file.');
  }
}

function makePageCard(pageNum, url, width, height, sizeBytes, downloadName) {
  const card = document.createElement('div');
  card.className = 'page-card';

  const thumb = document.createElement('div');
  thumb.className = 'page-card-thumb';
  const img = document.createElement('img');
  img.src = url;
  img.alt = `Page ${pageNum} preview`;
  thumb.appendChild(img);

  const body = document.createElement('div');
  body.className = 'page-card-body';

  const title = document.createElement('div');
  title.className = 'page-card-title';
  title.textContent = `Page ${pageNum}`;

  const meta = document.createElement('div');
  meta.className = 'page-card-meta';
  meta.textContent = `${width} × ${height}px · ${formatBytes(sizeBytes)}`;

  const link = document.createElement('a');
  link.className = 'page-card-download';
  link.href = url;
  link.setAttribute('download', downloadName);
  link.textContent = 'Download JPG';

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(link);

  card.appendChild(thumb);
  card.appendChild(body);
  return card;
}

function renderPageToBlob(page, scale) {
  return new Promise((resolve, reject) => {
    try {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }

      // JPG has no alpha channel — fill white first so transparent PDF
      // backgrounds don't render as black in the exported file.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTask.promise.then(() => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Encoding failed')); return; }
          resolve({ blob, width: canvas.width, height: canvas.height });
        }, 'image/jpeg', 0.92);
      }, reject);
    } catch (err) {
      reject(err);
    }
  });
}

async function convertPdf() {
  if (!state.file || !state.pdfDoc) {
    showWarning('Please choose a PDF first.');
    return;
  }

  resetWarning();
  els.convertBtn.disabled = true;
  els.resetBtn.disabled = true;
  els.resultPanel.hidden = true;
  els.pagesGrid.innerHTML = '';
  revokeAllPageUrls();
  els.progressNote.hidden = false;

  const scale = parseFloat(els.qualitySelect.value) || 1.5;
  const numPages = state.numPages;
  const baseFileName = baseName(state.file.name);
  let failedPages = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    els.progressNote.textContent = `Rendering page ${pageNum} of ${numPages}…`;
    try {
      const page = await state.pdfDoc.getPage(pageNum);
      const { blob, width, height } = await renderPageToBlob(page, scale);
      const url = URL.createObjectURL(blob);
      state.pageUrls.push(url);

      const downloadName = `page-${pageNum}.jpg`;
      const card = makePageCard(pageNum, url, width, height, blob.size, downloadName);
      els.pagesGrid.appendChild(card);

      if (els.resultPanel.hidden) els.resultPanel.hidden = false;
    } catch (err) {
      failedPages++;
    }
  }

  els.progressNote.hidden = true;
  els.convertBtn.disabled = false;
  els.resetBtn.disabled = false;
  els.resultPanel.hidden = els.pagesGrid.children.length === 0;

  if (els.pagesGrid.children.length > 0) {
    if (failedPages > 0) {
      showWarning(`Converted ${els.pagesGrid.children.length} of ${numPages} pages — ${failedPages} page${failedPages === 1 ? '' : 's'} could not be rendered.`);
    }
    if (typeof showToast === 'function') showToast('PDF converted to JPG');
    els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    showWarning('None of the pages could be rendered. The PDF may be corrupted or use an unsupported feature.');
  }
}

function downloadAll() {
  const links = els.pagesGrid.querySelectorAll('a.page-card-download');
  if (!links.length) {
    if (typeof showToast === 'function') showToast('Nothing to download yet');
    return;
  }
  if (typeof showToast === 'function') {
    showToast('Downloading all pages — your browser may ask for permission');
  }
  links.forEach((link, i) => {
    setTimeout(() => link.click(), i * 300);
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
els.convertBtn.addEventListener('click', convertPdf);
els.resetBtn.addEventListener('click', resetAll);
els.downloadAllBtn.addEventListener('click', downloadAll);

/* ── Cleanup on unload to avoid leaking blob URLs ──────────────── */
window.addEventListener('beforeunload', () => {
  revokeAllPageUrls();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
});
