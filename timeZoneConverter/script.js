'use strict';

/* Curated list of ~30 major IANA time zones with human-readable labels. */
const ZONES = [
  { tz: 'UTC', label: 'UTC' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles (America/Los_Angeles)' },
  { tz: 'America/Denver', label: 'Denver (America/Denver)' },
  { tz: 'America/Chicago', label: 'Chicago (America/Chicago)' },
  { tz: 'America/New_York', label: 'New York (America/New_York)' },
  { tz: 'America/Toronto', label: 'Toronto (America/Toronto)' },
  { tz: 'America/Anchorage', label: 'Anchorage (America/Anchorage)' },
  { tz: 'Pacific/Honolulu', label: 'Honolulu (Pacific/Honolulu)' },
  { tz: 'America/Mexico_City', label: 'Mexico City (America/Mexico_City)' },
  { tz: 'America/Sao_Paulo', label: 'São Paulo (America/Sao_Paulo)' },
  { tz: 'Europe/London', label: 'London (Europe/London)' },
  { tz: 'Europe/Lisbon', label: 'Lisbon (Europe/Lisbon)' },
  { tz: 'Europe/Paris', label: 'Paris (Europe/Paris)' },
  { tz: 'Europe/Berlin', label: 'Berlin (Europe/Berlin)' },
  { tz: 'Europe/Madrid', label: 'Madrid (Europe/Madrid)' },
  { tz: 'Europe/Rome', label: 'Rome (Europe/Rome)' },
  { tz: 'Europe/Istanbul', label: 'Istanbul (Europe/Istanbul)' },
  { tz: 'Europe/Moscow', label: 'Moscow (Europe/Moscow)' },
  { tz: 'Africa/Cairo', label: 'Cairo (Africa/Cairo)' },
  { tz: 'Africa/Lagos', label: 'Lagos (Africa/Lagos)' },
  { tz: 'Africa/Johannesburg', label: 'Johannesburg (Africa/Johannesburg)' },
  { tz: 'Asia/Dubai', label: 'Dubai (Asia/Dubai)' },
  { tz: 'Asia/Karachi', label: 'Karachi (Asia/Karachi)' },
  { tz: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  { tz: 'Asia/Dhaka', label: 'Dhaka (Asia/Dhaka)' },
  { tz: 'Asia/Bangkok', label: 'Bangkok (Asia/Bangkok)' },
  { tz: 'Asia/Singapore', label: 'Singapore (Asia/Singapore)' },
  { tz: 'Asia/Shanghai', label: 'Shanghai (Asia/Shanghai)' },
  { tz: 'Asia/Tokyo', label: 'Tokyo (Asia/Tokyo)' },
  { tz: 'Asia/Seoul', label: 'Seoul (Asia/Seoul)' },
  { tz: 'Australia/Perth', label: 'Perth (Australia/Perth)' },
  { tz: 'Australia/Sydney', label: 'Sydney (Australia/Sydney)' },
  { tz: 'Pacific/Auckland', label: 'Auckland (Pacific/Auckland)' },
];

function zoneLabel(tz) {
  const found = ZONES.find(z => z.tz === tz);
  return found ? found.label : tz;
}

/* ── Core timezone math (uses the real Intl/IANA database — no hand-rolled fixed offsets) ── */

// Returns {year, month, day, hour, minute, second} of `date` as displayed in `timeZone`.
function formatToPartsMap(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  }
  if (map.hour === 24) map.hour = 0; // some engines report midnight as 24 with hour12:false
  return map;
}

// Offset (in minutes) such that: wallClockAsUTCms = date.getTime() + offsetMinutes*60000
function getOffsetMinutes(date, timeZone) {
  const map = formatToPartsMap(date, timeZone);
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return (asUTC - date.getTime()) / 60000;
}

// Converts a wall-clock date/time (as if it were observed in `timeZone`) to the
// correct UTC instant, correctly resolving the DST offset that applies on that
// specific date (not just today's offset).
function zonedWallTimeToUtc(year, monthIndex, day, hour, minute, timeZone) {
  const wallUTC = Date.UTC(year, monthIndex, day, hour, minute, 0);
  let offset = getOffsetMinutes(new Date(wallUTC), timeZone);
  let utcMs = wallUTC - offset * 60000;
  // Refine once more: the offset used above was evaluated near, but not
  // necessarily exactly at, the true instant — re-check and correct if the
  // guess landed on the other side of a DST transition.
  const offset2 = getOffsetMinutes(new Date(utcMs), timeZone);
  if (offset2 !== offset) {
    utcMs = wallUTC - offset2 * 60000;
  }
  return new Date(utcMs);
}

// Whether `timeZone` is observing DST at `date`, determined by comparing its
// offset at that instant to its own January and July reference offsets in the
// same year (the smaller of the two is that zone's non-DST "standard" offset;
// if the zone never varies, January and July match and DST never applies).
function isDstAt(date, timeZone) {
  const year = formatToPartsMap(date, timeZone).year;
  const jan = new Date(Date.UTC(year, 0, 5, 12, 0, 0));
  const jul = new Date(Date.UTC(year, 6, 5, 12, 0, 0));
  const janOffset = getOffsetMinutes(jan, timeZone);
  const julOffset = getOffsetMinutes(jul, timeZone);
  const standardOffset = Math.min(janOffset, julOffset);
  const currentOffset = getOffsetMinutes(date, timeZone);
  return currentOffset > standardOffset;
}

function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.round(Math.abs(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

function formatInZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return dtf.format(date);
}

/* ── DOM wiring ── */

const els = {
  sourceDateTime: document.getElementById('sourceDateTime'),
  sourceZone: document.getElementById('sourceZone'),
  nowBtn: document.getElementById('nowBtn'),
  sourceInfoZone: document.getElementById('sourceInfoZone'),
  sourceInfoOffset: document.getElementById('sourceInfoOffset'),
  sourceInfoDst: document.getElementById('sourceInfoDst'),
  targetZoneSelect: document.getElementById('targetZoneSelect'),
  addTargetBtn: document.getElementById('addTargetBtn'),
  targetsList: document.getElementById('targetsList'),
  clearTargetsBtn: document.getElementById('clearTargetsBtn'),
  copySummaryBtn: document.getElementById('copySummaryBtn'),
};

let targets = [];

function populateZoneSelect(selectEl, defaultTz) {
  selectEl.innerHTML = '';
  ZONES.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z.tz;
    opt.textContent = z.label;
    if (z.tz === defaultTz) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function detectBrowserZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ZONES.some(z => z.tz === tz) ? tz : null;
  } catch (e) {
    return null;
  }
}

function setDateTimeToNowInZone(timeZone) {
  const now = new Date();
  const map = formatToPartsMap(now, timeZone);
  const pad = n => String(n).padStart(2, '0');
  els.sourceDateTime.value = `${map.year}-${pad(map.month)}-${pad(map.day)}T${pad(map.hour)}:${pad(map.minute)}`;
}

function getSourceInstant() {
  const val = els.sourceDateTime.value;
  if (!val) return null;
  const [datePart, timePart] = val.split('T');
  if (!datePart || !timePart) return null;
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  return zonedWallTimeToUtc(y, mo - 1, d, h, mi, els.sourceZone.value);
}

function renderSourceInfo(instant) {
  const tz = els.sourceZone.value;
  els.sourceInfoZone.textContent = zoneLabel(tz);
  const offsetMin = getOffsetMinutes(instant, tz);
  els.sourceInfoOffset.textContent = formatOffset(offsetMin);
  const dst = isDstAt(instant, tz);
  els.sourceInfoDst.textContent = dst ? 'DST active' : 'Standard time';
  els.sourceInfoDst.classList.toggle('dst-badge--off', !dst);
}

function renderTargets(instant) {
  els.targetsList.innerHTML = '';

  if (!targets.length) {
    const empty = document.createElement('div');
    empty.className = 'targets-empty';
    empty.textContent = 'Add a time zone above to see the converted time.';
    els.targetsList.appendChild(empty);
    return;
  }

  targets.forEach(tz => {
    const offsetMin = getOffsetMinutes(instant, tz);
    const dst = isDstAt(instant, tz);
    const label = zoneLabel(tz);
    const formatted = formatInZone(instant, tz);

    const card = document.createElement('div');
    card.className = 'target-card';

    const head = document.createElement('div');
    head.className = 'target-card-head';
    const name = document.createElement('span');
    name.className = 'target-zone-name';
    name.textContent = label;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'target-remove';
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove ${label}`);
    removeBtn.addEventListener('click', () => {
      targets = targets.filter(t => t !== tz);
      update();
    });
    head.appendChild(name);
    head.appendChild(removeBtn);

    const time = document.createElement('div');
    time.className = 'target-time';
    time.textContent = formatted;

    const meta = document.createElement('div');
    meta.className = 'target-meta';
    const offsetEl = document.createElement('span');
    offsetEl.className = 'target-offset';
    offsetEl.textContent = formatOffset(offsetMin);
    const dstEl = document.createElement('span');
    dstEl.className = 'dst-badge' + (dst ? '' : ' dst-badge--off');
    dstEl.textContent = dst ? 'DST active' : 'Standard time';
    meta.appendChild(offsetEl);
    meta.appendChild(dstEl);

    card.appendChild(head);
    card.appendChild(time);
    card.appendChild(meta);
    els.targetsList.appendChild(card);
  });
}

function update() {
  const instant = getSourceInstant();
  if (!instant || isNaN(instant.getTime())) return;
  renderSourceInfo(instant);
  renderTargets(instant);
}

function buildSummaryText() {
  const instant = getSourceInstant();
  if (!instant) return '';
  const sourceTz = els.sourceZone.value;
  const lines = [];
  lines.push('Time Zone Conversion');
  lines.push(`Source: ${zoneLabel(sourceTz)} — ${formatInZone(instant, sourceTz)} (${formatOffset(getOffsetMinutes(instant, sourceTz))}${isDstAt(instant, sourceTz) ? ', DST active' : ''})`);
  if (targets.length) {
    lines.push('');
    targets.forEach(tz => {
      lines.push(`${zoneLabel(tz)}: ${formatInZone(instant, tz)} (${formatOffset(getOffsetMinutes(instant, tz))}${isDstAt(instant, tz) ? ', DST active' : ''})`);
    });
  }
  return lines.join('\n');
}

/* ── Events ── */

els.sourceDateTime.addEventListener('input', update);
els.sourceZone.addEventListener('change', update);

els.nowBtn.addEventListener('click', () => {
  setDateTimeToNowInZone(els.sourceZone.value);
  update();
});

els.addTargetBtn.addEventListener('click', () => {
  const tz = els.targetZoneSelect.value;
  if (!tz || targets.includes(tz)) return;
  targets.push(tz);
  update();
});

els.clearTargetsBtn.addEventListener('click', () => {
  targets = [];
  update();
});

els.copySummaryBtn.addEventListener('click', () => {
  const text = buildSummaryText();
  copyToClipboard(text, 'Summary copied');
});

document.addEventListener('DOMContentLoaded', () => {
  const browserTz = detectBrowserZone();
  const defaultSourceTz = browserTz || 'America/New_York';

  populateZoneSelect(els.sourceZone, defaultSourceTz);
  populateZoneSelect(els.targetZoneSelect, 'Europe/London');

  setDateTimeToNowInZone(defaultSourceTz);

  const defaultTargets = ['UTC', 'Europe/London', 'Asia/Tokyo'];
  targets = defaultTargets.filter(tz => tz !== defaultSourceTz);

  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  update();
});
