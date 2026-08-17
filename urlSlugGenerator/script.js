'use strict';

const STOPWORDS = new Set([
  'a','an','the','and','or','but','of','in','on','at','to','for','with','by',
  'is','are','was','were','be','been','being','it','its','this','that','these','those',
  'as','from','into','than','then','so','if','not','no','do','does','did'
]);

// Strips combining diacritical marks (U+0300–U+036F) left behind by
// String.prototype.normalize('NFD'), e.g. "e" + combining-acute -> "e".
function stripDiacritics(str) {
  let out = '';
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (code < 0x0300 || code > 0x036f) out += ch;
  }
  return out;
}

const els = {
  input: document.getElementById('slugInput'),
  separator: document.getElementById('separator'),
  maxLength: document.getElementById('maxLength'),
  removeStopwords: document.getElementById('removeStopwords'),
  slugValue: document.getElementById('slugValue'),
  slugMeta: document.getElementById('slugMeta'),
  domainPrefix: document.getElementById('domainPrefix'),
  domainSlugPreview: document.getElementById('domainSlugPreview'),
  clearBtn: document.getElementById('clearBtn'),
  copySlugBtn: document.getElementById('copySlugBtn'),
  copyUrlBtn: document.getElementById('copyUrlBtn'),
};

function slugify(text, { separator = '-', maxLength = 0, removeStopwords = true } = {}) {
  if (!text) return '';

  let normalized = text
    .normalize('NFD');
  normalized = stripDiacritics(normalized)
    .toLowerCase()
    .replace(/['’]/g, ''); // drop apostrophes so "don't" -> "dont", not "don-t"

  let words = normalized
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (removeStopwords) {
    const filtered = words.filter(w => !STOPWORDS.has(w));
    if (filtered.length) words = filtered; // never let stopword removal empty the slug
  }

  let slug = words.join(separator);

  if (maxLength > 0 && slug.length > maxLength) {
    const truncated = slug.slice(0, maxLength);
    const lastSep = truncated.lastIndexOf(separator);
    slug = lastSep > 0 ? truncated.slice(0, lastSep) : truncated;
  }

  return slug;
}

function update() {
  const opts = {
    separator: els.separator.value,
    maxLength: parseInt(els.maxLength.value, 10) || 0,
    removeStopwords: els.removeStopwords.checked,
  };
  const slug = slugify(els.input.value, opts) || 'your-slug-appears-here';
  els.slugValue.textContent = slug;
  els.slugMeta.textContent = `${slug === 'your-slug-appears-here' ? 0 : slug.length} characters`;
  els.domainSlugPreview.textContent = slug;
}

els.input.addEventListener('input', update);
els.separator.addEventListener('change', update);
els.maxLength.addEventListener('change', update);
els.removeStopwords.addEventListener('change', update);
els.domainPrefix.addEventListener('input', update);

els.clearBtn.addEventListener('click', () => {
  els.input.value = '';
  update();
  els.input.focus();
});

els.copySlugBtn.addEventListener('click', () => {
  copyToClipboard(els.slugValue.textContent, 'Slug copied');
});

els.copyUrlBtn.addEventListener('click', () => {
  const prefix = els.domainPrefix.value.replace(/\/+$/, '');
  copyToClipboard(`${prefix}/${els.slugValue.textContent}`, 'Full URL copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('seo');
  update();
});
