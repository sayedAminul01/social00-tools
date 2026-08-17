'use strict';

/* ── Constants ────────────────────────────────────────────── */
const TITLE_FONT = '20px Arial';
const DESC_FONT = '14px Arial';
const TITLE_MAX_PX = 580;
const DESC_MAX_PX = 920;

const DEFAULT_TITLE = 'Your page title will appear here';
const DEFAULT_DESC = 'Your meta description will appear here — write one above to see the live preview update.';

/* ── Hidden canvas, created once and reused for text measurement ── */
let _canvas = null;
let _ctx = null;
function getMeasureCtx() {
  if (!_ctx) {
    _canvas = document.createElement('canvas');
    _canvas.width = 1;
    _canvas.height = 1;
    // Never appended to the document — stays fully off-DOM/hidden.
    _ctx = _canvas.getContext('2d');
  }
  return _ctx;
}
function measureTextWidth(text, font) {
  const ctx = getMeasureCtx();
  ctx.font = font;
  return ctx.measureText(text || '').width;
}

/* ── Elements ─────────────────────────────────────────────── */
const els = {
  title: document.getElementById('titleInput'),
  desc: document.getElementById('descInput'),
  url: document.getElementById('urlInput'),
  keyword: document.getElementById('keywordInput'),
  ogImage: document.getElementById('ogImageInput'),

  titleCounterBadge: document.getElementById('titleCounterBadge'),
  titlePxLabel: document.getElementById('titlePxLabel'),
  descCounterBadge: document.getElementById('descCounterBadge'),
  descPxLabel: document.getElementById('descPxLabel'),

  serpBreadcrumb: document.getElementById('serpBreadcrumb'),
  serpTitle: document.getElementById('serpTitle'),
  serpDesc: document.getElementById('serpDesc'),

  codeOutput: document.getElementById('codeOutput'),
  copyCodeBtn: document.getElementById('copyCodeBtn'),
  clearBtn: document.getElementById('clearBtn'),
};

/* ── Helpers ──────────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escapes for use inside an HTML attribute value (content="...").
function escAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Escapes for use as HTML element text content (e.g. <title>...</title>).
function escText(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Safely HTML-escapes `text`, then wraps case-insensitive matches of
// `keyword` in <mark>. Only used for the visual SERP preview, never
// for the copy-paste code block.
function highlightKeyword(text, keyword) {
  const safe = escapeHtml(text);
  const kw = (keyword || '').trim();
  if (!kw) return safe;
  const escapedKw = escapeHtml(kw);
  const pattern = escapeRegExp(escapedKw);
  if (!pattern) return safe;
  const re = new RegExp(pattern, 'ig');
  return safe.replace(re, (m) => `<mark>${m}</mark>`);
}

function normalizeUrl(raw) {
  const u = (raw || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function titleFyPathSegment(seg) {
  let s = seg;
  try { s = decodeURIComponent(seg); } catch (e) { /* leave as-is */ }
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildBreadcrumb(rawUrl) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return 'example.com';
  try {
    const u = new URL(normalized);
    const domain = u.hostname.replace(/^www\./i, '');
    const segments = u.pathname.split('/').filter(Boolean).map(titleFyPathSegment);
    return [domain, ...segments].join(' › ');
  } catch (e) {
    return normalized.replace(/^https?:\/\//i, '');
  }
}

function titleTier(len) {
  if (len >= 30 && len <= 60) return 'green';
  if ((len >= 15 && len <= 29) || (len >= 61 && len <= 70)) return 'amber';
  return 'red';
}

function descTier(len) {
  if (len >= 120 && len <= 155) return 'green';
  if ((len >= 80 && len <= 119) || (len >= 156 && len <= 165)) return 'amber';
  return 'red';
}

function setCounter(badgeEl, pxEl, len, px, tier) {
  badgeEl.textContent = `${len} character${len === 1 ? '' : 's'}`;
  badgeEl.className = `counter-badge counter-${tier}`;
  pxEl.textContent = `~${Math.round(px)}px (approx)`;
}

/* ── Main update ──────────────────────────────────────────── */
function update() {
  const title = els.title.value.trim();
  const desc = els.desc.value.trim();
  const urlRaw = els.url.value.trim();
  const keyword = els.keyword.value.trim();
  const ogImageRaw = els.ogImage.value.trim();

  // Counters
  const titleLen = title.length;
  const descLen = desc.length;
  const titlePx = measureTextWidth(title, TITLE_FONT);
  const descPx = measureTextWidth(desc, DESC_FONT);
  setCounter(els.titleCounterBadge, els.titlePxLabel, titleLen, titlePx, titleTier(titleLen));
  setCounter(els.descCounterBadge, els.descPxLabel, descLen, descPx, descTier(descLen));
  els.titlePxLabel.title = `Google's desktop title cutoff is roughly ${TITLE_MAX_PX}px`;
  els.descPxLabel.title = `Google's desktop description cutoff is roughly ${DESC_MAX_PX}px`;

  // SERP preview
  const titleForDisplay = title || DEFAULT_TITLE;
  const descForDisplay = desc || DEFAULT_DESC;
  els.serpBreadcrumb.textContent = buildBreadcrumb(urlRaw);
  els.serpTitle.innerHTML = highlightKeyword(titleForDisplay, keyword);
  els.serpDesc.innerHTML = highlightKeyword(descForDisplay, keyword);

  // Copy-paste code block
  const titleForCode = title || 'Your Page Title Here';
  const descForCode = desc || 'Your meta description will appear here.';
  const canonicalUrl = normalizeUrl(urlRaw) || 'https://example.com/page';
  const ogImageUrl = normalizeUrl(ogImageRaw);

  const lines = [
    `<title>${escText(titleForCode)}</title>`,
    `<meta name="description" content="${escAttr(descForCode)}">`,
    `<link rel="canonical" href="${escAttr(canonicalUrl)}">`,
    `<meta property="og:title" content="${escAttr(titleForCode)}">`,
    `<meta property="og:description" content="${escAttr(descForCode)}">`,
    `<meta property="og:url" content="${escAttr(canonicalUrl)}">`,
  ];
  if (ogImageUrl) lines.push(`<meta property="og:image" content="${escAttr(ogImageUrl)}">`);
  lines.push(`<meta name="twitter:card" content="summary_large_image">`);
  lines.push(`<meta name="twitter:title" content="${escAttr(titleForCode)}">`);
  lines.push(`<meta name="twitter:description" content="${escAttr(descForCode)}">`);
  if (ogImageUrl) lines.push(`<meta name="twitter:image" content="${escAttr(ogImageUrl)}">`);

  els.codeOutput.textContent = lines.join('\n');
}

/* ── Events ───────────────────────────────────────────────── */
[els.title, els.desc, els.url, els.keyword, els.ogImage].forEach((el) => {
  el.addEventListener('input', update);
});

els.clearBtn.addEventListener('click', () => {
  els.title.value = '';
  els.desc.value = '';
  els.url.value = '';
  els.keyword.value = '';
  els.ogImage.value = '';
  update();
  els.title.focus();
});

els.copyCodeBtn.addEventListener('click', () => {
  copyToClipboard(els.codeOutput.textContent, 'Meta tags copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('seo');
  update();
});
