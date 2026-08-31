'use strict';

/* ────────────────────────────────────────────────────────────────
   MD5 (RFC 1321). Not available in Web Crypto, so implemented here
   from scratch and verified against the official RFC 1321 test
   vectors, e.g. MD5("") = d41d8cd98f00b204e9800998ecf8427e,
   MD5("abc") = 900150983cd24fb0d6963f7d28e17f72.
   ──────────────────────────────────────────────────────────────── */
const MD5_K = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

function md5LeftRotate(x, c) {
  return ((x << c) | (x >>> (32 - c))) >>> 0;
}

// Computes the MD5 digest of a Uint8Array and returns it as a
// lowercase hex string. Works identically for UTF-8 text bytes and
// raw file bytes.
function md5Hex(bytes) {
  const origLen = bytes.length;
  const bitLen = origLen * 8;

  // Pad: append 0x80, then zero bytes until length % 64 === 56,
  // then the original bit-length as a 64-bit little-endian integer.
  let newLen = origLen + 1;
  while (newLen % 64 !== 56) newLen++;
  newLen += 8;

  const buf = new Uint8Array(newLen);
  buf.set(bytes);
  buf[origLen] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(newLen - 8, bitLen >>> 0, true);
  dv.setUint32(newLen - 4, Math.floor(bitLen / 0x100000000) >>> 0, true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let blockStart = 0; blockStart < newLen; blockStart += 64) {
    const M = new Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(blockStart + j * 4, true);

    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }

      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + md5LeftRotate(F, MD5_S[i])) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const toHexLE = (n) => {
    let out = '';
    for (let k = 0; k < 4; k++) out += ((n >>> (k * 8)) & 0xff).toString(16).padStart(2, '0');
    return out;
  };
  return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
}

/* ────────────────────────────────────────────────────────────────
   SHA-1 / SHA-256 / SHA-384 / SHA-512 via the native Web Crypto API
   — a trusted, browser-native implementation.
   ──────────────────────────────────────────────────────────────── */
async function webCryptoHex(algo, bytes) {
  const digest = await crypto.subtle.digest(algo, bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeAllHashes(bytes) {
  const [sha1, sha256, sha384, sha512] = await Promise.all([
    webCryptoHex('SHA-1', bytes),
    webCryptoHex('SHA-256', bytes),
    webCryptoHex('SHA-384', bytes),
    webCryptoHex('SHA-512', bytes),
  ]);
  return {
    MD5: md5Hex(bytes),
    'SHA-1': sha1,
    'SHA-256': sha256,
    'SHA-384': sha384,
    'SHA-512': sha512,
  };
}

/* ────────────────────────────────────────────────────────────────
   UI wiring
   ──────────────────────────────────────────────────────────────── */
const ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

const els = {
  tabText: document.getElementById('tabText'),
  tabFile: document.getElementById('tabFile'),
  panelText: document.getElementById('panelText'),
  panelFile: document.getElementById('panelFile'),
  textInput: document.getElementById('textInput'),
  clearBtn: document.getElementById('clearBtn'),
  hashTextBtn: document.getElementById('hashTextBtn'),
  fileInput: document.getElementById('fileInput'),
  fileMeta: document.getElementById('fileMeta'),
  hashList: document.getElementById('hashList'),
  compareInput: document.getElementById('compareInput'),
  compareResult: document.getElementById('compareResult'),
};

let currentHashes = {};

function setMode(mode) {
  const isText = mode === 'text';
  els.tabText.classList.toggle('active', isText);
  els.tabFile.classList.toggle('active', !isText);
  els.tabText.setAttribute('aria-selected', String(isText));
  els.tabFile.setAttribute('aria-selected', String(!isText));
  els.panelText.classList.toggle('hidden', !isText);
  els.panelFile.classList.toggle('hidden', isText);
}

els.tabText.addEventListener('click', () => setMode('text'));
els.tabFile.addEventListener('click', () => setMode('file'));

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
  return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function renderHashes(results) {
  currentHashes = results;
  ALGOS.forEach((algo) => {
    const el = document.getElementById('hash-' + algo);
    if (el) el.textContent = results[algo] || '—';
  });
  updateCompare();
}

function resetHashes() {
  currentHashes = {};
  ALGOS.forEach((algo) => {
    const el = document.getElementById('hash-' + algo);
    if (el) {
      el.textContent = '—';
      el.classList.remove('match');
    }
  });
  updateCompare();
}

async function hashText() {
  const text = els.textInput.value;
  if (!text) {
    resetHashes();
    return;
  }
  const bytes = new TextEncoder().encode(text);
  const results = await computeAllHashes(bytes);
  renderHashes(results);
}

let debounceTimer = null;
els.textInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(hashText, 200);
});
els.hashTextBtn.addEventListener('click', hashText);

els.clearBtn.addEventListener('click', () => {
  els.textInput.value = '';
  resetHashes();
  els.textInput.focus();
});

els.fileInput.addEventListener('change', async () => {
  const file = els.fileInput.files && els.fileInput.files[0];
  if (!file) {
    els.fileMeta.textContent = 'No file selected — hashes compute over the raw file bytes, nothing is uploaded.';
    resetHashes();
    return;
  }
  els.fileMeta.textContent = `Hashing "${file.name}" (${formatBytes(file.size)})…`;
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const results = await computeAllHashes(bytes);
    renderHashes(results);
    els.fileMeta.textContent = `"${file.name}" (${formatBytes(file.size)}) — hashed locally, never uploaded.`;
  } catch (err) {
    els.fileMeta.textContent = 'Could not read file: ' + (err && err.message ? err.message : err);
  }
});

/* Copy buttons (event delegation) */
els.hashList.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-hash-copy');
  if (!btn) return;
  const targetId = btn.getAttribute('data-target');
  const valueEl = document.getElementById(targetId);
  if (!valueEl || valueEl.textContent === '—') {
    if (typeof showToast === 'function') showToast('Nothing to copy yet');
    return;
  }
  copyToClipboard(valueEl.textContent, targetId.replace('hash-', '') + ' hash copied');
});

/* Compare against an expected hash */
function updateCompare() {
  const expected = els.compareInput.value.trim().toLowerCase();

  ALGOS.forEach((algo) => {
    const el = document.getElementById('hash-' + algo);
    if (el) el.classList.remove('match');
  });

  if (!expected) {
    els.compareResult.textContent = '';
    els.compareResult.className = 'compare-result';
    return;
  }

  const haveHashes = Object.keys(currentHashes).length > 0;
  let matchedAlgo = null;

  if (haveHashes) {
    ALGOS.forEach((algo) => {
      const value = currentHashes[algo];
      if (value && value.toLowerCase() === expected) {
        matchedAlgo = algo;
        const el = document.getElementById('hash-' + algo);
        if (el) el.classList.add('match');
      }
    });
  }

  if (!haveHashes) {
    els.compareResult.textContent = 'Generate a hash first';
    els.compareResult.className = 'compare-result';
  } else if (matchedAlgo) {
    els.compareResult.textContent = `✓ Matches ${matchedAlgo}`;
    els.compareResult.className = 'compare-result match';
  } else {
    els.compareResult.textContent = '✗ No match';
    els.compareResult.className = 'compare-result no-match';
  }
}

els.compareInput.addEventListener('input', updateCompare);

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
});
