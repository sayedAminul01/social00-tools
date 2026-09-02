'use strict';

/**
 * Split PDF — 100% client-side.
 *
 * PDF.js renders a thumbnail for every page so the user can see and check
 * the ones they want — it never mutates the source file. The original
 * file bytes are kept pristine (re-sliced fresh on every use) so pdf-lib
 * can load a clean copy whenever an output file is built. Two outputs are
 * supported: a single PDF containing only the checked pages (in ascending
 * original order), or one single-page PDF per checked page bundled into a
 * ZIP with JSZip. Nothing is ever uploaded anywhere.
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
  startOverBtn: document.getElementById('startOverBtn'),
  rangeInput: document.getElementById('rangeInput'),
  rangeHint: document.getElementById('rangeHint'),
  progressNote: document.getElementById('progressNote'),
  pageGrid: document.getElementById('pageGrid'),
  extractBtn: document.getElementById('extractBtn'),
  splitBtn: document.getElementById('splitBtn'),
  workNote: document.getElementById('workNote'),
  resultPanel: document.getElementById('resultPanel'),
  resultSummary: document.getElementById('resultSummary'),
  previewWrap: document.getElementById('previewWrap'),
  pdfFrame: document.getElementById('pdfFrame'),
  downloadBtn: document.getElementById('downloadBtn'),
};

/** Central application state. */
const state = {
  file: null,
  originalBytes: null,   // pristine bytes, re-sliced fresh for every pdf-lib load
  pdfDoc: null,           // pdf.js document proxy (render-only)
  numPages: 0,
  thumbUrls: {},          // pageNum(1-indexed) -> data URL
  selectedPages: new Set(), // 1-indexed page numbers the user has checked
  resultObjectUrl: null,
};

/* ══════════════════════════════════════════════════════════════
   Small helpers
   ══════════════════════════════════════════════════════════════ */

function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

/** Races a promise against a timeout so a stuck render never blocks the pipeline. */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timed out')), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024, i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

function revokeUrl(url) {
  if (url) { try { URL.revokeObjectURL(url); } catch (e) { /* noop */ } }
}

function resetWarning() { els.warningState.hidden = true; els.warningState.textContent = ''; }
function showWarning(msg) { els.warningState.hidden = false; els.warningState.textContent = msg; }

/* ══════════════════════════════════════════════════════════════
   Page range <-> checkbox sync
   ══════════════════════════════════════════════════════════════ */

function parseRangeString(str, maxPage) {
  const set = new Set();
  if (!str) return set;
  const parts = String(str).split(',');
  for (const raw of parts) {
    const token = raw.trim();
    if (!token) continue;
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      let a = parseInt(rangeMatch[1], 10);
      let b = parseInt(rangeMatch[2], 10);
      if (a > b) { const t = a; a = b; b = t; }
      for (let p = a; p <= b; p++) {
        if (p >= 1 && p <= maxPage) set.add(p);
      }
    } else if (/^\d+$/.test(token)) {
      const p = parseInt(token, 10);
      if (p >= 1 && p <= maxPage) set.add(p);
    }
    // Anything else (garbage, out-of-bounds) is silently ignored.
  }
  return set;
}

function collapseToRangeString(sortedPages) {
  if (!sortedPages.length) return '';
  const parts = [];
  let start = sortedPages[0];
  let prev = start;
  for (let i = 1; i <= sortedPages.length; i++) {
    const cur = sortedPages[i];
    if (cur === prev + 1) { prev = cur; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    if (i < sortedPages.length) { start = cur; prev = cur; }
  }
  return parts.join(',');
}

function sortedSelection() {
  return Array.from(state.selectedPages).sort((a, b) => a - b);
}

function updateRangeHint() {
  const n = state.selectedPages.size;
  if (n === 0) {
    els.rangeHint.textContent = 'No pages selected — all pages will be used for Split Into Separate Files.';
  } else {
    const pageWord = n === 1 ? 'page' : 'pages';
    els.rangeHint.textContent = `${n} ${pageWord} selected: ${collapseToRangeString(sortedSelection())}`;
  }
}

function syncRangeInputFromSelection() {
  els.rangeInput.value = collapseToRangeString(sortedSelection());
  updateRangeHint();
}

function syncCheckboxesFromSelection() {
  const cells = els.pageGrid.querySelectorAll('.page-cell');
  cells.forEach((cell) => {
    const p = parseInt(cell.dataset.page, 10);
    const checked = state.selectedPages.has(p);
    const cb = cell.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = checked;
    cell.classList.toggle('selected', checked);
  });
}

function togglePage(p, checked) {
  if (checked) state.selectedPages.add(p);
  else state.selectedPages.delete(p);
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
    const bytes = new Uint8Array(buf);
    const pdfDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;

    state.file = file;
    state.originalBytes = bytes;
    state.pdfDoc = pdfDoc;
    state.numPages = pdfDoc.numPages;
    state.thumbUrls = {};
    state.selectedPages = new Set();
    revokeResultUrl();

    els.fileName.textContent = file.name;
    els.fileSize.textContent = formatBytes(file.size);
    els.pageCountNote.textContent = `${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? '' : 's'}`;
    els.emptyState.hidden = true;
    els.editorPanel.hidden = false;
    els.resultPanel.hidden = true;
    els.rangeInput.value = '';

    els.progressNote.hidden = false;
    els.progressNote.textContent = 'Rendering page thumbnails…';
    await buildPageGrid();
    els.progressNote.hidden = true;

    updateRangeHint();
    toast('PDF loaded — select pages below');
  } catch (err) {
    state.pdfDoc = null;
    showWarning('This PDF could not be opened. It may be corrupted, password-protected, or not a valid PDF file.');
  }
}

async function buildPageGrid() {
  for (let i = 1; i <= state.numPages; i++) {
    try {
      const page = await state.pdfDoc.getPage(i);
      const native = page.getViewport({ scale: 1 });
      const scale = Math.min(1, 130 / native.width);
      const viewport = page.getViewport({ scale });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(viewport.width));
      c.height = Math.max(1, Math.round(viewport.height));
      await withTimeout(page.render({ canvasContext: c.getContext('2d'), viewport }).promise, 8000);
      state.thumbUrls[i] = c.toDataURL('image/png');
    } catch (err) {
      // A stuck or failed thumbnail render shouldn't block page selection —
      // the cell just renders without a preview image.
      state.thumbUrls[i] = '';
    }
  }
  renderPageGrid();
}

function renderPageGrid() {
  els.pageGrid.innerHTML = '';
  for (let i = 1; i <= state.numPages; i++) {
    const cell = document.createElement('div');
    cell.className = 'page-cell';
    cell.dataset.page = String(i);

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'page-cell-thumb-wrap';
    const img = document.createElement('img');
    img.className = 'page-cell-thumb';
    img.src = state.thumbUrls[i] || '';
    img.alt = `Page ${i} preview`;
    thumbWrap.appendChild(img);

    const foot = document.createElement('div');
    foot.className = 'page-cell-foot';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      togglePage(i, cb.checked);
      cell.classList.toggle('selected', cb.checked);
      syncRangeInputFromSelection();
    });
    const span = document.createElement('span');
    span.textContent = `Page ${i}`;
    foot.appendChild(cb);
    foot.appendChild(span);

    cell.addEventListener('click', (e) => {
      if (e.target === cb) return; // checkbox handles its own toggle
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });

    cell.appendChild(thumbWrap);
    cell.appendChild(foot);
    els.pageGrid.appendChild(cell);
  }
  syncCheckboxesFromSelection();
}

/* ══════════════════════════════════════════════════════════════
   Building output PDFs
   ══════════════════════════════════════════════════════════════ */

async function buildSinglePagePdf(srcDoc, pageIndex) {
  const newDoc = await PDFLib.PDFDocument.create();
  const [copied] = await newDoc.copyPages(srcDoc, [pageIndex]);
  newDoc.addPage(copied);
  return newDoc.save();
}

function revokeResultUrl() {
  revokeUrl(state.resultObjectUrl);
  state.resultObjectUrl = null;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function extractSelectedPages() {
  if (!state.originalBytes) { toast('Load a PDF first'); return; }
  const pages = sortedSelection();
  if (!pages.length) { toast('Check at least one page to extract'); return; }

  setWorking(true, 'Extracting selected pages…');
  await new Promise((r) => setTimeout(r, 0));

  try {
    const srcDoc = await PDFLib.PDFDocument.load(state.originalBytes.slice(0));
    const indices = pages.map((p) => p - 1);
    const newDoc = await PDFLib.PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((p) => newDoc.addPage(p));

    const outBytes = await newDoc.save();
    const blob = new Blob([outBytes], { type: 'application/pdf' });

    triggerDownload(blob, 'extracted.pdf');

    revokeResultUrl();
    const previewUrl = URL.createObjectURL(blob);
    state.resultObjectUrl = previewUrl;
    els.pdfFrame.src = previewUrl;
    els.previewWrap.hidden = false;
    els.downloadBtn.href = previewUrl;
    els.downloadBtn.download = 'extracted.pdf';

    const pageWord = pages.length === 1 ? 'page' : 'pages';
    els.resultSummary.textContent = `Extracted ${pages.length} ${pageWord} (${collapseToRangeString(pages)}) · ${formatBytes(blob.size)}`;
    els.resultPanel.hidden = false;
    els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast(`Extracted ${pages.length} ${pageWord} — download started`);
  } catch (err) {
    toast('Something went wrong extracting those pages. Try again.');
  } finally {
    setWorking(false);
  }
}

async function splitIntoSeparateFiles() {
  if (!state.originalBytes) { toast('Load a PDF first'); return; }
  if (typeof JSZip === 'undefined') { toast('The ZIP engine failed to load. Please reload the page.'); return; }

  const selected = sortedSelection();
  const pages = selected.length ? selected : Array.from({ length: state.numPages }, (_, i) => i + 1);

  setWorking(true, `Building ${pages.length} file${pages.length === 1 ? '' : 's'}…`);
  await new Promise((r) => setTimeout(r, 0));

  try {
    const srcDoc = await PDFLib.PDFDocument.load(state.originalBytes.slice(0));
    const zip = new JSZip();

    for (const p of pages) {
      const bytes = await buildSinglePagePdf(srcDoc, p - 1);
      zip.file(`page-${p}.pdf`, bytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(zipBlob, 'split-pages.zip');

    revokeResultUrl();
    els.previewWrap.hidden = true;
    const url = URL.createObjectURL(zipBlob);
    state.resultObjectUrl = url;
    els.downloadBtn.href = url;
    els.downloadBtn.download = 'split-pages.zip';

    els.resultSummary.textContent = `Split into ${pages.length} file${pages.length === 1 ? '' : 's'} · ${formatBytes(zipBlob.size)} ZIP`;
    els.resultPanel.hidden = false;
    els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast(`Split into ${pages.length} file${pages.length === 1 ? '' : 's'} — download started`);
  } catch (err) {
    toast('Something went wrong splitting the PDF. Try again.');
  } finally {
    setWorking(false);
  }
}

function setWorking(isWorking, msg) {
  els.extractBtn.disabled = isWorking;
  els.splitBtn.disabled = isWorking;
  els.workNote.hidden = !isWorking;
  if (isWorking) els.workNote.textContent = msg || 'Working…';
}

/* ══════════════════════════════════════════════════════════════
   Reset / drop zone wiring
   ══════════════════════════════════════════════════════════════ */

function resetAll() {
  state.file = null;
  state.originalBytes = null;
  state.pdfDoc = null;
  state.numPages = 0;
  state.thumbUrls = {};
  state.selectedPages = new Set();
  revokeResultUrl();

  els.fileInput.value = '';
  els.editorPanel.hidden = true;
  els.emptyState.hidden = false;
  els.pageGrid.innerHTML = '';
  els.rangeInput.value = '';
  els.resultPanel.hidden = true;
  els.previewWrap.hidden = false;
  els.pdfFrame.src = '';
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

  els.rangeInput.addEventListener('input', () => {
    const parsed = parseRangeString(els.rangeInput.value, state.numPages);
    state.selectedPages = parsed;
    syncCheckboxesFromSelection();
    updateRangeHint();
  });

  els.startOverBtn.addEventListener('click', resetAll);
  els.extractBtn.addEventListener('click', extractSelectedPages);
  els.splitBtn.addEventListener('click', splitIntoSeparateFiles);
});

window.addEventListener('beforeunload', () => {
  revokeResultUrl();
});
