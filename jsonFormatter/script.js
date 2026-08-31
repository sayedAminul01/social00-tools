'use strict';

const els = {
  input: document.getElementById('jsonInput'),
  indentSelect: document.getElementById('indentSelect'),
  formatBtn: document.getElementById('formatBtn'),
  minifyBtn: document.getElementById('minifyBtn'),
  copyBtn: document.getElementById('copyBtn'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('jsonStatus'),
  sizeCompare: document.getElementById('sizeCompare'),
  output: document.getElementById('jsonOutput'),
};

let lastMode = null; // 'format' | 'minify' | null

/* ── Helpers ──────────────────────────────────────────────── */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Wraps a pretty-printed / minified JSON string in <span> tags per token
// type (key, string, number, boolean, null) for simple syntax highlighting.
function highlightJSON(json) {
  const escaped = escapeHtml(json);
  const tokenPattern = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  return escaped.replace(tokenPattern, (match) => {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      cls = /:\s*$/.test(match) ? 'json-key' : 'json-string';
    } else if (/^(true|false)$/.test(match)) {
      cls = 'json-boolean';
    } else if (match === 'null') {
      cls = 'json-null';
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

function renderOutput(text) {
  els.output.innerHTML = highlightJSON(text);
}

function clearOutput() {
  els.output.textContent = '';
}

function setStatus(kind, html) {
  els.status.className = 'json-status is-' + kind;
  els.status.innerHTML = html;
}

function hideSizeCompare() {
  els.sizeCompare.hidden = true;
  els.sizeCompare.textContent = '';
}

function byteLength(str) {
  return new TextEncoder().encode(str).length;
}

function showSizeCompare(originalInput, minified) {
  const originalBytes = byteLength(originalInput);
  const minBytes = byteLength(minified);
  const saved = originalBytes - minBytes;
  const pct = originalBytes > 0 ? Math.round((saved / originalBytes) * 100) : 0;
  els.sizeCompare.hidden = false;
  if (saved >= 0) {
    els.sizeCompare.textContent =
      `Minified: ${minBytes.toLocaleString()} bytes → saved ${saved.toLocaleString()} bytes (${pct}%)`;
  } else {
    els.sizeCompare.textContent =
      `Minified: ${minBytes.toLocaleString()} bytes (${Math.abs(saved).toLocaleString()} bytes larger than input)`;
  }
}

// Counts newlines up to a character offset to turn a raw JSON.parse()
// position into a human-usable line/column pair.
function locateLineColumn(input, pos) {
  let line = 1;
  let col = 1;
  const end = Math.min(pos, input.length);
  for (let i = 0; i < end; i++) {
    if (input[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

// Different JS engines phrase JSON.parse() SyntaxErrors differently.
// V8/Chrome/Node: "Unexpected token } in JSON at position 42"
// Firefox: "JSON.parse: unexpected character at line 1 column 10 of the JSON data"
function describeError(err, input) {
  const message = err && err.message ? err.message : 'Invalid JSON';

  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const { line, col } = locateLineColumn(input, pos);
    return `${message} — Line ${line}, Column ${col} (character ${pos}).`;
  }

  const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    return `${message}.`;
  }

  return `${message}.`;
}

function getIndent() {
  const v = els.indentSelect.value;
  return v === 'tab' ? '\t' : parseInt(v, 10);
}

function tryParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/* ── Actions ──────────────────────────────────────────────── */

function handleFormat() {
  const input = els.input.value;
  hideSizeCompare();

  if (!input.trim()) {
    setStatus('neutral', 'Paste JSON above, then click <strong>Format / Validate</strong>.');
    clearOutput();
    lastMode = null;
    return;
  }

  const result = tryParse(input);
  if (result.ok) {
    const pretty = JSON.stringify(result.value, null, getIndent());
    renderOutput(pretty);
    setStatus('valid', '✓ Valid JSON');
    lastMode = 'format';
  } else {
    clearOutput();
    setStatus('invalid', '✗ Invalid JSON — ' + describeError(result.error, input));
    lastMode = null;
  }
}

function handleMinify() {
  const input = els.input.value;

  if (!input.trim()) {
    setStatus('neutral', 'Paste JSON above, then click <strong>Format / Validate</strong>.');
    clearOutput();
    hideSizeCompare();
    lastMode = null;
    return;
  }

  const result = tryParse(input);
  if (result.ok) {
    const minified = JSON.stringify(result.value);
    renderOutput(minified);
    setStatus('valid', '✓ Valid JSON');
    showSizeCompare(input, minified);
    lastMode = 'minify';
  } else {
    clearOutput();
    setStatus('invalid', '✗ Invalid JSON — ' + describeError(result.error, input));
    hideSizeCompare();
    lastMode = null;
  }
}

function handleClear() {
  els.input.value = '';
  clearOutput();
  hideSizeCompare();
  setStatus('neutral', 'Paste JSON above, then click <strong>Format / Validate</strong>.');
  lastMode = null;
  els.input.focus();
}

/* ── Wiring ───────────────────────────────────────────────── */

els.formatBtn.addEventListener('click', handleFormat);
els.minifyBtn.addEventListener('click', handleMinify);
els.clearBtn.addEventListener('click', handleClear);

els.copyBtn.addEventListener('click', () => {
  copyToClipboard(els.output.textContent, 'Output copied');
});

els.indentSelect.addEventListener('change', () => {
  if (lastMode === 'format') handleFormat();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
});
