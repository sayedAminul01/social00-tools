'use strict';

/**
 * Add Page Numbers to PDF — 100% client-side.
 *
 * Architecture:
 *  - PDF.js renders the first (non-skipped) page onto a <canvas> for a live
 *    preview, and we draw an approximate preview of the stamp text on top
 *    with plain canvas fillText — good enough to show roughly where it
 *    will land, but not pixel-exact (canvas font metrics differ slightly
 *    from PDF font metrics).
 *  - pdf-lib is invoked exactly ONCE, at export time: it loads a FRESH copy
 *    of the ORIGINAL bytes, embeds Helvetica, and for every page computes
 *    the exact x/y in PDF-point space using `font.widthOfTextAtSize()` for
 *    real measured text width. This is the numbers that actually end up in
 *    the downloaded file — precise, not an approximation.
 *
 * Numbering semantics (documented in this page's FAQ too):
 *  - {total} always equals the document's TOTAL PHYSICAL PAGE COUNT,
 *    including a skipped first page.
 *  - "Skip first page" gives page 1 no stamp at all. The page right after
 *    it shows the chosen starting number, and numbering continues from
 *    there — the skipped page is excluded from the count, not counted as
 *    page 0.
 */

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const MARGIN = 24; // points from the page edge

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
  applyBtn: document.getElementById('applyBtn'),
  positionGrid: document.getElementById('positionGrid'),
  formatPresets: document.getElementById('formatPresets'),
  formatInput: document.getElementById('formatInput'),
  startNumberInput: document.getElementById('startNumberInput'),
  fontSizeInput: document.getElementById('fontSizeInput'),
  colorInput: document.getElementById('colorInput'),
  skipFirstCheckbox: document.getElementById('skipFirstCheckbox'),
  previewCanvas: document.getElementById('previewCanvas'),
  previewHint: document.getElementById('previewHint'),
  progressNote: document.getElementById('progressNote'),
};

const previewCtx = els.previewCanvas.getContext('2d');

/** Central application state. */
const state = {
  file: null,
  originalArrayBuffer: null, // pristine bytes, re-sliced fresh for every export
  pdfDoc: null,              // pdf.js document proxy (render-only)
  numPages: 0,
  opts: {
    position: 'bottom-center',
    format: 'Page {n} of {total}',
    startNumber: 1,
    fontSize: 11,
    color: '#444444',
    skipFirst: false,
  },
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

function hexToRgb01(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#444444');
  if (!m) return { r: 0.27, g: 0.27, b: 0.27 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

/* ══════════════════════════════════════════════════════════════
   Shared numbering logic (used by both preview and export)
   ══════════════════════════════════════════════════════════════ */

/**
 * Returns the display number for a page, or null if that page should get
 * no stamp at all (only possible when skipFirst is true and index === 0).
 * pageIndex is 0-based.
 */
function computeDisplayNumber(pageIndex, numPages, startNumber, skipFirst) {
  if (skipFirst && pageIndex === 0) return null;
  const numberedOrder = skipFirst ? pageIndex - 1 : pageIndex;
  return startNumber + numberedOrder;
}

/** {total} is always the document's total physical page count. */
function buildStampText(format, n, total) {
  return String(format).split('{n}').join(String(n)).split('{total}').join(String(total));
}

/**
 * Computes the PDF-point x,y (bottom-left origin) for a given anchor
 * position, using the ACTUAL measured text width passed in.
 */
function computeStampXY(position, textWidth, fontSize, pageWidth, pageHeight, margin) {
  let x, y;
  switch (position) {
    case 'bottom-right': x = pageWidth - textWidth - margin; y = margin; break;
    case 'bottom-left': x = margin; y = margin; break;
    case 'top-center': x = (pageWidth - textWidth) / 2; y = pageHeight - margin - fontSize; break;
    case 'top-right': x = pageWidth - textWidth - margin; y = pageHeight - margin - fontSize; break;
    case 'top-left': x = margin; y = pageHeight - margin - fontSize; break;
    case 'bottom-center':
    default: x = (pageWidth - textWidth) / 2; y = margin; break;
  }
  return { x, y };
}

function firstPreviewPageIndex() {
  if (state.opts.skipFirst && state.numPages > 1) return 1;
  return 0;
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

    els.fileName.textContent = file.name;
    els.fileSize.textContent = formatBytes(file.size);
    els.pageCountNote.textContent = `${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? '' : 's'}`;
    els.emptyState.hidden = true;
    els.editorPanel.hidden = false;

    await renderPreview();
    toast('PDF loaded — adjust options to preview the stamp');
  } catch (err) {
    state.pdfDoc = null;
    showWarning('This PDF could not be opened. It may be corrupted, password-protected, or not a valid PDF file.');
  }
}

/* ══════════════════════════════════════════════════════════════
   Live preview
   ══════════════════════════════════════════════════════════════ */

async function renderPreview() {
  if (!state.pdfDoc) return;
  els.previewHint.textContent = 'Loading preview…';

  const pageIndex = firstPreviewPageIndex();
  const page = await state.pdfDoc.getPage(pageIndex + 1);
  const native = page.getViewport({ scale: 1, rotation: 0 });
  const scale = Math.min(1.4, 520 / native.width);
  const viewport = page.getViewport({ scale, rotation: 0 });

  els.previewCanvas.width = Math.max(1, Math.round(viewport.width));
  els.previewCanvas.height = Math.max(1, Math.round(viewport.height));
  await page.render({ canvasContext: previewCtx, viewport }).promise;

  const opts = state.opts;
  const n = computeDisplayNumber(pageIndex, state.numPages, opts.startNumber, opts.skipFirst);

  if (n === null) {
    els.previewHint.textContent = `Page ${pageIndex + 1} is skipped — no stamp will be added to it.`;
    return;
  }

  const text = buildStampText(opts.format, n, state.numPages);
  previewCtx.font = `${opts.fontSize * scale}px Helvetica, Arial, sans-serif`;
  const approxWidthPt = previewCtx.measureText(text).width / scale; // rough — pdf-lib measures precisely at export
  const { x, y } = computeStampXY(opts.position, approxWidthPt, opts.fontSize, native.width, native.height, MARGIN);

  const canvasX = x * scale;
  const canvasBaselineY = viewport.height - y * scale;
  previewCtx.fillStyle = opts.color;
  previewCtx.textBaseline = 'alphabetic';
  previewCtx.fillText(text, canvasX, canvasBaselineY);

  els.previewHint.textContent = `Previewing page ${pageIndex + 1} — approximate position, exact placement is computed at export.`;
}

/* ══════════════════════════════════════════════════════════════
   Options wiring
   ══════════════════════════════════════════════════════════════ */

function setPosition(pos) {
  state.opts.position = pos;
  els.positionGrid.querySelectorAll('.pos-btn').forEach((b) => b.classList.toggle('active', b.dataset.pos === pos));
  renderPreview();
}

function setFormat(fmt) {
  state.opts.format = fmt;
  els.formatInput.value = fmt;
  els.formatPresets.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.format === fmt));
  renderPreview();
}

function wireOptions() {
  els.positionGrid.querySelectorAll('.pos-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPosition(btn.dataset.pos));
  });
  els.formatPresets.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => setFormat(btn.dataset.format));
  });
  els.formatInput.addEventListener('input', () => {
    state.opts.format = els.formatInput.value || '{n}';
    els.formatPresets.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.format === state.opts.format));
    renderPreview();
  });
  els.startNumberInput.addEventListener('input', () => {
    const v = parseInt(els.startNumberInput.value, 10);
    state.opts.startNumber = Number.isFinite(v) ? v : 1;
    renderPreview();
  });
  els.fontSizeInput.addEventListener('input', () => {
    const v = parseFloat(els.fontSizeInput.value);
    state.opts.fontSize = Number.isFinite(v) && v > 0 ? v : 11;
    renderPreview();
  });
  els.colorInput.addEventListener('input', () => {
    state.opts.color = els.colorInput.value;
    renderPreview();
  });
  els.skipFirstCheckbox.addEventListener('change', () => {
    state.opts.skipFirst = els.skipFirstCheckbox.checked;
    renderPreview();
  });
}

/* ══════════════════════════════════════════════════════════════
   Export — pdf-lib does the real work, exactly once
   ══════════════════════════════════════════════════════════════ */

function downloadName(orig) {
  const base = (orig || 'document').replace(/\.pdf$/i, '');
  return `${base}-numbered.pdf`;
}

async function exportPdf() {
  if (!state.originalArrayBuffer) { toast('Load a PDF first'); return; }

  els.applyBtn.disabled = true;
  els.progressNote.hidden = false;
  els.progressNote.textContent = 'Stamping page numbers…';
  await new Promise((r) => setTimeout(r, 0));

  try {
    const bytes = state.originalArrayBuffer.slice(0);
    const doc = await PDFLib.PDFDocument.load(bytes);
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages = doc.getPages();
    const opts = state.opts;
    const c = hexToRgb01(opts.color);
    const total = pages.length; // {total} = total physical page count, see FAQ

    for (let i = 0; i < pages.length; i++) {
      const n = computeDisplayNumber(i, total, opts.startNumber, opts.skipFirst);
      if (n === null) continue; // skipped page — no stamp

      const page = pages[i];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const text = buildStampText(opts.format, n, total);
      const textWidth = font.widthOfTextAtSize(text, opts.fontSize);
      const { x, y } = computeStampXY(opts.position, textWidth, opts.fontSize, pageWidth, pageHeight, MARGIN);

      page.drawText(text, { x, y, size: opts.fontSize, font, color: PDFLib.rgb(c.r, c.g, c.b) });
    }

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
    toast('Numbered PDF downloaded');
  } catch (err) {
    showWarning('Something went wrong adding page numbers. Please try again.');
  } finally {
    els.applyBtn.disabled = false;
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

  els.fileInput.value = '';
  els.editorPanel.hidden = true;
  els.emptyState.hidden = false;
  previewCtx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height);
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
  wireOptions();
  els.startOverBtn.addEventListener('click', resetAll);
  els.applyBtn.addEventListener('click', exportPdf);
});
