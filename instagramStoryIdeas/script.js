'use strict';

/* ============================================================
   Instagram Story Ideas
   100% client-side template engine — no external API calls and
   no live trend data. Each idea is tagged with the real Instagram
   Story sticker type it's built around (poll, quiz, question box,
   slider, countdown, link, plain photo/video, repost/UGC) and a
   {niche} placeholder is substituted with the user's input.
   ============================================================ */

const STICKER_META = {
  poll:      { icon: '🗳️', label: 'Poll' },
  quiz:      { icon: '🧠', label: 'Quiz' },
  question:  { icon: '💬', label: 'Question Box' },
  slider:    { icon: '🎚️', label: 'Slider' },
  countdown: { icon: '⏳', label: 'Countdown' },
  link:      { icon: '🔗', label: 'Link' },
  photo:     { icon: '📷', label: 'Photo/Video' },
  repost:    { icon: '🔁', label: 'Repost/UGC' }
};

const TEMPLATES = {
  engagement: [
    { sticker: 'poll', text: 'This or That: {niche} edition — post two options and let followers vote' },
    { sticker: 'question', text: "Ask 'What's your biggest struggle with {niche}?' and turn 3 answers into future content" },
    { sticker: 'slider', text: "Slider sticker: rate today's {niche} tip from 0-100" },
    { sticker: 'quiz', text: 'Quick True or False quiz about {niche} — test what your followers actually know' },
    { sticker: 'poll', text: 'Yes/No poll: "Have you ever tried this {niche} hack before?"' },
    { sticker: 'question', text: "Open a question box: 'Ask me anything about {niche}' and answer the best 5 in a follow-up Story" },
    { sticker: 'slider', text: "Slider sticker: 'How excited are you for what's next in {niche}?' 😍 to 😴" },
    { sticker: 'quiz', text: 'Multiple-choice quiz: guess which {niche} myth is actually true' },
    { sticker: 'poll', text: "Poll: 'Which {niche} topic should I cover next?' with two options" },
    { sticker: 'question', text: 'Ask followers to send their #1 question about {niche} — batch-answer in Stories tomorrow' },
    { sticker: 'repost', text: "Repost a follower's {niche} post or tag and add your own reaction" },
    { sticker: 'photo', text: 'Quick selfie video: a 3-second hook about today\'s {niche} focus, no editing needed' }
  ],
  sales: [
    { sticker: 'countdown', text: 'Countdown to your next {niche} launch, event or sale' },
    { sticker: 'link', text: 'Link sticker: "Shop the {niche} deal — link below" with a bold discount graphic' },
    { sticker: 'poll', text: "Poll: 'Which {niche} product should get 20% off this week?'" },
    { sticker: 'question', text: "Ask 'What's stopping you from trying {niche}?' and use the replies to handle objections in your next post" },
    { sticker: 'countdown', text: 'Countdown: "48 hours left" on your current {niche} promo, set to notify followers' },
    { sticker: 'slider', text: "Slider: 'How likely are you to try this {niche} offer today?' — gauge interest live" },
    { sticker: 'link', text: 'Link sticker pointed straight at your best-selling {niche} product page' },
    { sticker: 'quiz', text: "Quiz: 'Which {niche} package is right for you?' with 3 answer options" },
    { sticker: 'repost', text: 'Repost a customer testimonial about your {niche} product with a link sticker attached' },
    { sticker: 'photo', text: "Behind-the-price video: show exactly what's included in your {niche} offer" },
    { sticker: 'poll', text: 'Poll: two {niche} products head-to-head, "Team A or Team B" style' },
    { sticker: 'countdown', text: 'Countdown to a cart-closing deadline for your {niche} offer' }
  ],
  behind: [
    { sticker: 'photo', text: 'Raw 30-second clip of your actual {niche} workspace or process, no script' },
    { sticker: 'question', text: "Ask 'What do you want to see behind the scenes of {niche}?' and film the top request" },
    { sticker: 'poll', text: "Poll: 'Messy desk or clean desk?' — show your real {niche} workspace either way" },
    { sticker: 'slider', text: "Slider: 'How stressful was today's {niche} session?' 😌 to 😅" },
    { sticker: 'quiz', text: 'Quiz: "Guess how long this {niche} task actually took me"' },
    { sticker: 'photo', text: 'Time-lapse of a {niche} project from start to finish' },
    { sticker: 'question', text: "Open a Q&A box: 'Ask me anything about a day in my {niche} life'" },
    { sticker: 'repost', text: "Repost a teammate's or collaborator's take on today's {niche} work" },
    { sticker: 'poll', text: "Poll: 'Which version do you like better?' — show two drafts of a {niche} piece" },
    { sticker: 'photo', text: 'Bloopers and outtakes reel from your latest {niche} content shoot' },
    { sticker: 'countdown', text: 'Countdown to when a behind-the-scenes {niche} project goes live' },
    { sticker: 'slider', text: "Slider: 'How much effort do you think goes into {niche} content?' — reveal the real number after" }
  ],
  education: [
    { sticker: 'quiz', text: 'True or False quiz that busts a common {niche} myth' },
    { sticker: 'question', text: "Ask 'What's confusing you most about {niche} right now?' and answer with a mini tutorial" },
    { sticker: 'poll', text: "Poll: 'Have you heard of this {niche} technique before?'" },
    { sticker: 'slider', text: "Slider: 'How confident do you feel about {niche} basics?' 0-100" },
    { sticker: 'photo', text: 'A quick 3-step Story walkthrough of a core {niche} concept' },
    { sticker: 'quiz', text: "Quiz: 'Which of these is NOT true about {niche}?' multiple choice" },
    { sticker: 'question', text: "Open a box for {niche} questions, then film a 'Top 3 answered' Story series" },
    { sticker: 'poll', text: "Poll: 'Beginner or advanced?' — segment your audience's {niche} level" },
    { sticker: 'link', text: 'Link sticker to a deeper blog post or guide about {niche}' },
    { sticker: 'photo', text: 'Quick tip video: one actionable {niche} tip in under 15 seconds' },
    { sticker: 'repost', text: "Repost a follower's question about {niche} and answer it on camera" },
    { sticker: 'countdown', text: 'Countdown to a live {niche} Q&A or workshop' }
  ]
};

const IDEA_COUNT = 10;

/* ── Helpers ────────────────────────────────────────────────── */

// Fisher-Yates shuffle, returns a new array (does not mutate input).
function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildPool(goal) {
  if (goal === 'mixed') {
    return [].concat(TEMPLATES.engagement, TEMPLATES.sales, TEMPLATES.behind, TEMPLATES.education);
  }
  return TEMPLATES[goal] || TEMPLATES.engagement;
}

function generateIdeas(niche, goal) {
  const pool = buildPool(goal);

  // Shuffle the pool so results vary between generations; if the pool
  // is smaller than needed, cycle through re-shuffled copies so we
  // still avoid running out before reaching IDEA_COUNT.
  let order = shuffle(pool);
  while (order.length < IDEA_COUNT) {
    order = order.concat(shuffle(pool));
  }
  order = order.slice(0, IDEA_COUNT);

  return order.map(item => ({
    sticker: item.sticker,
    text: item.text.split('{niche}').join(niche)
  }));
}

/* ── DOM wiring ─────────────────────────────────────────────── */

const els = {
  nicheInput: document.getElementById('nicheInput'),
  goalSelect: document.getElementById('goalSelect'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  resultsWrap: document.getElementById('resultsWrap'),
  ideasGrid: document.getElementById('ideasGrid'),
};

let currentIdeas = [];

function renderIdeas(ideas) {
  els.ideasGrid.innerHTML = '';

  ideas.forEach((idea, idx) => {
    const meta = STICKER_META[idea.sticker] || { icon: '✨', label: 'Idea' };

    const card = document.createElement('div');
    card.className = 'idea-card';

    const badge = document.createElement('span');
    badge.className = 'idea-badge';
    badge.innerHTML = `<span class="badge-icon">${meta.icon}</span><span>${meta.label}</span>`;

    const textEl = document.createElement('p');
    textEl.className = 'idea-text';
    textEl.textContent = idea.text;

    const footer = document.createElement('div');
    footer.className = 'idea-footer';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-sm';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      copyToClipboard(idea.text, `Idea ${idx + 1} copied`);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1400);
    });

    footer.appendChild(copyBtn);
    card.appendChild(badge);
    card.appendChild(textEl);
    card.appendChild(footer);
    els.ideasGrid.appendChild(card);
  });

  els.resultsWrap.hidden = false;
}

function runGenerate() {
  const niche = els.nicheInput.value.trim();
  if (!niche) {
    if (typeof showToast === 'function') showToast('Enter a niche or topic first');
    els.nicheInput.focus();
    return;
  }

  const goal = els.goalSelect.value;
  currentIdeas = generateIdeas(niche, goal);
  renderIdeas(currentIdeas);
  els.resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

els.generateBtn.addEventListener('click', runGenerate);
els.regenerateBtn.addEventListener('click', runGenerate);

els.nicheInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    runGenerate();
  }
});

els.copyAllBtn.addEventListener('click', () => {
  if (!currentIdeas.length) {
    if (typeof showToast === 'function') showToast('Nothing to copy yet');
    return;
  }
  const all = currentIdeas
    .map((idea, i) => `${i + 1}. ${idea.text}`)
    .join('\n');
  copyToClipboard(all, 'All ideas copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('instagram');
});
