'use strict';

/**
 * Social00 — Age Calculator
 *
 * All arithmetic works on plain (year, month, day) integers rather
 * than Date objects wherever a real "how many days apart" number
 * is needed we use Date.UTC (never a locale/DST-sensitive Date),
 * so results can't drift because of timezone or daylight-saving
 * changes. Convention for a Feb 29 birthday landing on a non-leap
 * "to" year: the anniversary is treated as completing on March 1
 * (Feb 28 is one day short of it) — explained in the FAQ.
 */

const els = {
  fromDate: document.getElementById('fromDate'),
  toDate: document.getElementById('toDate'),
  todayBtn: document.getElementById('todayBtn'),
  clearBtn: document.getElementById('clearBtn'),
  copyBtn: document.getElementById('copyBtn'),
  rYears: document.getElementById('rYears'),
  rMonths: document.getElementById('rMonths'),
  rDays: document.getElementById('rDays'),
  statTotalDays: document.getElementById('statTotalDays'),
  statTotalWeeks: document.getElementById('statTotalWeeks'),
  statTotalMonths: document.getElementById('statTotalMonths'),
  statNextBirthday: document.getElementById('statNextBirthday'),
};

/* ── Date helpers (pure integer year/month/day, no timezone risk) ── */

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// Last day-of-month for 1-indexed month m (1=Jan .. 12=Dec) in year y.
function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toUTCms(y, m, d) {
  return Date.UTC(y, m - 1, d);
}

function daysBetweenYMD(y1, m1, d1, y2, m2, d2) {
  return Math.round((toUTCms(y2, m2, d2) - toUTCms(y1, m1, d1)) / 86400000);
}

function parseDateInput(value) {
  // <input type="date"> always yields "YYYY-MM-DD" or "".
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function todayYMD() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function formatInputValue({ y, m, d }) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Calendar-correct whole years / months / days between two dates
 * where `to` is on/after `from`. Whole years first (has the "to"
 * month/day happened yet this year?), then whole months in the
 * remainder, then whatever days are left, borrowing the correct
 * number of days from the month immediately before "to"'s month
 * whenever "to"'s day-of-month is earlier than "from"'s.
 */
function diffYMD(from, to) {
  let years = to.y - from.y;
  let months = to.m - from.m;
  let days = to.d - from.d;

  if (days < 0) {
    months -= 1;
    let pm = to.m - 1;
    let py = to.y;
    if (pm === 0) { pm = 12; py -= 1; }
    days += daysInMonth(py, pm);
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  return { years, months, days };
}

// The birthday's actual calendar occurrence in a given year, adjusting
// Feb 29 -> Mar 1 whenever that year isn't a leap year.
function birthdayOccurrence(year, month, day) {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return { y: year, m: 3, d: 1 };
  }
  return { y: year, m: month, d: day };
}

function nextBirthdayInfo(from, to, years) {
  let occ = birthdayOccurrence(to.y, from.m, from.d);
  let diffDays = daysBetweenYMD(to.y, to.m, to.d, occ.y, occ.m, occ.d);
  if (diffDays < 0) {
    occ = birthdayOccurrence(to.y + 1, from.m, from.d);
    diffDays = daysBetweenYMD(to.y, to.m, to.d, occ.y, occ.m, occ.d);
  }
  const turningAge = diffDays === 0 ? years : years + 1;
  return { daysUntil: diffDays, turningAge };
}

/* ── UI wiring ─────────────────────────────────────────────────── */

let lastSummary = '';

function clearResults() {
  els.rYears.textContent = '0';
  els.rMonths.textContent = '0';
  els.rDays.textContent = '0';
  els.statTotalDays.textContent = '—';
  els.statTotalWeeks.textContent = '—';
  els.statTotalMonths.textContent = '—';
  els.statNextBirthday.textContent = '—';
  lastSummary = '';
}

function calculate() {
  els.fromDate.classList.remove('error');
  els.toDate.classList.remove('error');

  const from = parseDateInput(els.fromDate.value);
  const to = parseDateInput(els.toDate.value);

  if (!from || !to) {
    clearResults();
    return;
  }

  const fromMs = toUTCms(from.y, from.m, from.d);
  const toMs = toUTCms(to.y, to.m, to.d);

  if (toMs < fromMs) {
    els.fromDate.classList.add('error');
    els.toDate.classList.add('error');
    clearResults();
    window.showToast("'To date' must be the same as or after 'From date'");
    return;
  }

  const { years, months, days } = diffYMD(from, to);
  const totalDays = Math.round((toMs - fromMs) / 86400000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;
  const { daysUntil, turningAge } = nextBirthdayInfo(from, to, years);

  els.rYears.textContent = String(years);
  els.rMonths.textContent = String(months);
  els.rDays.textContent = String(days);

  els.statTotalDays.textContent = totalDays.toLocaleString('en-US');
  els.statTotalWeeks.textContent = totalWeeks.toLocaleString('en-US');
  els.statTotalMonths.textContent = totalMonths.toLocaleString('en-US');

  let nextBirthdayText;
  if (daysUntil === 0) {
    nextBirthdayText = `Today! 🎉 (turning ${turningAge})`;
  } else if (daysUntil === 1) {
    nextBirthdayText = `Tomorrow (turning ${turningAge})`;
  } else {
    nextBirthdayText = `In ${daysUntil.toLocaleString('en-US')} days (turning ${turningAge})`;
  }
  els.statNextBirthday.textContent = nextBirthdayText;

  lastSummary =
    `Age: ${years} years, ${months} months, ${days} days ` +
    `(from ${formatInputValue(from)} to ${formatInputValue(to)}). ` +
    `Total: ${totalDays.toLocaleString('en-US')} days, ${totalWeeks.toLocaleString('en-US')} weeks, ${totalMonths.toLocaleString('en-US')} months lived. ` +
    `Next birthday: ${nextBirthdayText}.`;
}

els.fromDate.addEventListener('input', calculate);
els.toDate.addEventListener('input', calculate);

els.todayBtn.addEventListener('click', () => {
  els.toDate.value = formatInputValue(todayYMD());
  calculate();
});

els.clearBtn.addEventListener('click', () => {
  els.fromDate.value = '';
  els.toDate.value = formatInputValue(todayYMD());
  els.fromDate.classList.remove('error');
  els.toDate.classList.remove('error');
  clearResults();
  els.fromDate.focus();
});

els.copyBtn.addEventListener('click', () => {
  copyToClipboard(lastSummary, 'Result copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');

  const today = todayYMD();
  els.toDate.value = formatInputValue(today);
  // Default "from" to 25 years before today purely as a friendly
  // placeholder value — fully editable, calculates immediately.
  // Guard the rare case where today is itself Feb 29 and the year
  // 25 years back isn't a leap year (no Feb 29 to fall back on).
  const placeholderYear = today.y - 25;
  const placeholderDay = (today.m === 2 && today.d === 29 && !isLeapYear(placeholderYear)) ? 28 : today.d;
  els.fromDate.value = formatInputValue({ y: placeholderYear, m: today.m, d: placeholderDay });

  calculate();
});
