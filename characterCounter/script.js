'use strict';

/* ── GSM-7 basic alphabet (GSM 03.38) ──────────────────────────
   A reasonable-approximation allow-list: core printable ASCII
   plus the handful of extra symbols/diacritics GSM-7 supports.
   Any code point NOT in this set (most emoji, most non-Latin
   scripts, curly quotes, etc.) forces the whole SMS to Unicode
   encoding, which cuts a segment from 160 down to 70 characters. */
const GSM7_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà" +
  "^{}\\[~]|€";

function isGSM7(text) {
  for (const ch of text) {
    if (GSM7_CHARS.indexOf(ch) === -1) return false;
  }
  return true;
}

// Count by Unicode code point (not UTF-16 code unit) so a single
// emoji counts as one character, not two.
function countCodePoints(text) {
  return Array.from(text).length;
}

const PLATFORMS = [
  { id: 'x', limit: 280 },
  { id: 'instagram', limit: 2200 },
  { id: 'fb-see-more', limit: 477 },
  { id: 'fb-max', limit: 63206 },
  { id: 'seo', limit: 160 },
  { id: 'linkedin', limit: 3000 },
  { id: 'yt-title', limit: 100 },
  { id: 'yt-desc', limit: 5000 }
];

const textInput = document.getElementById('textInput');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const charWithSpacesEl = document.getElementById('charWithSpaces');
const charNoSpacesEl = document.getElementById('charNoSpaces');

function updateCard(id, count, limit) {
  const fill = document.getElementById('fill-' + id);
  const countEl = document.getElementById('count-' + id);
  const statusEl = document.getElementById('status-' + id);
  const cardEl = document.querySelector('.platform-card[data-platform="' + id + '"]');
  if (!fill || !countEl || !statusEl || !cardEl) return;

  const ratio = limit > 0 ? count / limit : 0;
  const pct = Math.max(0, Math.min(100, ratio * 100));

  fill.style.width = pct + '%';
  fill.classList.remove('tier-warn', 'tier-over');
  cardEl.classList.remove('is-warn', 'is-over');

  let tier = 'ok';
  if (count > limit) tier = 'over';
  else if (ratio >= 0.8) tier = 'warn';

  if (tier === 'warn') { fill.classList.add('tier-warn'); cardEl.classList.add('is-warn'); }
  if (tier === 'over') { fill.classList.add('tier-over'); cardEl.classList.add('is-over'); }

  countEl.textContent = `${count.toLocaleString()} / ${limit.toLocaleString()}`;
  statusEl.textContent = tier === 'over'
    ? `${(count - limit).toLocaleString()} over`
    : `${(limit - count).toLocaleString()} left`;
}

function update() {
  const text = textInput.value;
  const withSpaces = countCodePoints(text);
  const noSpaces = countCodePoints(text.replace(/\s/g, ''));

  charWithSpacesEl.textContent = withSpaces.toLocaleString();
  charNoSpacesEl.textContent = noSpaces.toLocaleString();

  PLATFORMS.forEach(p => updateCard(p.id, withSpaces, p.limit));

  // SMS card: real GSM-7 detection, not a hardcoded 160.
  const gsm7 = isGSM7(text);
  const smsLimit = gsm7 ? 160 : 70;
  const badge = document.getElementById('badge-sms');
  const note = document.getElementById('note-sms');
  if (badge) badge.textContent = smsLimit.toLocaleString();
  if (note) {
    note.textContent = gsm7
      ? 'GSM-7 encoding detected — standard 160-character segment.'
      : 'Unicode character detected (e.g. emoji or non-Latin script) — segment limit drops to 70 characters.';
  }
  updateCard('sms', withSpaces, smsLimit);
}

textInput.addEventListener('input', update);

clearBtn.addEventListener('click', () => {
  textInput.value = '';
  update();
  textInput.focus();
});

copyBtn.addEventListener('click', () => {
  copyToClipboard(textInput.value, 'Text copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  update();
});
