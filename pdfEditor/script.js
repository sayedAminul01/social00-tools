'use strict';

/**
 * PDF Editor — 100% client-side.
 *
 * Architecture:
 *  - PDF.js renders pages onto <canvas> for the user to see and click on.
 *    It never mutates the source file.
 *  - We maintain our OWN in-memory list of tracked edits (text / images /
 *    freehand paths / whiteout rectangles), each tagged with the original
 *    page index and stored in PDF-point coordinate space (72pt/inch,
 *    origin bottom-left, y-up) — never in on-screen pixel space. We also
 *    track a working page order (deletions + reordering) and a per-page
 *    rotation delta, independently of the original file.
 *  - pdf-lib is invoked exactly ONCE, at export time: it loads a FRESH
 *    copy of the ORIGINAL bytes, copies pages into a new document in the
 *    working order (which cleanly handles deletion + reordering), applies
 *    rotation, and draws every tracked edit onto the matching new page.
 *
 * Coordinate system: the main editing canvas is always rendered at
 * rotation 0 (ignoring any inherent /Rotate on the source page), at a
 * simple scale factor. That keeps canvas-pixel <-> PDF-point conversion
 * a plain scale-and-flip-y operation everywhere in this file:
 *   pdfX = canvasX / scale
 *   pdfY = pageHeightPt - (canvasY / scale)
 * pdf-lib's setRotation() is applied on top at export time as a pure
 * viewing transform, so anything drawn here rotates correctly with it —
 * we never need to pre-rotate our own coordinates.
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
  editorToolbar: document.getElementById('editorToolbar'),
  undoBtn: document.getElementById('undoBtn'),
  deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
  toolOptions: document.getElementById('toolOptions'),
  textFontSelect: document.getElementById('textFontSelect'),
  textSizeSelect: document.getElementById('textSizeSelect'),
  textColorInput: document.getElementById('textColorInput'),
  imageFileInput: document.getElementById('imageFileInput'),
  signaturePad: document.getElementById('signaturePad'),
  clearSignatureBtn: document.getElementById('clearSignatureBtn'),
  useSignatureBtn: document.getElementById('useSignatureBtn'),
  drawColorInput: document.getElementById('drawColorInput'),
  drawWidthSelect: document.getElementById('drawWidthSelect'),
  whiteoutColorInput: document.getElementById('whiteoutColorInput'),
  pageThumbList: document.getElementById('pageThumbList'),
  canvasStack: document.getElementById('canvasStack'),
  pageCanvas: document.getElementById('pageCanvas'),
  overlayCanvas: document.getElementById('overlayCanvas'),
  canvasHint: document.getElementById('canvasHint'),
  progressNote: document.getElementById('progressNote'),
};

const pageCtx = els.pageCanvas.getContext('2d');
const overlayCtx = els.overlayCanvas.getContext('2d');

/** Central application state. */
const state = {
  file: null,
  originalArrayBuffer: null, // pristine bytes, re-sliced fresh for every export
  pdfDoc: null,              // pdf.js document proxy (render-only)
  pdfPages: new Map(),       // origIndex -> pdf.js page proxy
  nativeSizes: new Map(),    // origIndex -> { width, height } at scale 1, rotation 0 (PDF points)
  thumbDataUrls: {},         // origIndex -> data URL
  numOriginalPages: 0,
  workingPages: [],          // [{ origIndex, rotation }] in display/export order
  selectedOrigIndex: null,
  edits: [],                 // tracked annotations, see pushEdit() for shape
  nextEditId: 1,
  selectedEditId: null,
  currentTool: 'select',
  dragState: null,
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

function getAccentColor() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#f97316';
  } catch (e) { return '#f97316'; }
}

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

function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/* ══════════════════════════════════════════════════════════════
   Coordinate conversion — canvas pixel space <-> PDF point space
   ══════════════════════════════════════════════════════════════ */

function currentGeom() {
  if (state.selectedOrigIndex == null) return null;
  const size = state.nativeSizes.get(state.selectedOrigIndex);
  if (!size) return null;
  const scale = computeEditScale(size.width);
  return { scale, pageWidthPt: size.width, pageHeightPt: size.height };
}

function computeEditScale(nativeWidthPt) {
  const target = 720;
  return Math.min(3, Math.max(0.4, target / nativeWidthPt));
}

function canvasToPdfPoint(px, py, scale, pageHeightPt) {
  return { x: px / scale, y: pageHeightPt - py / scale };
}
function pdfToCanvasPoint(x, y, scale, pageHeightPt) {
  return { x: x * scale, y: (pageHeightPt - y) * scale };
}
/** Box given as PDF bottom-left anchor (x,y) + width/height -> canvas top-left box. */
function pdfRectToCanvasBox(x, y, w, h, scale, pageHeightPt) {
  return { left: x * scale, top: (pageHeightPt - y - h) * scale, width: w * scale, height: h * scale };
}
/** Canvas top-left box -> PDF bottom-left anchor (x,y) + width/height. */
function canvasBoxToPdfRect(left, top, w, h, scale, pageHeightPt) {
  return { x: left / scale, y: pageHeightPt - (top + h) / scale, width: w / scale, height: h / scale };
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
    state.originalArrayBuffer = buf; // kept pristine; only ever read via .slice(0)
    const forRender = buf.slice(0);
    const pdfDoc = await pdfjsLib.getDocument({ data: forRender }).promise;

    state.file = file;
    state.pdfDoc = pdfDoc;
    state.pdfPages = new Map();
    state.nativeSizes = new Map();
    state.thumbDataUrls = {};
    state.numOriginalPages = pdfDoc.numPages;
    state.workingPages = Array.from({ length: pdfDoc.numPages }, (_, i) => ({ origIndex: i, rotation: 0 }));
    state.edits = [];
    state.nextEditId = 1;
    state.selectedEditId = null;
    state.selectedOrigIndex = null;

    els.fileName.textContent = file.name;
    els.fileSize.textContent = formatBytes(file.size);
    els.pageCountNote.textContent = `${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? '' : 's'}`;
    els.emptyState.hidden = true;
    els.editorPanel.hidden = false;

    els.progressNote.hidden = false;
    els.progressNote.textContent = 'Rendering page thumbnails…';
    await buildThumbnails();
    els.progressNote.hidden = true;

    await loadPageIntoEditor(0);
    toast('PDF loaded — start editing');
  } catch (err) {
    state.pdfDoc = null;
    showWarning('This PDF could not be opened. It may be corrupted, password-protected, or not a valid PDF file.');
  }
}

async function buildThumbnails() {
  for (let i = 0; i < state.numOriginalPages; i++) {
    const page = await getPdfPage(i);
    const native = state.nativeSizes.get(i);
    const scale = Math.min(1, 130 / native.width);
    const viewport = page.getViewport({ scale, rotation: 0 });
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(viewport.width));
    c.height = Math.max(1, Math.round(viewport.height));
    const cctx = c.getContext('2d');
    await page.render({ canvasContext: cctx, viewport }).promise;
    state.thumbDataUrls[i] = c.toDataURL('image/png');
  }
  renderThumbList();
}

/* ══════════════════════════════════════════════════════════════
   Page sidebar: rotate / delete / reorder / select
   ══════════════════════════════════════════════════════════════ */

function mkThumbBtn(txt, title, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'thumb-btn';
  b.title = title;
  b.textContent = txt;
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}

function renderThumbList() {
  els.pageThumbList.innerHTML = '';
  state.workingPages.forEach((wp, idx) => {
    const li = document.createElement('li');
    li.className = 'page-thumb-item' + (wp.origIndex === state.selectedOrigIndex ? ' selected' : '');

    const num = document.createElement('span');
    num.className = 'thumb-num';
    num.textContent = `Page ${idx + 1}`;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'thumb-img-wrap';
    const img = document.createElement('img');
    img.className = 'thumb-img';
    img.src = state.thumbDataUrls[wp.origIndex] || '';
    img.alt = `Page ${idx + 1} preview`;
    img.style.transform = `rotate(${wp.rotation}deg)`;
    imgWrap.appendChild(img);
    imgWrap.addEventListener('click', () => loadPageIntoEditor(wp.origIndex));

    const actions = document.createElement('div');
    actions.className = 'thumb-actions';
    const rotateBtn = mkThumbBtn('⟳', 'Rotate 90°', () => {
      wp.rotation = (wp.rotation + 90) % 360;
      renderThumbList();
    });
    const upBtn = mkThumbBtn('▲', 'Move up', () => movePageWorking(idx, -1));
    upBtn.disabled = idx === 0;
    const downBtn = mkThumbBtn('▼', 'Move down', () => movePageWorking(idx, 1));
    downBtn.disabled = idx === state.workingPages.length - 1;
    const delBtn = mkThumbBtn('✕', 'Delete page', () => deletePageWorking(idx));
    delBtn.classList.add('thumb-remove');
    actions.append(rotateBtn, upBtn, downBtn, delBtn);

    li.append(num, imgWrap, actions);
    els.pageThumbList.appendChild(li);
  });
}

function movePageWorking(idx, dir) {
  const n = idx + dir;
  if (n < 0 || n >= state.workingPages.length) return;
  const [item] = state.workingPages.splice(idx, 1);
  state.workingPages.splice(n, 0, item);
  renderThumbList();
}

function deletePageWorking(idx) {
  if (state.workingPages.length <= 1) {
    toast('A PDF needs at least one page');
    return;
  }
  const removed = state.workingPages.splice(idx, 1)[0];
  toast('Page removed — applied only when you download');
  if (state.selectedOrigIndex === removed.origIndex) {
    const newIdx = Math.min(idx, state.workingPages.length - 1);
    loadPageIntoEditor(state.workingPages[newIdx].origIndex);
  } else {
    renderThumbList();
  }
}

/* ══════════════════════════════════════════════════════════════
   Main editing canvas
   ══════════════════════════════════════════════════════════════ */

async function loadPageIntoEditor(origIndex) {
  state.selectedOrigIndex = origIndex;
  state.selectedEditId = null;
  state.dragState = null;
  els.canvasHint.textContent = 'Loading page…';

  const page = await getPdfPage(origIndex);
  const geom = currentGeom();
  const viewport = page.getViewport({ scale: geom.scale, rotation: 0 });

  els.pageCanvas.width = Math.max(1, Math.round(viewport.width));
  els.pageCanvas.height = Math.max(1, Math.round(viewport.height));
  els.overlayCanvas.width = els.pageCanvas.width;
  els.overlayCanvas.height = els.pageCanvas.height;

  await page.render({ canvasContext: pageCtx, viewport }).promise;
  redrawOverlay();
  updateDeleteButtonState();

  const workIdx = state.workingPages.findIndex((wp) => wp.origIndex === origIndex);
  els.canvasHint.textContent = `Page ${workIdx + 1} of ${state.workingPages.length} · editing at ${Math.round(geom.scale * 100)}% zoom`;
  renderThumbList();
}

/* ══════════════════════════════════════════════════════════════
   Edits: create / find / remove
   ══════════════════════════════════════════════════════════════ */

function pushEdit(fields) {
  const edit = Object.assign({ id: state.nextEditId++ }, fields);
  state.edits.push(edit);
  state.selectedEditId = edit.id;
  redrawOverlay();
  updateDeleteButtonState();
  return edit;
}

function findEdit(id) { return state.edits.find((e) => e.id === id); }

function removeEditById(id) {
  const idx = state.edits.findIndex((e) => e.id === id);
  if (idx < 0) return;
  const [removed] = state.edits.splice(idx, 1);
  if (removed.type === 'image' && removed._objectUrl) {
    try { URL.revokeObjectURL(removed._objectUrl); } catch (e) { /* noop */ }
  }
  if (state.selectedEditId === id) state.selectedEditId = null;
}

function updateDeleteButtonState() {
  els.deleteSelectedBtn.disabled = !state.selectedEditId;
}

/* ══════════════════════════════════════════════════════════════
   Rendering: overlay canvas (existing edits + live drag previews)
   ══════════════════════════════════════════════════════════════ */

function buildFontCss(edit, scale) {
  return `${edit.fontSize * scale}px ${cssFamily(edit.font)}`;
}

function editToCanvasBox(edit, scale, pageHeightPt) {
  return pdfRectToCanvasBox(edit.x, edit.y, edit.width, edit.height, scale, pageHeightPt);
}

function drawSelectionBox(ctx, box, color, withHandle) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(box.left, box.top, box.width, box.height);
  ctx.setLineDash([]);
  if (withHandle) {
    ctx.fillStyle = color;
    ctx.fillRect(box.left + box.width - 8, box.top + box.height - 8, 10, 10);
  }
  ctx.restore();
}

function redrawOverlay() {
  overlayCtx.clearRect(0, 0, els.overlayCanvas.width, els.overlayCanvas.height);
  const geom = currentGeom();
  if (!geom) return;
  const { scale, pageHeightPt } = geom;
  const accent = getAccentColor();

  const pageEdits = state.edits.filter((e) => e.origPageIndex === state.selectedOrigIndex);
  pageEdits.forEach((edit) => {
    if (edit.type === 'rect') {
      const box = editToCanvasBox(edit, scale, pageHeightPt);
      overlayCtx.fillStyle = edit.color || '#ffffff';
      overlayCtx.fillRect(box.left, box.top, box.width, box.height);
      if (edit.id === state.selectedEditId) drawSelectionBox(overlayCtx, box, accent, true);
    } else if (edit.type === 'image') {
      const box = editToCanvasBox(edit, scale, pageHeightPt);
      if (edit._imgEl) {
        overlayCtx.drawImage(edit._imgEl, box.left, box.top, box.width, box.height);
      } else {
        overlayCtx.fillStyle = 'rgba(150,150,150,.35)';
        overlayCtx.fillRect(box.left, box.top, box.width, box.height);
      }
      if (edit.id === state.selectedEditId) drawSelectionBox(overlayCtx, box, accent, true);
    } else if (edit.type === 'path') {
      const pts = edit.points.map((p) => pdfToCanvasPoint(p.x, p.y, scale, pageHeightPt));
      overlayCtx.strokeStyle = edit.color;
      overlayCtx.lineWidth = Math.max(1, edit.lineWidth * scale);
      overlayCtx.lineJoin = 'round';
      overlayCtx.lineCap = 'round';
      overlayCtx.beginPath();
      pts.forEach((p, i) => (i === 0 ? overlayCtx.moveTo(p.x, p.y) : overlayCtx.lineTo(p.x, p.y)));
      overlayCtx.stroke();
      if (edit.id === state.selectedEditId) {
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        const box = {
          left: Math.min(...xs) - 4, top: Math.min(...ys) - 4,
          width: Math.max(...xs) - Math.min(...xs) + 8, height: Math.max(...ys) - Math.min(...ys) + 8,
        };
        drawSelectionBox(overlayCtx, box, accent, false);
      }
    } else if (edit.type === 'text') {
      overlayCtx.font = buildFontCss(edit, scale);
      overlayCtx.fillStyle = edit.color;
      overlayCtx.textBaseline = 'alphabetic';
      const p = pdfToCanvasPoint(edit.x, edit.y, scale, pageHeightPt);
      overlayCtx.fillText(edit.text, p.x, p.y);
      if (edit.id === state.selectedEditId) {
        const w = overlayCtx.measureText(edit.text).width;
        const box = { left: p.x - 2, top: p.y - edit.fontSize * scale * 0.9, width: w + 4, height: edit.fontSize * scale * 1.15 };
        drawSelectionBox(overlayCtx, box, accent, false);
      }
    }
  });

  const ds = state.dragState;
  if (ds && ds.mode === 'draw') {
    overlayCtx.strokeStyle = els.drawColorInput.value;
    overlayCtx.lineWidth = Math.max(1, parseFloat(els.drawWidthSelect.value) * scale);
    overlayCtx.lineJoin = 'round';
    overlayCtx.lineCap = 'round';
    overlayCtx.beginPath();
    ds.canvasPoints.forEach((p, i) => (i === 0 ? overlayCtx.moveTo(p.x, p.y) : overlayCtx.lineTo(p.x, p.y)));
    overlayCtx.stroke();
  } else if (ds && ds.mode === 'rect-draw') {
    const start = ds.start, cur = ds.current || start;
    const left = Math.min(start.x, cur.x), top = Math.min(start.y, cur.y);
    const w = Math.abs(cur.x - start.x), h = Math.abs(cur.y - start.y);
    overlayCtx.fillStyle = (els.whiteoutColorInput.value || '#ffffff') + 'cc';
    overlayCtx.fillRect(left, top, w, h);
    overlayCtx.strokeStyle = accent;
    overlayCtx.lineWidth = 1.5;
    overlayCtx.setLineDash([4, 3]);
    overlayCtx.strokeRect(left, top, w, h);
    overlayCtx.setLineDash([]);
  }
}

/* ══════════════════════════════════════════════════════════════
   Hit-testing for the Select/Move tool (+ text-tool re-edit)
   ══════════════════════════════════════════════════════════════ */

function hitTestEdits(px, py, scale, pageHeightPt, onlyType) {
  const pageEdits = state.edits.filter((e) => e.origPageIndex === state.selectedOrigIndex && (!onlyType || e.type === onlyType));
  for (let i = pageEdits.length - 1; i >= 0; i--) {
    const edit = pageEdits[i];
    if (edit.type === 'rect' || edit.type === 'image') {
      const box = editToCanvasBox(edit, scale, pageHeightPt);
      const hx = box.left + box.width, hy = box.top + box.height;
      if (px >= hx - 10 && px <= hx + 4 && py >= hy - 10 && py <= hy + 4) return { edit, handle: 'resize' };
      if (px >= box.left && px <= box.left + box.width && py >= box.top && py <= box.top + box.height) return { edit, handle: 'body' };
    } else if (edit.type === 'text') {
      overlayCtx.font = buildFontCss(edit, scale);
      const w = overlayCtx.measureText(edit.text).width;
      const p = pdfToCanvasPoint(edit.x, edit.y, scale, pageHeightPt);
      const left = p.x - 2, right = p.x + w + 2, top = p.y - edit.fontSize * scale * 0.9, bottom = p.y + edit.fontSize * scale * 0.3;
      if (px >= left && px <= right && py >= top && py <= bottom) return { edit, handle: 'body' };
    } else if (edit.type === 'path') {
      const pts = edit.points.map((p) => pdfToCanvasPoint(p.x, p.y, scale, pageHeightPt));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const pad = 6 + edit.lineWidth * scale;
      if (px >= Math.min(...xs) - pad && px <= Math.max(...xs) + pad && py >= Math.min(...ys) - pad && py <= Math.max(...ys) + pad) {
        return { edit, handle: 'body' };
      }
    }
  }
  return null;
}

function selectEdit(id) {
  state.selectedEditId = id;
  updateDeleteButtonState();
  redrawOverlay();
}

/* ══════════════════════════════════════════════════════════════
   Move / resize (drag interactions write pdf-space fields directly)
   ══════════════════════════════════════════════════════════════ */

function snapshotForMove(edit) {
  if (edit.type === 'path') return { points: edit.points.map((p) => ({ ...p })) };
  return { x: edit.x, y: edit.y };
}

function applyMoveDelta(edit, dxCanvas, dyCanvas, scale, startSnapshot) {
  const dxPdf = dxCanvas / scale, dyPdf = -dyCanvas / scale;
  if (edit.type === 'path') {
    edit.points = startSnapshot.points.map((p) => ({ x: p.x + dxPdf, y: p.y + dyPdf }));
  } else {
    edit.x = startSnapshot.x + dxPdf;
    edit.y = startSnapshot.y + dyPdf;
  }
}

function applyResize(edit, boxLeft, boxTop, newW, newH, scale, pageHeightPt) {
  const r = canvasBoxToPdfRect(boxLeft, boxTop, newW, newH, scale, pageHeightPt);
  edit.x = r.x; edit.y = r.y; edit.width = r.width; edit.height = r.height;
}

/* ══════════════════════════════════════════════════════════════
   Overlay pointer events — dispatch per current tool
   ══════════════════════════════════════════════════════════════ */

function getCanvasPoint(e, rect) {
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onOverlayPointerDown(e) {
  if (state.selectedOrigIndex == null) return;
  const geom = currentGeom();
  if (!geom) return;
  const { scale, pageHeightPt } = geom;
  const rect = els.overlayCanvas.getBoundingClientRect();
  const pt = getCanvasPoint(e, rect);
  const tool = state.currentTool;

  if (tool === 'select') {
    const hit = hitTestEdits(pt.x, pt.y, scale, pageHeightPt);
    if (hit && hit.handle === 'resize' && (hit.edit.type === 'image' || hit.edit.type === 'rect')) {
      els.overlayCanvas.setPointerCapture(e.pointerId);
      selectEdit(hit.edit.id);
      const box = editToCanvasBox(hit.edit, scale, pageHeightPt);
      state.dragState = { mode: 'resize', id: hit.edit.id, rect, startPt: pt, startBox: box };
    } else if (hit) {
      els.overlayCanvas.setPointerCapture(e.pointerId);
      selectEdit(hit.edit.id);
      state.dragState = { mode: 'move', id: hit.edit.id, rect, startPt: pt, startSnapshot: snapshotForMove(hit.edit) };
    } else {
      selectEdit(null);
    }
  } else if (tool === 'text') {
    const hit = hitTestEdits(pt.x, pt.y, scale, pageHeightPt, 'text');
    openTextEditor(hit ? hit.edit : null, pt, scale, pageHeightPt);
  } else if (tool === 'draw') {
    els.overlayCanvas.setPointerCapture(e.pointerId);
    const p = canvasToPdfPoint(pt.x, pt.y, scale, pageHeightPt);
    state.dragState = { mode: 'draw', rect, points: [p], canvasPoints: [pt] };
  } else if (tool === 'whiteout') {
    els.overlayCanvas.setPointerCapture(e.pointerId);
    state.dragState = { mode: 'rect-draw', rect, start: pt, current: pt };
  }
  redrawOverlay();
}

function onOverlayPointerMove(e) {
  const ds = state.dragState;
  if (!ds) return;
  const geom = currentGeom();
  if (!geom) return;
  const { scale, pageHeightPt } = geom;
  const pt = getCanvasPoint(e, ds.rect);

  if (ds.mode === 'move') {
    const edit = findEdit(ds.id);
    if (edit) applyMoveDelta(edit, pt.x - ds.startPt.x, pt.y - ds.startPt.y, scale, ds.startSnapshot);
  } else if (ds.mode === 'resize') {
    const edit = findEdit(ds.id);
    if (edit) {
      const newW = Math.max(10, ds.startBox.width + (pt.x - ds.startPt.x));
      const newH = Math.max(10, ds.startBox.height + (pt.y - ds.startPt.y));
      applyResize(edit, ds.startBox.left, ds.startBox.top, newW, newH, scale, pageHeightPt);
    }
  } else if (ds.mode === 'draw') {
    ds.points.push(canvasToPdfPoint(pt.x, pt.y, scale, pageHeightPt));
    ds.canvasPoints.push(pt);
  } else if (ds.mode === 'rect-draw') {
    ds.current = pt;
  }
  redrawOverlay();
}

function onOverlayPointerUp() {
  const ds = state.dragState;
  if (!ds) return;
  const geom = currentGeom();
  const { scale, pageHeightPt } = geom || {};

  if (ds.mode === 'draw' && ds.points.length >= 2) {
    pushEdit({
      type: 'path', origPageIndex: state.selectedOrigIndex, points: ds.points,
      color: els.drawColorInput.value, lineWidth: parseFloat(els.drawWidthSelect.value) || 2,
    });
  } else if (ds.mode === 'rect-draw') {
    const start = ds.start, cur = ds.current || start;
    const left = Math.min(start.x, cur.x), top = Math.min(start.y, cur.y);
    const w = Math.abs(cur.x - start.x), h = Math.abs(cur.y - start.y);
    if (w > 4 && h > 4) {
      const r = canvasBoxToPdfRect(left, top, w, h, scale, pageHeightPt);
      pushEdit({ type: 'rect', origPageIndex: state.selectedOrigIndex, x: r.x, y: r.y, width: r.width, height: r.height, color: els.whiteoutColorInput.value || '#ffffff' });
    }
  }
  state.dragState = null;
  redrawOverlay();
  updateDeleteButtonState();
}

/* ══════════════════════════════════════════════════════════════
   Add Text tool — inline HTML input overlaid on the canvas
   ══════════════════════════════════════════════════════════════ */

function openTextEditor(existingEdit, clickPt, scale, pageHeightPt) {
  const isNew = !existingEdit;
  const canvasPt = isNew ? clickPt : pdfToCanvasPoint(existingEdit.x, existingEdit.y, scale, pageHeightPt);
  const fontSize = isNew ? parseFloat(els.textSizeSelect.value) : existingEdit.fontSize;
  const font = isNew ? els.textFontSelect.value : existingEdit.font;
  const color = isNew ? els.textColorInput.value : existingEdit.color;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-text-input';
  input.value = isNew ? '' : existingEdit.text;
  input.style.left = `${canvasPt.x}px`;
  input.style.top = `${canvasPt.y - fontSize * scale}px`;
  input.style.fontSize = `${fontSize * scale}px`;
  input.style.fontFamily = cssFamily(font);
  input.style.color = color;
  els.canvasStack.appendChild(input);
  input.focus();

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    const val = input.value;
    input.remove();
    if (!val.trim()) {
      if (!isNew) removeEditById(existingEdit.id);
      redrawOverlay();
      updateDeleteButtonState();
      return;
    }
    if (isNew) {
      const p = canvasToPdfPoint(clickPt.x, clickPt.y, scale, pageHeightPt);
      pushEdit({ type: 'text', origPageIndex: state.selectedOrigIndex, x: p.x, y: p.y, text: val, fontSize, color, font });
    } else {
      existingEdit.text = val;
      redrawOverlay();
    }
  }
  function cancel() {
    if (committed) return;
    committed = true;
    input.remove();
  }
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => commit());
}

/* ══════════════════════════════════════════════════════════════
   Add Image / Signature tool
   ══════════════════════════════════════════════════════════════ */

function placeImageEdit(bytes, mime, naturalW, naturalH) {
  const geom = currentGeom();
  if (!geom) { toast('Load a PDF page first'); return; }
  const native = state.nativeSizes.get(state.selectedOrigIndex);
  let width = Math.min(native.width * 0.4, 200);
  let height = width * (naturalH / naturalW);
  if (height > native.height * 0.4) {
    height = native.height * 0.4;
    width = height * (naturalW / naturalH);
  }
  const x = (native.width - width) / 2;
  const y = (native.height - height) / 2;

  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const edit = pushEdit({
    type: 'image', origPageIndex: state.selectedOrigIndex,
    x, y, width, height, imageBytes: bytes, mime, _imgEl: null, _objectUrl: url,
  });
  const img = new Image();
  img.onload = () => { edit._imgEl = img; redrawOverlay(); };
  img.src = url;
  setTool('select');
  toast('Image placed — drag to position, use the corner handle to resize');
}

async function handleImageFile(file) {
  if (state.selectedOrigIndex == null) { toast('Load a PDF page first'); return; }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let mime = file.type;
    const previewUrl = URL.createObjectURL(new Blob([bytes], { type: mime || 'application/octet-stream' }));
    const imgEl = await loadImageEl(previewUrl).catch(() => null);
    if (!imgEl) { URL.revokeObjectURL(previewUrl); toast('Could not read that image file'); return; }
    const naturalW = imgEl.naturalWidth, naturalH = imgEl.naturalHeight;

    if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg') {
      URL.revokeObjectURL(previewUrl);
      placeImageEdit(bytes, mime === 'image/jpg' ? 'image/jpeg' : mime, naturalW, naturalH);
    } else {
      // Normalize any other format (webp, gif, etc.) to PNG via canvas so pdf-lib can embed it.
      const canvas = document.createElement('canvas');
      canvas.width = naturalW; canvas.height = naturalH;
      canvas.getContext('2d').drawImage(imgEl, 0, 0);
      URL.revokeObjectURL(previewUrl);
      canvas.toBlob(async (blob) => {
        if (!blob) { toast('Could not convert that image'); return; }
        const buf = new Uint8Array(await blob.arrayBuffer());
        placeImageEdit(buf, 'image/png', naturalW, naturalH);
      }, 'image/png');
    }
  } catch (err) {
    toast('Could not load that image');
  }
}

/* ── Signature pad ─────────────────────────────────────────── */
let sigDrawing = false;
let sigHasDrawn = false;
const sigCtx = els.signaturePad.getContext('2d');

function sigPoint(e) {
  const rect = els.signaturePad.getBoundingClientRect();
  const scaleX = els.signaturePad.width / rect.width;
  const scaleY = els.signaturePad.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function wireSignaturePad() {
  els.signaturePad.addEventListener('pointerdown', (e) => {
    sigDrawing = true;
    els.signaturePad.setPointerCapture(e.pointerId);
    const p = sigPoint(e);
    sigCtx.beginPath();
    sigCtx.moveTo(p.x, p.y);
    sigHasDrawn = true;
  });
  els.signaturePad.addEventListener('pointermove', (e) => {
    if (!sigDrawing) return;
    const p = sigPoint(e);
    sigCtx.strokeStyle = '#161616';
    sigCtx.lineWidth = 2.4;
    sigCtx.lineJoin = 'round';
    sigCtx.lineCap = 'round';
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
  });
  els.signaturePad.addEventListener('pointerup', () => { sigDrawing = false; });
  els.signaturePad.addEventListener('pointerleave', () => { sigDrawing = false; });

  els.clearSignatureBtn.addEventListener('click', () => {
    sigCtx.clearRect(0, 0, els.signaturePad.width, els.signaturePad.height);
    sigHasDrawn = false;
  });

  els.useSignatureBtn.addEventListener('click', () => {
    if (!sigHasDrawn) { toast('Draw a signature first'); return; }
    els.signaturePad.toBlob(async (blob) => {
      if (!blob) { toast('Could not capture the signature'); return; }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      placeImageEdit(bytes, 'image/png', els.signaturePad.width, els.signaturePad.height);
      sigCtx.clearRect(0, 0, els.signaturePad.width, els.signaturePad.height);
      sigHasDrawn = false;
    }, 'image/png');
  });
}

/* ══════════════════════════════════════════════════════════════
   Toolbar / tool option panels
   ══════════════════════════════════════════════════════════════ */

function setTool(tool) {
  state.currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  document.querySelectorAll('.opt-panel').forEach((p) => { p.hidden = p.dataset.panel !== tool; });
  els.overlayCanvas.style.cursor = tool === 'select' ? 'default' : (tool === 'draw' || tool === 'whiteout' || tool === 'text') ? 'crosshair' : 'default';
  if (tool !== 'select') {
    state.selectedEditId = null;
    updateDeleteButtonState();
    redrawOverlay();
  }
}

function wireToolbar() {
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });
  els.undoBtn.addEventListener('click', () => {
    if (!state.edits.length) { toast('Nothing to undo'); return; }
    const removed = state.edits.pop();
    if (removed.type === 'image' && removed._objectUrl) {
      try { URL.revokeObjectURL(removed._objectUrl); } catch (e) { /* noop */ }
    }
    if (state.selectedEditId === removed.id) state.selectedEditId = null;
    redrawOverlay();
    updateDeleteButtonState();
    toast('Last edit undone');
  });
  els.deleteSelectedBtn.addEventListener('click', () => {
    if (!state.selectedEditId) return;
    removeEditById(state.selectedEditId);
    redrawOverlay();
    updateDeleteButtonState();
    toast('Annotation deleted');
  });
}

function wireGlobalKeys() {
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedEditId) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      removeEditById(state.selectedEditId);
      redrawOverlay();
      updateDeleteButtonState();
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   Export — pdf-lib does the real work, exactly once
   ══════════════════════════════════════════════════════════════ */

function downloadName(orig) {
  const base = (orig || 'document').replace(/\.pdf$/i, '');
  return `${base}-edited.pdf`;
}

async function exportPdf() {
  if (!state.originalArrayBuffer) { toast('Load a PDF first'); return; }

  els.downloadBtn.disabled = true;
  els.progressNote.hidden = false;
  els.progressNote.textContent = 'Building your edited PDF…';
  await new Promise((r) => setTimeout(r, 0));

  try {
    const bytes = state.originalArrayBuffer.slice(0);
    const srcDoc = await PDFLib.PDFDocument.load(bytes);
    const newDoc = await PDFLib.PDFDocument.create();

    const indices = state.workingPages.map((wp) => wp.origIndex);
    const copiedPages = await newDoc.copyPages(srcDoc, indices);

    const fontMap = { Helvetica: PDFLib.StandardFonts.Helvetica, TimesRoman: PDFLib.StandardFonts.TimesRoman, Courier: PDFLib.StandardFonts.Courier };
    const fontCache = {};
    async function getFont(name) {
      if (fontCache[name]) return fontCache[name];
      const f = await newDoc.embedFont(fontMap[name] || PDFLib.StandardFonts.Helvetica);
      fontCache[name] = f;
      return f;
    }

    for (let i = 0; i < copiedPages.length; i++) {
      const page = copiedPages[i];
      newDoc.addPage(page);
      const wp = state.workingPages[i];

      const existingRotation = (page.getRotation && page.getRotation().angle) || 0;
      page.setRotation(PDFLib.degrees((existingRotation + wp.rotation) % 360));

      const pageEdits = state.edits.filter((e) => e.origPageIndex === wp.origIndex);
      for (const edit of pageEdits) {
        if (edit.type === 'text') {
          const font = await getFont(edit.font);
          const c = hexToRgb01(edit.color);
          page.drawText(edit.text, { x: edit.x, y: edit.y, size: edit.fontSize, font, color: PDFLib.rgb(c.r, c.g, c.b) });
        } else if (edit.type === 'rect') {
          const c = hexToRgb01(edit.color);
          page.drawRectangle({ x: edit.x, y: edit.y, width: edit.width, height: edit.height, color: PDFLib.rgb(c.r, c.g, c.b) });
        } else if (edit.type === 'image') {
          const embedded = edit.mime === 'image/png' ? await newDoc.embedPng(edit.imageBytes) : await newDoc.embedJpg(edit.imageBytes);
          page.drawImage(embedded, { x: edit.x, y: edit.y, width: edit.width, height: edit.height });
        } else if (edit.type === 'path') {
          const c = hexToRgb01(edit.color);
          for (let k = 1; k < edit.points.length; k++) {
            page.drawLine({
              start: { x: edit.points[k - 1].x, y: edit.points[k - 1].y },
              end: { x: edit.points[k].x, y: edit.points[k].y },
              thickness: edit.lineWidth, color: PDFLib.rgb(c.r, c.g, c.b), lineCap: PDFLib.LineCapStyle.Round,
            });
          }
        }
      }
    }

    const outBytes = await newDoc.save();
    const blob = new Blob([outBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName(state.file && state.file.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Edited PDF downloaded');
  } catch (err) {
    showWarning('Something went wrong building the edited PDF. Please try again.');
  } finally {
    els.downloadBtn.disabled = false;
    els.progressNote.hidden = true;
  }
}

/* ══════════════════════════════════════════════════════════════
   Reset / drop zone wiring
   ══════════════════════════════════════════════════════════════ */

function resetAll() {
  state.edits.forEach((e) => {
    if (e.type === 'image' && e._objectUrl) { try { URL.revokeObjectURL(e._objectUrl); } catch (err) { /* noop */ } }
  });
  state.file = null;
  state.originalArrayBuffer = null;
  state.pdfDoc = null;
  state.pdfPages = new Map();
  state.nativeSizes = new Map();
  state.thumbDataUrls = {};
  state.numOriginalPages = 0;
  state.workingPages = [];
  state.selectedOrigIndex = null;
  state.edits = [];
  state.nextEditId = 1;
  state.selectedEditId = null;
  state.dragState = null;

  els.fileInput.value = '';
  els.editorPanel.hidden = true;
  els.emptyState.hidden = false;
  els.pageThumbList.innerHTML = '';
  pageCtx.clearRect(0, 0, els.pageCanvas.width, els.pageCanvas.height);
  overlayCtx.clearRect(0, 0, els.overlayCanvas.width, els.overlayCanvas.height);
  resetWarning();
  setTool('select');
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
  wireToolbar();
  wireGlobalKeys();
  wireSignaturePad();

  els.overlayCanvas.addEventListener('pointerdown', onOverlayPointerDown);
  els.overlayCanvas.addEventListener('pointermove', onOverlayPointerMove);
  els.overlayCanvas.addEventListener('pointerup', onOverlayPointerUp);
  els.overlayCanvas.addEventListener('pointercancel', onOverlayPointerUp);

  els.imageFileInput.addEventListener('change', () => {
    const file = els.imageFileInput.files && els.imageFileInput.files[0];
    els.imageFileInput.value = '';
    if (file) handleImageFile(file);
  });

  els.startOverBtn.addEventListener('click', resetAll);
  els.downloadBtn.addEventListener('click', exportPdf);
});

window.addEventListener('beforeunload', () => {
  state.edits.forEach((e) => {
    if (e.type === 'image' && e._objectUrl) { try { URL.revokeObjectURL(e._objectUrl); } catch (err) { /* noop */ } }
  });
});
