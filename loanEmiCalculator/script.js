'use strict';

const els = {
  principal: document.getElementById('principal'),
  rate: document.getElementById('rate'),
  tenure: document.getElementById('tenure'),
  unitYears: document.getElementById('unitYears'),
  unitMonths: document.getElementById('unitMonths'),
  clearBtn: document.getElementById('clearBtn'),
  calculateBtn: document.getElementById('calculateBtn'),
  copySummaryBtn: document.getElementById('copySummaryBtn'),
  resultSection: document.getElementById('resultSection'),
  rvEmi: document.getElementById('rvEmi'),
  rvInterest: document.getElementById('rvInterest'),
  rvTotal: document.getElementById('rvTotal'),
  splitPrincipal: document.getElementById('splitPrincipal'),
  splitInterestFill: document.getElementById('splitInterestFill'),
  legendPrincipalPct: document.getElementById('legendPrincipalPct'),
  legendInterestPct: document.getElementById('legendInterestPct'),
  amortBody: document.getElementById('amortBody'),
  amortDetails: document.getElementById('amortDetails'),
};

let tenureUnit = 'years';
let lastResult = null; // holds the most recently computed, valid result for copying

function fmtNumber(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Standard EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * where r is the MONTHLY interest rate. When r === 0 (a 0% loan),
 * the formula divides by zero, so that case is handled explicitly
 * as EMI = P / n.
 */
function calculateEMI(principal, monthlyRate, months) {
  if (monthlyRate === 0) return principal / months;
  const pow = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * pow) / (pow - 1);
}

/**
 * Builds a year-by-year amortization summary. Walks month by month so
 * each month's interest is computed on the true remaining balance, then
 * groups every 12 months (or whatever is left) into one row. The final
 * month of the whole loan always uses the remaining balance itself as
 * that month's principal portion (rather than emi - interest), which
 * guarantees the loan pays off to exactly zero and the yearly principal
 * rows sum to exactly the original principal, regardless of any
 * floating-point drift accumulated along the way.
 */
function buildAmortizationSchedule(principal, monthlyRate, months, emi) {
  let balance = principal;
  const rows = [];
  let yearPrincipal = 0;
  let yearInterest = 0;

  for (let m = 1; m <= months; m++) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    const isLastMonth = m === months;
    const principalPortion = isLastMonth ? balance : (emi - interest);

    balance -= principalPortion;
    if (Math.abs(balance) < 0.005) balance = 0; // clear negligible float dust

    yearPrincipal += principalPortion;
    yearInterest += interest;

    if (m % 12 === 0 || isLastMonth) {
      rows.push({
        year: rows.length + 1,
        principalPaid: yearPrincipal,
        interestPaid: yearInterest,
        totalPaid: yearPrincipal + yearInterest,
        balance,
      });
      yearPrincipal = 0;
      yearInterest = 0;
    }
  }

  return rows;
}

function readInputs() {
  const principal = parseFloat(els.principal.value);
  const rate = parseFloat(els.rate.value);
  const tenureRaw = parseFloat(els.tenure.value);
  return { principal, rate, tenureRaw };
}

function validateInputs({ principal, rate, tenureRaw }) {
  const errors = [];
  if (!Number.isFinite(principal) || principal <= 0) errors.push('loan amount must be a positive number');
  if (!Number.isFinite(rate) || rate < 0) errors.push('interest rate must be zero or a positive number');
  if (!Number.isFinite(tenureRaw) || tenureRaw <= 0) errors.push('tenure must be a positive number');
  return errors;
}

function setTenureUnit(unit) {
  tenureUnit = unit;
  els.unitYears.classList.toggle('active', unit === 'years');
  els.unitMonths.classList.toggle('active', unit === 'months');
}

function renderResults({ principal, emi, totalInterest, totalPayment, rows }) {
  els.rvEmi.textContent = fmtNumber(emi);
  els.rvInterest.textContent = fmtNumber(totalInterest);
  els.rvTotal.textContent = fmtNumber(totalPayment);

  const principalPct = (principal / totalPayment) * 100;
  const interestPct = 100 - principalPct;
  els.splitPrincipal.style.width = principalPct + '%';
  els.splitInterestFill.style.width = interestPct + '%';
  els.legendPrincipalPct.textContent = principalPct.toFixed(1) + '%';
  els.legendInterestPct.textContent = interestPct.toFixed(1) + '%';

  els.amortBody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.year}</td>
      <td>${fmtNumber(row.principalPaid)}</td>
      <td>${fmtNumber(row.interestPaid)}</td>
      <td>${fmtNumber(row.totalPaid)}</td>
      <td>${fmtNumber(row.balance)}</td>
    </tr>
  `).join('');

  els.resultSection.hidden = false;
}

function compute({ showToastOnInvalid }) {
  const inputs = readInputs();
  const errors = validateInputs(inputs);

  if (errors.length) {
    lastResult = null;
    els.resultSection.hidden = true;
    if (showToastOnInvalid && typeof showToast === 'function') {
      showToast('Please check your input: ' + errors[0]);
    }
    return;
  }

  const { principal, rate, tenureRaw } = inputs;
  const months = tenureUnit === 'years' ? Math.round(tenureRaw * 12) : Math.round(tenureRaw);
  const monthlyRate = rate / 12 / 100;

  const emi = calculateEMI(principal, monthlyRate, months);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;
  const rows = buildAmortizationSchedule(principal, monthlyRate, months, emi);

  lastResult = { principal, rate, months, emi, totalInterest, totalPayment, rows };
  renderResults(lastResult);
}

els.unitYears.addEventListener('click', () => { setTenureUnit('years'); compute({ showToastOnInvalid: false }); });
els.unitMonths.addEventListener('click', () => { setTenureUnit('months'); compute({ showToastOnInvalid: false }); });

els.calculateBtn.addEventListener('click', () => compute({ showToastOnInvalid: true }));

[els.principal, els.rate, els.tenure].forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') compute({ showToastOnInvalid: true });
  });
});

els.clearBtn.addEventListener('click', () => {
  els.principal.value = '';
  els.rate.value = '';
  els.tenure.value = '';
  setTenureUnit('years');
  lastResult = null;
  els.resultSection.hidden = true;
  els.principal.focus();
});

els.copySummaryBtn.addEventListener('click', () => {
  if (!lastResult) {
    if (typeof showToast === 'function') showToast('Calculate your EMI first');
    return;
  }
  const r = lastResult;
  const summary = [
    'Loan EMI Calculator — Result Summary',
    `Loan amount: ${fmtNumber(r.principal)}`,
    `Annual interest rate: ${r.rate}%`,
    `Tenure: ${r.months} months`,
    `Monthly EMI: ${fmtNumber(r.emi)}`,
    `Total interest payable: ${fmtNumber(r.totalInterest)}`,
    `Total payment: ${fmtNumber(r.totalPayment)}`,
    '(Estimate based on the standard EMI formula — not financial advice.)',
  ].join('\n');
  copyToClipboard(summary, 'Summary copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
});
