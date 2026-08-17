'use strict';

/* ── Hook line bank ──────────────────────────────────────────────
   Each line uses a {topic} placeholder and is written as a natural,
   first-person spoken sentence — what a creator would actually say
   on camera in the opening seconds, not a headline fragment.
   Grouped by technique so the style <select> can filter the pool
   before picking 6. */
const HOOK_LINES = {
  pattern: [
    "Everything you've heard about {topic} is wrong — and I can prove it in the next few minutes.",
    'Stop what you\'re doing, because {topic} is not what you think it is.',
    "I'm about to break every rule you've ever heard about {topic}.",
    'This video gets {topic} completely wrong on purpose, so I can show you what actually works.',
    "If you think you understand {topic}, you're about to be proven wrong.",
    'Nobody talks about this, but {topic} has a massive problem hiding in plain sight.',
    'Forget everything you know about {topic} — we\'re starting from zero.',
    'I used to be terrible at {topic}. Then I found the one thing that changed everything.',
    'This one mistake with {topic} is costing you more than you realize.',
    "What if I told you {topic} is easier than everyone makes it look?"
  ],
  question: [
    'Have you ever wondered why {topic} feels so much harder than it should?',
    'What if you could master {topic} in a fraction of the time it usually takes?',
    'Why does nobody explain {topic} the right way?',
    'Are you making this one mistake with {topic} without even knowing it?',
    'What would happen if you actually committed to {topic} for the next 30 days?',
    "Do you know the real reason {topic} isn't working for you yet?",
    'How much time have you wasted trying to figure out {topic} on your own?',
    "What's actually stopping you from getting good at {topic}?",
    'Ever wonder what the pros do differently when it comes to {topic}?',
    'Why do most people quit {topic} right before it starts working?'
  ],
  story: [
    'Three months ago, I knew nothing about {topic} — and what happened next surprised even me.',
    'It was 2am, I was staring at my screen, and {topic} had just completely fallen apart.',
    'I still remember the exact moment {topic} finally clicked for me.',
    'Last year I made a huge mistake with {topic}, and it changed how I do everything now.',
    'I almost gave up on {topic} completely — until this happened.',
    'So there I was, halfway through {topic}, when everything went wrong.',
    'A friend challenged me to try {topic} for one week. I had no idea what I was getting into.',
    'The first time I tried {topic}, I failed so badly I almost quit filming this channel.',
    'I never planned to talk about {topic} — until it accidentally saved me hours of work.',
    "This story about {topic} still doesn't make sense to me, and I filmed the whole thing."
  ],
  promise: [
    "If you've ever struggled with {topic}, this video is going to fix that in the next ten minutes.",
    'By the end of this video, {topic} is never going to feel confusing again.',
    "If {topic} has been frustrating you, I'm about to show you exactly why — and how to fix it.",
    "You're going to walk away from this video knowing exactly how to handle {topic}.",
    "I'm going to solve the biggest problem people have with {topic}, right now.",
    "If you're stuck on {topic}, stick around — this is going to save you a ton of time.",
    "This video fixes the number one reason {topic} isn't working for most people.",
    "Struggling with {topic}? By the end of this, you won't be.",
    "I'm going to show you the exact fix for {topic} that nobody else is talking about.",
    "Whatever's been going wrong with {topic}, this video probably has your answer."
  ],
  curiosity: [
    'I tried {topic} for 30 days, and what happened on day 12 changed everything.',
    "There's one detail about {topic} that changes everything — and I'm saving it for the end.",
    'I found something about {topic} that most people never discover.',
    "By the end of this video, you'll know the one thing about {topic} that nobody tells you.",
    "Something happened when I tested {topic} that I still can't fully explain.",
    "There's a reason {topic} works for some people and not others — and it's not what you'd guess.",
    "I'm going to show you the result of {topic} first, and explain how in a second.",
    'What I discovered about {topic} completely changed my approach, and I\'ll show you why.',
    'Keep watching, because the twist with {topic} happens right at the end.',
    "I didn't believe this about {topic} until I saw it myself."
  ]
};

const HOOK_COUNT = 6;
const WORDS_PER_SECOND = 2.5;

const els = {
  topicInput: document.getElementById('topicInput'),
  styleSelect: document.getElementById('styleSelect'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  hooksOutput: document.getElementById('hooksOutput')
};

let lastHooks = [];

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

/* Builds the flat pool of hook lines to draw from for a given style key. */
function getPool(styleKey) {
  if (styleKey === 'any' || !HOOK_LINES[styleKey]) {
    return Object.values(HOOK_LINES).reduce((acc, list) => acc.concat(list), []);
  }
  return HOOK_LINES[styleKey].slice();
}

/* Picks `count` lines from the pool, using each unique line once before
   any repeats, and avoiding immediate back-to-back repeats. */
function pickLines(pool, count) {
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
  return template.replace(/\{topic\}/g, topic);
}

function countWords(str) {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function estimateSeconds(wordCount) {
  return Math.max(1, Math.round(wordCount / WORDS_PER_SECOND));
}

function buildHooks(topic, styleKey) {
  const pool = getPool(styleKey);
  const lines = pickLines(pool, HOOK_COUNT);
  return lines.map((template) => fillTemplate(template, topic));
}

function renderHooks(hooks) {
  if (!hooks.length) {
    els.hooksOutput.innerHTML = '<p class="hooks-placeholder" id="hooksPlaceholder">Your generated hooks will appear here.</p>';
    return;
  }

  els.hooksOutput.innerHTML = hooks.map((hook, i) => {
    const words = countWords(hook);
    const seconds = estimateSeconds(words);
    return `
      <div class="hook-card" data-index="${i}">
        <div class="hook-card-main">
          <div class="hook-card-text">${escapeHtml(hook)}</div>
          <div class="hook-card-meta">
            <span>${words} words</span>
            <span class="hook-badge">~${seconds} sec</span>
          </div>
        </div>
        <button class="hook-card-copy" data-copy-index="${i}" aria-label="Copy this hook" title="Copy hook">⧉</button>
      </div>
    `;
  }).join('');

  els.hooksOutput.querySelectorAll('[data-copy-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-copy-index'), 10);
      copyToClipboard(lastHooks[idx], 'Hook copied');
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
  const styleKey = els.styleSelect.value;

  lastHooks = buildHooks(topic, styleKey);
  renderHooks(lastHooks);
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
  if (!lastHooks.length) {
    showToast('Generate some hooks first');
    return;
  }
  copyToClipboard(lastHooks.join('\n\n'), 'All hooks copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('youtube');
});
