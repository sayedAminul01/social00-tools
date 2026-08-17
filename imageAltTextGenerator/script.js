'use strict';

/**
 * Image Alt Text Generator — 100% client-side templating.
 * This tool never sees or analyzes the actual image pixels. It only
 * works from the structured description the user types in, and turns
 * that into alt text variants following real WCAG/SEO guidance
 * (empty alt for decorative images, destination-focused alt for
 * linked images, no "image of" redundancy, no keyword stuffing, a
 * length ceiling around 125 characters, and a note that chart alt
 * text is not a substitute for a real data summary).
 */

const STOPWORDS_FOR_STUFFING = new Set([
  'the', 'and', 'with', 'from', 'this', 'that', 'for', 'are', 'was', 'were', 'has', 'have', 'your', 'you'
]);

const els = {
  imageType: document.getElementById('imageType'),
  topicKeyword: document.getElementById('topicKeyword'),
  imageDescription: document.getElementById('imageDescription'),
  descriptionHint: document.getElementById('descriptionHint'),
  isLinkImage: document.getElementById('isLinkImage'),
  destinationWrap: document.getElementById('destinationWrap'),
  destinationContext: document.getElementById('destinationContext'),
  clearBtn: document.getElementById('clearBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  variantsOutput: document.getElementById('variantsOutput'),
  checkerInput: document.getElementById('checkerInput'),
  checkerResult: document.getElementById('checkerResult'),
};

let currentCopyTexts = [];

/* ── Text helpers ─────────────────────────────────────────── */
function capitalizeFirst(s) {
  const t = (s || '').trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function lowerFirst(s) {
  const t = (s || '').trim();
  if (!t) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}
function stripTrailingPunctuation(s) {
  return (s || '').trim().replace(/[.!\s]+$/, '');
}
function truncateWords(s, n) {
  const words = (s || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= n) return words.join(' ');
  return words.slice(0, n).join(' ');
}

/* ── Quality analysis (shared by generated variants AND the
      standalone checker box) ───────────────────────────────── */
function analyzeAltText(rawText) {
  const t = (rawText || '').trim();
  const len = t.length;
  const flags = [];

  if (len === 0) {
    flags.push({ type: 'info', text: 'Empty alt text — only correct for decorative images. Anything meaningful should be described.' });
    return { len, flags };
  }

  if (len > 125) {
    flags.push({ type: 'warn', text: `${len} characters — many screen readers truncate alt text around 125. Consider trimming.` });
  }

  if (/^\s*(image|picture|graphic|photo)\s+of\b/i.test(t)) {
    flags.push({ type: 'warn', text: 'Starts with "image/picture/graphic of" — screen readers already announce it\'s an image, so this is redundant.' });
  }

  const counts = {};
  const words = t.toLowerCase().match(/[a-z0-9']+/g) || [];
  words.forEach((w) => {
    if (w.length < 3 || STOPWORDS_FOR_STUFFING.has(w)) return;
    counts[w] = (counts[w] || 0) + 1;
  });
  const stuffed = Object.entries(counts).find(([, c]) => c >= 3);
  if (stuffed) {
    flags.push({ type: 'bad', text: `"${stuffed[0]}" appears ${stuffed[1]}× — looks keyword-stuffed. Repetition like this hurts SEO and screen reader users alike.` });
  }

  return { len, flags };
}

function qualityBadge(len, flags) {
  if (len === 0) return { cls: 'quality-badge--info', label: 'Empty' };
  const hasBad = flags.some((f) => f.type === 'bad');
  const hasWarn = flags.some((f) => f.type === 'warn');
  if (hasBad) return { cls: 'quality-badge--bad', label: 'Needs work' };
  if (hasWarn) return { cls: 'quality-badge--warn', label: 'Could improve' };
  return { cls: 'quality-badge--good', label: 'Looks good' };
}

/* ── Variant builders ─────────────────────────────────────── */
function buildConcise(description) {
  const base = stripTrailingPunctuation(description);
  return capitalizeFirst(truncateWords(base, 8));
}

function buildDescriptive(description, imageType, keyword) {
  const base = stripTrailingPunctuation(description);
  let framed;
  if (imageType === 'screenshot') {
    framed = `Screenshot of ${lowerFirst(base)}`;
  } else if (imageType === 'logo') {
    framed = /logo/i.test(base) ? capitalizeFirst(base) : `${capitalizeFirst(base)} logo`;
  } else if (imageType === 'chart') {
    framed = /^(chart|graph|infographic)/i.test(base) ? capitalizeFirst(base) : `Chart showing ${lowerFirst(base)}`;
  } else {
    framed = capitalizeFirst(base);
  }

  let note = '';
  const kw = (keyword || '').trim();
  if (kw) {
    if (framed.toLowerCase().includes(kw.toLowerCase())) {
      note = `Your keyword "${kw}" is already part of the description — no need to force it in again.`;
    } else {
      const candidate = `${framed}, related to ${kw}`;
      if (candidate.length <= 140) {
        framed = candidate;
        note = `Keyword "${kw}" woven in naturally — edit or remove it if it doesn't genuinely fit this image.`;
      } else {
        note = `Keyword "${kw}" wasn't added — the description is already long enough without forcing it in.`;
      }
    }
  }
  return { text: framed, note };
}

function buildLinkVariant(destination) {
  const dest = stripTrailingPunctuation(destination);
  if (!dest) {
    return { text: '', empty: true, note: 'Fill in "Where does it go / what does it do?" above to generate this variant.' };
  }
  let phrase = dest;
  if (!/^(opens?|goes?\s+to|navigat(es|ing)\s+to|downloads?|starts?|plays?|links?\s+to)\b/i.test(phrase)) {
    phrase = `Opens ${lowerFirst(phrase)}`;
  }
  return {
    text: capitalizeFirst(phrase),
    note: 'For image-only links/buttons, alt text should describe the destination or action — the picture itself is secondary.',
  };
}

function buildChartVariant(description) {
  const base = stripTrailingPunctuation(description);
  const text = /^(chart|graph|infographic)/i.test(base) ? capitalizeFirst(base) : `Chart: ${capitalizeFirst(base)}`;
  return {
    text,
    note: 'Alt text alone is a poor substitute for chart data. Keep this as a short caption, and add the real numbers nearby as a text summary, table, or transcript.',
  };
}

/* ── Rendering ─────────────────────────────────────────────── */
function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function renderVariantCard(card) {
  const { len, flags } = analyzeAltText(card.text);
  const badge = qualityBadge(len, flags);

  const wrap = el('div', 'variant-card');

  const head = el('div', 'variant-head');
  head.appendChild(el('span', 'variant-name', card.label));
  if (!card.empty) {
    const badgeEl = el('span', `quality-badge ${badge.cls}`, badge.label);
    head.appendChild(badgeEl);
  }
  wrap.appendChild(head);

  wrap.appendChild(el('div', 'variant-text', card.empty ? '—' : card.text));

  if (card.note) wrap.appendChild(el('p', 'variant-note', card.note));

  const footer = el('div', 'variant-footer');
  const flagsWrap = el('div', 'variant-flags');
  if (!card.empty) {
    if (len > 0) flagsWrap.appendChild(el('span', 'quality-badge quality-badge--info', `${len} chars`));
    flags.forEach((f) => {
      const cls = f.type === 'bad' ? 'quality-badge--bad' : f.type === 'warn' ? 'quality-badge--warn' : 'quality-badge--info';
      flagsWrap.appendChild(el('span', `quality-badge ${cls}`, f.text.split(' — ')[0].split('.')[0]));
    });
  }
  footer.appendChild(flagsWrap);

  const copyBtn = el('button', 'btn-copy-sm', 'Copy');
  copyBtn.type = 'button';
  copyBtn.disabled = !!card.empty;
  copyBtn.addEventListener('click', () => copyToClipboard(card.text, `${card.label} alt text copied`));
  footer.appendChild(copyBtn);

  wrap.appendChild(footer);

  // Full flag explanations below the badges, for anyone who wants the detail.
  if (flags.length) {
    const detail = el('div', 'checker-flags');
    detail.style.marginTop = '.5rem';
    flags.forEach((f) => {
      const line = el('div', `checker-flag${f.type === 'info' ? ' checker-flag--good' : ''}`, f.text);
      detail.appendChild(line);
    });
    wrap.appendChild(detail);
  }

  els.variantsOutput.appendChild(wrap);
  if (!card.empty && card.text) currentCopyTexts.push(`${card.label}: ${card.text}`);
}

function renderDecorativeCard(isLink) {
  const card = el('div', 'decorative-card');
  card.appendChild(el('div', 'variant-name', 'Recommended'));
  card.appendChild(el('div', 'variant-text', 'alt=""'));
  card.appendChild(el(
    'p',
    '',
    'This image is marked Decorative-only, so the correct alt text is an empty string — not a description. An empty alt tells screen readers to skip the image entirely instead of reading out text that adds no information. Leaving the alt attribute off completely is different, and worse: many screen readers then fall back to announcing the file name.'
  ));
  if (isLink) {
    const p2 = el(
      'p',
      '',
      'Since this decorative image is also a link or button, it still needs an accessible name for screen reader users — but that should come from an aria-label on the link/button itself, not from alt text. Keep alt="" on the image.'
    );
    p2.style.marginTop = '.5rem';
    card.appendChild(p2);
  }
  els.variantsOutput.appendChild(card);
  currentCopyTexts = ['alt=""'];
}

function updateDescriptionHint() {
  const type = els.imageType.value;
  els.descriptionHint.textContent = type === 'decorative'
    ? 'Not needed for decorative images — this tool recommends alt="" regardless of what you type here.'
    : 'Describe it the way you\'d explain it to someone on the phone — subject, action, setting.';
}

function generateVariants() {
  const type = els.imageType.value;
  const description = els.imageDescription.value.trim();
  const keyword = els.topicKeyword.value.trim();
  const isLink = els.isLinkImage.checked;
  const destination = els.destinationContext.value.trim();

  els.variantsOutput.innerHTML = '';
  currentCopyTexts = [];

  if (type === 'decorative') {
    renderDecorativeCard(isLink);
    return;
  }

  if (!description) {
    els.variantsOutput.appendChild(el('p', 'empty-state', "Describe what's in the image above to generate alt text variants."));
    return;
  }

  renderVariantCard({ label: 'Concise', text: buildConcise(description), note: 'Short and to the point — a solid default for most images.' });

  const descRes = buildDescriptive(description, type, keyword);
  renderVariantCard({ label: 'Descriptive', text: descRes.text, note: descRes.note || 'Fuller description with more context.' });

  if (isLink) {
    const linkRes = buildLinkVariant(destination);
    renderVariantCard({ label: 'Link / button context', text: linkRes.text, note: linkRes.note, empty: !!linkRes.empty });
  }

  if (type === 'chart') {
    const chartRes = buildChartVariant(description);
    renderVariantCard({ label: 'Chart / data image', text: chartRes.text, note: chartRes.note });
  }
}

/* ── Standalone quality checker ───────────────────────────── */
function updateChecker() {
  const val = els.checkerInput.value;
  els.checkerResult.innerHTML = '';

  if (!val.trim()) {
    els.checkerResult.appendChild(el('p', 'checker-empty', 'Nothing to check yet.'));
    return;
  }

  const { len, flags } = analyzeAltText(val);
  const badge = qualityBadge(len, flags);

  const meta = el('div', 'checker-meta');
  meta.appendChild(el('span', 'checker-len', `${len} characters`));
  meta.appendChild(el('span', `quality-badge ${badge.cls}`, badge.label));
  els.checkerResult.appendChild(meta);

  const list = el('div', 'checker-flags');
  if (flags.length) {
    flags.forEach((f) => list.appendChild(el('div', `checker-flag${f.type === 'info' ? ' checker-flag--good' : ''}`, f.text)));
  } else {
    list.appendChild(el('div', 'checker-flag checker-flag--good', 'No issues found — length and phrasing look good.'));
  }
  els.checkerResult.appendChild(list);
}

/* ── Events ───────────────────────────────────────────────── */
els.imageType.addEventListener('change', () => {
  updateDescriptionHint();
  generateVariants();
});
[els.imageDescription, els.topicKeyword, els.destinationContext].forEach((elm) => {
  elm.addEventListener('input', generateVariants);
});
els.isLinkImage.addEventListener('change', () => {
  els.destinationWrap.hidden = !els.isLinkImage.checked;
  generateVariants();
});
els.checkerInput.addEventListener('input', updateChecker);

els.clearBtn.addEventListener('click', () => {
  els.imageType.value = 'photo';
  els.imageDescription.value = '';
  els.topicKeyword.value = '';
  els.destinationContext.value = '';
  els.isLinkImage.checked = false;
  els.destinationWrap.hidden = true;
  updateDescriptionHint();
  generateVariants();
  els.imageDescription.focus();
});

els.copyAllBtn.addEventListener('click', () => {
  const type = els.imageType.value;
  if (type !== 'decorative' && !els.imageDescription.value.trim()) {
    showToast('Describe the image first, or choose Decorative-only.');
    return;
  }
  if (!currentCopyTexts.length) {
    showToast('Nothing to copy yet');
    return;
  }
  copyToClipboard(currentCopyTexts.join('\n'), 'All variants copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('seo');
  updateDescriptionHint();
  generateVariants();
  updateChecker();
});
