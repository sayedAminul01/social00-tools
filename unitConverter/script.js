'use strict';

/**
 * Social00 — Unit Converter
 * Every category converts through a single canonical base unit
 * (see each category's `base`) instead of an N×N pairwise table:
 *   value_in_base = input * units[from].factor
 *   result        = value_in_base / units[to].factor
 * Temperature has no shared zero point, so it's handled separately
 * via a common Celsius pivot (see convertTemperature).
 */

const CATEGORIES = [
  {
    key: 'length', label: 'Length', icon: '📏', base: 'm',
    units: [
      { id: 'mm', label: 'Millimeters (mm)', factor: 0.001 },
      { id: 'cm', label: 'Centimeters (cm)', factor: 0.01 },
      { id: 'm', label: 'Meters (m)', factor: 1 },
      { id: 'km', label: 'Kilometers (km)', factor: 1000 },
      { id: 'in', label: 'Inches (in)', factor: 0.0254 },
      { id: 'ft', label: 'Feet (ft)', factor: 0.3048 },
      { id: 'yd', label: 'Yards (yd)', factor: 0.9144 },
      { id: 'mi', label: 'Miles (mi)', factor: 1609.344 },
    ],
    default: { from: 'in', to: 'cm' },
  },
  {
    key: 'weight', label: 'Weight', icon: '⚖️', base: 'kg',
    units: [
      { id: 'mg', label: 'Milligrams (mg)', factor: 0.000001 },
      { id: 'g', label: 'Grams (g)', factor: 0.001 },
      { id: 'kg', label: 'Kilograms (kg)', factor: 1 },
      { id: 't', label: 'Metric Tons (t)', factor: 1000 },
      { id: 'oz', label: 'Ounces (oz)', factor: 0.45359237 / 16 },
      { id: 'lb', label: 'Pounds (lb)', factor: 0.45359237 },
      { id: 'st', label: 'Stone (st)', factor: 0.45359237 * 14 },
    ],
    default: { from: 'kg', to: 'lb' },
  },
  {
    key: 'temperature', label: 'Temperature', icon: '🌡️', special: 'temperature',
    units: [
      { id: 'c', label: 'Celsius (°C)' },
      { id: 'f', label: 'Fahrenheit (°F)' },
      { id: 'k', label: 'Kelvin (K)' },
    ],
    default: { from: 'c', to: 'f' },
  },
  {
    key: 'volume', label: 'Volume (US)', icon: '🧪', base: 'L',
    units: [
      { id: 'ml', label: 'Milliliters (mL)', factor: 0.001 },
      { id: 'l', label: 'Liters (L)', factor: 1 },
      { id: 'm3', label: 'Cubic Meters (m³)', factor: 1000 },
      { id: 'floz', label: 'US Fluid Ounces (fl oz)', factor: 3.785411784 / 128 },
      { id: 'cup', label: 'US Cups', factor: 3.785411784 / 16 },
      { id: 'pt', label: 'US Pints', factor: 3.785411784 / 8 },
      { id: 'gal', label: 'US Gallons', factor: 3.785411784 },
    ],
    default: { from: 'gal', to: 'l' },
  },
  {
    key: 'area', label: 'Area', icon: '📐', base: 'm2',
    units: [
      { id: 'm2', label: 'Square Meters (m²)', factor: 1 },
      { id: 'km2', label: 'Square Kilometers (km²)', factor: 1000000 },
      { id: 'ft2', label: 'Square Feet (ft²)', factor: 0.3048 * 0.3048 },
      { id: 'yd2', label: 'Square Yards (yd²)', factor: 0.9144 * 0.9144 },
      { id: 'acre', label: 'Acres', factor: 4046.8564224 },
      { id: 'ha', label: 'Hectares', factor: 10000 },
    ],
    default: { from: 'acre', to: 'm2' },
  },
  {
    key: 'speed', label: 'Speed', icon: '🚀', base: 'mps',
    units: [
      { id: 'mps', label: 'Meters/Second (m/s)', factor: 1 },
      { id: 'kph', label: 'Kilometers/Hour (km/h)', factor: 1000 / 3600 },
      { id: 'mph', label: 'Miles/Hour (mph)', factor: 1609.344 / 3600 },
      { id: 'kn', label: 'Knots (kn)', factor: 1852 / 3600 },
    ],
    default: { from: 'kph', to: 'mph' },
  },
  {
    key: 'data', label: 'Data Storage', icon: '💾', base: 'B',
    units: [
      { id: 'b', label: 'Bytes (B)', factor: 1 },
      { id: 'kb', label: 'Kilobytes (KB)', factor: 1024 },
      { id: 'mb', label: 'Megabytes (MB)', factor: 1024 ** 2 },
      { id: 'gb', label: 'Gigabytes (GB)', factor: 1024 ** 3 },
      { id: 'tb', label: 'Terabytes (TB)', factor: 1024 ** 4 },
    ],
    default: { from: 'gb', to: 'mb' },
  },
];

const ABSOLUTE_ZERO_C = -273.15;

const els = {
  categoryTabs: document.getElementById('categoryTabs'),
  fromUnit: document.getElementById('fromUnit'),
  toUnit: document.getElementById('toUnit'),
  fromValue: document.getElementById('fromValue'),
  resultValue: document.getElementById('resultValue'),
  converterNote: document.getElementById('converterNote'),
  swapBtn: document.getElementById('swapBtn'),
  resetBtn: document.getElementById('resetBtn'),
  copyResultBtn: document.getElementById('copyResultBtn'),
};

let currentCategory = CATEGORIES[0];

/* ── Temperature: pivot through Celsius so every pair (C/F/K)
   uses the correct affine formula instead of a plain factor. ── */
function toCelsius(value, unit) {
  if (unit === 'c') return value;
  if (unit === 'f') return (value - 32) * 5 / 9;
  if (unit === 'k') return value - 273.15;
  return NaN;
}
function fromCelsius(celsius, unit) {
  if (unit === 'c') return celsius;
  if (unit === 'f') return celsius * 9 / 5 + 32;
  if (unit === 'k') return celsius + 273.15;
  return NaN;
}
function convertTemperature(value, fromId, toId) {
  const celsius = toCelsius(value, fromId);
  if (celsius < ABSOLUTE_ZERO_C - 1e-9) return { error: true };
  return { value: fromCelsius(celsius, toId) };
}

/* ── Linear categories: base-unit factor conversion ── */
function convertLinear(category, value, fromId, toId) {
  const units = category.units;
  const from = units.find(u => u.id === fromId);
  const to = units.find(u => u.id === toId);
  if (!from || !to) return { error: true };
  const baseValue = value * from.factor;
  return { value: baseValue / to.factor };
}

function convert(category, value, fromId, toId) {
  if (category.special === 'temperature') return convertTemperature(value, fromId, toId);
  return convertLinear(category, value, fromId, toId);
}

/* ── Format to up to 6 significant figures, trimming trailing zeros ── */
function formatResult(num) {
  if (!isFinite(num)) return '—';
  if (num === 0) return '0';

  const abs = Math.abs(num);
  let str;
  if (abs >= 1e21 || abs < 1e-6) {
    str = num.toExponential(5).replace(/\.?0+e/, 'e');
  } else {
    let precise = Number(num.toPrecision(6));
    str = precise.toString();
    if (str.includes('e')) str = precise.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    str = parts.join('.');
  }
  return str;
}

/* ── Populate selects for the active category ── */
function populateUnitSelect(select, category, selectedId) {
  select.innerHTML = category.units
    .map(u => `<option value="${u.id}"${u.id === selectedId ? ' selected' : ''}>${u.label}</option>`)
    .join('');
}

function renderCategoryTabs() {
  els.categoryTabs.innerHTML = CATEGORIES.map(cat => `
    <button type="button" class="cat-tab${cat.key === currentCategory.key ? ' active' : ''}"
      data-category="${cat.key}" role="tab" aria-selected="${cat.key === currentCategory.key}">
      ${cat.icon} ${cat.label}
    </button>
  `).join('');

  els.categoryTabs.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = CATEGORIES.find(c => c.key === tab.dataset.category);
      if (!cat || cat.key === currentCategory.key) return;
      currentCategory = cat;
      els.categoryTabs.querySelectorAll('.cat-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      loadCategory();
    });
  });
}

function loadCategory() {
  populateUnitSelect(els.fromUnit, currentCategory, currentCategory.default.from);
  populateUnitSelect(els.toUnit, currentCategory, currentCategory.default.to);
  els.fromValue.value = '1';

  if (currentCategory.special === 'temperature') {
    els.converterNote.textContent = 'Temperature uses the correct offset formulas (not simple multiplication) and can\'t go below absolute zero (−273.15 °C / 0 K).';
  } else if (currentCategory.key === 'volume') {
    els.converterNote.textContent = 'US customary units — a UK/imperial gallon is about 20% larger and is not what this converts.';
  } else if (currentCategory.key === 'data') {
    els.converterNote.textContent = 'Uses the 1024-based binary convention (KiB/MiB/GiB math), labeled with everyday KB/MB/GB names.';
  } else {
    els.converterNote.textContent = '';
  }

  update();
}

function update() {
  const raw = els.fromValue.value.trim();
  const value = parseFloat(raw);
  els.fromValue.classList.toggle('error', raw !== '' && isNaN(value));

  if (raw === '' || isNaN(value)) {
    els.resultValue.textContent = '0';
    els.resultValue.classList.remove('is-error');
    return;
  }

  const fromId = els.fromUnit.value;
  const toId = els.toUnit.value;
  const result = convert(currentCategory, value, fromId, toId);

  if (result.error) {
    els.resultValue.textContent = `Below absolute zero — the lowest possible temperature is −273.15 °C (0 K).`;
    els.resultValue.classList.add('is-error');
    return;
  }

  els.resultValue.classList.remove('is-error');
  els.resultValue.textContent = formatResult(result.value);
}

/* ── Events ── */
els.fromValue.addEventListener('input', update);
els.fromUnit.addEventListener('change', update);
els.toUnit.addEventListener('change', update);

els.swapBtn.addEventListener('click', () => {
  const fromId = els.fromUnit.value;
  const toId = els.toUnit.value;
  els.fromUnit.value = toId;
  els.toUnit.value = fromId;
  update();
});

els.resetBtn.addEventListener('click', () => {
  loadCategory();
});

els.copyResultBtn.addEventListener('click', () => {
  const text = els.resultValue.textContent.trim();
  if (!text || text === '0' || els.resultValue.classList.contains('is-error')) {
    if (typeof showToast === 'function') showToast('Nothing to copy yet');
    return;
  }
  copyToClipboard(text, 'Result copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  renderCategoryTabs();
  loadCategory();
});
