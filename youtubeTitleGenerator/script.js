'use strict';

/* ── Title formula bank ────────────────────────────────────────
   Each formula uses a {topic} placeholder. Grouped by style so
   the style <select> can filter the pool before picking 12. */
const TITLE_FORMULAS = {
  curiosity: [
    'The {topic} Secret Nobody Talks About',
    'Why {topic} Is Not What You Think',
    'What Nobody Tells You About {topic}',
    'The Truth About {topic}',
    'This Is Why {topic} Actually Works',
    'The Hidden Side of {topic}',
    "{topic}: What They Don't Want You to Know",
    'The Real Reason {topic} Works',
    'Something Strange Happens When You Try {topic}'
  ],
  howto: [
    'How to {topic} (Step by Step)',
    "How to {topic} Even If You're a Beginner",
    'How to {topic} the Right Way',
    'How to {topic} in Under 10 Minutes',
    'How to {topic} Without Wasting Time',
    'A Simple Guide to {topic}',
    "How to {topic}: A Beginner's Guide",
    'How to Finally {topic}',
    'How to {topic} Like a Pro'
  ],
  listicle: [
    '7 Ways to {topic}',
    '10 {topic} Mistakes to Avoid',
    '5 Tips for {topic} That Actually Work',
    '9 Things I Wish I Knew Before {topic}',
    '8 {topic} Hacks Nobody Told You About',
    '6 Simple Steps to {topic}',
    '12 Ideas for {topic}',
    '3 Rules for {topic} You Need to Know',
    "10 Signs You're Doing {topic} Wrong"
  ],
  emotional: [
    "I Tried {topic} for 30 Days — Here's What Happened",
    'This {topic} Changed Everything',
    'I Wish I Knew This About {topic} Sooner',
    'The {topic} Journey That Changed My Mind',
    'I Was Wrong About {topic}',
    'How {topic} Changed My Life',
    'My Honest Experience With {topic}',
    'I Almost Gave Up on {topic} — Then This Happened',
    'What {topic} Taught Me About Myself'
  ],
  comparison: [
    "{topic}: What's Actually Better?",
    'Old Way vs New Way of {topic}',
    '{topic} vs The Alternative: Which Wins?',
    'Is {topic} Better Than You Think?',
    '{topic}: Before vs After',
    'Cheap vs Expensive {topic}',
    '{topic}: The Pros and Cons',
    'Beginner vs Pro: {topic} Compared',
    '{topic} Compared: What Actually Works'
  ],
  question: [
    'Is {topic} Actually Worth It?',
    'What Happens When You {topic}?',
    'Can You Really {topic} in a Week?',
    'Is {topic} Worth Your Time in 2026?',
    'What Nobody Asks About {topic}?',
    'Should You Even Bother With {topic}?',
    'Why Does {topic} Actually Matter?',
    'Is {topic} a Waste of Money?',
    "What's the Best Way to {topic}?"
  ]
};

const EMOJI_LIST = ['\u{1F525}', '\u{1F3AF}', '\u{1F4A1}', '\u{1F680}', '✅', '⚡'];

const POWER_WORDS = ['secret', 'mistake', 'actually', 'never', 'always', 'proven', 'warning', 'honest'];

const TITLE_COUNT = 12;

const els = {
  topicInput: document.getElementById('topicInput'),
  styleSelect: document.getElementById('styleSelect'),
  emojiToggle: document.getElementById('emojiToggle'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  titlesOutput: document.getElementById('titlesOutput')
};

let lastTitles = [];

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

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function lowerFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/* Builds the flat pool of formulas to draw from for a given style key. */
function getPool(styleKey) {
  if (styleKey === 'any' || !TITLE_FORMULAS[styleKey]) {
    return Object.values(TITLE_FORMULAS).reduce((acc, list) => acc.concat(list), []);
  }
  return TITLE_FORMULAS[styleKey].slice();
}

/* Picks TITLE_COUNT formulas from the pool, using each unique formula
   once before any repeats, and avoiding immediate back-to-back repeats. */
function pickFormulas(pool, count) {
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
  const startsWithTopic = template.indexOf('{topic}') === 0;
  const filled = startsWithTopic ? capitalizeFirst(topic) : lowerFirst(topic);
  let title = template.replace(/\{topic\}/g, filled);
  title = capitalizeFirst(title);
  return title;
}

function applyEmoji(title, shouldAdd) {
  if (!shouldAdd) return title;
  const emoji = EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
  return Math.random() < 0.5 ? `${emoji} ${title}` : `${title} ${emoji}`;
}

/* Rough writing-quality heuristic, NOT a real CTR/view predictor.
   +1 for length ~40-60 chars, +1 for a digit, +1 for a power word. */
function computeStrength(title) {
  let score = 0;
  const len = title.length;
  if (len >= 40 && len <= 60) score++;
  if (/\d/.test(title)) score++;
  const lower = title.toLowerCase();
  if (POWER_WORDS.some((w) => lower.includes(w))) score++;

  if (score >= 3) return { label: 'Strong', cls: 'strength-strong' };
  if (score === 2) return { label: 'Good', cls: 'strength-good' };
  return { label: 'Fair', cls: 'strength-fair' };
}

function buildTitles(topic, styleKey, addEmoji) {
  const pool = getPool(styleKey);
  const formulas = pickFormulas(pool, TITLE_COUNT);
  return formulas.map((template) => {
    const base = fillTemplate(template, topic);
    const emojiOnThis = addEmoji && Math.random() < 0.5;
    return applyEmoji(base, emojiOnThis);
  });
}

function renderTitles(titles) {
  if (!titles.length) {
    els.titlesOutput.innerHTML = '<p class="titles-placeholder" id="titlesPlaceholder">Your generated titles will appear here.</p>';
    return;
  }

  els.titlesOutput.innerHTML = titles.map((title, i) => {
    const strength = computeStrength(title);
    return `
      <div class="title-card" data-index="${i}">
        <div class="title-card-main">
          <div class="title-card-text">${escapeHtml(title)}</div>
          <div class="title-card-meta">
            <span>${title.length} characters</span>
            <span class="strength-badge ${strength.cls}">${strength.label}</span>
          </div>
        </div>
        <button class="title-card-copy" data-copy-index="${i}" aria-label="Copy this title" title="Copy title">⧉</button>
      </div>
    `;
  }).join('');

  els.titlesOutput.querySelectorAll('[data-copy-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-copy-index'), 10);
      copyToClipboard(lastTitles[idx], 'Title copied');
    });
  });
}

function generate() {
  const topic = els.topicInput.value.trim();
  if (!topic) {
    showToast('Enter a topic or keyword first');
    els.topicInput.focus();
    return;
  }
  const styleKey = els.styleSelect.value;
  const addEmoji = els.emojiToggle.checked;

  lastTitles = buildTitles(topic, styleKey, addEmoji);
  renderTitles(lastTitles);
}

els.generateBtn.addEventListener('click', generate);
els.regenerateBtn.addEventListener('click', generate);

els.topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

els.copyAllBtn.addEventListener('click', () => {
  if (!lastTitles.length) {
    showToast('Generate some titles first');
    return;
  }
  copyToClipboard(lastTitles.join('\n'), 'All titles copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('youtube');
});
