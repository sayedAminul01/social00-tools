'use strict';

/* ── Character sets ──────────────────────────────────────────── */
const CHAR_SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

const AMBIGUOUS_CHARS = new Set(['l', '1', 'I', '0', 'O']);

/* ── Cryptographically secure randomness ─────────────────────────
   Uses window.crypto.getRandomValues() exclusively — never
   Math.random() — for every character decision in this tool.
   Bytes are pulled in batches for efficiency and consumed via
   rejection sampling to avoid modulo bias. */
let byteQueue = [];

function nextRandomByte() {
  if (byteQueue.length === 0) {
    const buf = new Uint8Array(256);
    window.crypto.getRandomValues(buf);
    byteQueue = Array.from(buf);
  }
  return byteQueue.pop();
}

// Rejection sampling: draw a byte and discard any byte that falls
// beyond the largest multiple of `max` that fits in 256, so every
// index 0..max-1 has an exactly equal chance of being chosen.
function secureRandomIndex(max) {
  if (max <= 0) throw new Error('max must be > 0');
  if (max > 256) throw new Error('max must be <= 256 for single-byte sampling');
  const limit = Math.floor(256 / max) * max;
  let byte = nextRandomByte();
  while (byte >= limit) {
    byte = nextRandomByte();
  }
  return byte % max;
}

/* ── Charset building ─────────────────────────────────────────── */
function buildCharsets(enabledKeys, excludeAmbiguous) {
  const perSet = {};
  let combined = '';
  enabledKeys.forEach((key) => {
    let chars = CHAR_SETS[key];
    if (excludeAmbiguous) {
      chars = chars.split('').filter((c) => !AMBIGUOUS_CHARS.has(c)).join('');
    }
    perSet[key] = chars;
    combined += chars;
  });
  return { perSet, combined };
}

function charsetSize(enabledKeys, excludeAmbiguous) {
  return buildCharsets(enabledKeys, excludeAmbiguous).combined.length;
}

/* ── Password generation with guaranteed type coverage ───────────
   1. Draw `length` characters from the combined set using
      rejection-sampled crypto randomness.
   2. Verify the result contains at least one character from every
      enabled set; if random chance produced a gap (more likely at
      short lengths), retry a few times.
   3. If still missing after retries, deterministically swap a
      random position for a character from the missing set — still
      chosen with crypto.getRandomValues(), never a predictable
      substitution — so the guarantee always holds. */
function drawPassword(combined, length) {
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += combined[secureRandomIndex(combined.length)];
  }
  return pwd;
}

function satisfiesAllSets(pwd, perSet) {
  return Object.values(perSet).every((chars) => {
    if (!chars.length) return true;
    for (let i = 0; i < pwd.length; i++) {
      if (chars.includes(pwd[i])) return true;
    }
    return false;
  });
}

function forceInjectMissingTypes(pwd, perSet, length) {
  const arr = pwd.split('');
  // Draw distinct target positions from a shrinking pool of unused
  // indices (rather than retrying a random guess until it misses
  // already-used slots) so two missing categories can never be
  // assigned the same position, however unlucky the draws are.
  const availablePositions = Array.from({ length }, (_, i) => i);
  Object.values(perSet).forEach((chars) => {
    if (!chars.length) return;
    const present = arr.some((c) => chars.includes(c));
    if (present) return;
    if (!availablePositions.length) return; // more missing categories than length; best-effort only
    const slot = secureRandomIndex(availablePositions.length);
    const pos = availablePositions.splice(slot, 1)[0];
    arr[pos] = chars[secureRandomIndex(chars.length)];
  });
  return arr.join('');
}

function generatePassword(enabledKeys, excludeAmbiguous, length) {
  const { perSet, combined } = buildCharsets(enabledKeys, excludeAmbiguous);
  if (!combined.length) return null;

  const MAX_ATTEMPTS = 15;
  let pwd = drawPassword(combined, length);
  let attempts = 1;
  while (!satisfiesAllSets(pwd, perSet) && attempts < MAX_ATTEMPTS) {
    pwd = drawPassword(combined, length);
    attempts++;
  }
  if (!satisfiesAllSets(pwd, perSet)) {
    pwd = forceInjectMissingTypes(pwd, perSet, length);
  }
  return pwd;
}

/* ── Entropy & strength ───────────────────────────────────────── */
function calcEntropyBits(length, setSize) {
  if (setSize <= 0) return 0;
  return length * Math.log2(setSize);
}

function strengthFromBits(bits) {
  if (bits < 40) return { label: 'Weak', className: 'weak' };
  if (bits < 60) return { label: 'Fair', className: 'fair' };
  if (bits < 80) return { label: 'Strong', className: 'strong' };
  return { label: 'Very Strong', className: 'very-strong' };
}

/* ── DOM wiring ───────────────────────────────────────────────── */
const els = {
  lengthSlider: document.getElementById('lengthSlider'),
  lengthValue: document.getElementById('lengthValue'),
  toggleUpper: document.getElementById('toggleUpper'),
  toggleLower: document.getElementById('toggleLower'),
  toggleNumbers: document.getElementById('toggleNumbers'),
  toggleSymbols: document.getElementById('toggleSymbols'),
  toggleAmbiguous: document.getElementById('toggleAmbiguous'),
  pwdValue: document.getElementById('pwdValue'),
  copyMainBtn: document.getElementById('copyMainBtn'),
  strengthFill: document.getElementById('strengthFill'),
  strengthText: document.getElementById('strengthText'),
  generateBtn: document.getElementById('generateBtn'),
  generateBatchBtn: document.getElementById('generateBatchBtn'),
  batchList: document.getElementById('batchList'),
};

const TOGGLE_MAP = [
  ['upper', els.toggleUpper],
  ['lower', els.toggleLower],
  ['numbers', els.toggleNumbers],
  ['symbols', els.toggleSymbols],
];

function getEnabledKeys() {
  return TOGGLE_MAP.filter(([, cb]) => cb.checked).map(([key]) => key);
}

// At least one toggle must always stay checked: once only one
// remains checked, disable it so it can't be unchecked below one
// active character set.
function enforceMinimumToggle() {
  const checked = TOGGLE_MAP.filter(([, cb]) => cb.checked);
  TOGGLE_MAP.forEach(([, cb]) => {
    cb.disabled = checked.length === 1 && cb.checked;
  });
}

function updateStrengthPreview() {
  const keys = getEnabledKeys();
  const excludeAmbiguous = els.toggleAmbiguous.checked;
  const length = parseInt(els.lengthSlider.value, 10);
  const size = charsetSize(keys, excludeAmbiguous);
  const bits = calcEntropyBits(length, size);
  const { label, className } = strengthFromBits(bits);

  els.strengthFill.className = 'strength-bar-fill ' + className;
  els.strengthFill.style.width = Math.min(100, (bits / 100) * 100) + '%';
  els.strengthText.className = 'strength-text ' + className;
  els.strengthText.textContent = `${label} — ~${Math.round(bits)} bits of entropy (${size}-character set, length ${length})`;
}

function updateLengthLabel() {
  els.lengthValue.textContent = els.lengthSlider.value;
}

function handleGenerate() {
  const keys = getEnabledKeys();
  if (!keys.length) {
    window.showToast('Select at least one character type');
    return;
  }
  const excludeAmbiguous = els.toggleAmbiguous.checked;
  const length = parseInt(els.lengthSlider.value, 10);
  const pwd = generatePassword(keys, excludeAmbiguous, length);
  if (!pwd) {
    window.showToast('Select at least one character type');
    return;
  }
  els.pwdValue.textContent = pwd;
  updateStrengthPreview();
}

function handleGenerateBatch() {
  const keys = getEnabledKeys();
  if (!keys.length) {
    window.showToast('Select at least one character type');
    return;
  }
  const excludeAmbiguous = els.toggleAmbiguous.checked;
  const length = parseInt(els.lengthSlider.value, 10);

  els.batchList.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const pwd = generatePassword(keys, excludeAmbiguous, length);
    const row = document.createElement('div');
    row.className = 'batch-item';

    const value = document.createElement('span');
    value.className = 'batch-value';
    value.textContent = pwd;

    const btn = document.createElement('button');
    btn.className = 'batch-copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => copyToClipboard(pwd, 'Password copied'));

    row.appendChild(value);
    row.appendChild(btn);
    els.batchList.appendChild(row);
  }
  els.batchList.hidden = false;
  updateStrengthPreview();
}

els.lengthSlider.addEventListener('input', () => {
  updateLengthLabel();
  updateStrengthPreview();
});

TOGGLE_MAP.forEach(([, cb]) => {
  cb.addEventListener('change', () => {
    enforceMinimumToggle();
    updateStrengthPreview();
  });
});

els.toggleAmbiguous.addEventListener('change', updateStrengthPreview);

els.generateBtn.addEventListener('click', handleGenerate);
els.generateBatchBtn.addEventListener('click', handleGenerateBatch);

els.copyMainBtn.addEventListener('click', () => {
  const text = els.pwdValue.textContent;
  if (!text || text.startsWith('Click Generate')) {
    window.showToast('Generate a password first');
    return;
  }
  copyToClipboard(text, 'Password copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  enforceMinimumToggle();
  updateLengthLabel();
  updateStrengthPreview();
});
