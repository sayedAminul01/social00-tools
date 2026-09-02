'use strict';

/**
 * Merge PDF — 100% client-side.
 *
 * Each added PDF is read once with PDF.js purely to report its page count
 * and render a first-page thumbnail — PDF.js never mutates the source
 * file. The original file bytes are cached per item (pristine, re-sliced
 * on every use) so pdf-lib can be invoked at merge time without re-reading
 * from disk. Merging loads each file's bytes fresh with
 * PDFLib.PDFDocument.load(), copies its pages into one new document in
 * the exact order shown in the list, and saves the result. Nothing is
 * ever uploaded anywhere.
 */

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  warningList: document.getElementById('warningList'),
  itemsPanel: document.getElementById('itemsPanel'),
  runningTotal: document.getElementById('runningTotal'),
  thumbList: document.getElementById('thumbList'),
  addMoreBtn: document.getElementById('addMoreBtn'),
  startOverBtn: document.getElementById('startOverBtn'),
  mergeBtn: document.getElementById('mergeBtn'),
  progressNote: document.getElementById('progressNote'),
  resultPanel: document.getElementById('resultPanel'),
  resultSummary: document.getElementById('resultSummary'),
  pdfFrame: document.getElementById('pdfFrame'),
  downloadBtn: document.getElementById('downloadBtn'),
};

/** Working state: ordered list of loaded PDFs plus the current result blob URL. */
const state = {
  items: [],          // { id, file, name, size, bytes, pageCount, thumbUrl, status: 'ok'|'error', errorMsg }
  nextId: 1,
  resultObjectUrl: null,
};

/* ══════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════ */

function revokeUrl(url) {
  if (url) {
    try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
}

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

function isPdfFile(file) {
  return !!file && ((file.type && file.type === 'application/pdf') || /\.pdf$/i.test(file.name || ''));
}

/* ══════════════════════════════════════════════════════════════
   Warning banner (rejected non-PDF files, unparsable files)
   ══════════════════════════════════════════════════════════════ */

function pushWarning(msg) {
  const row = document.createElement('div');
  row.className = 'warning-item';
  const text = document.createElement('span');
  text.className = 'warning-text';
  text.textContent = msg;
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'warning-dismiss';
  dismiss.title = 'Dismiss';
  dismiss.textContent = '✕';
  dismiss.addEventListener('click', () => {
    row.remove();
    if (!els.warningList.children.length) els.warningList.hidden = true;
  });
  row.appendChild(text);
  row.appendChild(dismiss);
  els.warningList.appendChild(row);
  els.warningList.hidden = false;
}

/* ══════════════════════════════════════════════════════════════
   File loading
   ══════════════════════════════════════════════════════════════ */

function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  files.forEach((file) => {
    if (!isPdfFile(file)) {
      pushWarning(`"${file.name || 'file'}" was skipped — not a PDF file.`);
      return;
    }
    loadPdfFile(file);
  });
}

async function loadPdfFile(file) {
  const item = {
    id: state.nextId++,
    file,
    name: file.name || 'document.pdf',
    size: file.size || 0,
    bytes: null,
    pageCount: null,
    thumbUrl: null,
    status: 'loading',
    errorMsg: '',
  };
  state.items.push(item);
  showItemsPanel();
  renderThumbList();
  updateTotals();

  if (typeof pdfjsLib === 'undefined' || typeof PDFLib === 'undefined') {
    item.status = 'error';
    item.errorMsg = 'The PDF engine failed to load — please check your connection and reload the page.';
    renderThumbList();
    updateTotals();
    return;
  }

  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const pdfDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;

    item.bytes = bytes;
    item.pageCount = pdfDoc.numPages;

    try {
      const page = await pdfDoc.getPage(1);
      const native = page.getViewport({ scale: 1 });
      const scale = Math.min(1, 100 / native.width);
      const viewport = page.getViewport({ scale });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(viewport.width));
      c.height = Math.max(1, Math.round(viewport.height));
      await withTimeout(page.render({ canvasContext: c.getContext('2d'), viewport }).promise, 8000);
      const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
      if (blob) item.thumbUrl = URL.createObjectURL(blob);
    } catch (thumbErr) {
      // Thumbnail is a nice-to-have; a failure here shouldn't block the file.
    }

    item.status = 'ok';
  } catch (err) {
    item.status = 'error';
    item.errorMsg = `"${item.name}" could not be opened — it may be corrupted or password-protected.`;
  }

  renderThumbList();
  updateTotals();
}

function showItemsPanel() {
  els.emptyState.hidden = true;
  els.itemsPanel.hidden = false;
}

/* ══════════════════════════════════════════════════════════════
   List (reorder / remove) + running total
   ══════════════════════════════════════════════════════════════ */

function updateTotals() {
  const okItems = state.items.filter((it) => it.status === 'ok');
  const totalPages = okItems.reduce((sum, it) => sum + (it.pageCount || 0), 0);
  const fileWord = okItems.length === 1 ? 'file' : 'files';
  const pageWord = totalPages === 1 ? 'page' : 'pages';
  els.runningTotal.textContent = `${okItems.length} ${fileWord} · ${totalPages} ${pageWord} total`;
  els.mergeBtn.disabled = okItems.length < 2;
}

function renderThumbList() {
  els.thumbList.innerHTML = '';
  state.items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'thumb-item' + (item.status === 'error' ? ' thumb-item--error' : '');
    li.dataset.id = String(item.id);

    const num = document.createElement('span');
    num.className = 'thumb-num';
    num.textContent = String(idx + 1);

    const info = document.createElement('div');
    info.className = 'thumb-info';
    const name = document.createElement('span');
    name.className = 'thumb-name';
    name.textContent = item.name;
    info.appendChild(name);

    if (item.status === 'ok') {
      const dims = document.createElement('span');
      dims.className = 'thumb-dims';
      const pageWord = item.pageCount === 1 ? 'page' : 'pages';
      dims.textContent = `${formatBytes(item.size)} · ${item.pageCount} ${pageWord}`;
      info.appendChild(dims);
    } else if (item.status === 'loading') {
      const dims = document.createElement('span');
      dims.className = 'thumb-dims';
      dims.textContent = 'Reading…';
      info.appendChild(dims);
    } else {
      const err = document.createElement('span');
      err.className = 'thumb-dims';
      err.style.color = '#f59e0b';
      err.textContent = item.errorMsg || 'Could not be opened.';
      info.appendChild(err);
    }

    li.appendChild(num);

    if (item.status === 'ok') {
      const thumb = document.createElement('img');
      thumb.className = 'thumb-img';
      thumb.src = item.thumbUrl || '';
      thumb.alt = `${item.name} first page preview`;
      li.appendChild(thumb);
    }

    li.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'thumb-actions';

    if (item.status === 'ok') {
      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'thumb-btn thumb-up';
      upBtn.title = 'Move up';
      upBtn.textContent = '▲';
      upBtn.disabled = idx === 0;
      upBtn.addEventListener('click', () => moveItem(item.id, -1));

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'thumb-btn thumb-down';
      downBtn.title = 'Move down';
      downBtn.textContent = '▼';
      downBtn.disabled = idx === state.items.length - 1;
      downBtn.addEventListener('click', () => moveItem(item.id, 1));

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'thumb-btn thumb-remove';
    removeBtn.title = 'Remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => removeItem(item.id));
    actions.appendChild(removeBtn);

    li.appendChild(actions);
    els.thumbList.appendChild(li);
  });
}

function moveItem(id, dir) {
  const idx = state.items.findIndex((it) => it.id === id);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.items.length) return;
  const [item] = state.items.splice(idx, 1);
  state.items.splice(newIdx, 0, item);
  renderThumbList();
}

function removeItem(id) {
  const idx = state.items.findIndex((it) => it.id === id);
  if (idx < 0) return;
  revokeUrl(state.items[idx].thumbUrl);
  state.items.splice(idx, 1);
  renderThumbList();
  updateTotals();
  if (!state.items.length) {
    els.itemsPanel.hidden = true;
    els.emptyState.hidden = false;
    els.resultPanel.hidden = true;
  }
}

function resetAll() {
  state.items.forEach((it) => revokeUrl(it.thumbUrl));
  state.items = [];
  revokeResultUrl();
  els.fileInput.value = '';
  els.thumbList.innerHTML = '';
  els.warningList.innerHTML = '';
  els.warningList.hidden = true;
  els.itemsPanel.hidden = true;
  els.emptyState.hidden = false;
  els.resultPanel.hidden = true;
  els.progressNote.hidden = true;
  els.mergeBtn.disabled = true;
  updateTotals();
}

function revokeResultUrl() {
  revokeUrl(state.resultObjectUrl);
  state.resultObjectUrl = null;
}

/* ══════════════════════════════════════════════════════════════
   Merge
   ══════════════════════════════════════════════════════════════ */

async function mergePdfs() {
  const okItems = state.items.filter((it) => it.status === 'ok');
  if (okItems.length < 2) {
    toast('Add at least 2 valid PDFs to merge');
    return;
  }
  if (typeof PDFLib === 'undefined') {
    toast('The PDF engine failed to load. Please reload the page.');
    return;
  }

  els.mergeBtn.disabled = true;
  els.progressNote.hidden = false;
  els.resultPanel.hidden = true;

  // Let the UI paint "Merging PDFs…" before the async work runs.
  await new Promise((r) => setTimeout(r, 0));

  try {
    const newDoc = await PDFLib.PDFDocument.create();
    let totalPages = 0;

    for (const item of okItems) {
      const srcDoc = await PDFLib.PDFDocument.load(item.bytes.slice(0));
      const indices = srcDoc.getPageIndices();
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      copiedPages.forEach((p) => newDoc.addPage(p));
      totalPages += indices.length;
    }

    const outBytes = await newDoc.save();
    const blob = new Blob([outBytes], { type: 'application/pdf' });

    // Trigger an actual, immediate download.
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = 'merged.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);

    // Persistent preview + manual re-download button.
    revokeResultUrl();
    const previewUrl = URL.createObjectURL(blob);
    state.resultObjectUrl = previewUrl;
    els.pdfFrame.src = previewUrl;
    els.downloadBtn.href = previewUrl;

    const fileWord = okItems.length === 1 ? 'file' : 'files';
    const pageWord = totalPages === 1 ? 'page' : 'pages';
    els.resultSummary.textContent = `${okItems.length} ${fileWord} merged · ${totalPages} ${pageWord} · ${formatBytes(blob.size)}`;
    els.resultPanel.hidden = false;
    els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    toast(`PDFs merged — ${totalPages} ${pageWord} downloaded`);
  } catch (err) {
    toast('Something went wrong merging the PDFs. Try again.');
  } finally {
    els.progressNote.hidden = true;
    els.mergeBtn.disabled = state.items.filter((it) => it.status === 'ok').length < 2;
  }
}

/* ══════════════════════════════════════════════════════════════
   Event wiring
   ══════════════════════════════════════════════════════════════ */

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
  const files = e.dataTransfer && e.dataTransfer.files;
  if (files && files.length) handleFiles(files);
});
els.fileInput.addEventListener('change', () => {
  if (els.fileInput.files && els.fileInput.files.length) handleFiles(els.fileInput.files);
  els.fileInput.value = ''; // allow re-selecting the same file later
});

els.addMoreBtn.addEventListener('click', () => els.fileInput.click());
els.startOverBtn.addEventListener('click', resetAll);
els.mergeBtn.addEventListener('click', mergePdfs);

window.addEventListener('beforeunload', () => {
  state.items.forEach((it) => revokeUrl(it.thumbUrl));
  revokeResultUrl();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
});
