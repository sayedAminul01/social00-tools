'use strict';

const LB_TO_KG = 0.45359237; // exact
const IN_TO_M = 0.0254;      // exact

const els = {
  unitMetricBtn: document.getElementById('unitMetricBtn'),
  unitImperialBtn: document.getElementById('unitImperialBtn'),
  panelMetric: document.getElementById('panel-metric'),
  panelImperial: document.getElementById('panel-imperial'),
  heightCm: document.getElementById('heightCm'),
  weightKg: document.getElementById('weightKg'),
  heightFt: document.getElementById('heightFt'),
  heightIn: document.getElementById('heightIn'),
  weightLb: document.getElementById('weightLb'),
  calcBtn: document.getElementById('calcBtn'),
  clearBtn: document.getElementById('clearBtn'),
  copyBtn: document.getElementById('copyBtn'),
  bmiValue: document.getElementById('bmiValue'),
  bmiCategory: document.getElementById('bmiCategory'),
  gaugeMarker: document.getElementById('gaugeMarker'),
};

let currentUnit = 'metric';
let lastSummary = '';

function setUnit(unit) {
  currentUnit = unit;
  const isMetric = unit === 'metric';
  els.unitMetricBtn.classList.toggle('active', isMetric);
  els.unitMetricBtn.setAttribute('aria-selected', String(isMetric));
  els.unitImperialBtn.classList.toggle('active', !isMetric);
  els.unitImperialBtn.setAttribute('aria-selected', String(!isMetric));
  els.panelMetric.classList.toggle('active', isMetric);
  els.panelImperial.classList.toggle('active', !isMetric);
}

// Core formula: BMI = weight(kg) / height(m)^2
function bmiFromKgM(weightKg, heightM) {
  return weightKg / (heightM * heightM);
}

function isPositiveNumber(n) {
  return typeof n === 'number' && isFinite(n) && n > 0;
}

// Reads and validates the currently active unit panel's inputs.
// Returns { ok: true, weightKg, heightM } or { ok: false, error }.
function readInputs() {
  if (currentUnit === 'metric') {
    const heightCm = parseFloat(els.heightCm.value);
    const weightKg = parseFloat(els.weightKg.value);
    if (!isPositiveNumber(heightCm) || !isPositiveNumber(weightKg)) {
      return { ok: false, error: 'Enter a valid height and weight' };
    }
    return { ok: true, weightKg, heightM: heightCm / 100 };
  }

  const ft = parseFloat(els.heightFt.value) || 0;
  const inch = parseFloat(els.heightIn.value) || 0;
  const weightLb = parseFloat(els.weightLb.value);
  const totalInches = ft * 12 + inch;

  if (!isPositiveNumber(totalInches) || !isPositiveNumber(weightLb)) {
    return { ok: false, error: 'Enter a valid height and weight' };
  }
  return { ok: true, weightKg: weightLb * LB_TO_KG, heightM: totalInches * IN_TO_M };
}

function categoryFor(bmi) {
  if (bmi < 18.5) return { name: 'Underweight', cls: 'cat-under' };
  if (bmi < 25) return { name: 'Normal weight', cls: 'cat-normal' };
  if (bmi < 30) return { name: 'Overweight', cls: 'cat-over' };
  return { name: 'Obese', cls: 'cat-obese' };
}

function updateGauge(bmi) {
  const clamped = Math.min(40, Math.max(15, bmi));
  const pct = ((clamped - 15) / (40 - 15)) * 100;
  els.gaugeMarker.style.left = pct + '%';
}

function heightSummary() {
  if (currentUnit === 'metric') return `${els.heightCm.value} cm`;
  const ft = els.heightFt.value || '0';
  const inch = els.heightIn.value || '0';
  return `${ft}'${inch}"`;
}

function weightSummary() {
  return currentUnit === 'metric' ? `${els.weightKg.value} kg` : `${els.weightLb.value} lb`;
}

function calculate(showErrors) {
  const result = readInputs();
  if (!result.ok) {
    els.bmiValue.textContent = '—';
    els.bmiCategory.textContent = 'Enter your height and weight above';
    els.bmiCategory.className = 'result-category';
    lastSummary = '';
    if (showErrors && typeof showToast === 'function') showToast(result.error);
    return;
  }

  const bmi = bmiFromKgM(result.weightKg, result.heightM);
  const rounded = Math.round(bmi * 10) / 10;
  const cat = categoryFor(bmi);

  els.bmiValue.textContent = rounded.toFixed(1);
  els.bmiCategory.textContent = cat.name;
  els.bmiCategory.className = 'result-category ' + cat.cls;
  updateGauge(bmi);

  lastSummary = `BMI: ${rounded.toFixed(1)} (${cat.name}) — Height: ${heightSummary()}, Weight: ${weightSummary()}. Screening estimate only, not a medical diagnosis.`;
}

els.unitMetricBtn.addEventListener('click', () => { setUnit('metric'); calculate(false); });
els.unitImperialBtn.addEventListener('click', () => { setUnit('imperial'); calculate(false); });

[els.heightCm, els.weightKg, els.heightFt, els.heightIn, els.weightLb].forEach((input) => {
  input.addEventListener('input', () => calculate(false));
});

els.calcBtn.addEventListener('click', () => calculate(true));

els.clearBtn.addEventListener('click', () => {
  [els.heightCm, els.weightKg, els.heightFt, els.heightIn, els.weightLb].forEach((input) => { input.value = ''; });
  calculate(false);
});

els.copyBtn.addEventListener('click', () => {
  copyToClipboard(lastSummary, 'Result copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  setUnit('metric');
  calculate(false);
});
