'use strict';

/* ------------------------------------------------------------------
   Template bank. Every tweet is assembled from hand-written templates
   for the chosen tone, with {topic} and {n} substituted in. This is a
   100% client-side template generator — it is NOT a live connection
   to any AI language model and has no awareness of current trends.
   ------------------------------------------------------------------ */

// Two phrasing sets per tone so "Regenerate" produces genuinely
// different wording in Single Tweet mode, not just reordered text.
const SINGLES = {
  informative: {
    a: [
      'PSA: {topic} is simpler than it looks. Here\'s the short version: focus on the fundamentals first, refine later.',
      'A clear way to think about {topic}: start small, measure often, adjust fast.',
      'Most guides overcomplicate {topic}. The real skill is doing the basics consistently.',
      'If you\'re new to {topic}, don\'t skip the fundamentals — they\'re the part that actually compounds.',
      'Quick tip on {topic}: progress beats perfection every time.',
      'The best explanation of {topic} I can give in one tweet: understand it, apply it, repeat it.'
    ],
    b: [
      'Think {topic} is complicated? It\'s not — nail the fundamentals first, everything else follows.',
      'One way to approach {topic}: start small, measure results, tweak as you go.',
      'Most people overthink {topic}. The real edge is consistent basics, done well.',
      'New to {topic}? Don\'t skip the fundamentals — that\'s where the real compounding happens.',
      'Reminder on {topic}: progress beats perfection, every single time.',
      '{topic}, summed up: understand it, apply it, repeat it until it\'s automatic.'
    ]
  },
  bold: {
    a: [
      'Unpopular opinion: {topic} is way more important than most people give it credit for.',
      'Hot take: if you\'re not taking {topic} seriously yet, you\'re already behind.',
      'Stop overthinking {topic}. Start. That\'s the whole strategy.',
      'Nobody wants to hear this about {topic}, but comfort and growth don\'t coexist.',
      'The people winning at {topic} aren\'t smarter — they just showed up more.',
      '{topic} rewards consistency, not talent. Full stop.'
    ],
    b: [
      'Controversial take: {topic} deserves way more respect than most people give it.',
      'If you\'re still sleeping on {topic}, you\'re already falling behind.',
      'Overthinking {topic} is the strategy killer. Just start.',
      'Hard truth about {topic}: comfort and growth rarely show up together.',
      'Winners in {topic} aren\'t the smartest ones — they\'re the ones who kept showing up.',
      '{topic} rewards consistency over talent. Every time.'
    ]
  },
  storytelling: {
    a: [
      'I used to think {topic} was impossible for me. Turns out I just hadn\'t started yet.',
      'The best lesson {topic} ever taught me: done is better than perfect.',
      'A year ago I knew nothing about {topic}. Today it\'s second nature. Funny how that works.',
      'My biggest mistake with {topic}? Waiting for the "right time" that never came.',
      'Someone once told me {topic} would change how I see everything. They were right.',
      'Every expert in {topic} was once a beginner who refused to quit.'
    ],
    b: [
      'I once believed {topic} just wasn\'t for me. Turns out I\'d simply never started.',
      'The biggest thing {topic} taught me: done beats perfect, always.',
      'Twelve months ago {topic} felt foreign. Now it\'s just how I operate. Wild how that happens.',
      'My real mistake with {topic}? Waiting on a "perfect moment" that was never coming.',
      'Someone warned me {topic} would change my perspective completely. They weren\'t wrong.',
      'Every person great at {topic} today started as a beginner who didn\'t quit.'
    ]
  },
  listicle: {
    a: [
      '3 things nobody tells you about {topic}: it\'s slower than you think, simpler than you fear, and worth it either way.',
      '{topic} in one sentence: show up daily, track what works, drop what doesn\'t.',
      'The 80/20 of {topic}: 20% of the effort gets you 80% of the results — find that 20%.',
      'Quick list for {topic}: start, stumble, adjust, repeat. That\'s the whole loop.',
      'Two rules for {topic}: consistency over intensity, progress over perfection.',
      'One thread\'s worth of advice on {topic}, compressed into one tweet: just begin.'
    ],
    b: [
      '3 truths about {topic} people rarely say out loud: it\'s slower, simpler, and worth it anyway.',
      '{topic}, in a sentence: show up daily, keep what works, cut what doesn\'t.',
      'The 80/20 rule applied to {topic}: find the 20% of effort driving 80% of the results.',
      'Simple loop for {topic}: start, stumble, adjust, repeat.',
      'Two rules that matter for {topic}: consistency over intensity, progress over perfect.',
      'A full thread on {topic}, compressed into one line: just begin.'
    ]
  }
};

const HOOKS = {
  informative: [
    'Everything you need to know about {topic} — a quick thread: 🧵',
    'Here\'s a clear breakdown of {topic}, in {n} tweets: 🧵',
    '{topic}, explained simply. A thread: (1/{n})'
  ],
  bold: [
    'Unpopular opinion: most advice about {topic} is wrong. Thread: 🧵',
    'Hot take: {topic} is more important than people think. 🧵',
    'Everyone\'s overthinking {topic}. Here\'s the real story: (1/{n})'
  ],
  storytelling: [
    'A few years ago I knew nothing about {topic}. Here\'s what changed everything: 🧵',
    'Let me tell you a story about {topic} that changed how I think: 🧵',
    'This is the story of how {topic} taught me a lesson I won\'t forget: (1/{n})'
  ],
  listicle: [
    '{n} things I wish I knew about {topic} before I started: 🧵',
    '{n} lessons about {topic}, in one thread: 🧵',
    'A no-fluff list: {n} things about {topic} that actually matter. (1/{n})'
  ]
};

// Up to 8 usable beats per tone (max thread length 10 needs 10 - 2 = 8).
const BEATS = {
  informative: [
    'First, understand the basics of {topic} — most people skip this step and pay for it later.',
    'A common misconception about {topic} is that it\'s complicated. It isn\'t, once you break it down.',
    'Here\'s a practical tip for {topic} you can apply today.',
    'One thing that trips people up with {topic} is timing — get this right and everything else gets easier.',
    'The data on {topic} tells a clearer story than most opinions do.',
    'If you only remember one thing about {topic}, make it this.',
    'Tools and resources make {topic} easier — don\'t try to do it all manually.',
    'Beginners often overestimate how hard {topic} really is on day one.'
  ],
  bold: [
    'Most people get {topic} wrong because they copy what worked for someone else.',
    'Stop waiting for the "perfect" approach to {topic}. Done beats perfect.',
    'The biggest myth about {topic}? That you need permission to start.',
    'Nobody talks about the real cost of ignoring {topic} — until it\'s too late.',
    'If your approach to {topic} feels comfortable, you\'re probably not pushing hard enough.',
    'The people winning at {topic} aren\'t smarter. They just started earlier.',
    'Confidence in {topic} comes from reps, not theory.',
    'Everyone wants results with {topic}. Few want the process.'
  ],
  storytelling: [
    'At first, {topic} felt overwhelming — I didn\'t know where to start.',
    'Then I made a mistake with {topic} that taught me more than any guide could.',
    'The turning point came when I stopped guessing and actually paid attention to {topic}.',
    'I remember thinking {topic} would never click for me. It did, eventually.',
    'Every setback with {topic} was actually setting up the next breakthrough.',
    'Looking back, the hardest part of {topic} wasn\'t the skill — it was the mindset.',
    'A mentor once told me something about {topic} I still think about.',
    'The version of me who started {topic} wouldn\'t recognize where I ended up.'
  ],
  listicle: [
    'Start small with {topic} — momentum matters more than scale at first.',
    'Track your progress with {topic}. What gets measured gets improved.',
    'Don\'t skip the fundamentals of {topic}, even when they feel boring.',
    'Find one person who\'s ahead of you in {topic} and study what they do.',
    'Consistency beats intensity when it comes to {topic}.',
    'Expect setbacks with {topic} — they\'re part of the process, not a sign to quit.',
    'Simplify your approach to {topic} before you try to optimize it.',
    'Celebrate small wins with {topic}. They compound.'
  ]
};

const CLOSERS = {
  informative: [
    'That\'s the full breakdown on {topic}. If this helped, a repost helps others find it too. What would you add?',
    'That covers the essentials of {topic}. Bookmark this for later, and let me know what I missed.',
    'That\'s {topic}, broken down into the parts that actually matter. Questions? Drop them below.'
  ],
  bold: [
    'That\'s my hot take on {topic}. Agree or disagree? Reply and tell me why.',
    'That\'s the real story on {topic}, whether people want to hear it or not. Thoughts?',
    'Strong opinions, loosely held — that\'s where I stand on {topic}. Change my mind.'
  ],
  storytelling: [
    'That\'s the story of {topic}, at least my version of it. Been through something similar? I\'d love to hear it — reply below.',
    'That\'s how {topic} played out for me. If any of this resonated, a repost might help someone who needs it today.',
    'That\'s where the story of {topic} leaves off — for now. Follow along for the next chapter.'
  ],
  listicle: [
    'That\'s {n} things about {topic} that actually move the needle. Save this thread, and follow for more like it.',
    'That wraps up {n} lessons on {topic}. Which one hit hardest? Reply and let me know.',
    '{n} points, zero fluff — that\'s {topic} in a nutshell. Repost if it was useful.'
  ]
};

const els = {
  topic: document.getElementById('topicInput'),
  mode: document.getElementById('modeSelect'),
  threadLengthField: document.getElementById('threadLengthField'),
  threadLength: document.getElementById('threadLengthSelect'),
  tone: document.getElementById('toneSelect'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyThreadBtn: document.getElementById('copyThreadBtn'),
  results: document.getElementById('tweetResults'),
  empty: document.getElementById('tweetEmpty'),
};

let generationSeed = 0;
let lastThreadTweets = []; // [{ pos: '1/7', text: '...' }, ...] for "Copy Full Thread"

function fillTemplate(tpl, topic, n) {
  return tpl.replace(/\{topic\}/g, topic).replace(/\{n\}/g, n);
}

function charTier(length) {
  if (length > 280) return 'over';
  if (length >= 260) return 'warn';
  return 'ok';
}

function buildCharRing(length) {
  const tier = charTier(length);
  const pct = Math.min(100, Math.round((length / 280) * 100));
  const wrap = document.createElement('div');
  wrap.className = 'char-ring tier-' + tier;
  wrap.style.setProperty('--pct', String(pct));
  wrap.title = length + ' / 280 characters';
  const span = document.createElement('span');
  span.textContent = String(length);
  wrap.appendChild(span);
  return wrap;
}

function buildTweetCard({ headLabel, roleLabel, text, copyLabel }) {
  const card = document.createElement('div');
  card.className = 'tweet-card';

  const head = document.createElement('div');
  head.className = 'tweet-card-head';
  if (headLabel) {
    const pos = document.createElement('span');
    pos.className = 'tweet-pos';
    pos.textContent = headLabel;
    head.appendChild(pos);
  }
  if (roleLabel) {
    const role = document.createElement('span');
    role.className = 'tweet-role';
    role.textContent = roleLabel;
    head.appendChild(role);
  }
  card.appendChild(head);

  const textEl = document.createElement('p');
  textEl.className = 'tweet-text';
  textEl.textContent = text;
  card.appendChild(textEl);

  const foot = document.createElement('div');
  foot.className = 'tweet-card-foot';
  foot.appendChild(buildCharRing(text.length));

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-copy-tweet';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    copyToClipboard(text, copyLabel || 'Tweet copied');
  });
  foot.appendChild(copyBtn);

  card.appendChild(foot);
  return card;
}

function renderSingles(topic, tone) {
  const bank = SINGLES[tone] || SINGLES.informative;
  const setKey = generationSeed % 2 === 0 ? 'a' : 'b';
  const templates = bank[setKey];

  els.results.className = 'tweet-results';
  els.results.innerHTML = '';
  lastThreadTweets = [];
  els.copyThreadBtn.hidden = true;

  templates.forEach((tpl, i) => {
    const text = fillTemplate(tpl, topic, templates.length);
    const card = buildTweetCard({
      headLabel: null,
      roleLabel: 'Option ' + (i + 1),
      text,
      copyLabel: 'Tweet ' + (i + 1) + ' copied'
    });
    els.results.appendChild(card);
  });

  els.empty.hidden = true;
}

function renderThread(topic, tone, length) {
  const hookBank = HOOKS[tone] || HOOKS.informative;
  const beatBank = BEATS[tone] || BEATS.informative;
  const closerBank = CLOSERS[tone] || CLOSERS.informative;

  const n = length;
  const beatsNeeded = Math.max(0, n - 2);

  const hookTpl = hookBank[generationSeed % hookBank.length];
  const closerTpl = closerBank[(generationSeed + 1) % closerBank.length];
  const beatOffset = generationSeed % beatBank.length;

  const tweets = [];
  tweets.push({
    role: 'Hook',
    text: fillTemplate(hookTpl, topic, n)
  });
  for (let i = 0; i < beatsNeeded; i++) {
    const beatTpl = beatBank[(beatOffset + i) % beatBank.length];
    tweets.push({
      role: 'Point ' + (i + 1),
      text: fillTemplate(beatTpl, topic, n)
    });
  }
  tweets.push({
    role: 'Wrap-up',
    text: fillTemplate(closerTpl, topic, n)
  });

  els.results.className = 'tweet-results is-thread';
  els.results.innerHTML = '';
  lastThreadTweets = [];

  tweets.forEach((tweet, i) => {
    const pos = (i + 1) + '/' + n;
    lastThreadTweets.push({ pos, text: tweet.text });
    const card = buildTweetCard({
      headLabel: pos,
      roleLabel: tweet.role,
      text: tweet.text,
      copyLabel: 'Tweet ' + pos + ' copied'
    });
    els.results.appendChild(card);
  });

  els.copyThreadBtn.hidden = false;
  els.empty.hidden = true;
}

function updateThreadLengthVisibility() {
  const isThread = els.mode.value === 'thread';
  els.threadLengthField.hidden = !isThread;
}

function generate() {
  const topic = els.topic.value.trim();
  if (!topic) {
    showToast('Please enter a topic first');
    return;
  }

  const tone = els.tone.value;
  const mode = els.mode.value;

  if (mode === 'thread') {
    const length = parseInt(els.threadLength.value, 10) || 7;
    renderThread(topic, tone, length);
  } else {
    renderSingles(topic, tone);
  }

  els.regenerateBtn.hidden = false;
}

els.mode.addEventListener('change', updateThreadLengthVisibility);

els.generateBtn.addEventListener('click', () => {
  generationSeed = 0;
  generate();
});

els.regenerateBtn.addEventListener('click', () => {
  generationSeed++;
  generate();
});

els.copyThreadBtn.addEventListener('click', () => {
  if (!lastThreadTweets.length) {
    showToast('Nothing to copy yet');
    return;
  }
  const full = lastThreadTweets
    .map(t => t.pos + '\n' + t.text)
    .join('\n\n');
  copyToClipboard(full, 'Full thread copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('writing');
  updateThreadLengthVisibility();
});
