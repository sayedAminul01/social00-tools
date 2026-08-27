'use strict';

const els = {
  principal: document.getElementById('principal'),
  rate: document.getElementById('rate'),
  years: document.getElementById('years'),
  frequency: document.getElementById('frequency'),
  enableContrib: document.getElementById('enableContrib'),
  contribFields: document.getElementById('contribFields'),
  contribAmount: document.getElementById('contribAmount'),
  contribFrequency: document.getElementById('contribFrequency'),
  rvFuture: document.getElementById('rvFuture'),
  rvContributed: document.getElementById('rvContributed'),
  rvInterest: document.getElementById('rvInterest'),
  rvEar: document.getElementById('rvEar'),
  tableWrap: document.getElementById('tableWrap'),
  yearTableBody: document.getElementById('yearTableBody'),
  clearBtn: document.getElementById('clearBtn'),
  copyBtn: document.getElementById('copyBtn'),
};

const money = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Simulates compound growth period-by-period rather than relying on a
 * single closed-form formula. This handles the case where contribution
 * frequency and compounding frequency don't match, by pro-rating the
 * contribution amount evenly across each compounding period so the
 * total contributed per year always equals contribAmount * contribsPerYear
 * exactly, regardless of n.
 *
 * @returns {{ future: number, totalContributed: number, totalInterest: number, ear: number, yearRows: Array }}
 */
function simulateCompoundGrowth({ principal, ratePct, years, n, contribAmount, contribFreqPerYear }) {
  const r = ratePct / 100;
  const numPeriods = Math.max(0, Math.round(n * years));
  const contribPerPeriod = contribAmount > 0 ? contribAmount * (contribFreqPerYear / n) : 0;

  let balance = principal;
  let totalContributed = principal;
  let totalInterest = 0;

  const yearRows = [];
  let yearStart = balance;
  let yearContrib = 0;
  let yearInterest = 0;

  for (let p = 0; p < numPeriods; p++) {
    const interest = balance * (r / n);
    balance += interest;
    balance += contribPerPeriod;

    totalInterest += interest;
    totalContributed += contribPerPeriod;
    yearInterest += interest;
    yearContrib += contribPerPeriod;

    const isLastPeriodOfYear = (p + 1) % n === 0 || p === numPeriods - 1;
    if (isLastPeriodOfYear) {
      const yearIndex = Math.floor(p / n) + 1;
      yearRows.push({
        year: yearIndex,
        start: yearStart,
        contrib: yearContrib,
        interest: yearInterest,
        end: balance,
      });
      yearStart = balance;
      yearContrib = 0;
      yearInterest = 0;
    }
  }

  const ear = (Math.pow(1 + r / n, n) - 1) * 100;

  return { future: balance, totalContributed, totalInterest, ear, yearRows };
}

function readInputs() {
  const principal = parseFloat(els.principal.value);
  const ratePct = parseFloat(els.rate.value);
  const years = parseFloat(els.years.value);
  const n = parseInt(els.frequency.value, 10);
  const contribEnabled = els.enableContrib.checked;
  const contribAmount = contribEnabled ? (parseFloat(els.contribAmount.value) || 0) : 0;
  const contribFreqPerYear = contribEnabled ? parseInt(els.contribFrequency.value, 10) : 12;

  return { principal, ratePct, years, n, contribAmount, contribFreqPerYear };
}

function validate({ principal, ratePct, years }) {
  if (!Number.isFinite(principal) || principal < 0) return 'Initial principal must be 0 or greater.';
  if (!Number.isFinite(ratePct) || ratePct < 0) return 'Annual interest rate must be 0 or greater.';
  if (!Number.isFinite(years) || years <= 0) return 'Time period must be greater than 0.';
  return null;
}

let lastSummaryText = '';

function renderYearTable(yearRows) {
  els.yearTableBody.innerHTML = yearRows.map(row => `
    <tr>
      <td>${row.year}</td>
      <td>${money(row.start)}</td>
      <td>${money(row.contrib)}</td>
      <td>${money(row.interest)}</td>
      <td>${money(row.end)}</td>
    </tr>
  `).join('');
  els.tableWrap.hidden = yearRows.length === 0;
}

function update() {
  const inputs = readInputs();
  const error = validate(inputs);

  if (error) {
    els.rvFuture.textContent = '—';
    els.rvContributed.textContent = '—';
    els.rvInterest.textContent = '—';
    els.rvEar.textContent = '—';
    els.tableWrap.hidden = true;
    lastSummaryText = '';
    return;
  }

  const result = simulateCompoundGrowth(inputs);

  els.rvFuture.textContent = money(result.future);
  els.rvContributed.textContent = money(result.totalContributed);
  els.rvInterest.textContent = money(result.totalInterest);
  els.rvEar.textContent = `${result.ear.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}%`;

  renderYearTable(result.yearRows);

  const lines = [
    'Compound Interest Projection',
    `Initial principal: ${money(inputs.principal)}`,
    `Annual interest rate: ${inputs.ratePct}%`,
    `Time period: ${inputs.years} years`,
    `Compounding frequency: ${els.frequency.options[els.frequency.selectedIndex].text}`,
  ];
  if (inputs.contribAmount > 0) {
    lines.push(`Regular contribution: ${money(inputs.contribAmount)} (${els.contribFrequency.options[els.contribFrequency.selectedIndex].text})`);
  }
  lines.push('');
  lines.push(`Future value: ${money(result.future)}`);
  lines.push(`Total contributed: ${money(result.totalContributed)}`);
  lines.push(`Total interest earned: ${money(result.totalInterest)}`);
  lines.push(`Effective annual rate: ${result.ear.toFixed(2)}%`);
  lines.push('');
  lines.push('This is a mathematical projection assuming a constant rate of return — not investment advice or a guaranteed outcome.');
  lastSummaryText = lines.join('\n');
}

function toggleContribFields() {
  els.contribFields.hidden = !els.enableContrib.checked;
  update();
}

['input', 'change'].forEach(evt => {
  els.principal.addEventListener(evt, update);
  els.rate.addEventListener(evt, update);
  els.years.addEventListener(evt, update);
  els.frequency.addEventListener(evt, update);
  els.contribAmount.addEventListener(evt, update);
  els.contribFrequency.addEventListener(evt, update);
});

els.enableContrib.addEventListener('change', toggleContribFields);

els.clearBtn.addEventListener('click', () => {
  els.principal.value = '10000';
  els.rate.value = '5';
  els.years.value = '10';
  els.frequency.value = '12';
  els.enableContrib.checked = false;
  els.contribAmount.value = '100';
  els.contribFrequency.value = '12';
  els.contribFields.hidden = true;
  update();
});

els.copyBtn.addEventListener('click', () => {
  copyToClipboard(lastSummaryText, 'Summary copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  update();
});
