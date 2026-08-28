'use strict';

const BASE_CONFIG = {
  2: { id: 'binaryInput', errorId: 'binaryError', chars: /^[01]*$/, name: 'Binary', charsHint: '0-1' },
  8: { id: 'octalInput', errorId: 'octalError', chars: /^[0-7]*$/, name: 'Octal', charsHint: '0-7' },
  10: { id: 'decimalInput', errorId: 'decimalError', chars: /^[0-9]*$/, name: 'Decimal', charsHint: '0-9' },
  16: { id: 'hexInput', errorId: 'hexError', chars: /^[0-9a-fA-F]*$/, name: 'Hexadecimal', charsHint: '0-9, a-f' },
};

const els = {};
for (const base in BASE_CONFIG) {
  const cfg = BASE_CONFIG[base];
  els[base] = {
    input: document.getElementById(cfg.id),
    error: document.getElementById(cfg.errorId),
    row: document.getElementById(cfg.id).closest('.base-row'),
  };
}
const valueMeta = document.getElementById('valueMeta');
const clearBtn = document.getElementById('clearBtn');

/**
 * Parses a raw string as an unsigned BigInt in the given base.
 * Returns null for an empty string. Throws if the string contains
 * characters invalid for that base (caller validates first, but this
 * stays defensive).
 */
function parseInBase(str, base) {
  if (str === '') return null;
  switch (base) {
    case 2: return BigInt('0b' + str);
    case 8: return BigInt('0o' + str);
    case 10: return BigInt(str);
    case 16: return BigInt('0x' + str);
    default: throw new Error('Unsupported base');
  }
}

function formatInBase(value, base) {
  return value.toString(Number(base));
}

function setError(base, message) {
  const { row, error } = els[base];
  if (message) {
    row.classList.add('has-error');
    error.textContent = message;
  } else {
    row.classList.remove('has-error');
    error.textContent = '';
  }
}

function clearAllErrors() {
  for (const base in BASE_CONFIG) setError(base, '');
}

function updateMeta(value) {
  if (value === null) {
    valueMeta.innerHTML = '0 bits, 0 bytes';
    return;
  }
  const bitLength = value === 0n ? 1 : value.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);
  valueMeta.innerHTML = `<strong>${bitLength}</strong> bits, <strong>${byteLength}</strong> byte${byteLength === 1 ? '' : 's'}`;
}

function clearOtherFields(exceptBase) {
  for (const base in BASE_CONFIG) {
    if (Number(base) === exceptBase) continue;
    els[base].input.value = '';
  }
  updateMeta(null);
}

/**
 * Called whenever the user types in the field for `base`. Validates the
 * raw text against that base's character set, parses it with BigInt for
 * exact precision (no Number-based rounding above 2^53), and reformats
 * the result into the other three fields.
 */
function handleInput(base) {
  const cfg = BASE_CONFIG[base];
  const { input } = els[base];
  const raw = input.value.trim();

  if (raw === '') {
    clearAllErrors();
    clearOtherFields(base);
    return;
  }

  if (!cfg.chars.test(raw)) {
    setError(base, `Only ${cfg.charsHint} allowed in ${cfg.name.toLowerCase()}.`);
    // Don't touch the other fields — leave their last valid values intact.
    return;
  }

  setError(base, '');

  let value;
  try {
    value = parseInBase(raw, Number(base));
  } catch (err) {
    setError(base, `Couldn't parse this ${cfg.name.toLowerCase()} value.`);
    return;
  }

  for (const otherBase in BASE_CONFIG) {
    if (Number(otherBase) === base) continue;
    els[otherBase].input.value = formatInBase(value, Number(otherBase));
    setError(otherBase, '');
  }

  updateMeta(value);
}

for (const base in BASE_CONFIG) {
  const numBase = Number(base);
  els[base].input.addEventListener('input', () => handleInput(numBase));
}

clearBtn.addEventListener('click', () => {
  for (const base in BASE_CONFIG) {
    els[base].input.value = '';
    setError(base, '');
  }
  updateMeta(null);
  els[2].input.focus();
});

document.querySelectorAll('.btn-copy-field').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetInput = document.getElementById(targetId);
    copyToClipboard(targetInput.value, 'Value copied');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  updateMeta(null);
});
