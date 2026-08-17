'use strict';

/**
 * Hashtag Generator — script.js
 * ────────────────────────────────────────────────────────────────
 * Everything here runs locally in the browser. HASHTAG_BANK is a
 * curated list of commonly-used hashtags per niche. The "tier"
 * label on each tag (mega / large / medium / niche) is a rough,
 * hand-picked estimate of relative popularity based on typical
 * usage patterns — it is NOT pulled from any live API and does
 * NOT represent real-time post counts. Treat it as general
 * guidance, not a precise metric.
 * ──────────────────────────────────────────────────────────────── */

const HASHTAG_BANK = {
  fitness: [
    { tag: 'fitness', tier: 'mega' }, { tag: 'workout', tier: 'mega' },
    { tag: 'gym', tier: 'mega' }, { tag: 'fitnessmotivation', tier: 'mega' },
    { tag: 'fitfam', tier: 'large' }, { tag: 'gymlife', tier: 'large' },
    { tag: 'fitnessjourney', tier: 'large' }, { tag: 'healthylifestyle', tier: 'large' },
    { tag: 'exercise', tier: 'large' },
    { tag: 'personaltrainer', tier: 'medium' }, { tag: 'gymmotivation', tier: 'medium' },
    { tag: 'strengthtraining', tier: 'medium' }, { tag: 'homeworkout', tier: 'medium' },
    { tag: 'bodybuilding', tier: 'medium' }, { tag: 'cardio', tier: 'medium' },
    { tag: 'crossfit', tier: 'niche' }, { tag: 'fitnessaddict', tier: 'niche' },
    { tag: 'legday', tier: 'niche' }, { tag: 'calisthenics', tier: 'niche' },
    { tag: 'fitspo', tier: 'niche' }
  ],
  travel: [
    { tag: 'travel', tier: 'mega' }, { tag: 'wanderlust', tier: 'mega' },
    { tag: 'travelgram', tier: 'mega' }, { tag: 'instatravel', tier: 'mega' },
    { tag: 'traveltheworld', tier: 'large' }, { tag: 'travelphotography', tier: 'large' },
    { tag: 'adventure', tier: 'large' }, { tag: 'explore', tier: 'large' },
    { tag: 'travelblogger', tier: 'large' },
    { tag: 'backpacking', tier: 'medium' }, { tag: 'travelling', tier: 'medium' },
    { tag: 'traveler', tier: 'medium' }, { tag: 'vacationmode', tier: 'medium' },
    { tag: 'roadtrip', tier: 'medium' }, { tag: 'solotravel', tier: 'medium' },
    { tag: 'traveldiaries', tier: 'niche' }, { tag: 'offthebeatenpath', tier: 'niche' },
    { tag: 'digitalnomad', tier: 'niche' }, { tag: 'travelmore', tier: 'niche' },
    { tag: 'wanderer', tier: 'niche' }
  ],
  food: [
    { tag: 'food', tier: 'mega' }, { tag: 'foodie', tier: 'mega' },
    { tag: 'foodporn', tier: 'mega' }, { tag: 'instafood', tier: 'mega' },
    { tag: 'foodphotography', tier: 'large' }, { tag: 'foodblogger', tier: 'large' },
    { tag: 'yummy', tier: 'large' }, { tag: 'delicious', tier: 'large' },
    { tag: 'homemade', tier: 'large' },
    { tag: 'foodstagram', tier: 'medium' }, { tag: 'foodlover', tier: 'medium' },
    { tag: 'cooking', tier: 'medium' }, { tag: 'recipeoftheday', tier: 'medium' },
    { tag: 'tasty', tier: 'medium' }, { tag: 'foodgasm', tier: 'medium' },
    { tag: 'foodphotographer', tier: 'niche' }, { tag: 'plantbased', tier: 'niche' },
    { tag: 'homecooking', tier: 'niche' }, { tag: 'comfortfood', tier: 'niche' },
    { tag: 'foodculture', tier: 'niche' }
  ],
  fashion: [
    { tag: 'fashion', tier: 'mega' }, { tag: 'style', tier: 'mega' },
    { tag: 'ootd', tier: 'mega' }, { tag: 'fashionista', tier: 'mega' },
    { tag: 'streetstyle', tier: 'large' }, { tag: 'fashionblogger', tier: 'large' },
    { tag: 'outfitoftheday', tier: 'large' }, { tag: 'styleinspo', tier: 'large' },
    { tag: 'trendy', tier: 'large' },
    { tag: 'fashiongram', tier: 'medium' }, { tag: 'fashionstyle', tier: 'medium' },
    { tag: 'outfitinspo', tier: 'medium' }, { tag: 'whatiwore', tier: 'medium' },
    { tag: 'fashionaddict', tier: 'medium' }, { tag: 'minimalstyle', tier: 'medium' },
    { tag: 'sustainablefashion', tier: 'niche' }, { tag: 'capsulewardrobe', tier: 'niche' },
    { tag: 'fashiondesigner', tier: 'niche' }, { tag: 'thriftedfashion', tier: 'niche' },
    { tag: 'vintagestyle', tier: 'niche' }
  ],
  beauty: [
    { tag: 'beauty', tier: 'mega' }, { tag: 'makeup', tier: 'mega' },
    { tag: 'skincare', tier: 'mega' }, { tag: 'beautiful', tier: 'mega' },
    { tag: 'makeupartist', tier: 'large' }, { tag: 'glam', tier: 'large' },
    { tag: 'beautyblogger', tier: 'large' }, { tag: 'mua', tier: 'large' },
    { tag: 'glowingskin', tier: 'large' },
    { tag: 'makeuplover', tier: 'medium' }, { tag: 'skincareroutine', tier: 'medium' },
    { tag: 'beautytips', tier: 'medium' }, { tag: 'crueltyfree', tier: 'medium' },
    { tag: 'naturalbeauty', tier: 'medium' }, { tag: 'beautyaddict', tier: 'medium' },
    { tag: 'cleanbeauty', tier: 'niche' }, { tag: 'skincarejunkie', tier: 'niche' },
    { tag: 'makeuptutorial', tier: 'niche' }, { tag: 'beautycommunity', tier: 'niche' },
    { tag: 'skinbarrier', tier: 'niche' }
  ],
  business: [
    { tag: 'business', tier: 'mega' }, { tag: 'entrepreneur', tier: 'mega' },
    { tag: 'marketing', tier: 'mega' }, { tag: 'smallbusiness', tier: 'mega' },
    { tag: 'startup', tier: 'large' }, { tag: 'entrepreneurship', tier: 'large' },
    { tag: 'businessowner', tier: 'large' }, { tag: 'digitalmarketing', tier: 'large' },
    { tag: 'success', tier: 'large' },
    { tag: 'businesstips', tier: 'medium' }, { tag: 'entrepreneurlife', tier: 'medium' },
    { tag: 'branding', tier: 'medium' }, { tag: 'ecommerce', tier: 'medium' },
    { tag: 'businessgrowth', tier: 'medium' }, { tag: 'hustle', tier: 'medium' },
    { tag: 'startuplife', tier: 'niche' }, { tag: 'businessstrategy', tier: 'niche' },
    { tag: 'sidehustle', tier: 'niche' }, { tag: 'womaninbusiness', tier: 'niche' },
    { tag: 'businesscoach', tier: 'niche' }
  ],
  tech: [
    { tag: 'technology', tier: 'mega' }, { tag: 'tech', tier: 'mega' },
    { tag: 'coding', tier: 'mega' }, { tag: 'software', tier: 'mega' },
    { tag: 'programming', tier: 'large' }, { tag: 'developer', tier: 'large' },
    { tag: 'innovation', tier: 'large' }, { tag: 'ai', tier: 'large' },
    { tag: 'techie', tier: 'large' },
    { tag: 'webdevelopment', tier: 'medium' }, { tag: 'coder', tier: 'medium' },
    { tag: 'softwareengineer', tier: 'medium' }, { tag: 'machinelearning', tier: 'medium' },
    { tag: 'techlife', tier: 'medium' }, { tag: 'startuptech', tier: 'medium' },
    { tag: 'opensource', tier: 'niche' }, { tag: 'cleancode', tier: 'niche' },
    { tag: 'technews', tier: 'niche' }, { tag: 'devcommunity', tier: 'niche' },
    { tag: 'artificialintelligence', tier: 'niche' }
  ],
  art: [
    { tag: 'art', tier: 'mega' }, { tag: 'artist', tier: 'mega' },
    { tag: 'artwork', tier: 'mega' }, { tag: 'drawing', tier: 'mega' },
    { tag: 'illustration', tier: 'large' }, { tag: 'painting', tier: 'large' },
    { tag: 'digitalart', tier: 'large' }, { tag: 'sketch', tier: 'large' },
    { tag: 'artistsoninstagram', tier: 'large' },
    { tag: 'creativeart', tier: 'medium' }, { tag: 'artoftheday', tier: 'medium' },
    { tag: 'contemporaryart', tier: 'medium' }, { tag: 'watercolor', tier: 'medium' },
    { tag: 'artgallery', tier: 'medium' }, { tag: 'fineart', tier: 'medium' },
    { tag: 'conceptart', tier: 'niche' }, { tag: 'artprocess', tier: 'niche' },
    { tag: 'dailyart', tier: 'niche' }, { tag: 'artcommunity', tier: 'niche' },
    { tag: 'sketchbook', tier: 'niche' }
  ],
  photography: [
    { tag: 'photography', tier: 'mega' }, { tag: 'photo', tier: 'mega' },
    { tag: 'photooftheday', tier: 'mega' }, { tag: 'picoftheday', tier: 'mega' },
    { tag: 'photographer', tier: 'large' }, { tag: 'photoshoot', tier: 'large' },
    { tag: 'portraitphotography', tier: 'large' }, { tag: 'naturephotography', tier: 'large' },
    { tag: 'camera', tier: 'large' },
    { tag: 'instaphoto', tier: 'medium' }, { tag: 'photographylovers', tier: 'medium' },
    { tag: 'streetphotography', tier: 'medium' }, { tag: 'landscapephotography', tier: 'medium' },
    { tag: 'shotoniphone', tier: 'medium' }, { tag: 'cameraphotography', tier: 'medium' },
    { tag: 'photographyislife', tier: 'niche' }, { tag: 'photographyeveryday', tier: 'niche' },
    { tag: 'filmphotography', tier: 'niche' }, { tag: 'longexposure', tier: 'niche' },
    { tag: 'goldenhour', tier: 'niche' }
  ],
  music: [
    { tag: 'music', tier: 'mega' }, { tag: 'musician', tier: 'mega' },
    { tag: 'song', tier: 'mega' }, { tag: 'singer', tier: 'mega' },
    { tag: 'newmusic', tier: 'large' }, { tag: 'livemusic', tier: 'large' },
    { tag: 'musicproducer', tier: 'large' }, { tag: 'hiphop', tier: 'large' },
    { tag: 'songwriter', tier: 'large' },
    { tag: 'musiclife', tier: 'medium' }, { tag: 'indiemusic', tier: 'medium' },
    { tag: 'musicvideo', tier: 'medium' }, { tag: 'musicislife', tier: 'medium' },
    { tag: 'bandlife', tier: 'medium' }, { tag: 'musiclover', tier: 'medium' },
    { tag: 'undergroundmusic', tier: 'niche' }, { tag: 'musicproduction', tier: 'niche' },
    { tag: 'unsignedartist', tier: 'niche' }, { tag: 'musiccommunity', tier: 'niche' },
    { tag: 'homestudio', tier: 'niche' }
  ],
  motivation: [
    { tag: 'motivation', tier: 'mega' }, { tag: 'inspiration', tier: 'mega' },
    { tag: 'mindset', tier: 'mega' }, { tag: 'motivational', tier: 'mega' },
    { tag: 'selfimprovement', tier: 'large' }, { tag: 'positivevibes', tier: 'large' },
    { tag: 'successmindset', tier: 'large' }, { tag: 'hustle', tier: 'large' },
    { tag: 'growthmindset', tier: 'large' },
    { tag: 'dailymotivation', tier: 'medium' }, { tag: 'inspirationalquotes', tier: 'medium' },
    { tag: 'motivationalquotes', tier: 'medium' }, { tag: 'goalsetting', tier: 'medium' },
    { tag: 'personaldevelopment', tier: 'medium' }, { tag: 'mindsetiseverything', tier: 'medium' },
    { tag: 'motivationdaily', tier: 'niche' }, { tag: 'riseandgrind', tier: 'niche' },
    { tag: 'selfmastery', tier: 'niche' }, { tag: 'positivemindset', tier: 'niche' },
    { tag: 'believeinyourself', tier: 'niche' }
  ],
  gaming: [
    { tag: 'gaming', tier: 'mega' }, { tag: 'gamer', tier: 'mega' },
    { tag: 'videogames', tier: 'mega' }, { tag: 'twitch', tier: 'mega' },
    { tag: 'gamerlife', tier: 'large' }, { tag: 'esports', tier: 'large' },
    { tag: 'streamer', tier: 'large' }, { tag: 'pcgaming', tier: 'large' },
    { tag: 'gamingcommunity', tier: 'large' },
    { tag: 'gamersofinstagram', tier: 'medium' }, { tag: 'gamenight', tier: 'medium' },
    { tag: 'playstation', tier: 'medium' }, { tag: 'xbox', tier: 'medium' },
    { tag: 'consolegaming', tier: 'medium' }, { tag: 'retrogaming', tier: 'medium' },
    { tag: 'indiegame', tier: 'niche' }, { tag: 'speedrun', tier: 'niche' },
    { tag: 'gamingclips', tier: 'niche' }, { tag: 'esportslife', tier: 'niche' },
    { tag: 'gamedev', tier: 'niche' }
  ],
  pets: [
    { tag: 'pets', tier: 'mega' }, { tag: 'dog', tier: 'mega' },
    { tag: 'cat', tier: 'mega' }, { tag: 'dogsofinstagram', tier: 'mega' },
    { tag: 'catsofinstagram', tier: 'large' }, { tag: 'puppy', tier: 'large' },
    { tag: 'kitten', tier: 'large' }, { tag: 'petstagram', tier: 'large' },
    { tag: 'doglover', tier: 'large' },
    { tag: 'catlover', tier: 'medium' }, { tag: 'rescuedog', tier: 'medium' },
    { tag: 'dogmom', tier: 'medium' }, { tag: 'catmom', tier: 'medium' },
    { tag: 'animallovers', tier: 'medium' }, { tag: 'petlife', tier: 'medium' },
    { tag: 'dogtraining', tier: 'niche' }, { tag: 'catcafe', tier: 'niche' },
    { tag: 'adoptdontshop', tier: 'niche' }, { tag: 'dogphotography', tier: 'niche' },
    { tag: 'rescuepets', tier: 'niche' }
  ],
  general: [
    { tag: 'instagood', tier: 'mega' }, { tag: 'photooftheday', tier: 'mega' },
    { tag: 'love', tier: 'mega' }, { tag: 'follow', tier: 'mega' },
    { tag: 'instadaily', tier: 'large' }, { tag: 'picoftheday', tier: 'large' },
    { tag: 'contentcreator', tier: 'large' }, { tag: 'dailyinspiration', tier: 'large' },
    { tag: 'trending', tier: 'large' },
    { tag: 'instagram', tier: 'medium' }, { tag: 'explorepage', tier: 'medium' },
    { tag: 'likeforlike', tier: 'medium' }, { tag: 'followforfollow', tier: 'medium' },
    { tag: 'lifestyle', tier: 'medium' }, { tag: 'creator', tier: 'medium' },
    { tag: 'smallbusiness', tier: 'niche' }, { tag: 'communityfirst', tier: 'niche' },
    { tag: 'contentcreation', tier: 'niche' }, { tag: 'socialmedia', tier: 'niche' },
    { tag: 'viral', tier: 'niche' }
  ]
};

/* Obvious synonym / keyword mapping onto the niche keys above. */
const NICHE_SYNONYMS = {
  fitness: ['workout', 'gym', 'exercise', 'training', 'muscle', 'cardio'],
  travel: ['vacation', 'trip', 'wanderlust', 'explore', 'traveling', 'traveller'],
  food: ['recipe', 'cooking', 'foodie', 'restaurant', 'cuisine', 'cook', 'baking', 'chef'],
  fashion: ['style', 'outfit', 'clothing', 'ootd', 'clothes', 'wardrobe'],
  beauty: ['makeup', 'skincare', 'cosmetics', 'glam', 'skin'],
  business: ['startup', 'marketing', 'entrepreneur', 'ecommerce', 'sidehustle', 'sales'],
  tech: ['coding', 'software', 'programming', 'technology', 'developer', 'app', 'saas'],
  art: ['drawing', 'painting', 'illustration', 'artist', 'sketch', 'design'],
  photography: ['photo', 'camera', 'photoshoot', 'photographer', 'portrait'],
  music: ['song', 'singer', 'musician', 'band', 'rap', 'producer'],
  motivation: ['inspire', 'mindset', 'motivational', 'selfimprovement', 'inspiration', 'success'],
  gaming: ['gamer', 'videogames', 'esports', 'streaming', 'streamer', 'console'],
  pets: ['dog', 'cat', 'puppy', 'kitten', 'animal', 'pet']
};

const INSTAGRAM_CAP = 30;
const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'a', 'an', 'of', 'in', 'on', 'to', 'my', 'your', 'is', 'are']);

const els = {
  input: document.getElementById('nicheInput'),
  generateBtn: document.getElementById('generateBtn'),
  counter: document.getElementById('hashtagCounter'),
  tierMega: document.getElementById('tierMega'),
  tierMedium: document.getElementById('tierMedium'),
  tierNiche: document.getElementById('tierNiche'),
  tierMegaSection: document.getElementById('tierMegaSection'),
  tierMediumSection: document.getElementById('tierMediumSection'),
  tierNicheSection: document.getElementById('tierNicheSection'),
  emptyState: document.getElementById('emptyState'),
  copySpaceBtn: document.getElementById('copySpaceBtn'),
  copyLinesBtn: document.getElementById('copyLinesBtn'),
  clearBtn: document.getElementById('clearBtn'),
};

/** Active hashtag set the user is currently working with. */
let currentTags = [];

function matchNiche(lowerInput) {
  // Tokenize into whole words so short keys like "art", "tech" or "pets"
  // never false-match inside an unrelated word (e.g. "smart", "carpets").
  const words = lowerInput.split(/[^a-z0-9]+/).filter(Boolean);
  const nicheKeys = Object.keys(HASHTAG_BANK).filter(k => k !== 'general');

  // 1) Exact whole-word match against a niche key itself.
  for (const word of words) {
    if (nicheKeys.includes(word)) return word;
  }
  // 2) Prefix match for longer keys only, so "travelling"/"fashionista"
  //    still resolve to "travel"/"fashion" without risking short-key noise.
  for (const word of words) {
    for (const key of nicheKeys) {
      if (key.length >= 5 && word.startsWith(key)) return key;
    }
  }
  // 3) Whole-word synonym match.
  for (const word of words) {
    for (const [key, synonyms] of Object.entries(NICHE_SYNONYMS)) {
      if (synonyms.includes(word)) return key;
    }
  }
  return 'general';
}

function deriveFromInput(rawInput) {
  const cleaned = rawInput.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  if (!cleaned) return [];
  const words = cleaned.split(/\s+/).filter(Boolean);
  const derived = [];

  if (words.length > 1) {
    const concat = words.join('');
    if (concat.length >= 3) derived.push({ tag: concat, tier: 'niche' });
  }

  const seenWords = new Set();
  for (const w of words) {
    if (derived.length >= 5) break;
    if (w.length <= 2 || STOPWORDS.has(w) || seenWords.has(w)) continue;
    seenWords.add(w);
    derived.push({ tag: w, tier: 'medium' });
  }

  return derived;
}

function generateHashtags(rawInput) {
  const input = rawInput.trim();
  if (!input) return [];

  const lower = input.toLowerCase();
  const nicheKey = matchNiche(lower);
  const bankTags = HASHTAG_BANK[nicheKey] || HASHTAG_BANK.general;
  const derivedTags = deriveFromInput(input);

  const combined = [...bankTags, ...derivedTags];
  const seen = new Set();
  const result = [];

  for (const item of combined) {
    const key = item.tag.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= 30) break;
  }

  return result;
}

function tierGroup(tier) {
  if (tier === 'mega' || tier === 'large') return 'mega';
  if (tier === 'medium') return 'medium';
  return 'niche';
}

function buildChip(item) {
  const li = document.createElement('li');
  li.className = 'chip';
  li.dataset.tag = item.tag;

  const tagBtn = document.createElement('button');
  tagBtn.type = 'button';
  tagBtn.className = 'chip-tag';
  tagBtn.textContent = '#' + item.tag;
  tagBtn.title = 'Click to copy #' + item.tag;
  tagBtn.addEventListener('click', () => {
    copyToClipboard('#' + item.tag, '#' + item.tag + ' copied');
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'chip-remove';
  removeBtn.setAttribute('aria-label', 'Remove #' + item.tag);
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    currentTags = currentTags.filter(t => t.tag !== item.tag);
    render();
  });

  li.appendChild(tagBtn);
  li.appendChild(removeBtn);
  return li;
}

function render() {
  els.tierMega.innerHTML = '';
  els.tierMedium.innerHTML = '';
  els.tierNiche.innerHTML = '';

  const groups = { mega: [], medium: [], niche: [] };
  currentTags.forEach(item => groups[tierGroup(item.tier)].push(item));

  groups.mega.forEach(item => els.tierMega.appendChild(buildChip(item)));
  groups.medium.forEach(item => els.tierMedium.appendChild(buildChip(item)));
  groups.niche.forEach(item => els.tierNiche.appendChild(buildChip(item)));

  els.tierMegaSection.style.display = groups.mega.length ? '' : 'none';
  els.tierMediumSection.style.display = groups.medium.length ? '' : 'none';
  els.tierNicheSection.style.display = groups.niche.length ? '' : 'none';

  const count = currentTags.length;
  els.counter.textContent = count + ' / ' + INSTAGRAM_CAP + ' hashtags';
  els.counter.classList.toggle('is-warn', count > INSTAGRAM_CAP);

  els.emptyState.style.display = count ? 'none' : '';
}

function handleGenerate() {
  const value = els.input.value;
  if (!value.trim()) {
    els.input.focus();
    showToast('Type a niche or topic first');
    return;
  }
  currentTags = generateHashtags(value);
  render();
}

els.generateBtn.addEventListener('click', handleGenerate);
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleGenerate();
  }
});

els.copySpaceBtn.addEventListener('click', () => {
  if (!currentTags.length) { showToast('Generate hashtags first'); return; }
  const text = currentTags.map(t => '#' + t.tag).join(' ');
  copyToClipboard(text, 'Hashtags copied (space separated)');
});

els.copyLinesBtn.addEventListener('click', () => {
  if (!currentTags.length) { showToast('Generate hashtags first'); return; }
  const text = currentTags.map(t => '#' + t.tag).join('\n');
  copyToClipboard(text, 'Hashtags copied (line by line)');
});

els.clearBtn.addEventListener('click', () => {
  currentTags = [];
  els.input.value = '';
  render();
  els.input.focus();
});

document.addEventListener('DOMContentLoaded', () => {
  render();
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('instagram');
});
