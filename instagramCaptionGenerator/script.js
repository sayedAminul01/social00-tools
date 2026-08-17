'use strict';

/* ============================================================
   Instagram Caption Generator
   100% client-side template engine — no external API calls.
   Templates use a {topic} placeholder substituted with the
   user's input, optionally sprinkled with tone emoji and
   closed with a call-to-action line.
   ============================================================ */

const TEMPLATES = {
  funny: [
    "Me pretending {topic} isn't the best part of my day 😅",
    "Warning: this post about {topic} may cause excessive scrolling 🙃",
    "{topic} really said 'let me ruin your productivity' 😂",
    "POV: you clicked on this post about {topic} and now we're friends 🤝",
    "Plot twist: {topic} is actually my love language 💀",
    "I don't always post about {topic}, but when I do, it's chaos 🎉",
    "Not me still thinking about {topic} at 2am 😭",
    "{topic}: 10/10, would recommend, no notes 😆",
    "Trying to act normal about {topic} but failing spectacularly 🤪",
    "This is your sign to stop scrolling and enjoy {topic} 👀"
  ],
  inspirational: [
    "Some days {topic} reminds you why you started. Keep going. ✨",
    "Growth isn't loud — it's showing up for {topic} even when it's hard. 🌱",
    "Every step toward {topic} is a step toward the life you're building. 💫",
    "{topic} taught me that consistency beats perfection every time. 🙌",
    "Small progress on {topic} today is still progress. Don't stop. 🔥",
    "You weren't made to play small. Chase {topic} boldly. ⭐",
    "The best time to start {topic} was yesterday. The next best time is now. 🌅",
    "Trust the process — {topic} is shaping you into who you're meant to be. 💛",
    "One year from now, you'll be glad you stuck with {topic}. 🚀",
    "Believe in the magic of {topic}, and watch what unfolds. ✨"
  ],
  casual: [
    "Just here vibing with {topic} today 🌤️",
    "A little {topic}, a little chaos, a lot of fun.",
    "Currently obsessed with {topic}, no explanation needed.",
    "Not much happening, just {topic} and good vibes.",
    "Living my best life, one {topic} at a time.",
    "This is basically my whole personality right now: {topic}.",
    "Snapshot of the day: {topic} and coffee ☕",
    "Keeping it simple — {topic} and good company.",
    "Just a regular day featuring {topic}.",
    "Here for the {topic}, staying for the memories."
  ],
  business: [
    "Here's how {topic} is helping us grow — and how it can help you too.",
    "We built {topic} to solve a problem we kept running into ourselves.",
    "Behind every {topic} update is a team obsessed with getting it right.",
    "{topic} isn't just a feature — it's a promise to our customers.",
    "Big things are coming to {topic}. Stay tuned.",
    "Our customers asked for {topic}, so we delivered.",
    "Proud to share the latest on {topic} — built with you in mind.",
    "{topic} is live. Here's what it means for your business.",
    "We're doubling down on {topic} because you told us it matters.",
    "Results don't lie — here's what {topic} did for our clients this quarter."
  ],
  travel: [
    "Chasing {topic} one trip at a time. 🌍",
    "Passport stamped, memories made — all thanks to {topic}. ✈️",
    "{topic} hits different when the view is this good. 🏝️",
    "Some places you visit. {topic} is a place you feel. 🌅",
    "Wanderlust status: fully committed to {topic}. 🧳",
    "Getting delightfully lost in {topic} today. 🗺️",
    "Collecting moments, not things — starting with {topic}. 📸",
    "This is your sign to book the trip and go see {topic}. ✈️",
    "Home is wherever {topic} takes me next. 🌎",
    "Sunsets and {topic} — does it get better than this? 🌇"
  ],
  food: [
    "{topic} just made my whole day better 🍽️",
    "Recipe for happiness: good friends and {topic}. 🍴",
    "Warning: {topic} may cause instant cravings. 😋",
    "This {topic} is proof that simple can still be spectacular.",
    "Comfort food, comfort mood — thank you {topic}. 🥘",
    "Life's too short to skip {topic}. 🍕",
    "Homemade, heartfelt, and honestly delicious — that's {topic}. 👩‍🍳",
    "Currently in a committed relationship with {topic}. 😍",
    "Good {topic}, good company, good day. 🍷",
    "Taste-tested and approved: {topic} for the win. ✅"
  ],
  fitness: [
    "Showed up for {topic} today, even when I didn't want to. 💪",
    "{topic} isn't easy, but neither is regret. Keep pushing.",
    "Sweat now, shine later — today's focus: {topic}. 🔥",
    "Progress on {topic} looks different every day, and that's okay.",
    "Your only competition is who you were yesterday. Today: {topic}. 🏋️",
    "Small wins with {topic} add up to big change.",
    "No excuses today — just {topic} and effort. 💥",
    "Strong body, stronger mind. Today's session: {topic}. 🙌",
    "Consistency over perfection — that's how {topic} gets done.",
    "Another day, another rep. {topic} isn't going to do itself. 🚀"
  ],
  romantic: [
    "Every {topic} feels a little more magical with you. 💕",
    "You + {topic} = my favorite kind of day. ❤️",
    "Some moments are just meant to be shared — like {topic}. 💞",
    "Falling for you a little more with every {topic}. 🌹",
    "Home isn't a place, it's {topic} with you. 💛",
    "You make even {topic} feel like a love story. 💌",
    "Here's to {topic} and many more memories with you. 🥂",
    "Grateful for you, for {topic}, and for us. 💗",
    "Life is sweeter when {topic} includes you. 🍯",
    "You're my favorite part of {topic}, always. ✨"
  ]
};

const EMOJI_SETS = {
  funny: ['😂', '😅', '🤪', '😆', '💀'],
  inspirational: ['✨', '🔥', '🌱', '💫', '🙌'],
  casual: ['🌤️', '☕', '😎', '👍'],
  business: ['📈', '💼', '🚀', '✅'],
  travel: ['🌍', '✈️', '🏝️', '🗺️'],
  food: ['🍕', '😋', '🍴', '🥘'],
  fitness: ['💪', '🔥', '🏋️', '🚀'],
  romantic: ['❤️', '💕', '🌹', '💌']
};

const CTA_BANK = [
  "Double tap if you agree 👇",
  "Tag someone who needs to see this",
  "Save this for later ✨",
  "Drop a 🔥 in the comments",
  "Which one is you? Let me know below",
  "Follow for more like this",
  "Share this with a friend who gets it",
  "Let me know your thoughts in the comments 👇"
];

const CHAR_LIMIT = 2200;

/* ── Helpers ────────────────────────────────────────────────── */

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fisher-Yates shuffle, returns a new array (does not mutate input).
function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Strips emoji-range glyphs using codePointAt-based filtering (no raw
// emoji regex literals). Covers the main pictograph block
// (U+1F300–U+1FAFF), the misc symbols/dingbats block (U+2600–U+27BF)
// commonly used for emoji, plus the variation-selector and
// zero-width-joiner characters that often ride along with them so
// stripping never leaves an orphaned invisible mark behind.
function stripEmoji(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isEmojiPictograph = code >= 0x1F300 && code <= 0x1FAFF;
    const isEmojiSymbol = code >= 0x2600 && code <= 0x27BF;
    const isVariationSelector = code === 0xFE0F || code === 0xFE0E;
    const isZeroWidthJoiner = code === 0x200D;
    if (isEmojiPictograph || isEmojiSymbol || isVariationSelector || isZeroWidthJoiner) continue;
    out += ch;
  }
  // Collapse the extra whitespace/blank lines left behind by removed emoji.
  return out
    .split('\n')
    .map(line => line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, ''))
    .join('\n')
    .trim();
}

function buildCaption(template, topic, tone, emojiOn, ctaOn) {
  let caption = template.split('{topic}').join(topic);

  if (emojiOn) {
    const emojiSet = EMOJI_SETS[tone] || [];
    if (emojiSet.length && Math.random() < 0.35) {
      caption += ' ' + pickRandom(emojiSet);
    }
  }

  if (ctaOn) {
    caption += '\n\n' + pickRandom(CTA_BANK);
  }

  if (!emojiOn) {
    caption = stripEmoji(caption);
  }

  return caption;
}

function generateCaptions(topic, tone, emojiOn, ctaOn) {
  const pool = TEMPLATES[tone] || TEMPLATES.casual;
  const count = 8;

  // Shuffle the pool so results vary between generations; if the pool
  // is smaller than needed, cycle through a re-shuffled copy so we
  // still avoid back-to-back repeats.
  let order = shuffle(pool);
  while (order.length < count) {
    order = order.concat(shuffle(pool));
  }
  order = order.slice(0, count);

  return order.map(template => buildCaption(template, topic, tone, emojiOn, ctaOn));
}

/* ── DOM wiring ─────────────────────────────────────────────── */

const els = {
  topicInput: document.getElementById('topicInput'),
  toneSelect: document.getElementById('toneSelect'),
  includeEmoji: document.getElementById('includeEmoji'),
  includeCta: document.getElementById('includeCta'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  resultsWrap: document.getElementById('resultsWrap'),
  captionsGrid: document.getElementById('captionsGrid'),
};

let currentCaptions = [];

function renderCaptions(captions) {
  els.captionsGrid.innerHTML = '';

  captions.forEach((caption, idx) => {
    const card = document.createElement('div');
    card.className = 'caption-card';

    const textEl = document.createElement('p');
    textEl.className = 'caption-text';
    textEl.textContent = caption;

    const footer = document.createElement('div');
    footer.className = 'caption-footer';

    const countEl = document.createElement('span');
    countEl.className = 'caption-count';
    const over = caption.length > CHAR_LIMIT;
    countEl.classList.toggle('over-limit', over);
    countEl.textContent = `${caption.length} / ${CHAR_LIMIT} characters`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-sm';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      copyToClipboard(caption, `Caption ${idx + 1} copied`);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1400);
    });

    footer.appendChild(countEl);
    footer.appendChild(copyBtn);
    card.appendChild(textEl);
    card.appendChild(footer);
    els.captionsGrid.appendChild(card);
  });

  els.resultsWrap.hidden = false;
}

function runGenerate() {
  const topic = els.topicInput.value.trim();
  if (!topic) {
    if (typeof showToast === 'function') showToast('Enter a topic first');
    els.topicInput.focus();
    return;
  }

  const tone = els.toneSelect.value;
  const emojiOn = els.includeEmoji.checked;
  const ctaOn = els.includeCta.checked;

  currentCaptions = generateCaptions(topic, tone, emojiOn, ctaOn);
  renderCaptions(currentCaptions);
  els.resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

els.generateBtn.addEventListener('click', runGenerate);
els.regenerateBtn.addEventListener('click', runGenerate);

els.topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    runGenerate();
  }
});

els.copyAllBtn.addEventListener('click', () => {
  if (!currentCaptions.length) {
    if (typeof showToast === 'function') showToast('Nothing to copy yet');
    return;
  }
  const all = currentCaptions
    .map((c, i) => `Caption ${i + 1}:\n${c}`)
    .join('\n\n----------\n\n');
  copyToClipboard(all, 'All captions copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('instagram');
});
