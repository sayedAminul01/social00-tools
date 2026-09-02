'use strict';

/**
 * Rotate PDF — 100% client-side.
 *
 * Architecture:
 *  - PDF.js renders a low-res thumbnail for every page so the user can see
 *    what they're rotating. It never touches the source file.
 *  - We keep our OWN in-memory list of per-page rotation deltas (multiples
 *    of 90, normalized to 0/90/180/270). Nothing is applied to any file
 *    until export — thumbnails just get a CSS `transform: rotate()` as
 *    live visual feedback.
 *  - pdf-lib is invoked exactly ONCE, at export time: it loads a FRESH copy
 *    of the ORIGINAL bytes and, for every page, adds the queued delta on
 *    top of whatever rotation the page already had:
 *      page.setRotation(PDFLib.degrees((existingRotation + delta) % 360))
 *    This preserves any rotation already baked into the source PDF instead
 *    of overwriting it.
 */

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  warningState: document.getElementById('warningState'),
  editorPanel: document.getElementById('editorPanel'),
  fileName: document.getElementById('fileName'),
  fileSize: document.getElementById('fileSize'),
  pageCountNote: document.getElementById('pageCountNote'),
  rotateAllBtn: document.getElementById('rotateAllBtn'),
  startOverBtn: document.getElementById('startOverBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  rotateGrid: document.getElementById('rotateGrid'),
  progressNote: document.getElementById('progressNote'),
};

/** Central application state. */
const state = {
  file: null,
  originalArrayBuffer: null, // pristine bytes, re-sliced fresh for every export
  pdfDoc: null,              // pdf.js document proxy (render-only)
  numPages: 0,
  thumbDataUrls: {},         // pageIndex(0-based) -> data URL
  pages: [],                 // [{ index, rotation }] rotation is a queued delta, normalized 0-359
};

/* ══════════════════════════════════════════════════════════════
   Small helpers
   ══════════════════════════════════════════════════════════════ */

function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024, i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

function resetWarning() { els.warningState.hidden = true; els.warningState.textContent = ''; }
function showWarning(msg) { els.warningState.hidden = false; els.warningState.textContent = msg; }

/** Normalize any integer degree value (positive or negative) to 0/90/180/270. */
function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

/* ══════════════════════════════════════════════════════════════
   File loading
   ══════════════════════════════════════════════════════════════ */

async function handleFile(file) {
  resetWarning();
  if (!file) return;

  const looksLikePdf = (file.type && file.type === 'application/pdf') || /\.pdf$/i.test(file.name || '');
  if (!looksLikePdf) {
    showWarning(`"${file.name}" doesn't look like a PDF file. Please choose a .pdf file.`);
    return;
  }
  if (typeof pdfjsLib === 'undefined' || typeof PDFLib === 'undefined') {
    showWarning('The PDF engine failed to load. Please check your connection and reload the page.');
    return;
  }

  try {
    const buf = await file.arrayBuffer();
    state.originalArrayBuffer = buf; // kept pristine; only ever read via .slice(0)
    const forRender = buf.slice(0);
    const pdfDoc = await pdfjsLib.getDocument({ data: forRender }).promise;

    state.file = file;
    state.pdfDoc = pdfDoc;
    state.numPages = pdfDoc.numPages;
    state.thumbDataUrls = {};
    state.pages = Array.from({ length: pdfDoc.numPages }, (_, i) => ({ index: i, rotation: 0 }));

    els.fileName.textContent = file.name;
    els.fileSize.textContent = formatBytes(file.size);
    els.pageCountNote.textContent = `${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? '' : 's'}`;
    els.emptyState.hidden = true;
    els.editorPanel.hidden = false;

    els.progressNote.hidden = false;
    els.progressNote.textContent = 'Rendering page thumbnails…';
    await buildThumbnails();
    els.progressNote.hidden = true;

    renderGrid();
    toast('PDF loaded — click a rotate button on any page');
  } catch (err) {
    state.pdfDoc = null;
    showWarning('This PDF could not be opened. It may be corrupted, password-protected, or not a valid PDF file.');
  }
}

async function buildThumbnails() {
  for (let i = 0; i < state.numPages; i++) {
    const page = await state.pdfDoc.getPage(i + 1);
    const native = page.getViewport({ scale: 1, rotation: 0 });
    const scale = Math.min(1, 160 / native.width);
    const viewport = page.getViewport({ scale, rotation: 0 });
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(viewport.width));
    c.height = Math.max(1, Math.round(viewport.height));
    const cctx = c.getContext('2d');
    await page.render({ canvasContext: cctx, viewport }).promise;
    state.thumbDataUrls[i] = c.toDataURL('image/png');
  }
}

/* ══════════════════════════════════════════════════════════════
   Page grid: rotate-left / rotate-right / rotate-all
   ══════════════════════════════════════════════════════════════ */

function renderGrid() {
  els.rotateGrid.innerHTML = '';
  state.pages.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'rotate-item';
    li.dataset.pageIndex = String(p.index);

    const num = document.createElement('span');
    num.className = 'rotate-num';
    num.textContent = `Page ${p.index + 1}`;

    const wrap = document.createElement('div');
    wrap.className = 'rotate-thumb-wrap';
    const img = document.createElement('img');
    img.className = 'rotate-thumb-img';
    img.alt = `Page ${p.index + 1} preview`;
    img.src = state.thumbDataUrls[p.index] || '';
    img.style.transform = `rotate(${p.rotation}deg)`;
    wrap.appendChild(img);

    const actions = document.createElement('div');
    actions.className = 'rotate-actions';
    const leftBtn = document.createElement('button');
    leftBtn.type = 'button';
    leftBtn.className = 'rotate-btn';
    leftBtn.title = 'Rotate left 90°';
    leftBtn.textContent = '⟲';
    leftBtn.addEventListener('click', () => rotatePage(p.index, -90));

    const rightBtn = document.createElement('button');
    rightBtn.type = 'button';
    rightBtn.className = 'rotate-btn';
    rightBtn.title = 'Rotate right 90°';
    rightBtn.textContent = '⟳';
    rightBtn.addEventListener('click', () => rotatePage(p.index, 90));

    actions.append(leftBtn, rightBtn);

    const deg = document.createElement('span');
    deg.className = 'rotate-deg';
    deg.textContent = `${p.rotation}°`;

    li.append(num, wrap, actions, deg);
    els.rotateGrid.appendChild(li);
  });
}

function rotatePage(index, delta) {
  const p = state.pages.find((pg) => pg.index === index);
  if (!p) return;
  p.rotation = normalizeDeg(p.rotation + delta);
  updatePageDom(p);
}

function rotateAll(delta) {
  state.pages.forEach((p) => { p.rotation = normalizeDeg(p.rotation + delta); });
  renderGrid();
}

function updatePageDom(p) {
  const li = els.rotateGrid.querySelector(`li[data-page-index="${p.index}"]`);
  if (!li) return;
  const img = li.querySelector('.rotate-thumb-img');
  const deg = li.querySelector('.rotate-deg');
  if (img) img.style.transform = `rotate(${p.rotation}deg)`;
  if (deg) deg.textContent = `${p.rotation}°`;
}

/* ══════════════════════════════════════════════════════════════
   Export — pdf-lib does the real work, exactly once
   ══════════════════════════════════════════════════════════════ */

function downloadName(orig) {
  const base = (orig || 'document').replace(/\.pdf$/i, '');
  return `${base}-rotated.pdf`;
}

async function exportPdf() {
  if (!state.originalArrayBuffer) { toast('Load a PDF first'); return; }

  els.downloadBtn.disabled = true;
  els.progressNote.hidden = false;
  els.progressNote.textContent = 'Building your rotated PDF…';
  await new Promise((r) => setTimeout(r, 0));

  try {
    const bytes = state.originalArrayBuffer.slice(0);
    const doc = await PDFLib.PDFDocument.load(bytes);
    const docPages = doc.getPages();

    state.pages.forEach((p) => {
      const page = docPages[p.index];
      if (!page) return;
      const existingRotation = (page.getRotation && page.getRotation().angle) || 0;
      page.setRotation(PDFLib.degrees(normalizeDeg(existingRotation + p.rotation)));
    });

    const outBytes = await doc.save();
    const blob = new Blob([outBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName(state.file && state.file.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Rotated PDF downloaded');
  } catch (err) {
    showWarning('Something went wrong building the rotated PDF. Please try again.');
  } finally {
    els.downloadBtn.disabled = false;
    els.progressNote.hidden = true;
  }
}

/* ══════════════════════════════════════════════════════════════
   Reset / drop zone wiring
   ══════════════════════════════════════════════════════════════ */

function resetAll() {
  state.file = null;
  state.originalArrayBuffer = null;
  state.pdfDoc = null;
  state.numPages = 0;
  state.thumbDataUrls = {};
  state.pages = [];

  els.fileInput.value = '';
  els.editorPanel.hidden = true;
  els.emptyState.hidden = false;
  els.rotateGrid.innerHTML = '';
  resetWarning();
}

function wireDropZone() {
  els.dropZone.addEventListener('click', () => els.fileInput.click());
  els.dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach((evt) => {
    els.dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); els.dropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'dragend'].forEach((evt) => {
    els.dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); els.dropZone.classList.remove('drag-over'); });
  });
  els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation();
    els.dropZone.classList.remove('drag-over');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  els.fileInput.addEventListener('change', () => {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (file) handleFile(file);
  });
}

/* ══════════════════════════════════════════════════════════════
   Wire-up
   ══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');

  wireDropZone();
  els.rotateAllBtn.addEventListener('click', () => rotateAll(90));
  els.startOverBtn.addEventListener('click', resetAll);
  els.downloadBtn.addEventListener('click', exportPdf);
});
