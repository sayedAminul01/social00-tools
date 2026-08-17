'use strict';

/* ── Number helpers ─────────────────────────────────────────── */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function normalizeHue(h) {
  return ((h % 360) + 360) % 360;
}

/* ── Hex <-> HSL conversion (standard formulas) ────────────────
   hexToHsl: RGB 0-255 -> 0-1, find max/min, then
     l = (max+min)/2
     d = max-min
     s = d / (1 - |2l-1|)                     (0 when d === 0)
     h depends on which channel is max, *60, wrapped to 0-360
   Sanity check: #FF0000 -> r=1,g=0,b=0 -> max=1,min=0,l=0.5,
   d=1, s=1/(1-0)=1 -> 100%, h=((0-0)/1)*60=0 -> hsl(0,100%,50%). */
function hexToHsl(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;

  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let hue = 0;
  let s = 0;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { h: Math.round(hue), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/* hslToHex: standard chroma/x/m piecewise conversion.
   Sanity check: hsl(0,100%,50%) -> c=1, x=0, m=0 -> (r,g,b)=(1,0,0)
   -> #FF0000, matching the inverse check above. */
function hslToHex(h, s, l) {
  const hue = normalizeHue(h);
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (hue < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (hue < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (hue < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (hue < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (hue < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const toHex = (v) => {
    const n = clamp(Math.round((v + m) * 255), 0, 255);
    return n.toString(16).padStart(2, '0');
  };

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}

/* ── Keyword -> deterministic seed hue ─────────────────────────
   Sum of character codes, mapped to 0-360 with modulo. Fixed
   65% saturation / 50% lightness seed, per spec. */
function hashKeywordToHue(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return sum % 360;
}

/* ── Harmony palette generation ─────────────────────────────── */
function mkSwatch(h, s, l) {
  return { h: normalizeHue(h), s: clamp(s, 0, 100), l: clamp(l, 5, 95) };
}

function generatePalette(h, s, l, harmony) {
  switch (harmony) {
    case 'complementary':
      return [
        mkSwatch(h, s, l),
        mkSwatch(h + 180, s, l),
        mkSwatch(h, s, l + 20),
        mkSwatch(h, s, l - 20),
        mkSwatch(h + 180, s, l + 15),
      ];
    case 'analogous':
      return [
        mkSwatch(h - 30, s, l),
        mkSwatch(h - 15, s, l),
        mkSwatch(h, s, l),
        mkSwatch(h + 15, s, l),
        mkSwatch(h + 30, s, l),
      ];
    case 'triadic':
      return [
        mkSwatch(h, s, l),
        mkSwatch(h + 120, s, l),
        mkSwatch(h + 240, s, l),
        mkSwatch(h, s, l + 20),
        mkSwatch(h, s, l - 20),
      ];
    case 'split-complementary':
      return [
        mkSwatch(h, s, l),
        mkSwatch(h + 150, s, l),
        mkSwatch(h + 210, s, l),
        mkSwatch(h, s, l + 20),
        mkSwatch(h, s, l - 20),
      ];
    case 'tetradic':
      return [
        mkSwatch(h, s, l),
        mkSwatch(h + 90, s, l),
        mkSwatch(h + 180, s, l),
        mkSwatch(h + 270, s, l),
        mkSwatch(h, s, l + 20),
      ];
    case 'monochromatic':
      return [20, 35, 50, 65, 80].map((ll) => mkSwatch(h, s, ll));
    default:
      return [mkSwatch(h, s, l)];
  }
}

/* ── DOM wiring ─────────────────────────────────────────────── */
const els = {
  colorPicker: document.getElementById('colorPicker'),
  hexInput: document.getElementById('hexInput'),
  keywordInput: document.getElementById('keywordInput'),
  harmonySelect: document.getElementById('harmonySelect'),
  generateBtn: document.getElementById('generateBtn'),
  swatchesRow: document.getElementById('swatchesRow'),
  copyCssBtn: document.getElementById('copyCssBtn'),
  copyTailwindBtn: document.getElementById('copyTailwindBtn'),
};

let currentPaletteHexes = [];

function isValidHex(value) {
  return /^#?[0-9a-fA-F]{6}$/.test(String(value).trim());
}

/* Two-way sync: color picker <-> hex text field */
els.colorPicker.addEventListener('input', () => {
  els.hexInput.value = els.colorPicker.value.toUpperCase();
  els.hexInput.classList.remove('invalid');
});

els.hexInput.addEventListener('input', () => {
  const raw = els.hexInput.value.trim();
  if (isValidHex(raw)) {
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    els.colorPicker.value = normalized.toLowerCase();
    els.hexInput.classList.remove('invalid');
  } else {
    els.hexInput.classList.add('invalid');
  }
});

function renderSwatches(hexList) {
  currentPaletteHexes = hexList;
  els.swatchesRow.innerHTML = hexList
    .map(
      (hex) => `
      <div class="swatch-block">
        <div class="swatch" style="background-color:${hex}" data-hex="${hex}" tabindex="0" role="button" aria-label="Copy ${hex}"></div>
        <span class="swatch-label">${hex}</span>
      </div>`
    )
    .join('');

  els.swatchesRow.querySelectorAll('.swatch').forEach((sw) => {
    const copy = () => copyToClipboard(sw.dataset.hex, `${sw.dataset.hex} copied`);
    sw.addEventListener('click', copy);
    sw.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); }
    });
  });
}

function generate() {
  const keyword = els.keywordInput.value.trim();
  let seed;

  if (keyword) {
    seed = { h: hashKeywordToHue(keyword), s: 65, l: 50 };
  } else {
    const hex = els.hexInput.value.trim() || els.colorPicker.value;
    const hsl = hexToHsl(hex);
    if (!hsl) {
      showToast('Enter a valid 6-digit hex code');
      return;
    }
    seed = hsl;
  }

  const swatches = generatePalette(seed.h, seed.s, seed.l, els.harmonySelect.value);
  const hexList = swatches.map((sw) => hslToHex(sw.h, sw.s, sw.l));
  renderSwatches(hexList);
}

els.generateBtn.addEventListener('click', generate);
els.keywordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); generate(); }
});

els.copyCssBtn.addEventListener('click', () => {
  if (!currentPaletteHexes.length) { showToast('Generate a palette first'); return; }
  const body = currentPaletteHexes.map((hex, i) => `  --color-${i + 1}: ${hex};`).join('\n');
  copyToClipboard(`:root {\n${body}\n}`, 'CSS variables copied');
});

els.copyTailwindBtn.addEventListener('click', () => {
  if (!currentPaletteHexes.length) { showToast('Generate a palette first'); return; }
  const body = currentPaletteHexes.map((hex, i) => `    brand${i + 1}: '${hex}',`).join('\n');
  copyToClipboard(`colors: {\n${body}\n}`, 'Tailwind config copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('image');
  generate();
});
