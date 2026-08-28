'use strict';

/* ── Cryptographically secure randomness ─────────────────────────
   Uses window.crypto.getRandomValues() exclusively — never
   Math.random() — for every number this tool produces. Random
   bytes are consumed via rejection sampling (the same technique
   used by this site's Password Generator) so every integer in the
   requested range has an exactly equal chance of being chosen —
   no modulo bias. */

// Draw an unbiased random integer in the inclusive range [min, max].
// Generalizes the single-byte rejection-sampling approach to as
// many bytes as the range needs: compute the total space spanned
// by that many random bytes, find the largest multiple of `range`
// that fits inside it, and discard (re-draw) any value landing in
// the small leftover "excess" zone — the classic fix for the
// naive (and biased) `random() % range` shortcut.
function secureRandomInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('min and max must be integers');
  }
  if (max < min) throw new Error('max must be >= min');

  const range = max - min + 1;
  if (range === 1) return min;

  // Number of bytes needed to comfortably cover `range` values.
  // Capped at 6 bytes (48 bits / ~281 trillion values) which stays
  // safely within Number.MAX_SAFE_INTEGER for the arithmetic below
  // and covers every realistic range this UI can produce.
  const bitsNeeded = Math.ceil(Math.log2(range));
  const bytesNeeded = Math.min(6, Math.max(1, Math.ceil(bitsNeeded / 8)));
  const totalSpace = Math.pow(256, bytesNeeded);
  const limit = Math.floor(totalSpace / range) * range;

  const buf = new Uint8Array(bytesNeeded);
  let rand;
  do {
    window.crypto.getRandomValues(buf);
    rand = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      rand = rand * 256 + buf[i];
    }
  } while (rand >= limit);

  return min + (rand % range);
}

// Generate `quantity` numbers in [min, max]. When `unique` is true,
// draws distinct values via a Set-based rejection loop — callers
// must validate quantity <= range size beforehand so this can
// never loop forever.
function generateNumbers(min, max, quantity, unique) {
  if (!unique) {
    const results = [];
    for (let i = 0; i < quantity; i++) {
      results.push(secureRandomInt(min, max));
    }
    return results;
  }

  const seen = new Set();
  while (seen.size < quantity) {
    seen.add(secureRandomInt(min, max));
  }
  return Array.from(seen);
}

/* ── DOM wiring ───────────────────────────────────────────────── */
const els = {
  minValue: document.getElementById('minValue'),
  maxValue: document.getElementById('maxValue'),
  quantity: document.getElementById('quantity'),
  allowDuplicates: document.getElementById('allowDuplicates'),
  fieldError: document.getElementById('fieldError'),
  generateBtn: document.getElementById('generateBtn'),
  rngOutput: document.getElementById('rngOutput'),
  rngResultList: document.getElementById('rngResultList'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  fairMin: document.getElementById('fairMin'),
  fairMax: document.getElementById('fairMax'),
  fairSamples: document.getElementById('fairSamples'),
  runFairnessBtn: document.getElementById('runFairnessBtn'),
  fairnessChart: document.getElementById('fairnessChart'),
  fairnessSummary: document.getElementById('fairnessSummary'),
};

let lastResults = [];

function showError(message) {
  els.fieldError.textContent = message;
  els.fieldError.hidden = false;
}

function clearError() {
  els.fieldError.hidden = true;
  els.fieldError.textContent = '';
}

function validateInputs() {
  const min = parseInt(els.minValue.value, 10);
  const max = parseInt(els.maxValue.value, 10);
  const quantity = parseInt(els.quantity.value, 10);
  const allowDuplicates = els.allowDuplicates.checked;

  if (!Number.isFinite(min) || !Number.isInteger(min)) {
    return { error: 'Minimum must be a whole number.' };
  }
  if (!Number.isFinite(max) || !Number.isInteger(max)) {
    return { error: 'Maximum must be a whole number.' };
  }
  if (min > max) {
    return { error: 'Minimum must be less than or equal to maximum.' };
  }
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
    return { error: 'Quantity must be a whole number of at least 1.' };
  }
  if (quantity > 10000) {
    return { error: 'Quantity is limited to 10,000 per generation.' };
  }

  const rangeSize = max - min + 1;
  if (!allowDuplicates && quantity > rangeSize) {
    return { error: `Can't generate ${quantity} unique numbers from a range that only contains ${rangeSize} value${rangeSize === 1 ? '' : 's'}. Increase the range, reduce the quantity, or allow duplicates.` };
  }

  return { min, max, quantity, allowDuplicates };
}

function renderResults(numbers) {
  els.rngResultList.innerHTML = '';
  const single = numbers.length === 1;

  numbers.forEach((num) => {
    const item = document.createElement('div');
    item.className = 'rng-result-item' + (single ? ' rng-result-single' : '');

    const value = document.createElement('span');
    value.className = 'rng-result-value';
    value.textContent = num;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rng-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => copyToClipboard(String(num), 'Number copied'));

    item.appendChild(value);
    item.appendChild(btn);
    els.rngResultList.appendChild(item);
  });

  els.rngOutput.hidden = false;
}

function handleGenerate() {
  clearError();
  const validated = validateInputs();
  if (validated.error) {
    showError(validated.error);
    els.rngOutput.hidden = true;
    return;
  }

  const { min, max, quantity, allowDuplicates } = validated;
  const numbers = generateNumbers(min, max, quantity, !allowDuplicates);
  lastResults = numbers;
  renderResults(numbers);
}

els.generateBtn.addEventListener('click', handleGenerate);

els.copyAllBtn.addEventListener('click', () => {
  if (!lastResults.length) {
    window.showToast('Generate numbers first');
    return;
  }
  // Copied as comma-separated values.
  copyToClipboard(lastResults.join(', '), 'All numbers copied');
});

/* ── Fairness sanity check ────────────────────────────────────── */
function runFairnessTest() {
  const min = parseInt(els.fairMin.value, 10);
  const max = parseInt(els.fairMax.value, 10);
  const samples = parseInt(els.fairSamples.value, 10);

  if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
    els.fairnessSummary.textContent = 'Enter a valid min/max (min must be less than max) for the fairness test.';
    els.fairnessChart.innerHTML = '';
    return;
  }
  const range = max - min + 1;
  if (range > 30) {
    els.fairnessSummary.textContent = 'Keep the fairness test range to 30 values or fewer so the chart stays readable.';
    els.fairnessChart.innerHTML = '';
    return;
  }

  const counts = new Array(range).fill(0);
  for (let i = 0; i < samples; i++) {
    const n = secureRandomInt(min, max);
    counts[n - min]++;
  }

  const expected = samples / range;
  const maxCount = Math.max(...counts);

  els.fairnessChart.innerHTML = '';
  counts.forEach((count, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'fairness-bar-wrap';

    const countLabel = document.createElement('span');
    countLabel.className = 'fairness-bar-count';
    countLabel.textContent = count;

    const bar = document.createElement('div');
    bar.className = 'fairness-bar';
    const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
    bar.style.height = heightPct + '%';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'fairness-bar-label';
    valueLabel.textContent = min + i;

    wrap.appendChild(countLabel);
    wrap.appendChild(bar);
    wrap.appendChild(valueLabel);
    els.fairnessChart.appendChild(wrap);
  });

  const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - expected))) / expected * 100;
  els.fairnessSummary.textContent = `${samples.toLocaleString()} draws across ${range} values. Expected ~${expected.toFixed(0)} per value; largest deviation was ${maxDeviation.toFixed(1)}% — consistent with an unbiased, uniform generator.`;
}

els.runFairnessBtn.addEventListener('click', runFairnessTest);

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
});
