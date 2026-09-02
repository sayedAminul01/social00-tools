'use strict';

/**
 * Watermark PDF — 100% client-side.
 *
 * Architecture:
 *  - PDF.js renders the first applicable page onto a <canvas> purely so the
 *    user can see roughly what page they're marking. It never mutates the
 *    source file.
 *  - The live "preview" of the watermark itself is a plain CSS-positioned
 *    <div> centered over that canvas and rotated with a CSS transform —
 *    an intentionally approximate, canvas-space stand-in so the user gets
 *    instant visual feedback while dragging sliders, without re-running
 *    pdf-lib on every keystroke.
 *  - pdf-lib is invoked exactly ONCE, at export time: it loads a FRESH copy
 *    of the ORIGINAL bytes, embeds the chosen Standard-14 font, and for
 *    every selected page draws the watermark text centered on the page
 *    using real glyph-width geometry and a rotation-aware anchor offset
 *    (see computeWatermarkAnchor below) — not a naive fixed anchor point.
 *
 * Coordinate system: PDF space is points (72/inch), origin bottom-left,
 * y-up. pdf-lib's drawText() rotates the glyph run around the given (x,y)
 * anchor, and that anchor is the run's baseline-start corner, not its
 * visual center — so to make the *visual center* of the rotated text land
 * exactly on the page's center point, the anchor has to be walked back by
 * half the text's width and ~half its visual height, rotated by the same
 * angle. That's what computeWatermarkAnchor does.
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
  downloadBtn: document.getElementById('downloadBtn'),
  wmText: document.getElementById('wmText'),
  wmFont: document.getElementById('wmFont'),
  wmSize: document.getElementById('wmSize'),
  wmColor: document.getElementById('wmColor'),
  wmOpacity: document.getElementById('wmOpacity'),
  wmOpacityValue: document.getElementById('wmOpacityValue'),
  wmRotation: document.getElementById('wmRotation'),
  wmRotationValue: document.getElementById('wmRotationValue'),
  wmPageMode: document.getElementById('wmPageMode'),
  wmCustomRangeWrap: document.getElementById('wmCustomRangeWrap'),
  wmCustomRange: document.getElementById('wmCustomRange'),
  previewCanvas: document.getElementById('previewCanvas'),
  previewWatermark: document.getElementById('previewWatermark'),
  canvasHint: document.getElementById('canvasHint'),
  progressNote: document.getElementById('progressNote'),
};

const previewCtx = els.previewCanvas.getContext('2d');

/** Central application state. */
const state = {
  file: null,
  originalArrayBuffer: null, // pristine bytes, re-sliced fresh for every export
  pdfDoc: null,              // pdf.js document proxy (render-only)
  pdfPages: new Map(),       // origIndex -> pdf.js page proxy
  nativeSizes: new Map(),    // origIndex -> { width, height } at scale 1, rotation 0 (PDF points)
  numPages: 0,
  previewScale: 1,
  sizeUserModified: false,   // true once the user manually edits font size for this file
};

const FONT_MAP = {
  Helvetica: 'Helvetica',
  TimesRoman: 'TimesRoman',
  Courier: 'Courier',
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
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

function cssFamily(font) {
  if (font === 'TimesRoman') return '"Times New Roman", Times, serif';
  if (font === 'Courier') return '"Courier New", Courier, monospace';
  return 'Helvetica, Arial, sans-serif';
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

/* ══════════════════════════════════════════════════════════════
   Page-range parsing — "1-3,5" style, 1-based & inclusive
   ══════════════════════════════════════════════════════════════ */

function parsePageRange(rangeStr, numPages) {
  const trimmed = (rangeStr || '').trim();
  if (!trimmed) return { ok: false, error: 'Enter a page range, e.g. 1-3,5.' };

  const indices = new Set();
  const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { ok: false, error: 'Enter a page range, e.g. 1-3,5.' };

  for (const part of parts) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    const singleMatch = /^(\d+)$/.exec(part);
    const m = rangeMatch || singleMatch;
    if (!m) return { ok: false, error: `"${part}" isn't a valid page number or range.` };

    let start = parseInt(m[1], 10);
    let end = rangeMatch ? parseInt(m[2], 10) : start;
    if (start > end) { const t = start; start = end; end = t; }
    if (start < 1 || end > numPages) {
      return {
        ok: false,
        error: `"${part}" is out of range — this PDF has ${numPages} page${numPages === 1 ? '' : 's'}.`,
      };
    }
    for (let i = start; i <= end; i++) indices.add(i - 1);
  }
  return { ok: true, indices };
}

/* ══════════════════════════════════════════════════════════════
   The centering math — used only at export time (real geometry)
   ══════════════════════════════════════════════════════════════ */

/**
 * Returns the pdf-lib drawText() anchor (x, y) such that the *visual
 * center* of `text` (drawn at `size` with `font`, then rotated by
 * `angleDeg` around this very anchor) lands exactly on the page's
 * geometric center (pageWidth/2, pageHeight/2).
 */
function computeWatermarkAnchor(pageWidth, pageHeight, text, font, size, angleDeg) {
  const textWidth = font.widthOfTextAtSize(text, size);
  const dx = textWidth / 2;
  const dy = size * 0.35; // approximation of the text's visual half-height above baseline
  const rad = (angleDeg * Math.PI) / 180;
  const x = pageWidth / 2 - (dx * Math.cos(rad) - dy * Math.sin(rad));
  const y = pageHeight / 2 - (dx * Math.sin(rad) + dy * Math.cos(rad));
  return { x, y };
}

/* ══════════════════════════════════════════════════════════════
   pdf.js page access + native size cache
   ══════════════════════════════════════════════════════════════ */

async function getPdfPage(origIndex) {
  if (state.pdfPages.has(origIndex)) return state.pdfPages.get(origIndex);
  const page = await state.pdfDoc.getPage(origIndex + 1);
  state.pdfPages.set(origIndex, page);
  if (!state.nativeSizes.has(origIndex)) {
    const vp = page.getViewport({ scale: 1, rotation: 0 });
    state.nativeSizes.set(origIndex, { width: vp.width, height: vp.height });
  }
  return page;
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
    const forRender = buf.slice(0);
    const pdfDoc = await pdfjsLib.getDocument({ data: forRender }).promise;

    state.file = file;
    state.originalArrayBuffer = buf; // kept pristine; only ever read via .slice(0)
    state.pdfDoc = pdfDoc;
    state.pdfPages = new Map();
    state.nativeSizes = new Map();
    state.numPages = pdfDoc.numPages;
    state.sizeUserModified = false;

    els.fileName.textContent = file.name;
    els.fileSize.textContent = formatBytes(file.size);
    els.pageCountNote.textContent = `${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? '' : 's'}`;
    els.emptyState.hidden = true;
    els.editorPanel.hidden = false;

    await applySuggestedFontSize();
    await renderPreview();
    toast('PDF loaded — configure your watermark');
  } catch (err) {
    state.pdfDoc = null;
    state.originalArrayBuffer = null;
    showWarning('This PDF could not be opened. It may be corrupted, password-protected, or not a valid PDF file. Password-protected PDFs aren’t supported — remove the password with your PDF viewer first, then try again.');
  }
}

/** Scale the default font size to the page rather than using one fixed
 *  constant for every document (a 48pt default looks tiny on a poster-size
 *  page and huge on a small one). Only applied if the user hasn't already
 *  typed their own size for this file. */
async function applySuggestedFontSize() {
  if (state.sizeUserModified || !state.numPages) return;
  try {
    const page = await getPdfPage(0);
    const native = state.nativeSizes.get(0);
    const suggested = clamp(Math.round(native.width / 12), 24, 96);
    els.wmSize.value = String(suggested);
  } catch (e) { /* keep the static default on failure */ }
}

/* ══════════════════════════════════════════════════════════════
   Live preview: real page render + approximate CSS watermark overlay
   ══════════════════════════════════════════════════════════════ */

function computePreviewScale(nativeWidthPt) {
  const target = 560;
  return clamp(target / nativeWidthPt, 0.3, 2);
}

/** Which page to show in the preview: the first page in the selected
 *  range, or page 0 if "All pages" is chosen or the range is invalid. */
function getPreviewPageIndex() {
  if (els.wmPageMode.value === 'custom' && state.numPages) {
    const result = parsePageRange(els.wmCustomRange.value, state.numPages);
    if (result.ok && result.indices.size) {
      return Math.min(...Array.from(result.indices));
    }
  }
  return 0;
}

async function renderPreview() {
  if (!state.pdfDoc) return;
  const previewIdx = getPreviewPageIndex();
  const page = await getPdfPage(previewIdx);
  const native = state.nativeSizes.get(previewIdx);
  const scale = computePreviewScale(native.width);
  state.previewScale = scale;

  const viewport = page.getViewport({ scale, rotation: 0 });
  els.previewCanvas.width = Math.max(1, Math.round(viewport.width));
  els.previewCanvas.height = Math.max(1, Math.round(viewport.height));
  await page.render({ canvasContext: previewCtx, viewport }).promise;

  updatePreviewWatermarkStyle();
  els.canvasHint.textContent =
    `Previewing page ${previewIdx + 1} of ${state.numPages} — approximate; exact placement is calculated at export time.`;
}

function updatePreviewWatermarkStyle() {
  const text = els.wmText.value || '';
  const font = els.wmFont.value;
  const size = Math.max(1, parseFloat(els.wmSize.value) || 1);
  const color = els.wmColor.value;
  const opacity = clamp(parseFloat(els.wmOpacity.value) || 0, 0, 100) / 100;
  const angle = parseFloat(els.wmRotation.value) || 0;
  const scale = state.previewScale || 1;

  els.previewWatermark.textContent = text;
  els.previewWatermark.style.fontFamily = cssFamily(font);
  els.previewWatermark.style.fontSize = `${size * scale}px`;
  els.previewWatermark.style.color = color;
  els.previewWatermark.style.opacity = String(opacity);
  // PDF space is y-up, CSS/canvas space is y-down, so a pdf-lib rotation of
  // +angle appears as -angle on screen. This preview is intentionally
  // approximate; the export math below is the source of truth.
  els.previewWatermark.style.transform = `translate(-50%, -50%) rotate(${-angle}deg)`;
}

/* ══════════════════════════════════════════════════════════════
   Export — pdf-lib does the real work, exactly once
   ══════════════════════════════════════════════════════════════ */

function getSelectedPageIndices() {
  if (els.wmPageMode.value !== 'custom') return { ok: true, indices: null }; // null = all pages
  return parsePageRange(els.wmCustomRange.value, state.numPages);
}

async function exportPdf() {
  if (!state.originalArrayBuffer) { toast('Load a PDF first'); return; }

  const text = els.wmText.value;
  if (!text || !text.trim()) {
    showWarning('Enter some watermark text before exporting.');
    return;
  }

  const pageSelection = getSelectedPageIndices();
  if (!pageSelection.ok) {
    showWarning(pageSelection.error);
    return;
  }

  resetWarning();
  els.downloadBtn.disabled = true;
  els.progressNote.hidden = false;
  els.progressNote.textContent = 'Building your watermarked PDF…';
  await new Promise((r) => setTimeout(r, 0));

  try {
    const bytes = state.originalArrayBuffer.slice(0);
    const pdfDoc = await PDFLib.PDFDocument.load(bytes);

    const fontKey = els.wmFont.value;
    const stdFont = PDFLib.StandardFonts[FONT_MAP[fontKey]] || PDFLib.StandardFonts.Helvetica;
    const font = await pdfDoc.embedFont(stdFont);

    const size = Math.max(1, parseFloat(els.wmSize.value) || 48);
    const angle = parseFloat(els.wmRotation.value) || 0;
    const opacity = clamp(parseFloat(els.wmOpacity.value) || 0, 0, 100) / 100;
    const { r, g, b } = hexToRgb01(els.wmColor.value);

    const pages = pdfDoc.getPages();
    const targetIndices = pageSelection.indices ? Array.from(pageSelection.indices) : pages.map((_, i) => i);

    for (const idx of targetIndices) {
      const page = pages[idx];
      if (!page) continue;
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const { x, y } = computeWatermarkAnchor(pageWidth, pageHeight, text, font, size, angle);
      page.drawText(text, {
        x, y, size, font,
        color: PDFLib.rgb(r, g, b),
        opacity,
        rotate: PDFLib.degrees(angle),
      });
    }

    const outBytes = await pdfDoc.save();
    const blob = new Blob([outBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watermarked.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Watermarked PDF downloaded');
  } catch (err) {
    showWarning('Something went wrong building the watermarked PDF. Please try again.');
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
  state.pdfPages = new Map();
  state.nativeSizes = new Map();
  state.numPages = 0;
  state.previewScale = 1;
  state.sizeUserModified = false;

  els.fileInput.value = '';
  els.editorPanel.hidden = true;
  els.emptyState.hidden = false;
  previewCtx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height);

  els.wmText.value = 'CONFIDENTIAL';
  els.wmFont.value = 'Helvetica';
  els.wmSize.value = '48';
  els.wmColor.value = '#888888';
  els.wmOpacity.value = '30';
  els.wmOpacityValue.textContent = '30%';
  els.wmRotation.value = '45';
  els.wmRotationValue.textContent = '45°';
  els.wmPageMode.value = 'all';
  els.wmCustomRange.value = '';
  els.wmCustomRangeWrap.hidden = true;

  updatePreviewWatermarkStyle();
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

function wireOptionInputs() {
  els.wmText.addEventListener('input', updatePreviewWatermarkStyle);
  els.wmFont.addEventListener('change', updatePreviewWatermarkStyle);
  els.wmColor.addEventListener('input', updatePreviewWatermarkStyle);
  els.wmSize.addEventListener('input', () => {
    state.sizeUserModified = true;
    updatePreviewWatermarkStyle();
  });
  els.wmOpacity.addEventListener('input', () => {
    els.wmOpacityValue.textContent = `${els.wmOpacity.value}%`;
    updatePreviewWatermarkStyle();
  });
  els.wmRotation.addEventListener('input', () => {
    els.wmRotationValue.textContent = `${els.wmRotation.value}°`;
    updatePreviewWatermarkStyle();
  });
  els.wmPageMode.addEventListener('change', () => {
    els.wmCustomRangeWrap.hidden = els.wmPageMode.value !== 'custom';
    if (state.pdfDoc) renderPreview();
  });
  els.wmCustomRange.addEventListener('input', () => {
    if (state.pdfDoc) renderPreview();
  });
}

/* ══════════════════════════════════════════════════════════════
   Wire-up
   ══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');

  wireDropZone();
  wireOptionInputs();
  updatePreviewWatermarkStyle();

  els.startOverBtn.addEventListener('click', resetAll);
  els.downloadBtn.addEventListener('click', exportPdf);
});
