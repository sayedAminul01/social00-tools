/**
 * Social00 — Final Grade Calculator
 * script.js
 * Vanilla JS — no dependencies. All math is exact weighted-average algebra,
 * computed locally. Nothing here calls a server or "AI" — it's real formulas.
 */
'use strict';

/* =============================================
   HELPERS
   ============================================= */
function getNum(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const v = parseFloat(el.value);
  return isNaN(v) ? null : v;
}

function fmtPctFixed(n, dp = 2) {
  return n.toFixed(dp) + '%';
}

function setError(id, isError) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('error', isError);
}

function inRange(n) {
  return n !== null && n >= 0 && n <= 100;
}


/* =============================================
   MODE TABS
   ============================================= */
(function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.calc-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById('panel-' + mode).classList.add('active');
    });
  });
})();


/* =============================================
   COMPONENT BREAKDOWN (Mode 1 only)
   ============================================= */
let componentId = 0;

function addComponentRow(name = '', weight = '', score = '') {
  const list = document.getElementById('componentsList');
  const id = ++componentId;
  const row = document.createElement('div');
  row.className = 'component-row';
  row.dataset.id = id;
  row.innerHTML = `
    <input type="text" class="comp-name" placeholder="e.g. Homework" value="${name}" autocomplete="off" />
    <input type="number" class="comp-weight" placeholder="Weight %" min="0" max="100" step="0.01" value="${weight}" inputmode="decimal" autocomplete="off" />
    <input type="number" class="comp-score" placeholder="Score %" min="0" max="100" step="0.01" value="${score}" inputmode="decimal" autocomplete="off" />
    <button type="button" class="btn-remove-component" aria-label="Remove component">×</button>
  `;
  list.appendChild(row);

  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      recomputeComponents();
      calculateNeed();
    });
  });
  row.querySelector('.btn-remove-component').addEventListener('click', () => {
    row.remove();
    recomputeComponents();
    calculateNeed();
  });
}

function recomputeComponents() {
  const rows = document.querySelectorAll('#componentsList .component-row');
  let sumWeight = 0;
  let sumWeightedScore = 0;

  rows.forEach(row => {
    const w = parseFloat(row.querySelector('.comp-weight').value);
    const s = parseFloat(row.querySelector('.comp-score').value);
    if (!isNaN(w) && !isNaN(s) && w > 0) {
      sumWeight += w;
      sumWeightedScore += w * s;
    }
  });

  const avgEl = document.getElementById('componentsAvg');
  if (sumWeight > 0) {
    const avg = sumWeightedScore / sumWeight;
    avgEl.textContent = fmtPctFixed(avg);
    return avg;
  } else {
    avgEl.textContent = '—';
    return null;
  }
}

function initComponents() {
  const toggle = document.getElementById('useComponents');
  const directGroup = document.getElementById('directGradeGroup');
  const block = document.getElementById('componentsBlock');
  const addBtn = document.getElementById('addComponent');
  const directInput = document.getElementById('currentGrade');

  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    block.hidden = !on;
    directGroup.hidden = on;
    directInput.disabled = on;
    calculateNeed();
  });

  addBtn.addEventListener('click', () => {
    addComponentRow();
    recomputeComponents();
    calculateNeed();
  });

  // Seed with two example rows so the feature is self-explanatory
  addComponentRow('Homework', '20', '88');
  addComponentRow('Midterm', '30', '75');
  recomputeComponents();
}


/* =============================================
   MODE 1 — "What Do I Need?"
   ============================================= */
function calculateNeed() {
  const usingComponents = document.getElementById('useComponents').checked;
  const currentGrade = usingComponents ? recomputeComponents() : getNum('currentGrade');
  const finalWeightPct = getNum('finalWeight');
  const desiredGrade = getNum('desiredGrade');

  setError('currentGrade', !usingComponents && currentGrade !== null && !inRange(currentGrade));
  setError('finalWeight', finalWeightPct !== null && !inRange(finalWeightPct));
  setError('desiredGrade', desiredGrade !== null && !inRange(desiredGrade));

  const box = document.getElementById('resultNeed');
  const valueEl = document.getElementById('resultNeedValue');
  const labelEl = document.getElementById('resultNeedLabel');
  const detailEl = document.getElementById('resultNeedDetail');

  box.classList.remove('result-card--ok', 'result-card--secured', 'result-card--impossible');

  if (currentGrade === null || finalWeightPct === null || desiredGrade === null) {
    labelEl.textContent = 'Score needed on the final';
    valueEl.textContent = '—';
    detailEl.textContent = usingComponents
      ? 'Add your components, final weight and desired grade above.'
      : 'Fill in the fields above to see what you need.';
    return;
  }

  if (!inRange(finalWeightPct) || !inRange(desiredGrade) || (!usingComponents && !inRange(currentGrade))) {
    labelEl.textContent = 'Score needed on the final';
    valueEl.textContent = '—';
    detailEl.textContent = 'Grades and weights must be between 0% and 100%.';
    if (window.showToast) window.showToast('Values must be between 0% and 100%');
    return;
  }

  const fw = finalWeightPct / 100;
  const nonFinalW = 1 - fw;

  // Edge case: final is worth 0% of the grade — the final score can't move it at all.
  if (fw === 0) {
    const ceiling = currentGrade; // nonFinalW = 1
    if (currentGrade >= desiredGrade) {
      labelEl.textContent = 'Already secured';
      valueEl.textContent = '✓ Locked in';
      detailEl.textContent = `The final is worth 0% of your grade, and your current ${fmtPctFixed(currentGrade)} already meets or beats your ${fmtPctFixed(desiredGrade)} target.`;
      box.classList.add('result-card--secured');
    } else {
      labelEl.textContent = 'Not achievable';
      valueEl.textContent = '✗ Not possible';
      detailEl.textContent = `The final is worth 0% of your grade, so it can't change your outcome. Your grade is fixed at ${fmtPctFixed(ceiling)}, below your ${fmtPctFixed(desiredGrade)} target.`;
      box.classList.add('result-card--impossible');
    }
    return;
  }

  const required = (desiredGrade - currentGrade * nonFinalW) / fw;

  if (required <= 0) {
    labelEl.textContent = 'Already secured';
    valueEl.textContent = '✓ Locked in';
    detailEl.textContent = `Even a 0% on the final keeps you at or above ${fmtPctFixed(desiredGrade)} overall, based on your current ${fmtPctFixed(currentGrade)}.`;
    box.classList.add('result-card--secured');
  } else if (required > 100) {
    const ceiling = currentGrade * nonFinalW + 100 * fw;
    labelEl.textContent = 'Not achievable';
    valueEl.textContent = '✗ Not possible';
    detailEl.textContent = `Even a perfect 100% on the final only gets you to ${fmtPctFixed(ceiling)} overall — a ${fmtPctFixed(desiredGrade)} isn't mathematically reachable from here (it would require ${fmtPctFixed(required)} on the final).`;
    box.classList.add('result-card--impossible');
  } else {
    labelEl.textContent = 'Score needed on the final';
    valueEl.textContent = fmtPctFixed(required);
    detailEl.textContent = `Scoring ${fmtPctFixed(required)} or higher on the final gets you to ${fmtPctFixed(desiredGrade)} overall (current ${fmtPctFixed(currentGrade)} × ${fmtPctFixed(nonFinalW * 100)} + final × ${fmtPctFixed(fw * 100)}).`;
    box.classList.add('result-card--ok');
  }
}


/* =============================================
   MODE 2 — "What Will I Get?"
   ============================================= */
function calculatePredict() {
  const currentGrade = getNum('currentGrade2');
  const finalWeightPct = getNum('finalWeight2');
  const predictedScore = getNum('predictedScore');

  setError('currentGrade2', currentGrade !== null && !inRange(currentGrade));
  setError('finalWeight2', finalWeightPct !== null && !inRange(finalWeightPct));
  setError('predictedScore', predictedScore !== null && !inRange(predictedScore));

  const valueEl = document.getElementById('resultPredictValue');
  const detailEl = document.getElementById('resultPredictDetail');

  if (currentGrade === null || finalWeightPct === null || predictedScore === null) {
    valueEl.textContent = '—';
    detailEl.textContent = 'Fill in the fields above to see your projected grade.';
    return;
  }

  if (!inRange(currentGrade) || !inRange(finalWeightPct) || !inRange(predictedScore)) {
    valueEl.textContent = '—';
    detailEl.textContent = 'Grades and weights must be between 0% and 100%.';
    if (window.showToast) window.showToast('Values must be between 0% and 100%');
    return;
  }

  const fw = finalWeightPct / 100;
  const overall = currentGrade * (1 - fw) + predictedScore * fw;

  valueEl.textContent = fmtPctFixed(overall);
  detailEl.textContent = `${fmtPctFixed(currentGrade)} × ${fmtPctFixed((1 - fw) * 100)} + ${fmtPctFixed(predictedScore)} × ${fmtPctFixed(fw * 100)} = ${fmtPctFixed(overall)} overall.`;
}


/* =============================================
   WIRE UP INPUTS
   ============================================= */
function initNeedPanel() {
  ['currentGrade', 'finalWeight', 'desiredGrade'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateNeed);
  });

  document.getElementById('clearNeed').addEventListener('click', () => {
    ['currentGrade', 'finalWeight', 'desiredGrade'].forEach(id => {
      const el = document.getElementById(id);
      el.value = '';
      el.classList.remove('error');
    });
    document.getElementById('componentsList').innerHTML = '';
    document.getElementById('useComponents').checked = false;
    document.getElementById('componentsBlock').hidden = true;
    document.getElementById('directGradeGroup').hidden = false;
    document.getElementById('currentGrade').disabled = false;
    componentId = 0;
    addComponentRow('Homework', '20', '88');
    addComponentRow('Midterm', '30', '75');
    recomputeComponents();
    calculateNeed();
  });

  document.getElementById('copyNeed').addEventListener('click', () => {
    const label = document.getElementById('resultNeedLabel').textContent;
    const value = document.getElementById('resultNeedValue').textContent;
    const detail = document.getElementById('resultNeedDetail').textContent;
    if (value === '—') {
      if (window.showToast) window.showToast('Nothing to copy yet');
      return;
    }
    const text = `Final Grade Calculator\n${label}: ${value}\n${detail}`;
    if (window.copyToClipboard) window.copyToClipboard(text, 'Result copied to clipboard');
  });
}

function initPredictPanel() {
  ['currentGrade2', 'finalWeight2', 'predictedScore'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculatePredict);
  });

  document.getElementById('clearPredict').addEventListener('click', () => {
    ['currentGrade2', 'finalWeight2', 'predictedScore'].forEach(id => {
      const el = document.getElementById(id);
      el.value = '';
      el.classList.remove('error');
    });
    calculatePredict();
  });

  document.getElementById('copyPredict').addEventListener('click', () => {
    const value = document.getElementById('resultPredictValue').textContent;
    const detail = document.getElementById('resultPredictDetail').textContent;
    if (value === '—') {
      if (window.showToast) window.showToast('Nothing to copy yet');
      return;
    }
    const text = `Final Grade Calculator\nProjected overall grade: ${value}\n${detail}`;
    if (window.copyToClipboard) window.copyToClipboard(text, 'Result copied to clipboard');
  });
}


/* =============================================
   INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  initComponents();
  initNeedPanel();
  initPredictPanel();
  calculateNeed();
  calculatePredict();

  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
});
