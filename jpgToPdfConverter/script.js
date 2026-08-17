'use strict';

/**
 * JPG to PDF Converter — 100% client-side.
 *
 * Every added image is drawn to an offscreen <canvas> and re-exported
 * as a JPEG via canvas.toBlob(). Those raw JPEG bytes are then embedded
 * directly inside a hand-built PDF file using the standard /DCTDecode
 * filter on an Image XObject — no external PDF library is used. The
 * PDF's byte structure (header, objects, xref table, trailer) is
 * assembled entirely by this file. Nothing is ever uploaded anywhere.
 */

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  itemsPanel: document.getElementById('itemsPanel'),
  thumbList: document.getElementById('thumbList'),
  addMoreBtn: document.getElementById('addMoreBtn'),
  startOverBtn: document.getElementById('startOverBtn'),
  pageSizeSelect: document.getElementById('pageSizeSelect'),
  pageSizeNote: document.getElementById('pageSizeNote'),
  generateBtn: document.getElementById('generateBtn'),
  progressNote: document.getElementById('progressNote'),
  resultPanel: document.getElementById('resultPanel'),
  resultSummary: document.getElementById('resultSummary'),
  pdfFrame: document.getElementById('pdfFrame'),
  downloadBtn: document.getElementById('downloadBtn'),
};

/** Working state: ordered list of loaded images plus the current result blob URL. */
const state = {
  items: [],          // { id, file, name, img, objectUrl, w, h }
  nextId: 1,
  resultObjectUrl: null,
};

const PAGE_SIZE_NOTES = {
  original: "Each page will exactly match that image's own dimensions — no borders or margins.",
  a4: 'Every image is scaled to fit and centered on a standard A4 page (595 × 842pt), with a small margin.',
  letter: 'Every image is scaled to fit and centered on a standard US Letter page (612 × 792pt), with a small margin.',
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

/* ══════════════════════════════════════════════════════════════
   File loading
   ══════════════════════════════════════════════════════════════ */

function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  let rejected = 0;
  files.forEach((file) => {
    if (!file.type || !file.type.startsWith('image/')) {
      rejected++;
      return;
    }
    loadImageFile(file);
  });

  if (rejected > 0) {
    toast(rejected === 1 ? 'One file was skipped — not a recognized image type' : `${rejected} files were skipped — not recognized image types`);
  }
}

function loadImageFile(file) {
  let objectUrl;
  try {
    objectUrl = URL.createObjectURL(file);
  } catch (err) {
    toast(`Could not read "${file.name}"`);
    return;
  }

  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) {
      revokeUrl(objectUrl);
      toast(`"${file.name}" could not be decoded — it may be corrupt`);
      return;
    }
    const item = {
      id: state.nextId++,
      file,
      name: file.name || 'image',
      img,
      objectUrl,
      w,
      h,
    };
    state.items.push(item);
    renderThumbList();
    showItemsPanel();
  };
  img.onerror = () => {
    revokeUrl(objectUrl);
    toast(`"${file.name}" could not be loaded — it may be corrupt or unsupported`);
  };
  img.src = objectUrl;
}

function showItemsPanel() {
  els.emptyState.hidden = true;
  els.itemsPanel.hidden = false;
}

/* ══════════════════════════════════════════════════════════════
   Thumbnail list (reorder / remove)
   ══════════════════════════════════════════════════════════════ */

function renderThumbList() {
  els.thumbList.innerHTML = '';
  state.items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'thumb-item';
    li.dataset.id = String(item.id);

    const num = document.createElement('span');
    num.className = 'thumb-num';
    num.textContent = String(idx + 1);

    const thumb = document.createElement('img');
    thumb.className = 'thumb-img';
    thumb.src = item.objectUrl;
    thumb.alt = `Page ${idx + 1} preview`;

    const info = document.createElement('div');
    info.className = 'thumb-info';
    const name = document.createElement('span');
    name.className = 'thumb-name';
    name.textContent = item.name;
    const dims = document.createElement('span');
    dims.className = 'thumb-dims';
    dims.textContent = `${item.w} × ${item.h}px`;
    info.appendChild(name);
    info.appendChild(dims);

    const actions = document.createElement('div');
    actions.className = 'thumb-actions';

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

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'thumb-btn thumb-remove';
    removeBtn.title = 'Remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => removeItem(item.id));

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(removeBtn);

    li.appendChild(num);
    li.appendChild(thumb);
    li.appendChild(info);
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
  revokeUrl(state.items[idx].objectUrl);
  state.items.splice(idx, 1);
  renderThumbList();
  if (!state.items.length) {
    els.itemsPanel.hidden = true;
    els.emptyState.hidden = false;
    els.resultPanel.hidden = true;
  }
}

function resetAll() {
  state.items.forEach((it) => revokeUrl(it.objectUrl));
  state.items = [];
  revokeResultUrl();
  els.fileInput.value = '';
  els.thumbList.innerHTML = '';
  els.itemsPanel.hidden = true;
  els.emptyState.hidden = false;
  els.resultPanel.hidden = true;
  els.progressNote.hidden = true;
  els.generateBtn.disabled = false;
  els.generateBtn.textContent = 'Generate PDF';
}

function revokeResultUrl() {
  revokeUrl(state.resultObjectUrl);
  state.resultObjectUrl = null;
}

/* ══════════════════════════════════════════════════════════════
   Canvas → JPEG bytes
   ══════════════════════════════════════════════════════════════ */

const MAX_DIM = 3000; // cap the longest edge to keep PDFs reasonably sized

function drawToCanvas(img) {
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > MAX_DIM) {
    const scale = MAX_DIM / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  // Flatten transparency onto white — DCTDecode/JPEG has no alpha channel.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToJpegBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('toBlob failed')); return; }
      blob.arrayBuffer().then(
        (buf) => resolve(new Uint8Array(buf)),
        (err) => reject(err)
      );
    }, 'image/jpeg', 0.92);
  });
}

/* ══════════════════════════════════════════════════════════════
   Raw PDF byte builder
   ══════════════════════════════════════════════════════════════
   Standard PDF structure: a JPEG's compressed bytes can be embedded
   as-is inside an Image XObject stream via /Filter /DCTDecode — no
   re-encoding of the JPEG data itself is required. Each object's
   byte offset (measured from the start of the file) must be recorded
   for the cross-reference (xref) table at the end. */

const PT_PER_PX = 72 / 96; // standard 96dpi assumption for "Original" page size
const PAGE_SIZES = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};
const PAGE_MARGIN = 36; // 0.5 inch, for A4/Letter fit-to-page modes

class PdfBuilder {
  constructor() {
    this.chunks = [];
    this.length = 0;
    this.offsets = Object.create(null); // objNum -> byte offset
    this._encoder = new TextEncoder();
  }
  pushBytes(bytes) {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }
  pushText(str) {
    this.pushBytes(this._encoder.encode(str));
  }
  startObj(num) {
    this.offsets[num] = this.length;
  }
  finalize() {
    const out = new Uint8Array(this.length);
    let pos = 0;
    for (const c of this.chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  }
}

function fmtNum(n) {
  // Fixed 2dp, no scientific notation, trims a trailing ".00" only when whole.
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

/**
 * @param {{bytes: Uint8Array, pxW: number, pxH: number}[]} images
 * @param {'original'|'a4'|'letter'} mode
 * @returns {Uint8Array} the complete PDF file bytes
 */
function buildPdf(images, mode) {
  const N = images.length;
  const pb = new PdfBuilder();

  // Object numbering: 1 = Catalog, 2 = Pages, then 3 objects per image
  // (Page, Content stream, Image XObject) starting at object 3.
  const totalObjCount = 2 + 3 * N;

  pb.pushText('%PDF-1.4\n');
  pb.pushBytes(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])); // binary marker comment

  // Object 1: Catalog
  pb.startObj(1);
  pb.pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages (kids computed up front — object numbers are deterministic)
  const kidRefs = [];
  for (let i = 0; i < N; i++) {
    const pageNum = 3 + i * 3;
    kidRefs.push(`${pageNum} 0 R`);
  }
  pb.startObj(2);
  pb.pushText(`2 0 obj\n<< /Type /Pages /Kids [${kidRefs.join(' ')}] /Count ${N} >>\nendobj\n`);

  for (let i = 0; i < N; i++) {
    const { bytes, pxW, pxH } = images[i];
    const pageNum = 3 + i * 3;
    const contentNum = 4 + i * 3;
    const imgNum = 5 + i * 3;

    // ── Page geometry ──
    let pageW, pageH, drawW, drawH, x, y;
    if (mode === 'a4' || mode === 'letter') {
      const size = PAGE_SIZES[mode];
      pageW = size.w;
      pageH = size.h;
      const availW = pageW - PAGE_MARGIN * 2;
      const availH = pageH - PAGE_MARGIN * 2;
      const aspect = pxW / pxH;
      drawW = availW;
      drawH = drawW / aspect;
      if (drawH > availH) {
        drawH = availH;
        drawW = drawH * aspect;
      }
      x = (pageW - drawW) / 2;
      y = (pageH - drawH) / 2;
    } else {
      // Original: page == image's own size (converted px -> pt), fills edge to edge.
      pageW = pxW * PT_PER_PX;
      pageH = pxH * PT_PER_PX;
      drawW = pageW;
      drawH = pageH;
      x = 0;
      y = 0;
    }

    // ── Page object ──
    pb.startObj(pageNum);
    pb.pushText(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im${i} ${imgNum} 0 R >> /ProcSet [/PDF /ImageC] >> ` +
      `/MediaBox [0 0 ${fmtNum(pageW)} ${fmtNum(pageH)}] /Contents ${contentNum} 0 R >>\nendobj\n`
    );

    // ── Content stream: scale the 1x1 unit-square image to drawW x drawH at (x,y) ──
    const contentStr = `q\n${fmtNum(drawW)} 0 0 ${fmtNum(drawH)} ${fmtNum(x)} ${fmtNum(y)} cm\n/Im${i} Do\nQ`;
    const contentBytes = pb._encoder.encode(contentStr);
    pb.startObj(contentNum);
    pb.pushText(`${contentNum} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    pb.pushBytes(contentBytes);
    pb.pushText('\nendstream\nendobj\n');

    // ── Image XObject: raw JPEG bytes embedded verbatim via DCTDecode ──
    pb.startObj(imgNum);
    pb.pushText(
      `${imgNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`
    );
    pb.pushBytes(bytes);
    pb.pushText('\nendstream\nendobj\n');
  }

  // ── xref table ──
  const xrefOffset = pb.length;
  pb.pushText(`xref\n0 ${totalObjCount + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= totalObjCount; n++) {
    const off = pb.offsets[n];
    pb.pushText(`${String(off).padStart(10, '0')} 00000 n \n`);
  }

  // ── trailer ──
  pb.pushText(`trailer\n<< /Size ${totalObjCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return pb.finalize();
}

/* ══════════════════════════════════════════════════════════════
   Generate
   ══════════════════════════════════════════════════════════════ */

async function generatePdf() {
  if (!state.items.length) {
    toast('Add at least one image first');
    return;
  }

  els.generateBtn.disabled = true;
  els.progressNote.hidden = false;
  els.resultPanel.hidden = true;

  // Let the UI paint "Building PDF…" before the synchronous byte assembly runs.
  await new Promise((r) => setTimeout(r, 0));

  try {
    const prepared = [];
    for (const item of state.items) {
      const canvas = drawToCanvas(item.img);
      const bytes = await canvasToJpegBytes(canvas);
      prepared.push({ bytes, pxW: canvas.width, pxH: canvas.height });
    }

    const mode = els.pageSizeSelect.value;
    const pdfBytes = buildPdf(prepared, mode);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    revokeResultUrl();
    const url = URL.createObjectURL(blob);
    state.resultObjectUrl = url;

    els.pdfFrame.src = url;
    els.downloadBtn.href = url;

    const pageWord = prepared.length === 1 ? 'page' : 'pages';
    els.resultSummary.textContent = `${prepared.length} ${pageWord} · ${formatBytes(blob.size)}`;
    els.resultPanel.hidden = false;
    els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    toast(`PDF created — ${prepared.length} ${pageWord}`);
  } catch (err) {
    toast('Something went wrong building the PDF. Try different images.');
  } finally {
    els.progressNote.hidden = true;
    els.generateBtn.disabled = false;
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
els.generateBtn.addEventListener('click', generatePdf);
els.pageSizeSelect.addEventListener('change', () => {
  els.pageSizeNote.textContent = PAGE_SIZE_NOTES[els.pageSizeSelect.value] || PAGE_SIZE_NOTES.original;
});

window.addEventListener('beforeunload', () => {
  state.items.forEach((it) => revokeUrl(it.objectUrl));
  revokeResultUrl();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
});
