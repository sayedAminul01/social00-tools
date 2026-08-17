'use strict';

/* ── Headline template bank ────────────────────────────────────
   Each template uses a {topic} placeholder built to work with a
   short topic fragment (2-4 words), not a full sentence. Output
   is always rendered in ALL CAPS, matching thumbnail-text style. */
const HEADLINE_TEMPLATES = {
  shock: [
    '{topic}?!',
    'I TRIED {topic}',
    'THE TRUTH ABOUT {topic}',
    '{topic} GONE WRONG',
    "YOU WON'T BELIEVE {topic}",
    'NOBODY TALKS ABOUT {topic}',
    'THE {topic} NOBODY WARNED ME',
    'WAIT... {topic}?',
    '{topic} SHOCKED ME',
    'WHAT REALLY HAPPENED: {topic}'
  ],
  number: [
    '5 {topic} MISTAKES',
    '{topic} IN 3 STEPS',
    'TOP 10 {topic} TIPS',
    '{topic}: 7 SECRETS',
    '3 WAYS TO {topic}',
    '{topic} — RANKED',
    '5 {topic} HACKS',
    '{topic} IN 60 SECONDS',
    '#1 {topic} MISTAKE',
    '{topic}: TOP 5 PICKS'
  ],
  beforeafter: [
    '{topic}: BEFORE VS AFTER',
    '30 DAYS OF {topic}',
    '{topic} — DAY 1 VS 30',
    'MY {topic} TRANSFORMATION',
    '{topic}: THEN AND NOW',
    'I CHANGED {topic} IN A WEEK',
    '{topic} GLOW UP',
    '{topic}: THE RESULTS',
    '{topic} — 1 MONTH LATER',
    'FROM ZERO TO {topic}'
  ],
  question: [
    'IS {topic} WORTH IT?',
    'CAN YOU REALLY {topic}?',
    'WHY DOES {topic} HAPPEN?',
    '{topic}... BUT WHY?',
    'WHAT IF {topic}?',
    'IS {topic} A SCAM?',
    'SHOULD YOU TRY {topic}?',
    'WHAT HAPPENS AFTER {topic}?',
    '{topic} — REALLY?',
    'HOW HARD IS {topic}?'
  ]
};

const HEADLINE_COUNT = 8;
const WORD_WARNING_THRESHOLD = 6;

/* Leading filler words that add nothing to a short thumbnail phrase. */
const LEADING_FILLER = /^(how to|how i|i tried|trying to|attempting to|the|a|an|my)\s+/i;

const els = {
  topicInput: document.getElementById('topicInput'),
  styleTabs: document.querySelectorAll('.style-tab'),
  generateBtn: document.getElementById('generateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  clearBtn: document.getElementById('clearBtn'),
  headlinesOutput: document.getElementById('headlinesOutput')
};

let activeStyle = 'any';
let lastHeadlines = [];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Fisher-Yates shuffle, returns a new array */
function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Reduces a raw topic to a short core phrase (max 4 words) so it
   fits naturally inside a 2-6 word thumbnail template. Strips
   common leading filler like "how to" / "i tried" / "the". */
function simplifyTopic(raw) {
  let t = raw.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  t = t.replace(LEADING_FILLER, '');
  const words = t.split(' ').filter(Boolean);
  if (words.length > 4) t = words.slice(0, 4).join(' ');
  return t || raw.trim();
}

/* Builds the flat pool of templates to draw from for a given style key. */
function getPool(styleKey) {
  if (styleKey === 'any' || !HEADLINE_TEMPLATES[styleKey]) {
    return Object.values(HEADLINE_TEMPLATES).reduce((acc, list) => acc.concat(list), []);
  }
  return HEADLINE_TEMPLATES[styleKey].slice();
}

/* Picks `count` templates from the pool, using each unique template
   once before any repeats, and avoiding immediate back-to-back repeats. */
function pickTemplates(pool, count) {
  const picks = [];
  let cursor = 0;
  let lap = shuffle(pool);

  while (picks.length < count) {
    if (cursor >= lap.length) {
      lap = shuffle(pool);
      cursor = 0;
    }
    const candidate = lap[cursor];
    cursor++;
    if (picks.length > 0 && picks[picks.length - 1] === candidate && pool.length > 1) {
      continue; // avoid an immediate duplicate when we still have other options
    }
    picks.push(candidate);
  }
  return picks;
}

function fillTemplate(template, topic) {
  const filled = template.replace(/\{topic\}/g, topic);
  return filled.toUpperCase();
}

/* Soft readability flag — thumbnail text has no platform character
   limit, but lines past ~6 words stop being readable at small sizes. */
function checkLength(text) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > WORD_WARNING_THRESHOLD) {
    return { warn: true, label: `${wordCount} words — long for a thumbnail`, cls: 'length-warn' };
  }
  return { warn: false, label: `${wordCount} word${wordCount === 1 ? '' : 's'}`, cls: 'length-ok' };
}

function buildHeadlines(topic, styleKey) {
  const core = simplifyTopic(topic);
  const pool = getPool(styleKey);
  const templates = pickTemplates(pool, HEADLINE_COUNT);
  return templates.map((template) => fillTemplate(template, core));
}

function renderHeadlines(headlines) {
  if (!headlines.length) {
    els.headlinesOutput.innerHTML = '<p class="headlines-placeholder" id="headlinesPlaceholder">Your generated thumbnail headlines will appear here.</p>';
    return;
  }

  els.headlinesOutput.innerHTML = headlines.map((headline, i) => {
    const len = checkLength(headline);
    const safe = escapeHtml(headline);
    return `
      <div class="headline-card" data-index="${i}">
        <div class="headline-preview"><span class="headline-highlight">${safe}</span></div>
        <div class="headline-card-footer">
          <div class="headline-card-main">
            <div class="headline-card-text">${safe}</div>
            <div class="headline-card-meta">
              <span class="length-badge ${len.cls}">${len.label}</span>
            </div>
          </div>
          <button class="headline-copy" data-copy-index="${i}" aria-label="Copy this headline" title="Copy headline">⧉</button>
        </div>
      </div>
    `;
  }).join('');

  els.headlinesOutput.querySelectorAll('[data-copy-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-copy-index'), 10);
      copyToClipboard(lastHeadlines[idx], 'Headline copied');
    });
  });
}

function generate() {
  const topic = els.topicInput.value.trim();
  if (!topic) {
    showToast('Enter a video topic first');
    els.topicInput.focus();
    return;
  }

  lastHeadlines = buildHeadlines(topic, activeStyle);
  renderHeadlines(lastHeadlines);
}

function setActiveStyle(styleKey) {
  activeStyle = styleKey;
  els.styleTabs.forEach((tab) => {
    const isActive = tab.getAttribute('data-style') === styleKey;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

els.styleTabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveStyle(tab.getAttribute('data-style')));
});

els.generateBtn.addEventListener('click', generate);

els.topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

els.copyAllBtn.addEventListener('click', () => {
  if (!lastHeadlines.length) {
    showToast('Generate some headlines first');
    return;
  }
  copyToClipboard(lastHeadlines.join('\n'), 'All headlines copied');
});

els.clearBtn.addEventListener('click', () => {
  els.topicInput.value = '';
  lastHeadlines = [];
  renderHeadlines([]);
  els.topicInput.focus();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('youtube');
});
