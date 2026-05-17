/**
 * Social00 — Percentage Calculator
 * script.js
 * Vanilla JS — no dependencies
 */

/* =============================================
   THEME TOGGLE
   ============================================= */
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

function applyTheme(theme) {
  body.classList.remove('dark-mode', 'light-mode');
  body.classList.add(theme + '-mode');
  try { localStorage.setItem('s00-theme', theme); } catch (_) {}
}

(function initTheme() {
  let saved = 'dark';
  try { saved = localStorage.getItem('s00-theme') || 'dark'; } catch (_) {}
  applyTheme(saved);
})();

themeToggle.addEventListener('click', () => {
  const isDark = body.classList.contains('dark-mode');
  applyTheme(isDark ? 'light' : 'dark');
});


/* =============================================
   MODE TABS
   ============================================= */
const tabs   = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.calc-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;

    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    panels.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById('panel-' + mode).classList.add('active');

    restoreValues(mode);
  });
});


/* =============================================
   UTILITIES
   ============================================= */
function round(n, dp = 4) {
  return parseFloat(n.toFixed(dp));
}

function fmt(n) {
  // Format number nicely — remove trailing zeros after decimal
  if (n === null || n === undefined || isNaN(n)) return '—';
  const r = round(n, 4);
  return r.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function getVal(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? null : v;
}

function setResult(idValue, text, idFormula = null, formula = '') {
  const el = document.getElementById(idValue);
  if (el) el.textContent = text;
  if (idFormula) {
    const fel = document.getElementById(idFormula);
    if (fel) fel.textContent = formula;
  }
}

function markResult(boxId, hasResult) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.classList.toggle('has-result', hasResult);
}

function inputError(id, state) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('error', state);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}


/* =============================================
   LOCAL STORAGE — Save / Restore Values
   ============================================= */
const STORAGE_KEY = 's00-pct-vals';

function saveValues(mode, data) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[mode] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (_) {}
}

function loadValues(mode) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[mode] || {};
  } catch (_) { return {}; }
}

function restoreValues(mode) {
  const data = loadValues(mode);
  Object.entries(data).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val !== '') { el.value = val; }
  });
  // Trigger calculation
  calculators[mode] && calculators[mode]();
}


/* =============================================
   CALCULATORS
   ============================================= */

const calculators = {

  /* 1. What is X% of Y */
  'basic-percent': function () {
    const x = getVal('bp-x');
    const y = getVal('bp-y');

    inputError('bp-x', x !== null && x < 0);
    inputError('bp-y', y !== null && y < 0);

    if (x === null || y === null) {
      setResult('rv-basic-percent', '—', 'rf-basic-percent', '');
      markResult('result-basic-percent', false);
      return;
    }
    const result = (x / 100) * y;
    setResult(
      'rv-basic-percent', fmt(result),
      'rf-basic-percent', `(${fmt(x)}% ÷ 100) × ${fmt(y)} = ${fmt(result)}`
    );
    markResult('result-basic-percent', true);
    saveValues('basic-percent', { 'bp-x': x, 'bp-y': y });
  },

  /* 2. X is what % of Y */
  'what-percent': function () {
    const x = getVal('wp-x');
    const y = getVal('wp-y');

    inputError('wp-y', y !== null && y === 0);

    if (x === null || y === null) {
      setResult('rv-what-percent', '—', 'rf-what-percent', '');
      markResult('result-what-percent', false);
      return;
    }
    if (y === 0) {
      setResult('rv-what-percent', 'Error', 'rf-what-percent', 'Cannot divide by zero');
      markResult('result-what-percent', false);
      return;
    }
    const result = (x / y) * 100;
    setResult(
      'rv-what-percent', fmt(result) + '%',
      'rf-what-percent', `(${fmt(x)} ÷ ${fmt(y)}) × 100 = ${fmt(result)}%`
    );
    markResult('result-what-percent', true);
    saveValues('what-percent', { 'wp-x': x, 'wp-y': y });
  },

  /* 3. Percentage Increase */
  'increase': function () {
    const oldV = getVal('inc-old');
    const newV = getVal('inc-new');

    inputError('inc-old', oldV !== null && oldV === 0);

    if (oldV === null || newV === null) {
      setResult('rv-increase', '—', 'rf-increase', '');
      markResult('result-increase', false);
      return;
    }
    if (oldV === 0) {
      setResult('rv-increase', 'Error', 'rf-increase', 'Original value cannot be 0');
      markResult('result-increase', false);
      return;
    }
    const result = ((newV - oldV) / oldV) * 100;
    const label  = result >= 0 ? 'Increase' : 'Decrease';
    const sign   = result >= 0 ? '+' : '';
    setResult(
      'rv-increase', sign + fmt(result) + '%',
      'rf-increase', `((${fmt(newV)} − ${fmt(oldV)}) ÷ ${fmt(oldV)}) × 100 = ${sign}${fmt(result)}%`
    );
    markResult('result-increase', true);
    saveValues('increase', { 'inc-old': oldV, 'inc-new': newV });
  },

  /* 4. Percentage Decrease */
  'decrease': function () {
    const oldV = getVal('dec-old');
    const newV = getVal('dec-new');

    inputError('dec-old', oldV !== null && oldV === 0);

    if (oldV === null || newV === null) {
      setResult('rv-decrease', '—', 'rf-decrease', '');
      markResult('result-decrease', false);
      return;
    }
    if (oldV === 0) {
      setResult('rv-decrease', 'Error', 'rf-decrease', 'Original value cannot be 0');
      markResult('result-decrease', false);
      return;
    }
    const result = ((oldV - newV) / oldV) * 100;
    setResult(
      'rv-decrease', fmt(result) + '%',
      'rf-decrease', `((${fmt(oldV)} − ${fmt(newV)}) ÷ ${fmt(oldV)}) × 100 = ${fmt(result)}%`
    );
    markResult('result-decrease', true);
    saveValues('decrease', { 'dec-old': oldV, 'dec-new': newV });
  },

  /* 5. Discount */
  'discount': function () {
    const price = getVal('disc-price');
    const pct   = getVal('disc-pct');

    inputError('disc-pct', pct !== null && (pct < 0 || pct > 100));

    if (price === null || pct === null) {
      document.getElementById('rv-discount-amt').textContent = '—';
      document.getElementById('rv-discount').textContent     = '—';
      document.getElementById('rf-discount').textContent     = '';
      markResult('result-discount', false);
      return;
    }
    const discAmt  = (price * pct) / 100;
    const finalPx  = price - discAmt;

    document.getElementById('rv-discount-amt').textContent = '−$' + fmt(discAmt);
    document.getElementById('rv-discount').textContent     = '$' + fmt(finalPx);
    document.getElementById('rf-discount').textContent     = `$${fmt(price)} − $${fmt(discAmt)} = $${fmt(finalPx)}`;
    markResult('result-discount', true);
    saveValues('discount', { 'disc-price': price, 'disc-pct': pct });
  },

  /* 6. Markup */
  'markup': function () {
    const cost = getVal('mu-cost');
    const pct  = getVal('mu-pct');

    if (cost === null || pct === null) {
      document.getElementById('rv-markup-amt').textContent = '—';
      document.getElementById('rv-markup').textContent     = '—';
      document.getElementById('rf-markup').textContent     = '';
      markResult('result-markup', false);
      return;
    }
    const muAmt    = (cost * pct) / 100;
    const sellPx   = cost + muAmt;

    document.getElementById('rv-markup-amt').textContent = '+$' + fmt(muAmt);
    document.getElementById('rv-markup').textContent     = '$' + fmt(sellPx);
    document.getElementById('rf-markup').textContent     = `$${fmt(cost)} + $${fmt(muAmt)} = $${fmt(sellPx)}`;
    markResult('result-markup', true);
    saveValues('markup', { 'mu-cost': cost, 'mu-pct': pct });
  },

  /* 7. Grade */
  'grade': function () {
    const obtained = getVal('gr-obtained');
    const total    = getVal('gr-total');
    const badge    = document.getElementById('grade-badge');

    inputError('gr-total', total !== null && total === 0);

    if (obtained === null || total === null) {
      setResult('rv-grade', '—', 'rf-grade', '');
      badge.className = 'grade-badge';
      badge.textContent = '';
      markResult('result-grade', false);
      return;
    }
    if (total === 0) {
      setResult('rv-grade', 'Error', 'rf-grade', 'Total marks cannot be 0');
      badge.className = 'grade-badge';
      markResult('result-grade', false);
      return;
    }
    const pct = (obtained / total) * 100;
    setResult(
      'rv-grade', fmt(pct) + '%',
      'rf-grade', `(${fmt(obtained)} ÷ ${fmt(total)}) × 100 = ${fmt(pct)}%`
    );
    markResult('result-grade', true);

    // Letter grade
    let letter = 'F';
    if (pct >= 90) letter = 'A+';
    else if (pct >= 80) letter = 'A';
    else if (pct >= 70) letter = 'B';
    else if (pct >= 60) letter = 'C';
    else if (pct >= 50) letter = 'D';

    badge.textContent = letter;
    badge.className = 'grade-badge show grade-' + letter[0];

    saveValues('grade', { 'gr-obtained': obtained, 'gr-total': total });
  }
};


/* =============================================
   LIVE INPUT LISTENERS
   ============================================= */
function wireInputs(panel, ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      calculators[panel] && calculators[panel]();
    });
  });
}

wireInputs('basic-percent', ['bp-x', 'bp-y']);
wireInputs('what-percent',  ['wp-x', 'wp-y']);
wireInputs('increase',      ['inc-old', 'inc-new']);
wireInputs('decrease',      ['dec-old', 'dec-new']);
wireInputs('discount',      ['disc-price', 'disc-pct']);
wireInputs('markup',        ['mu-cost', 'mu-pct']);
wireInputs('grade',         ['gr-obtained', 'gr-total']);


/* =============================================
   CLEAR BUTTONS
   ============================================= */
const clearMap = {
  'basic-percent': ['bp-x', 'bp-y'],
  'what-percent':  ['wp-x', 'wp-y'],
  'increase':      ['inc-old', 'inc-new'],
  'decrease':      ['dec-old', 'dec-new'],
  'discount':      ['disc-price', 'disc-pct'],
  'markup':        ['mu-cost', 'mu-pct'],
  'grade':         ['gr-obtained', 'gr-total']
};

document.querySelectorAll('.btn-clear').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.dataset.panel;
    const ids   = clearMap[panel] || [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('error'); }
    });
    calculators[panel] && calculators[panel]();

    // Clear saved values for this panel
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      delete all[panel];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (_) {}
  });
});


/* =============================================
   COPY BUTTONS
   ============================================= */
document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const resultId = btn.dataset.result;
    const el = document.getElementById(resultId);
    if (!el) return;

    const text = el.textContent.trim();
    if (!text || text === '—' || text === 'Error') {
      showToast('Nothing to copy yet');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('✓ Copied: ' + text))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  });
});

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('✓ Copied: ' + text);
  } catch (_) {
    showToast('Copy failed — please copy manually');
  }
  document.body.removeChild(ta);
}


/* =============================================
   SCROLL TO TOP
   ============================================= */
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 320);
}, { passive: true });

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


/* =============================================
   STICKY HEADER SHADOW
   ============================================= */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 10
    ? '0 2px 24px rgba(0,0,0,0.3)'
    : 'none';
}, { passive: true });


/* =============================================
   INIT — Restore first tab values on load
   ============================================= */
(function init() {
  restoreValues('basic-percent');
})();