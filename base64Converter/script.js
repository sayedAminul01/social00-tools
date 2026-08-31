'use strict';

/**
 * Base64 Encoder / Decoder — 100% client-side.
 *
 * Plain btoa()/atob() only operate on Latin1 (code points 0-255), so they
 * throw or silently corrupt anything outside that range (emoji, accented
 * letters, non-Latin scripts). To handle UTF-8 correctly:
 *   encode: string -> UTF-8 bytes (TextEncoder) -> Base64
 *   decode: Base64 -> bytes -> UTF-8 string (TextDecoder)
 *
 * Byte<->Base64 conversion is done in chunks so the spread/apply trick used
 * to turn a byte array into a "binary string" never blows the call stack on
 * large files.
 */

const CHUNK_SIZE = 8192;

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  // atob() throws DOMException on invalid input — let callers catch it.
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sanitizeBase64Input(str) {
  // Strip whitespace/newlines users commonly paste in (wrapped text, etc.)
  return (str || '').replace(/\s+/g, '');
}

/** Detects and strips a `data:<mime>;base64,` prefix. Returns { mime, data }. */
function stripDataUriPrefix(str) {
  const trimmed = (str || '').trim();
  const match = trimmed.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/is);
  if (match) {
    return { mime: match[1] || '', data: match[2] };
  }
  return { mime: '', data: trimmed };
}

function encodeTextToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}

function decodeBase64ToText(base64) {
  const bytes = base64ToBytes(sanitizeBase64Input(base64)); // may throw
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes); // may throw
}

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

function friendlyDecodeError(err) {
  if (err instanceof DOMException || (err && /base64|character/i.test(err.message || ''))) {
    return "That doesn't look like valid Base64. Please check your input and try again.";
  }
  return 'Could not decode that Base64 string. Please check it and try again.';
}

/* ── Element refs ──────────────────────────────────────────── */
const els = {
  tabText: document.getElementById('tabText'),
  tabFile: document.getElementById('tabFile'),
  textPanel: document.getElementById('textPanel'),
  filePanel: document.getElementById('filePanel'),

  textEncodeInput: document.getElementById('textEncodeInput'),
  textEncodeBtn: document.getElementById('textEncodeBtn'),
  textEncodeClearBtn: document.getElementById('textEncodeClearBtn'),
  textEncodeOutput: document.getElementById('textEncodeOutput'),
  textEncodeMeta: document.getElementById('textEncodeMeta'),
  textEncodeCopyBtn: document.getElementById('textEncodeCopyBtn'),

  textDecodeInput: document.getElementById('textDecodeInput'),
  textDecodeBtn: document.getElementById('textDecodeBtn'),
  textDecodeClearBtn: document.getElementById('textDecodeClearBtn'),
  textDecodeOutput: document.getElementById('textDecodeOutput'),
  textDecodeMeta: document.getElementById('textDecodeMeta'),
  textDecodeCopyBtn: document.getElementById('textDecodeCopyBtn'),

  fileDropZone: document.getElementById('fileDropZone'),
  fileEncodeInput: document.getElementById('fileEncodeInput'),
  fileEmptyState: document.getElementById('fileEmptyState'),
  fileMetaRow: document.getElementById('fileMetaRow'),
  fileEncodeName: document.getElementById('fileEncodeName'),
  fileEncodeSize: document.getElementById('fileEncodeSize'),
  dataUriToggleRow: document.getElementById('dataUriToggleRow'),
  dataUriToggle: document.getElementById('dataUriToggle'),
  fileEncodeOutput: document.getElementById('fileEncodeOutput'),
  fileEncodeMeta: document.getElementById('fileEncodeMeta'),
  fileEncodeCopyBtn: document.getElementById('fileEncodeCopyBtn'),

  fileDecodeInput: document.getElementById('fileDecodeInput'),
  fileDecodeName: document.getElementById('fileDecodeName'),
  fileDecodeMime: document.getElementById('fileDecodeMime'),
  fileDecodeBtn: document.getElementById('fileDecodeBtn'),
  fileDecodeClearBtn: document.getElementById('fileDecodeClearBtn'),
  fileDecodeStatus: document.getElementById('fileDecodeStatus'),
};

/* ── Mode tabs ─────────────────────────────────────────────── */
function setMode(mode) {
  const isText = mode === 'text';
  els.tabText.classList.toggle('active', isText);
  els.tabFile.classList.toggle('active', !isText);
  els.tabText.setAttribute('aria-selected', String(isText));
  els.tabFile.setAttribute('aria-selected', String(!isText));
  els.textPanel.hidden = !isText;
  els.filePanel.hidden = isText;
}
els.tabText.addEventListener('click', () => setMode('text'));
els.tabFile.addEventListener('click', () => setMode('file'));

/* ── Text: Encode ──────────────────────────────────────────── */
function runTextEncode() {
  const text = els.textEncodeInput.value;
  if (!text) {
    els.textEncodeOutput.value = '';
    els.textEncodeMeta.textContent = '0 characters';
    if (typeof showToast === 'function') showToast('Type some text first');
    return;
  }
  try {
    const encoded = encodeTextToBase64(text);
    els.textEncodeOutput.value = encoded;
    els.textEncodeMeta.textContent = `${encoded.length} characters`;
  } catch (err) {
    if (typeof showToast === 'function') showToast('Could not encode that text.');
  }
}
els.textEncodeBtn.addEventListener('click', runTextEncode);
els.textEncodeClearBtn.addEventListener('click', () => {
  els.textEncodeInput.value = '';
  els.textEncodeOutput.value = '';
  els.textEncodeMeta.textContent = '0 characters';
  els.textEncodeInput.focus();
});
els.textEncodeCopyBtn.addEventListener('click', () => {
  copyToClipboard(els.textEncodeOutput.value, 'Base64 copied');
});

/* ── Text: Decode ──────────────────────────────────────────── */
function runTextDecode() {
  const input = els.textDecodeInput.value;
  if (!input.trim()) {
    els.textDecodeOutput.value = '';
    els.textDecodeMeta.textContent = '0 characters';
    if (typeof showToast === 'function') showToast('Paste a Base64 string first');
    return;
  }
  try {
    const decoded = decodeBase64ToText(input);
    els.textDecodeOutput.value = decoded;
    els.textDecodeMeta.textContent = `${decoded.length} characters`;
  } catch (err) {
    els.textDecodeOutput.value = '';
    els.textDecodeMeta.textContent = '0 characters';
    if (typeof showToast === 'function') showToast(friendlyDecodeError(err));
  }
}
els.textDecodeBtn.addEventListener('click', runTextDecode);
els.textDecodeClearBtn.addEventListener('click', () => {
  els.textDecodeInput.value = '';
  els.textDecodeOutput.value = '';
  els.textDecodeMeta.textContent = '0 characters';
  els.textDecodeInput.focus();
});
els.textDecodeCopyBtn.addEventListener('click', () => {
  copyToClipboard(els.textDecodeOutput.value, 'Text copied');
});

/* ── File: Encode ──────────────────────────────────────────── */
const fileState = { file: null, base64: '' };

function renderFileEncodeOutput() {
  if (!fileState.base64) {
    els.fileEncodeOutput.value = '';
    els.fileEncodeMeta.textContent = '0 characters';
    return;
  }
  let output = fileState.base64;
  if (els.dataUriToggle.checked && fileState.file) {
    const mime = fileState.file.type || 'application/octet-stream';
    output = `data:${mime};base64,${fileState.base64}`;
  }
  els.fileEncodeOutput.value = output;
  els.fileEncodeMeta.textContent = `${output.length} characters`;
}

async function handleFile(file) {
  if (!file) return;
  fileState.file = file;
  fileState.base64 = '';

  els.fileEmptyState.hidden = true;
  els.fileMetaRow.hidden = false;
  els.dataUriToggleRow.hidden = false;
  els.fileEncodeName.textContent = file.name;
  els.fileEncodeSize.textContent = formatBytes(file.size);
  els.fileEncodeOutput.value = 'Encoding…';
  els.fileEncodeMeta.textContent = '';

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    fileState.base64 = bytesToBase64(bytes);
    renderFileEncodeOutput();
    if (typeof showToast === 'function') showToast('File encoded');
  } catch (err) {
    els.fileEncodeOutput.value = '';
    els.fileEncodeMeta.textContent = '0 characters';
    if (typeof showToast === 'function') showToast('Could not read that file. Please try a different one.');
  }
}

els.fileDropZone.addEventListener('click', () => els.fileEncodeInput.click());
els.fileDropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.fileEncodeInput.click();
  }
});
['dragenter', 'dragover'].forEach((evt) => {
  els.fileDropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.fileDropZone.classList.add('drag-over');
  });
});
['dragleave', 'dragend'].forEach((evt) => {
  els.fileDropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.fileDropZone.classList.remove('drag-over');
  });
});
els.fileDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  els.fileDropZone.classList.remove('drag-over');
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});
els.fileEncodeInput.addEventListener('change', () => {
  const file = els.fileEncodeInput.files && els.fileEncodeInput.files[0];
  if (file) handleFile(file);
});
els.dataUriToggle.addEventListener('change', renderFileEncodeOutput);
els.fileEncodeCopyBtn.addEventListener('click', () => {
  copyToClipboard(els.fileEncodeOutput.value, 'Base64 copied');
});

/* ── File: Decode ──────────────────────────────────────────── */
function setDecodeStatus(message, kind) {
  els.fileDecodeStatus.textContent = message || '';
  els.fileDecodeStatus.classList.remove('is-error', 'is-success');
  if (kind) els.fileDecodeStatus.classList.add(kind === 'error' ? 'is-error' : 'is-success');
}

els.fileDecodeBtn.addEventListener('click', () => {
  const raw = els.fileDecodeInput.value;
  if (!raw.trim()) {
    setDecodeStatus('Paste a Base64 string first.', 'error');
    if (typeof showToast === 'function') showToast('Paste a Base64 string first');
    return;
  }

  const { mime: detectedMime, data } = stripDataUriPrefix(raw);
  const cleanBase64 = sanitizeBase64Input(data);

  let bytes;
  try {
    bytes = base64ToBytes(cleanBase64);
  } catch (err) {
    setDecodeStatus("That doesn't look like valid Base64. Please check your input and try again.", 'error');
    if (typeof showToast === 'function') showToast("That doesn't look like valid Base64. Please check your input and try again.");
    return;
  }

  const mime = (els.fileDecodeMime.value.trim()) || detectedMime || 'application/octet-stream';
  const filename = els.fileDecodeName.value.trim() || 'decoded-file';

  try {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    setDecodeStatus(`Decoded ${formatBytes(bytes.length)} — download started.`, 'success');
    if (typeof showToast === 'function') showToast('File downloaded');
  } catch (err) {
    setDecodeStatus('Could not create a download for that data. Please try again.', 'error');
  }
});

els.fileDecodeClearBtn.addEventListener('click', () => {
  els.fileDecodeInput.value = '';
  els.fileDecodeName.value = '';
  els.fileDecodeMime.value = '';
  setDecodeStatus('');
  els.fileDecodeInput.focus();
});

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
});
