'use strict';

/**
 * Compress PDF — 100% client-side.
 *
 * SCOPE (deliberately conservative — see the tool's own FAQ):
 *  - Only images using the standard /DCTDecode (JPEG) filter are touched.
 *  - Only when the color space is one we're certain round-trips safely
 *    (DeviceGray / DeviceRGB / CalGray / CalRGB / none) with 8 bits per
 *    component, no soft mask, no explicit mask, no custom Decode array.
 *  - Each matching image is decoded, optionally downscaled to a 1600px
 *    longer-side cap, and re-encoded as JPEG at the chosen quality. The
 *    original stream is only replaced if the new bytes are ACTUALLY
 *    smaller — otherwise that image is left untouched.
 *  - Everything else (fonts, text, vector graphics, non-JPEG images,
 *    CMYK/indexed images, images with transparency, page structure) is
 *    never modified.
 *  - If a document has no compressible images, or nothing could safely
 *    be shrunk, the ORIGINAL file bytes are handed back unchanged rather
 *    than re-serializing the document for no reason.
 */

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const QUALITY_PRESETS = {
  low: { quality: 0.8, maxDim: null, label: 'Low compression' },
  recommended: { quality: 0.6, maxDim: 1600, label: 'Recommended' },
  high: { quality: 0.4, maxDim: 1600, label: 'High compression' },
};

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  warningState: document.getElementById('warningState'),
  compressPanel: document.getElementById('compressPanel'),
  fileName: document.getElementById('fileName'),
  fileSize: document.getElementById('fileSize'),
  pageCountNote: document.getElementById('pageCountNote'),
  startOverBtn: document.getElementById('startOverBtn'),
  qualitySelect: document.getElementById('qualitySelect'),
  compressBtn: document.getElementById('compressBtn'),
  progressNote: document.getElementById('progressNote'),
  resultsBox: document.getElementById('resultsBox'),
  origSizeVal: document.getElementById('origSizeVal'),
  newSizeVal: document.getElementById('newSizeVal'),
  savedVal: document.getElementById('savedVal'),
  resultsMessage: document.getElementById('resultsMessage'),
  downloadBtn: document.getElementById('downloadBtn'),
};

/** Central application state. */
const state = {
  file: null,
  originalArrayBuffer: null, // pristine bytes, re-sliced fresh for every run
  numPages: 0,
  outBytes: null,   // Uint8Array ready to download
  outIsOriginal: false,
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

function yieldToUi() { return new Promise((r) => setTimeout(r, 0)); }

function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/* ══════════════════════════════════════════════════════════════
   Core: re-encode one JPEG's raw bytes at a target quality / size cap
   ══════════════════════════════════════════════════════════════ */

async function reencodeJpegBytes(rawBytes, quality, maxDim) {
  const blob = new Blob([rawBytes], { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageEl(url);
    let w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return null;
    if (maxDim && Math.max(w, h) > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const outBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!outBlob) return null;
    const outBytes = new Uint8Array(await outBlob.arrayBuffer());
    return { bytes: outBytes, width: w, height: h };
  } catch (e) {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ══════════════════════════════════════════════════════════════
   Core: walk every page's /Resources /XObject dict via pdf-lib's
   low-level API and re-encode only unambiguous DCTDecode images.
   Mutates pdfDoc in place; caller decides whether/when to .save().
   ══════════════════════════════════════════════════════════════ */

async function compressPdfDocument(pdfDoc, opts, onProgress) {
  const PDFName = PDFLib.PDFName;
  const PDFDict = PDFLib.PDFDict;
  const PDFNumber = PDFLib.PDFNumber;

  const stats = {
    imagesFound: 0,       // unambiguous DCTDecode images we were willing to touch
    imagesCompressed: 0,  // of those, how many actually got replaced (smaller result)
    imagesUnchanged: 0,   // found but re-encode wasn't smaller, left as-is
    imagesSkipped: 0,     // non-DCTDecode or otherwise-unsafe images, never touched
    bytesBefore: 0,
    bytesAfter: 0,
  };

  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (onProgress) onProgress(i + 1, pages.length);
    await yieldToUi();

    const page = pages[i];
    let resources;
    try { resources = page.node.Resources(); } catch (e) { resources = undefined; }
    if (!resources) continue;

    let xobjects;
    try { xobjects = resources.lookup(PDFName.of('XObject'), PDFDict); } catch (e) { xobjects = undefined; }
    if (!xobjects) continue;

    let keys;
    try { keys = xobjects.keys(); } catch (e) { keys = []; }

    for (const key of keys) {
      let xobj;
      try { xobj = xobjects.lookup(key); } catch (e) { continue; }
      if (!xobj || !xobj.dict || typeof xobj.getContents !== 'function') continue;
      const dict = xobj.dict;

      const subtype = dict.get(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;

      // Only act on an unambiguous, single-filter DCTDecode image — a bare
      // PDFName, never an array (which would mean chained/multiple filters).
      const filter = dict.get(PDFName.of('Filter'));
      if (!filter || filter.toString() !== '/DCTDecode') { stats.imagesSkipped++; continue; }

      // Extra conservative safety net: skip anything whose color space we
      // aren't 100% sure re-encodes correctly as a plain RGB/gray JPEG.
      const csObj = dict.get(PDFName.of('ColorSpace'));
      const csStr = csObj ? csObj.toString() : '';
      const safeColorSpace = csStr === '' || csStr === '/DeviceGray' || csStr === '/DeviceRGB' || csStr === '/CalRGB' || csStr === '/CalGray';
      if (!safeColorSpace) { stats.imagesSkipped++; continue; }

      const bpc = dict.get(PDFName.of('BitsPerComponent'));
      if (bpc && typeof bpc.asNumber === 'function' && bpc.asNumber() !== 8) { stats.imagesSkipped++; continue; }

      // Skip images with a soft mask, explicit mask, or custom Decode array —
      // re-encoding could change how they composite, so leave them alone.
      if (dict.get(PDFName.of('SMask')) || dict.get(PDFName.of('Mask')) || dict.get(PDFName.of('Decode'))) {
        stats.imagesSkipped++;
        continue;
      }

      stats.imagesFound++;

      let rawBytes;
      try { rawBytes = xobj.getContents(); } catch (e) { rawBytes = null; }
      if (!rawBytes || !rawBytes.length) { stats.imagesUnchanged++; continue; }

      const result = await reencodeJpegBytes(rawBytes, opts.quality, opts.maxDim);
      if (!result || !result.bytes || !result.bytes.length) { stats.imagesUnchanged++; continue; }

      // Only swap in the new bytes if they're genuinely smaller — never
      // trade a bigger or lower-quality image for zero gain.
      if (result.bytes.length < rawBytes.length) {
        xobj.contents = result.bytes;
        dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
        dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
        dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
        dict.set(PDFName.of('Width'), PDFNumber.of(result.width));
        dict.set(PDFName.of('Height'), PDFNumber.of(result.height));
        dict.set(PDFName.of('Length'), PDFNumber.of(result.bytes.length));
        stats.imagesCompressed++;
        stats.bytesBefore += rawBytes.length;
        stats.bytesAfter += result.bytes.length;
      } else {
        stats.imagesUnchanged++;
      }
    }
  }

  return stats;
}

/* ══════════════════════════════════════════════════════════════
   File loading
   ══════════════════════════════════════════════════════════════ */

function getSelectedPresetKey() {
  const checked = els.qualitySelect.querySelector('input[name="qualityLevel"]:checked');
  return (checked && checked.value) || 'recommended';
}

function updateQualitySelectVisual() {
  els.qualitySelect.querySelectorAll('.quality-option').forEach((label) => {
    const input = label.querySelector('input[type="radio"]');
    label.classList.toggle('selected', !!(input && input.checked));
  });
}

function resetResults() {
  els.resultsBox.hidden = true;
  els.resultsMessage.textContent = '';
  els.origSizeVal.textContent = '—';
  els.newSizeVal.textContent = '—';
  els.savedVal.textContent = '—';
  state.outBytes = null;
  state.outIsOriginal = false;
}

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
    const probeDoc = await PDFLib.PDFDocument.load(buf.slice(0));
    const numPages = probeDoc.getPageCount();

    state.file = file;
    state.originalArrayBuffer = buf;
    state.numPages = numPages;
    resetResults();

    els.fileName.textContent = file.name;
    els.fileSize.textContent = formatBytes(file.size);
    els.pageCountNote.textContent = `${numPages} page${numPages === 1 ? '' : 's'}`;
    els.emptyState.hidden = true;
    els.compressPanel.hidden = false;
    updateQualitySelectVisual();

    toast('PDF loaded — choose a compression level and compress');
  } catch (err) {
    state.file = null;
    state.originalArrayBuffer = null;
    showWarning('This PDF could not be opened. It may be corrupted, password-protected, or not a valid PDF file.');
  }
}

/* ══════════════════════════════════════════════════════════════
   Compress action
   ══════════════════════════════════════════════════════════════ */

function showProgress(msg) {
  els.progressNote.hidden = false;
  els.progressNote.textContent = msg;
}
function hideProgress() {
  els.progressNote.hidden = true;
}

async function runCompress() {
  if (!state.originalArrayBuffer) { toast('Load a PDF first'); return; }

  els.compressBtn.disabled = true;
  resetResults();
  showProgress('Preparing…');
  await yieldToUi();

  try {
    const presetKey = getSelectedPresetKey();
    const preset = QUALITY_PRESETS[presetKey] || QUALITY_PRESETS.recommended;

    const bytes = state.originalArrayBuffer.slice(0);
    const pdfDoc = await PDFLib.PDFDocument.load(bytes);

    const stats = await compressPdfDocument(pdfDoc, preset, (cur, total) => {
      showProgress(`Compressing… analyzing page ${cur} of ${total}`);
    });

    const origSize = state.file.size;

    if (stats.imagesFound === 0) {
      // Nothing this tool can safely compress — hand back the original file
      // untouched rather than pretending to have done something.
      state.outBytes = new Uint8Array(state.originalArrayBuffer.slice(0));
      state.outIsOriginal = true;
      els.origSizeVal.textContent = formatBytes(origSize);
      els.newSizeVal.textContent = formatBytes(origSize);
      els.savedVal.textContent = '0%';
      els.resultsMessage.textContent = 'No compressible JPEG images found in this PDF — this tool can’t shrink text, vector graphics, or images in other formats it deliberately leaves untouched. You can still download the original file below.';
      els.resultsBox.hidden = false;
    } else if (stats.imagesCompressed === 0) {
      // Images exist, but none could be safely shrunk — again, hand back
      // the original rather than re-serializing for no real gain.
      state.outBytes = new Uint8Array(state.originalArrayBuffer.slice(0));
      state.outIsOriginal = true;
      els.origSizeVal.textContent = formatBytes(origSize);
      els.newSizeVal.textContent = formatBytes(origSize);
      els.savedVal.textContent = '0%';
      els.resultsMessage.textContent = 'This PDF’s images are already highly compressed (or use a format this tool doesn’t touch) — nothing could be safely shrunk further. You can still download the original file below.';
      els.resultsBox.hidden = false;
    } else {
      showProgress('Finalizing your compressed PDF…');
      await yieldToUi();
      const outBytes = await pdfDoc.save();
      state.outBytes = outBytes;
      state.outIsOriginal = false;

      const newSize = outBytes.length;
      els.origSizeVal.textContent = formatBytes(origSize);
      els.newSizeVal.textContent = formatBytes(newSize);

      if (newSize < origSize) {
        const pct = Math.round((1 - newSize / origSize) * 100);
        els.savedVal.textContent = `${pct}%`;
        els.resultsMessage.textContent = `Done — ${stats.imagesCompressed} image${stats.imagesCompressed === 1 ? '' : 's'} re-encoded, and your file is now ${pct}% smaller.`;
      } else {
        els.savedVal.textContent = '0%';
        els.resultsMessage.textContent = 'This PDF was already tightly optimized — the compressed version isn’t smaller overall, even though individual images were re-encoded. You can still download it below if you’d like.';
      }
      els.resultsBox.hidden = false;
    }
  } catch (err) {
    showWarning('Something went wrong while compressing this PDF. Please try again.');
  } finally {
    els.compressBtn.disabled = false;
    hideProgress();
  }
}

/* ══════════════════════════════════════════════════════════════
   Download / reset
   ══════════════════════════════════════════════════════════════ */

function downloadName(orig) {
  const base = (orig || 'document').replace(/\.pdf$/i, '');
  return `${base}-compressed.pdf`;
}

function downloadCompressed() {
  if (!state.outBytes) { toast('Compress a PDF first'); return; }
  const blob = new Blob([state.outBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName(state.file && state.file.name);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(state.outIsOriginal ? 'Original PDF downloaded' : 'Compressed PDF downloaded');
}

function resetAll() {
  state.file = null;
  state.originalArrayBuffer = null;
  state.numPages = 0;
  state.outBytes = null;
  state.outIsOriginal = false;

  els.fileInput.value = '';
  els.compressPanel.hidden = true;
  els.emptyState.hidden = false;
  resetResults();
  resetWarning();
}

/* ══════════════════════════════════════════════════════════════
   Drop zone wiring
   ══════════════════════════════════════════════════════════════ */

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

  els.qualitySelect.querySelectorAll('input[name="qualityLevel"]').forEach((input) => {
    input.addEventListener('change', () => {
      updateQualitySelectVisual();
      resetResults();
    });
  });

  els.compressBtn.addEventListener('click', runCompress);
  els.downloadBtn.addEventListener('click', downloadCompressed);
  els.startOverBtn.addEventListener('click', resetAll);
});
