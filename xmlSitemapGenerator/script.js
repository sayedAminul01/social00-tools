'use strict';

const SITEMAP_URL_LIMIT = 50000;

// XML-escapes text content: & must go first so subsequent replacements
// don't double-escape the ampersands they themselves introduce.
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Combines a pasted line with the base domain unless the line is already
// an absolute http(s) URL. Returns null for blank lines.
function combineUrl(line, base) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleanBase = base.trim().replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  return cleanBase + path;
}

const els = {
  baseDomain: document.getElementById('baseDomain'),
  urlInput: document.getElementById('urlInput'),
  changefreq: document.getElementById('changefreq'),
  priority: document.getElementById('priority'),
  includeLastmod: document.getElementById('includeLastmod'),
  summary: document.getElementById('urlSummary'),
  invalidBox: document.getElementById('invalidBox'),
  invalidList: document.getElementById('invalidList'),
  limitWarning: document.getElementById('limitWarning'),
  output: document.getElementById('sitemapOutput'),
  clearBtn: document.getElementById('clearBtn'),
  copyBtn: document.getElementById('copyXmlBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
};

// Parses the textarea into deduped, validated absolute URLs.
// Dedupe key is the normalized href from the URL constructor, so
// "/about" and "/about" (typed twice) collapse to a single entry.
function parseAndValidate(text, base) {
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const seen = new Set();
  const valid = [];
  const invalid = [];
  let duplicates = 0;

  rawLines.forEach(line => {
    const combined = combineUrl(line, base);
    if (!combined) return;
    let urlObj;
    try {
      urlObj = new URL(combined);
    } catch (e) {
      invalid.push(line);
      return;
    }
    const href = urlObj.href;
    if (seen.has(href)) {
      duplicates++;
      return;
    }
    seen.add(href);
    valid.push(href);
  });

  return { totalParsed: rawLines.length, valid, invalid, duplicates };
}

function buildXml(urls, opts) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  urls.forEach(url => {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    if (opts.lastmod) lines.push(`    <lastmod>${opts.lastmod}</lastmod>`);
    if (opts.changefreq) lines.push(`    <changefreq>${opts.changefreq}</changefreq>`);
    if (opts.priority) lines.push(`    <priority>${opts.priority}</priority>`);
    lines.push('  </url>');
  });
  lines.push('</urlset>');
  return lines.join('\n');
}

let lastXml = '';

function update() {
  const base = els.baseDomain.value || '';
  const { totalParsed, valid, invalid, duplicates } = parseAndValidate(els.urlInput.value, base);

  const opts = {
    changefreq: els.changefreq.value,
    priority: els.priority.value,
    lastmod: els.includeLastmod.checked ? todayISO() : '',
  };

  const xml = valid.length ? buildXml(valid, opts) : '';
  lastXml = xml;
  els.output.textContent = xml || '<!-- Add some URLs above to generate your sitemap -->';

  els.summary.textContent =
    `Parsed ${totalParsed} line${totalParsed === 1 ? '' : 's'} → ` +
    `${valid.length} valid URL${valid.length === 1 ? '' : 's'}, ` +
    `${duplicates} duplicate${duplicates === 1 ? '' : 's'} removed, ` +
    `${invalid.length} invalid skipped`;

  if (invalid.length) {
    els.invalidBox.hidden = false;
    els.invalidList.innerHTML = invalid.map(l => `<li>${escapeXml(l)}</li>`).join('');
  } else {
    els.invalidBox.hidden = true;
    els.invalidList.innerHTML = '';
  }

  if (valid.length > SITEMAP_URL_LIMIT) {
    els.limitWarning.hidden = false;
    els.limitWarning.textContent =
      `⚠ ${valid.length.toLocaleString()} URLs exceeds the sitemaps.org limit of 50,000 URLs ` +
      `(and 50MB uncompressed) per sitemap file. Split these into multiple sitemap files and ` +
      `reference them from a sitemap index file.`;
  } else {
    els.limitWarning.hidden = true;
  }
}

let debounceTimer = null;
function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(update, 250);
}

els.baseDomain.addEventListener('input', scheduleUpdate);
els.urlInput.addEventListener('input', scheduleUpdate);
els.changefreq.addEventListener('change', update);
els.priority.addEventListener('change', update);
els.includeLastmod.addEventListener('change', update);

els.clearBtn.addEventListener('click', () => {
  els.urlInput.value = '';
  update();
  els.urlInput.focus();
});

els.copyBtn.addEventListener('click', () => {
  copyToClipboard(lastXml, 'Sitemap XML copied');
});

els.downloadBtn.addEventListener('click', () => {
  if (!lastXml) { showToast('Nothing to download yet'); return; }
  const blob = new Blob([lastXml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sitemap.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('sitemap.xml downloaded');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('seo');
  update();
});
