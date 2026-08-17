'use strict';

const CHAR_LIMIT = 500;
const MAX_TAGS = 32;

const STOPWORDS = new Set([
  'a','an','the','and','or','but','of','in','on','at','to','for','with','by',
  'is','are','was','were','be','been','being','it','its','this','that','these','those',
  'as','from','into','than','then','so','if','not','no','do','does','did'
]);

// Curated generic tags per niche — a small hand-written bank, not a live API.
const NICHE_TAGS = {
  general: [],
  gaming: ['gaming', 'gameplay', 'letsplay', 'gamer', 'videogames', 'twitch', 'esports', 'walkthrough', 'gaming channel', 'pc gaming'],
  tech: ['tech review', 'technology', 'gadgets', 'unboxing', 'tech tips', 'software', 'tech news', 'howtotech', 'innovation', 'computer'],
  beauty: ['beauty tutorial', 'makeup', 'skincare', 'beauty tips', 'cosmetics', 'grwm', 'beauty routine', 'haul', 'makeup tutorial', 'beauty hacks'],
  fitness: ['fitness', 'workout', 'home workout', 'gym', 'fitness motivation', 'weight loss', 'exercise', 'healthy lifestyle', 'fitness tips', 'cardio'],
  cooking: ['cooking', 'recipe', 'home cooking', 'easy recipes', 'foodie', 'cooking tutorial', 'kitchen', 'meal prep', 'how to cook', 'food vlog'],
  education: ['education', 'learning', 'tutorial', 'howto', 'study tips', 'online learning', 'explainer', 'educational video', 'lesson', 'knowledge'],
  vlog: ['vlog', 'daily vlog', 'lifestyle', 'vlogger', 'day in my life', 'personal vlog', 'life vlog', 'vlogging', 'storytime', 'behind the scenes'],
  music: ['music', 'music video', 'new music', 'musician', 'cover song', 'original song', 'music production', 'songwriting', 'live music', 'indie music'],
  business: ['business', 'entrepreneur', 'small business', 'startup', 'business tips', 'marketing', 'entrepreneurship', 'business owner', 'side hustle', 'business growth'],
};

const els = {
  topicInput: document.getElementById('topicInput'),
  nicheSelect: document.getElementById('nicheSelect'),
  generateBtn: document.getElementById('generateBtn'),
  tagsChips: document.getElementById('tagsChips'),
  tagsEmpty: document.getElementById('tagsEmpty'),
  tagCount: document.getElementById('tagCount'),
  charCount: document.getElementById('charCount'),
  charBarFill: document.getElementById('charBarFill'),
  clearBtn: document.getElementById('clearBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
};

// Current working list of tags (post-generation, user can remove chips from it).
let currentTags = [];

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .map(w => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

function significantWords(text) {
  const words = tokenize(text).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const seen = new Set();
  const out = [];
  for (const w of words) {
    if (!seen.has(w)) { seen.add(w); out.push(w); }
  }
  return out;
}

function generateTags(rawTopic, niche) {
  const topic = rawTopic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!topic) return [];

  const built = [];

  // 1. exact full topic phrase
  built.push(topic);

  // 2. each significant individual word
  for (const w of significantWords(topic)) built.push(w);

  // 3. topic combined with modifiers
  const suffixModifiers = ['tutorial', '2026', 'guide', 'tips', 'for beginners', 'explained', 'review', 'tips and tricks', 'ideas'];
  for (const mod of suffixModifiers) built.push(`${topic} ${mod}`);
  built.push(`how to ${topic}`);
  built.push(`best ${topic}`);

  // 4. curated niche bank
  const bank = NICHE_TAGS[niche] || [];
  for (const t of bank) built.push(t);

  // Deduplicate case-insensitively, preserving first occurrence.
  const seen = new Set();
  const deduped = [];
  for (const tag of built) {
    const clean = tag.trim().replace(/\s+/g, ' ');
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(clean);
  }

  // Order shorter/broader tags first.
  deduped.sort((a, b) => a.length - b.length);

  return deduped.slice(0, MAX_TAGS);
}

function combinedCharCount(tags) {
  // YouTube counts the tags field as one comma-separated string.
  return tags.join(',').length;
}

function renderTags() {
  els.tagsChips.innerHTML = '';

  if (!currentTags.length) {
    const empty = document.createElement('p');
    empty.className = 'tags-empty';
    empty.id = 'tagsEmpty';
    empty.textContent = 'Your tags will appear here after you generate.';
    els.tagsChips.appendChild(empty);
  } else {
    currentTags.forEach((tag, idx) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';

      const label = document.createElement('span');
      label.textContent = tag;
      chip.appendChild(label);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Remove tag ${tag}`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        currentTags.splice(idx, 1);
        renderTags();
      });
      chip.appendChild(removeBtn);

      els.tagsChips.appendChild(chip);
    });
  }

  const count = combinedCharCount(currentTags);
  els.tagCount.textContent = String(currentTags.length);
  els.charCount.textContent = `${count} / ${CHAR_LIMIT} characters`;

  let state = 'good';
  if (count > 480) state = 'over';
  else if (count >= 400) state = 'warn';

  els.charCount.classList.remove('state-good', 'state-warn', 'state-over');
  els.charCount.classList.add(`state-${state}`);

  els.charBarFill.classList.remove('state-warn', 'state-over');
  if (state === 'warn') els.charBarFill.classList.add('state-warn');
  if (state === 'over') els.charBarFill.classList.add('state-over');

  const pct = Math.min(100, (count / CHAR_LIMIT) * 100);
  els.charBarFill.style.width = `${pct}%`;
}

function handleGenerate() {
  const topic = els.topicInput.value;
  if (!topic.trim()) {
    window.showToast('Enter a video topic first');
    els.topicInput.focus();
    return;
  }
  currentTags = generateTags(topic, els.nicheSelect.value);
  renderTags();
}

els.generateBtn.addEventListener('click', handleGenerate);
els.topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleGenerate();
  }
});

els.clearBtn.addEventListener('click', () => {
  els.topicInput.value = '';
  els.nicheSelect.value = 'general';
  currentTags = [];
  renderTags();
  els.topicInput.focus();
});

els.copyAllBtn.addEventListener('click', () => {
  if (!currentTags.length) {
    window.showToast('Nothing to copy yet');
    return;
  }
  copyToClipboard(currentTags.join(', '), 'Tags copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('youtube');
  renderTags();
});
