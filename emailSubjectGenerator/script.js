'use strict';

/* ── Formula banks ──────────────────────────────────────────────
   Each formula uses {topic} as a placeholder for the user's input. */
const FORMULAS = {
  newsletter: [
    'This Week: {topic}',
    '{topic} — Your Weekly Roundup',
    "What's New: {topic}",
    'Your Update on {topic}',
    "This Week's Must-Read: {topic}",
    '{topic}: The Highlights',
    'Catch Up On {topic}',
    "Here's What You Missed: {topic}",
    'Fresh This Week: {topic}',
    'Your {topic} Digest'
  ],
  promo: [
    '{topic} — Ends Soon',
    "Don't Miss: {topic}",
    'Your {topic} Is Waiting',
    'Save Big: {topic}',
    '{topic} Starts Now',
    'Just For You: {topic}',
    'Unlock {topic}',
    'Sale Alert: {topic}',
    "Here's Your {topic}",
    "You'll Love This: {topic}"
  ],
  announcement: [
    'Big News: {topic}',
    'Introducing {topic}',
    "It's Here: {topic}",
    'Say Hello To {topic}',
    'Now Available: {topic}',
    'We Have News: {topic}',
    '{topic} Has Arrived',
    'A New Way To {topic}',
    "You Asked, We Built: {topic}",
    'Meet {topic}'
  ],
  welcome: [
    "Welcome! Here's What's Next",
    "You're In — Let's Get Started with {topic}",
    'Welcome Aboard',
    "Here's Your First Step with {topic}",
    'Glad You Joined — About {topic}',
    "Let's Get You Set Up with {topic}",
    'Your Journey with {topic} Starts Now',
    "Welcome — Here's How {topic} Works",
    "You're Officially In",
    'A Warm Welcome + {topic}'
  ],
  cart: [
    'You Left Something Behind',
    'Still Thinking About {topic}?',
    'Your Cart Is Waiting',
    "Don't Forget {topic}",
    'Complete Your Order: {topic}',
    "It's Still There: {topic}",
    'Forgot Something?',
    '{topic} Is Still Available',
    'Your Cart Misses You',
    'Come Back For {topic}'
  ],
  event: [
    "You're Invited: {topic}",
    'Save Your Spot for {topic}',
    'Join Us: {topic}',
    'Reserve Your Seat: {topic}',
    '{topic} — Save the Date',
    "Don't Miss {topic}",
    'Register Now: {topic}',
    "See You There? {topic}",
    'Your Invite: {topic}',
    'One Spot Left for {topic}'
  ]
};

const URGENCY_PHRASES = ['Ends tonight', 'Last chance', '24 hours only', 'Today only'];
const EMOJI_SET = ['🎉', '🔥', '⏰', '✨', '🛍️', '📩'];

/* ~12 common spam-trigger terms, matched case-insensitively as substrings. */
const SPAM_WORDS = [
  'free', 'guarantee', 'act now', 'click here', 'buy now', '$$$',
  '100%', 'risk-free', 'winner', 'congratulations', 'urgent', 'limited time'
];

const els = {
  topic: document.getElementById('topicInput'),
  emailType: document.getElementById('emailType'),
  addUrgency: document.getElementById('addUrgency'),
  addEmoji: document.getElementById('addEmoji'),
  addPersonalize: document.getElementById('addPersonalize'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  resultsWrap: document.getElementById('resultsWrap'),
  resultsList: document.getElementById('resultsList'),
};

let lastLines = [];

function pick(arr, i) {
  return arr[i % arr.length];
}

function shuffledIndices(len) {
  const idx = Array.from({ length: len }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function containsSpamWord(text) {
  const lower = text.toLowerCase();
  return SPAM_WORDS.some(word => lower.includes(word));
}

function buildSubjectLines(topic, type, opts) {
  const bank = FORMULAS[type] || FORMULAS.newsletter;
  const count = 12;
  const order = shuffledIndices(bank.length);

  const lines = [];
  for (let n = 0; n < count; n++) {
    const formula = pick(bank, pick(order, n));
    let line = formula.replace(/\{topic\}/g, topic);

    // Apply urgency to roughly a third of lines (mod 3, independent of the
    // bit pattern below so it freely overlaps with emoji/personalization).
    if (opts.urgency && n % 3 === 0) {
      const phrase = pick(URGENCY_PHRASES, n);
      line = n % 2 === 0 ? `${phrase}: ${line}` : `${line} — ${phrase}`;
    }

    // Emoji and personalization each toggle on ~half the lines, keyed off
    // independent bits of n so the two combine on some lines, appear alone
    // on others, and are absent elsewhere — never identical treatment.
    const wantsEmoji = opts.emoji && (n & 1) === 0;
    const wantsPersonalize = opts.personalize && (n & 2) === 0;

    if (wantsEmoji) {
      const emoji = pick(EMOJI_SET, n);
      line = n % 4 === 0 ? `${emoji} ${line}` : `${line} ${emoji}`;
    }

    if (wantsPersonalize) {
      line = `{FirstName}, ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
    }

    lines.push(line);
  }
  return lines;
}

function charCountClass(len) {
  if (len < 50) return 'good';
  if (len <= 60) return 'warn';
  return 'bad';
}

function renderResults(lines) {
  if (!lines.length) {
    els.resultsList.innerHTML = '<p class="results-empty">Enter a topic and click Generate to see subject lines here.</p>';
    els.resultsWrap.hidden = false;
    return;
  }

  els.resultsList.innerHTML = lines.map((line, i) => {
    const len = line.length;
    const cls = charCountClass(len);
    const flagged = containsSpamWord(line);
    return `
      <div class="result-card">
        <div class="result-text">${escapeHtml(line)}</div>
        <div class="result-meta">
          <span class="char-count ${cls}">${len} chars</span>
          ${flagged ? '<span class="spam-badge" title="Contains a common spam-trigger word">⚠ Spam word</span>' : ''}
          <span class="result-actions">
            <button class="btn-copy-line" data-idx="${i}">Copy</button>
          </span>
        </div>
      </div>
    `;
  }).join('');

  els.resultsWrap.hidden = false;

  els.resultsList.querySelectorAll('.btn-copy-line').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      copyToClipboard(lines[idx], 'Subject line copied');
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generate() {
  const topic = els.topic.value.trim() || 'Your Update';
  const type = els.emailType.value;
  const opts = {
    urgency: els.addUrgency.checked,
    emoji: els.addEmoji.checked,
    personalize: els.addPersonalize.checked,
  };
  lastLines = buildSubjectLines(topic, type, opts);
  renderResults(lastLines);
}

els.generateBtn.addEventListener('click', generate);
els.regenerateBtn.addEventListener('click', generate);

els.copyAllBtn.addEventListener('click', () => {
  if (!lastLines.length) {
    showToast('Generate some subject lines first');
    return;
  }
  copyToClipboard(lastLines.join('\n'), 'All subject lines copied');
});

els.topic.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('writing');
});
