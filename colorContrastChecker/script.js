'use strict';

/* ── Number helpers ─────────────────────────────────────────── */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function normalizeHue(h) {
  return ((h % 360) + 360) % 360;
}

/* ── Hex <-> RGB ────────────────────────────────────────────── */
function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function isValidHex(value) {
  return /^#?[0-9a-fA-F]{6}$/.test(String(value).trim());
}

/* ── Hex <-> HSL conversion (standard formulas, same as
   Color Palette Generator) ────────────────────────────────────
   Sanity check: #FF0000 -> r=1,g=0,b=0 -> max=1,min=0,l=0.5,
   d=1, s=1/(1-0)=1 -> 100%, h=0 -> hsl(0,100%,50%). */
function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;

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

  return { h: hue, s: s * 100, l: l * 100 };
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

/* ── WCAG 2.1 relative luminance & contrast ratio ──────────────
   Per-channel linearization: c <= 0.03928 -> c/12.92,
   else ((c+0.055)/1.055)^2.4. Then
   L = 0.2126*R + 0.7152*G + 0.0722*B.
   Contrast ratio = (L_lighter + 0.05) / (L_darker + 0.05).
   Reference checks: black/white -> L=0 and L=1 -> (1.05)/(0.05)
   = exactly 21. white/white -> (1.05)/(1.05) = exactly 1. */
function srgbChannelToLinear(c8) {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  const R = srgbChannelToLinear(rgb.r);
  const G = srgbChannelToLinear(rgb.g);
  const B = srgbChannelToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hexA, hexB) {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return null;
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/* WCAG 2.1 thresholds */
const THRESHOLDS = {
  normalAA: 4.5,
  normalAAA: 7,
  largeAA: 3,
  largeAAA: 4.5,
  uiComponent: 3,
};

/* ── Accessible-alternative search ─────────────────────────────
   Keeps the foreground's hue & saturation, and walks its HSL
   lightness step-by-step toward whichever extreme (black or
   white) gives the higher contrast against the background,
   verifying the real contrast formula at every step until the
   4.5:1 AA-normal-text threshold is actually met. This is a real
   search, not a fixed guess — and it always terminates, since one
   of pure black or pure white against any background always
   reaches at least ~4.58:1 (the crossover point is #767676-ish
   mid-gray, and even there both ends clear 4.5:1). */
function findAccessibleForeground(fgHex, bgHex, targetRatio) {
  const target = targetRatio || THRESHOLDS.normalAA;
  const hsl = hexToHsl(fgHex);
  if (!hsl) return null;

  const contrastAtLightness = (l) => contrastRatio(hslToHex(hsl.h, hsl.s, l), bgHex);

  const blackRatio = contrastAtLightness(0);
  const whiteRatio = contrastAtLightness(100);
  const direction = whiteRatio > blackRatio ? 1 : -1;

  for (let step = 0; step <= 100; step++) {
    const l = clamp(hsl.l + direction * step, 0, 100);
    const ratio = contrastAtLightness(l);
    if (ratio >= target) {
      return { hex: hslToHex(hsl.h, hsl.s, l), ratio };
    }
    if (l === 0 || l === 100) break;
  }

  // Fallback (should not normally be reached — see proof above):
  // return whichever extreme performed better.
  return whiteRatio >= blackRatio
    ? { hex: hslToHex(hsl.h, hsl.s, 100), ratio: whiteRatio }
    : { hex: hslToHex(hsl.h, hsl.s, 0), ratio: blackRatio };
}

/* ── DOM wiring ─────────────────────────────────────────────── */
const els = {
  fgColorPicker: document.getElementById('fgColorPicker'),
  fgHexInput: document.getElementById('fgHexInput'),
  bgColorPicker: document.getElementById('bgColorPicker'),
  bgHexInput: document.getElementById('bgHexInput'),
  swapBtn: document.getElementById('swapBtn'),
  copyFgBtn: document.getElementById('copyFgBtn'),
  copyBgBtn: document.getElementById('copyBgBtn'),
  previewBox: document.getElementById('previewBox'),
  previewNormal: document.getElementById('previewNormal'),
  previewLarge: document.getElementById('previewLarge'),
  ratioValue: document.getElementById('ratioValue'),
  normalAA: document.getElementById('normalAA'),
  normalAAA: document.getElementById('normalAAA'),
  largeAA: document.getElementById('largeAA'),
  largeAAA: document.getElementById('largeAAA'),
  uiComponent: document.getElementById('uiComponent'),
  suggestionCard: document.getElementById('suggestionCard'),
  suggestionSwatch: document.getElementById('suggestionSwatch'),
  suggestionHex: document.getElementById('suggestionHex'),
  suggestionRatio: document.getElementById('suggestionRatio'),
  useSuggestionBtn: document.getElementById('useSuggestionBtn'),
  resetBtn: document.getElementById('resetBtn'),
};

const DEFAULT_FG = '#111111';
const DEFAULT_BG = '#FFFFFF';

function normalizedHex(raw, fallback) {
  const trimmed = String(raw).trim();
  if (isValidHex(trimmed)) return (trimmed.startsWith('#') ? trimmed : `#${trimmed}`).toUpperCase();
  return fallback;
}

function currentFgHex() {
  return normalizedHex(els.fgHexInput.value, els.fgColorPicker.value.toUpperCase());
}
function currentBgHex() {
  return normalizedHex(els.bgHexInput.value, els.bgColorPicker.value.toUpperCase());
}

function setBadge(el, passed) {
  el.textContent = passed ? 'Pass' : 'Fail';
  el.classList.toggle('pass', passed);
  el.classList.toggle('fail', !passed);
}

function setColorFields(which, hex) {
  const picker = which === 'fg' ? els.fgColorPicker : els.bgColorPicker;
  const input = which === 'fg' ? els.fgHexInput : els.bgHexInput;
  picker.value = hex.toLowerCase();
  input.value = hex.toUpperCase();
  input.classList.remove('invalid');
}

function update() {
  const fgHex = currentFgHex();
  const bgHex = currentBgHex();

  els.previewBox.style.backgroundColor = bgHex;
  els.previewBox.style.color = fgHex;

  const ratio = contrastRatio(fgHex, bgHex);
  if (ratio === null) return;

  els.ratioValue.textContent = `${ratio.toFixed(2)}:1`;

  const normalAAPass = ratio >= THRESHOLDS.normalAA;
  setBadge(els.normalAA, normalAAPass);
  setBadge(els.normalAAA, ratio >= THRESHOLDS.normalAAA);
  setBadge(els.largeAA, ratio >= THRESHOLDS.largeAA);
  setBadge(els.largeAAA, ratio >= THRESHOLDS.largeAAA);
  setBadge(els.uiComponent, ratio >= THRESHOLDS.uiComponent);

  if (!normalAAPass) {
    const suggestion = findAccessibleForeground(fgHex, bgHex, THRESHOLDS.normalAA);
    if (suggestion) {
      els.suggestionCard.hidden = false;
      els.suggestionSwatch.style.backgroundColor = suggestion.hex;
      els.suggestionHex.textContent = suggestion.hex;
      els.suggestionRatio.textContent = `${suggestion.ratio.toFixed(2)}:1`;
      els.useSuggestionBtn.dataset.hex = suggestion.hex;
    } else {
      els.suggestionCard.hidden = true;
    }
  } else {
    els.suggestionCard.hidden = true;
  }
}

/* Two-way sync: color picker <-> hex text field, for both swatches */
els.fgColorPicker.addEventListener('input', () => {
  els.fgHexInput.value = els.fgColorPicker.value.toUpperCase();
  els.fgHexInput.classList.remove('invalid');
  update();
});
els.fgHexInput.addEventListener('input', () => {
  const raw = els.fgHexInput.value.trim();
  if (isValidHex(raw)) {
    els.fgColorPicker.value = (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase();
    els.fgHexInput.classList.remove('invalid');
  } else {
    els.fgHexInput.classList.add('invalid');
  }
  update();
});

els.bgColorPicker.addEventListener('input', () => {
  els.bgHexInput.value = els.bgColorPicker.value.toUpperCase();
  els.bgHexInput.classList.remove('invalid');
  update();
});
els.bgHexInput.addEventListener('input', () => {
  const raw = els.bgHexInput.value.trim();
  if (isValidHex(raw)) {
    els.bgColorPicker.value = (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase();
    els.bgHexInput.classList.remove('invalid');
  } else {
    els.bgHexInput.classList.add('invalid');
  }
  update();
});

els.swapBtn.addEventListener('click', () => {
  const fgHex = currentFgHex();
  const bgHex = currentBgHex();
  setColorFields('fg', bgHex);
  setColorFields('bg', fgHex);
  update();
});

els.copyFgBtn.addEventListener('click', () => {
  copyToClipboard(currentFgHex(), 'Foreground hex copied');
});
els.copyBgBtn.addEventListener('click', () => {
  copyToClipboard(currentBgHex(), 'Background hex copied');
});

els.useSuggestionBtn.addEventListener('click', () => {
  const hex = els.useSuggestionBtn.dataset.hex;
  if (!hex) return;
  setColorFields('fg', hex);
  update();
  showToast('Foreground color updated');
});

els.resetBtn.addEventListener('click', () => {
  setColorFields('fg', DEFAULT_FG);
  setColorFields('bg', DEFAULT_BG);
  update();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  update();
});
