'use strict';

/* ── Elements ─────────────────────────────────────────────────── */
const els = {
  productName: document.getElementById('productName'),
  audience: document.getElementById('audience'),
  features: document.getElementById('features'),
  tone: document.getElementById('tone'),
  generateBtn: document.getElementById('generateBtn'),
  clearBtn: document.getElementById('clearBtn'),
  resultsWrap: document.getElementById('resultsWrap'),
};

/* ── Template bank ────────────────────────────────────────────
   Every string below is a hand-written template pattern, not the
   output of a live language model. Feature text is wrapped in a
   fixed "connector + outcome" shape to approximate benefit-style
   copy — see the FAQ on this page for the honest explanation. */
const TONE_BANK = {
  persuasive: {
    label: 'Persuasive / Sales',
    connectors: ['so you can', 'which means you', 'giving you the power to', "so you're able to"],
    outcomes: [
      'get results faster',
      'never miss a beat',
      'do more with less effort',
      'stay ahead of the competition',
      'see the difference immediately',
      'get it right every time',
    ],
    shortTemplates: [
      (name, feat, aud) => `Meet the ${name} — engineered with ${feat}, so you get real results without the hassle${aud}.`,
      (name, feat, aud) => `${name}: built for people who want ${feat} without settling for less${aud}.`,
      (name, feat, aud) => `Why settle? The ${name} delivers ${feat}, so you always come out ahead${aud}.`,
    ],
    hooks: [
      (name, aud) => `Looking for a smarter way to get things done? The ${name} is designed to outperform, every single time${aud}.`,
      (name, aud) => `The ${name} isn't just another product — it's the upgrade you've been waiting for${aud}.`,
    ],
    lead: "Here's why it works:",
    ctas: [
      (name) => `Don't wait — grab the ${name} today and see the difference for yourself.`,
      (name) => `Ready to upgrade? The ${name} is ready when you are.`,
    ],
  },
  minimal: {
    label: 'Minimal / Modern',
    connectors: ['so', 'meaning', 'which means'],
    outcomes: [
      'it just works',
      'everyday use feels effortless',
      'nothing gets in your way',
      'you get exactly what you need',
      'less thinking, more doing',
      'it stays out of your way',
    ],
    shortTemplates: [
      (name, feat, aud) => `${name} — ${feat}. Simple, effective, done${aud}.`,
      (name, feat, aud) => `The ${name} keeps it simple: ${feat}, nothing you don't need${aud}.`,
      (name, feat, aud) => `${name}. Just ${feat}. That's it${aud}.`,
    ],
    hooks: [
      (name, aud) => `The ${name} is built around one idea: keep it simple, make it work${aud}.`,
      (name, aud) => `Less noise, more function. That's the ${name}${aud}.`,
    ],
    lead: 'What you get:',
    ctas: [
      (name) => `Simple choice: the ${name}.`,
      (name) => `Get the ${name} and get on with your day.`,
    ],
  },
  luxury: {
    label: 'Luxury',
    connectors: ['so you can', 'ensuring you', 'so that you'],
    outcomes: [
      'experience true refinement',
      'enjoy uncompromising quality in every detail',
      'feel the difference craftsmanship makes',
      'indulge without a second thought',
      'elevate the everyday into the exceptional',
      'settle for nothing less than the best',
    ],
    shortTemplates: [
      (name, feat, aud) => `Introducing the ${name} — crafted with ${feat}, for those who expect more${aud}.`,
      (name, feat, aud) => `The ${name} pairs ${feat} for an experience defined by quality${aud}.`,
      (name, feat, aud) => `Discover the ${name}: ${feat}, thoughtfully made for the discerning${aud}.`,
    ],
    hooks: [
      (name, aud) => `The ${name} was created for one purpose — to bring uncompromising quality into everyday life${aud}.`,
      (name, aud) => `Some products are made to be used. The ${name} is made to be experienced${aud}.`,
    ],
    lead: 'What sets it apart:',
    ctas: [
      (name) => `Treat yourself to the ${name} — because you've earned it.`,
      (name) => `Experience the ${name} for yourself.`,
    ],
  },
  playful: {
    label: 'Playful',
    connectors: ['so you can', 'which means you', 'so you get to'],
    outcomes: [
      'have way more fun',
      'flash a big smile every time',
      'make everyday moments a little brighter',
      'enjoy the little things even more',
      'feel like a kid again',
      'turn a chore into a highlight',
    ],
    shortTemplates: [
      (name, feat, aud) => `Say hello to the ${name} 👋 — packing ${feat} to make your day a little better${aud}.`,
      (name, feat, aud) => `The ${name} brings ${feat} together for a whole lot of fun${aud}.`,
      (name, feat, aud) => `Meet your new favorite thing: the ${name}, with ${feat} built right in${aud}.`,
    ],
    hooks: [
      (name, aud) => `Okay, we need to talk about the ${name} — it might just become your new obsession${aud}.`,
      (name, aud) => `Say hi to the ${name}: proof that everyday products can still be fun${aud}.`,
    ],
    lead: "Here's what makes it awesome:",
    ctas: [
      (name) => `Go on, add the ${name} to your cart — you know you want to 😉`,
      (name) => `Your future self will thank you for grabbing the ${name} today.`,
    ],
  },
};

/* ── Parsing / formatting helpers ────────────────────────────── */
function parseFeatures(raw) {
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const parts = lines.length > 1 ? lines : raw.split(',').map(s => s.trim()).filter(Boolean);
  return parts.map(cleanFeature).filter(Boolean);
}

function cleanFeature(str) {
  return str.replace(/^[-•*]\s*/, '').replace(/\.+$/, '').trim();
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function lowerFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function joinTwo(a, b) {
  return b ? `${a} and ${lowerFirst(b)}` : a;
}

/* Wraps a single feature in the tone's connector + outcome template,
   e.g. "Waterproof sole — so you can stay ahead of the competition."
   This is a fixed pattern applied to whatever text was typed in, not
   an analysis of what the feature actually does. */
function toBenefitPhrase(feature, tone, idx) {
  const bank = TONE_BANK[tone];
  const connector = bank.connectors[idx % bank.connectors.length];
  const outcome = bank.outcomes[idx % bank.outcomes.length];
  return `${capitalizeFirst(feature)} — ${connector} ${outcome}.`;
}

function countWords(text) {
  const words = text.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ── Generators ───────────────────────────────────────────────── */
function generateShort(name, features, audience, tone) {
  const bank = TONE_BANK[tone];
  const feat = joinTwo(features[0], features[1]);
  const aud = audience ? ` — perfect for ${audience}` : '';
  const template = bank.shortTemplates[Math.floor(Math.random() * bank.shortTemplates.length)];
  return template(name, feat, aud);
}

function generateLong(name, features, audience, tone) {
  const bank = TONE_BANK[tone];
  const aud = audience ? ` for ${audience}` : '';
  const hook = bank.hooks[Math.floor(Math.random() * bank.hooks.length)](name, aud);
  const offset = Math.floor(Math.random() * 100);
  const bullets = features.slice(0, 6).map((f, i) => toBenefitPhrase(f, tone, i + offset));
  const cta = bank.ctas[Math.floor(Math.random() * bank.ctas.length)](name);

  const html = `<p>${escapeHtml(hook)}</p><p>${escapeHtml(bank.lead)}</p><ul class="variant-bullets">${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul><p class="variant-cta">${escapeHtml(cta)}</p>`;
  const plain = `${hook}\n\n${bank.lead}\n${bullets.map(b => `- ${b}`).join('\n')}\n\n${cta}`;
  return { html, plain };
}

/* ── State + rendering ───────────────────────────────────────── */
let lastData = null;

function renderResults() {
  if (!lastData) return;
  const { name, features, audience, tone } = lastData;
  const short = generateShort(name, features, audience, tone);
  const long = generateLong(name, features, audience, tone);
  lastData.shortText = short;
  lastData.longPlain = long.plain;

  els.resultsWrap.innerHTML = `
    <div class="variant-card">
      <div class="variant-head">
        <span class="variant-label">Short Description <span class="variant-hint">— listing / product card snippet</span></span>
        <span class="variant-count" id="shortCount">${countWords(short)} words</span>
      </div>
      <p class="variant-text" id="shortText">${escapeHtml(short)}</p>
      <button class="btn-copy-sm" id="copyShortBtn">Copy</button>
    </div>
    <div class="variant-card">
      <div class="variant-head">
        <span class="variant-label">Long Description <span class="variant-hint">— SEO product page copy</span></span>
        <span class="variant-count" id="longCount">${countWords(long.plain)} words</span>
      </div>
      <div class="variant-text" id="longText">${long.html}</div>
      <button class="btn-copy-sm" id="copyLongBtn">Copy</button>
    </div>
    <div class="variant-actions">
      <button class="btn-clear" id="regenerateBtn">🔄 Regenerate</button>
      <button class="btn-copy" id="copyBothBtn">Copy Both</button>
    </div>
  `;

  document.getElementById('copyShortBtn').addEventListener('click', () => {
    copyToClipboard(lastData.shortText, 'Short description copied');
  });
  document.getElementById('copyLongBtn').addEventListener('click', () => {
    copyToClipboard(lastData.longPlain, 'Long description copied');
  });
  document.getElementById('copyBothBtn').addEventListener('click', () => {
    copyToClipboard(`${lastData.shortText}\n\n---\n\n${lastData.longPlain}`, 'Both descriptions copied');
  });
  document.getElementById('regenerateBtn').addEventListener('click', () => {
    renderResults();
  });
}

function showEmptyState(message) {
  els.resultsWrap.innerHTML = `<p class="results-empty">${escapeHtml(message)}</p>`;
  lastData = null;
}

/* ── Actions ──────────────────────────────────────────────────── */
function generate() {
  const name = els.productName.value.trim();
  const features = parseFeatures(els.features.value);
  const audience = els.audience.value.trim();
  const tone = els.tone.value;

  if (!name) {
    showToast('Please enter a product name');
    els.productName.focus();
    return;
  }
  if (!features.length) {
    showToast('Please enter at least one feature');
    els.features.focus();
    return;
  }

  lastData = { name, features, audience, tone };
  renderResults();
}

els.generateBtn.addEventListener('click', generate);

els.clearBtn.addEventListener('click', () => {
  els.productName.value = '';
  els.audience.value = '';
  els.features.value = '';
  els.tone.value = 'persuasive';
  showEmptyState('Fill in a product name and at least one feature, then click "Generate Descriptions".');
  els.productName.focus();
});

[els.productName, els.audience].forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('writing');
});
