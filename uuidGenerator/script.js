'use strict';

/* ── UUID v4 generation ───────────────────────────────────────────
   Primary path: crypto.randomUUID() — native, guaranteed spec-correct,
   available in all modern browsers. Fallback: manual RFC 4122 v4
   construction from crypto.getRandomValues(), kept here for
   environments without randomUUID() and shown in the FAQ for
   educational transparency. Neither path ever touches Math.random(). */

function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return generateUuidV4Manual();
}

// Manual RFC 4122 §4.4 construction:
// 1. Fill 16 bytes with cryptographically secure randomness.
// 2. Force the high nibble of byte 6 to 0100 (binary) -> version 4.
// 3. Force the top two bits of byte 8 to 10 (binary) -> RFC 4122 variant.
// 4. Format as lowercase 8-4-4-4-12 hyphenated hex.
function generateUuidV4Manual() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version nibble -> 0100
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant bits -> 10xxxxxx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// Applies the presentation-only format toggles. The underlying random
// value is identical no matter which of these are set.
function formatUuid(uuid, { uppercase = false, hyphens = true, braces = false } = {}) {
  let out = hyphens ? uuid : uuid.replace(/-/g, '');
  if (uppercase) out = out.toUpperCase();
  if (braces) out = `{${out}}`;
  return out;
}

/* ── DOM wiring ───────────────────────────────────────────────── */
const els = {
  quantity: document.getElementById('quantity'),
  uppercaseToggle: document.getElementById('uppercaseToggle'),
  hyphensToggle: document.getElementById('hyphensToggle'),
  bracesToggle: document.getElementById('bracesToggle'),
  generateBtn: document.getElementById('generateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  uuidList: document.getElementById('uuidList'),
};

let currentUuids = [];

function getFormatOptions() {
  return {
    uppercase: els.uppercaseToggle.checked,
    hyphens: els.hyphensToggle.checked,
    braces: els.bracesToggle.checked,
  };
}

function renderList() {
  const opts = getFormatOptions();
  els.uuidList.innerHTML = '';

  if (!currentUuids.length) {
    const empty = document.createElement('p');
    empty.className = 'uuid-empty';
    empty.id = 'uuidEmpty';
    empty.textContent = 'Click "Generate" to create your first UUID.';
    els.uuidList.appendChild(empty);
    return;
  }

  currentUuids.forEach((raw) => {
    const formatted = formatUuid(raw, opts);

    const row = document.createElement('div');
    row.className = 'uuid-item';

    const value = document.createElement('span');
    value.className = 'uuid-value';
    value.textContent = formatted;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'uuid-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => copyToClipboard(formatted, 'UUID copied'));

    row.appendChild(value);
    row.appendChild(btn);
    els.uuidList.appendChild(row);
  });
}

function handleGenerate() {
  const quantity = parseInt(els.quantity.value, 10) || 1;
  currentUuids = Array.from({ length: quantity }, () => generateUuidV4());
  renderList();
}

function handleCopyAll() {
  if (!currentUuids.length) {
    window.showToast('Generate a UUID first');
    return;
  }
  const opts = getFormatOptions();
  const text = currentUuids.map((raw) => formatUuid(raw, opts)).join('\n');
  copyToClipboard(text, `${currentUuids.length} UUID${currentUuids.length > 1 ? 's' : ''} copied`);
}

els.generateBtn.addEventListener('click', handleGenerate);
els.copyAllBtn.addEventListener('click', handleCopyAll);
[els.uppercaseToggle, els.hyphensToggle, els.bracesToggle].forEach((el) => {
  el.addEventListener('change', renderList);
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  handleGenerate();
});
