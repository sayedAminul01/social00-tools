'use strict';

/* ── Formula banks ──────────────────────────────────────────────
   Each formula uses {topic} as a placeholder for the user's input.
   Templates are full flowing paragraphs (2-3 sentences), not fragments. */
const FORMULAS = {
  question: [
    "Have you ever wondered what it actually takes to get better at {topic}? You're not the only one — it's a question that trips up beginners and experienced people alike. In this guide, we'll walk through exactly what works, step by step, so you can stop guessing and start making real progress.",
    "What if everything you thought you knew about {topic} was only half the story? Most advice online skims the surface and leaves out the details that actually move the needle. This guide digs into the parts that matter, so you can finally see the full picture.",
    "Why do some people seem to master {topic} while everyone else struggles for years? The difference usually comes down to a handful of habits and decisions most people never hear about. That's exactly what we're going to unpack in this post.",
    "How much time have you already spent trying to figure out {topic} the hard way? If it feels like you're constantly starting over, you're not alone — and it's not because you're doing something wrong. It's because most guides skip the fundamentals that actually make it click.",
    "Ever wonder why some approaches to {topic} just work better than others? It's rarely about talent or luck — it's about following a process that's been tested and refined. Let's break down exactly what that process looks like.",
    "What separates people who succeed at {topic} from everyone else who gives up halfway through? Spoiler: it's not more effort, it's a better starting point. This post lays out that starting point so you don't have to guess your way there.",
    "Could a few small changes to how you approach {topic} completely change your results? It's more likely than you'd think, and the changes are simpler than most people assume. Here's exactly where to start.",
    "Is there really a right way to think about {topic}, or is it all just trial and error? There's actually a surprising amount of structure once you know where to look. This guide lays that structure out clearly, without the fluff."
  ],
  stat: [
    "Studies suggest that most people give up on {topic} within the first few weeks — not because it's impossible, but because they start without a clear plan. That's the gap this guide is built to close. By the end, you'll have a straightforward path forward instead of a pile of scattered tips.",
    "It's estimated that a huge share of the effort people put into {topic} never turns into real results, simply because it's aimed in the wrong direction. The good news is that fixing that doesn't require more work — just better direction. That's what this post is here to provide.",
    "Nearly everyone who tries {topic} makes the same handful of avoidable mistakes early on. Those mistakes compound over time, making everything feel harder than it needs to be. This guide walks through how to sidestep them from the start.",
    "The difference between people who get real results with {topic} and those who don't often comes down to a small number of decisions made early on. Get those decisions right, and everything downstream gets easier. Here's what those decisions actually look like.",
    "Most beginners underestimate how much {topic} depends on a few foundational habits rather than raw talent or luck. Once those habits are in place, progress tends to speed up dramatically. This guide breaks down exactly what those habits are.",
    "A surprising number of people quit {topic} right before things would have started clicking for them. Momentum in this area tends to build slowly, then all at once. This post is designed to help you push through that early stretch.",
    "Conventional wisdom about {topic} gets a lot of the basics wrong, which is part of why so many people feel stuck. Once you strip away the noise, the real fundamentals are much simpler than they seem. Let's get into what actually matters.",
    "It turns out that the biggest obstacle with {topic} usually isn't the skill itself — it's the lack of a clear starting point. This guide gives you that starting point, along with a straightforward plan to build from there."
  ],
  pas: [
    "If you've ever felt stuck with {topic}, you're not alone. It's one of the most common frustrations people run into — and most advice out there only makes it more confusing. In this guide, we'll break down exactly what actually works.",
    "Struggling to make progress with {topic} can feel discouraging, especially when it seems like everyone else has already figured it out. The truth is, most people are quietly stuck in the same place, just without saying so. This post walks through a clearer path forward.",
    "There's nothing more frustrating than putting real effort into {topic} and still not seeing results. Over time, that frustration can turn into doubt about whether it's even worth continuing. This guide is here to change that, with a plan that actually works.",
    "Trying to figure out {topic} on your own often means wading through conflicting advice, outdated tips, and information that doesn't apply to your situation. It's exhausting, and it's a big reason so many people give up too early. Here's a simpler way through it.",
    "So much of the advice around {topic} sounds good in theory but falls apart the moment you try to use it. That gap between theory and practice is where most people get stuck and stay stuck. This guide focuses on what actually holds up in practice.",
    "Feeling overwhelmed by {topic} usually isn't a sign that something's wrong with you — it's a sign the information you've been given wasn't organized clearly. That disorganization compounds fast, turning a manageable topic into something that feels impossible. Let's fix that, one clear step at a time.",
    "Nobody tells you how frustrating {topic} can be until you're already in the middle of it, second-guessing every decision. That uncertainty is exactly what keeps people from moving forward. This guide replaces the guesswork with a clear, tested approach.",
    "It's easy to feel like you're the only one who finds {topic} genuinely difficult, especially when everyone else makes it look effortless. In reality, almost everyone hits the same wall at some point. This post shows you exactly how to get past it."
  ],
  story: [
    "A few years ago, I sat down determined to finally make sense of {topic} — and got nowhere for weeks. It wasn't until I stopped following generic advice and started focusing on a few key fundamentals that things finally clicked. This guide shares exactly what changed.",
    "The first time I tried to tackle {topic}, I made almost every mistake in the book. It took a lot of trial and error to figure out what actually mattered versus what was just noise. This post is the guide I wish I'd had back then.",
    "I still remember how overwhelming {topic} felt the first time I seriously looked into it — too much conflicting information and not enough clarity. Eventually, a simpler approach emerged that actually worked. That's what this guide is built around.",
    "Someone once told me that {topic} was 'simple once you get it' — which, at the time, felt like the least helpful advice possible. It took real work to find the parts that actually mattered. This guide lays out those parts clearly, so you don't have to dig for them yourself.",
    "There was a point where {topic} felt like more trouble than it was worth, and I nearly gave up on it entirely. What turned things around wasn't more effort — it was a completely different approach. Here's what that approach looks like.",
    "Years of trial and error taught me more about {topic} than any single resource ever did — mostly by showing me what didn't work. This guide skips that trial and error and gets straight to what does. Consider it the shortcut I didn't have.",
    "I used to think {topic} was just naturally harder for some people than others, until I realized it was really about having the right framework. Once that framework was in place, everything else started to fall into line. This post walks through that framework step by step.",
    "The turning point with {topic} came from an unexpected place — not a course or a guide, but a small shift in how I approached the whole problem. That shift is the foundation of everything in this post. Let's get into it."
  ],
  promise: [
    "By the end of this guide, you'll have a clear, practical understanding of {topic} — no jargon, no fluff, just what actually works. We'll walk through the key ideas step by step, so you can put them into practice right away.",
    "This post breaks {topic} down into a simple, repeatable process you can start using today. You won't need any special background or prior experience — just a willingness to follow along and apply what you learn.",
    "In the next few minutes, you'll learn exactly how {topic} works and, more importantly, how to make it work for you. We're skipping the theory-heavy detours and going straight to what gets results.",
    "This guide is designed to give you a complete, no-nonsense roadmap for {topic} — the kind you can actually follow, not just read and forget. By the time you're done, you'll know exactly what to do next.",
    "Consider this your shortcut to understanding {topic}: the essential ideas, explained clearly, with nothing extra to wade through. You'll walk away with a plan you can put to use immediately.",
    "Here's what you'll get from this guide: a clear explanation of {topic}, the common pitfalls to avoid, and a straightforward path to real results. No filler, just what you need to know.",
    "We're going to cover everything you need to know about {topic} in plain, practical terms — the kind of explanation you can actually act on. By the end, the confusion will be gone and the next steps will be obvious.",
    "This is a straight-to-the-point guide to {topic}: what it is, why it matters, and exactly how to approach it well. Expect clear explanations and actionable steps, not vague generalities."
  ]
};

const els = {
  topic: document.getElementById('topicInput'),
  introStyle: document.getElementById('introStyle'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  resultsWrap: document.getElementById('resultsWrap'),
  resultsList: document.getElementById('resultsList'),
};

let lastIntros = [];

function shuffledIndices(len) {
  const idx = Array.from({ length: len }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildIntros(topic, style) {
  const bank = FORMULAS[style] || FORMULAS.question;
  const count = Math.min(4, bank.length);
  const order = shuffledIndices(bank.length).slice(0, count);
  return order.map(i => bank[i].replace(/\{topic\}/g, topic));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderResults(intros) {
  if (!intros.length) {
    els.resultsList.innerHTML = '<p class="results-empty">Enter a topic and click Generate to see intro paragraphs here.</p>';
    els.resultsWrap.hidden = false;
    return;
  }

  els.resultsList.innerHTML = intros.map((text, i) => {
    const words = wordCount(text);
    return `
      <div class="intro-card">
        <div class="intro-text">${escapeHtml(text)}</div>
        <div class="intro-meta">
          <span class="word-count">${words} words</span>
          <span class="intro-actions">
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
      copyToClipboard(intros[idx], 'Intro copied');
    });
  });
}

function generate() {
  const topic = els.topic.value.trim();
  if (!topic) {
    showToast('Enter a blog topic first');
    return;
  }
  const style = els.introStyle.value;
  lastIntros = buildIntros(topic, style);
  renderResults(lastIntros);
}

els.generateBtn.addEventListener('click', generate);
els.regenerateBtn.addEventListener('click', generate);

els.copyAllBtn.addEventListener('click', () => {
  if (!lastIntros.length) {
    showToast('Generate some intros first');
    return;
  }
  copyToClipboard(lastIntros.join('\n\n'), 'All intros copied');
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
