'use strict';

/* ── Length presets: representative total seconds + derived item counts ── */
const LENGTHS = {
  '3-5':   { label: '3–5 min',   seconds: 240,  itemCount: 3, subCount: 2 },
  '8-10':  { label: '8–10 min',  seconds: 540,  itemCount: 5, subCount: 3 },
  '15-20': { label: '15–20 min', seconds: 1050, itemCount: 7, subCount: 4 },
  '30+':   { label: '30+ min',   seconds: 1800, itemCount: 8, subCount: 4 },
};

/* ── Rotating placeholder phrasing (used by Regenerate) ── */
const HOOK_PHRASINGS = [
  t => `Open with a bold 5–8 second hook about ${t} — tease the payoff before your intro.`,
  t => `Start mid-action or with a surprising claim about ${t} to stop the scroll immediately.`,
  t => `Lead with the single most compelling fact or result about ${t} to earn the first 10 seconds.`,
];

const CTA_PHRASINGS = [
  t => `Ask for a like and subscribe, then point viewers to your next video related to ${t}.`,
  t => `Invite viewers to drop their take on ${t} in the comments, then tease what's coming next.`,
  t => `Close with one clear call-to-action tied to ${t} — don't stack more than a single ask.`,
];

const ITEM_PHRASINGS = {
  Step: [
    (t, i) => `Step ${i}: [walk through this part of ${t} on screen, one action at a time]`,
    (t, i) => `Step ${i}: [demonstrate this stage of ${t} and show the result]`,
    (t, i) => `Step ${i}: [cover a key point about ${t} here — explain the why, not just the how]`,
  ],
  Item: [
    (t, i) => `Item ${i}: [reveal item ${i} for ${t} and explain why it made the list]`,
    (t, i) => `Item ${i}: [introduce item ${i} related to ${t} with a quick example]`,
    (t, i) => `Item ${i}: [rank and justify item ${i} in your ${t} list]`,
  ],
  'Sub-point': [
    (t, i) => `Sub-point ${i}: [explain one facet of ${t} in plain, concrete terms]`,
    (t, i) => `Sub-point ${i}: [break down this part of ${t} with a quick example]`,
    (t, i) => `Sub-point ${i}: [answer one question a beginner would ask about ${t}]`,
  ],
};

/* ── Format definitions: each beat has a weight (% of total runtime) ── */
const FORMATS = {
  tutorial: {
    label: 'Tutorial / How-To',
    beats: [
      { name: 'Hook', w: 6, kind: 'hook' },
      { name: 'Problem Setup', w: 9, kind: 'text', text: t => `Explain the problem ${t} solves and who this video is for.` },
      { name: 'Materials / Prerequisites', w: 9, kind: 'text', text: t => `List the tools, software or background needed before starting ${t}.` },
      { name: 'Steps', w: 54, kind: 'items', itemLabel: 'Step', countKey: 'itemCount' },
      { name: 'Common Mistakes', w: 9, kind: 'text', text: t => `Call out 1–2 mistakes people commonly make with ${t} and how to avoid them.` },
      { name: 'Recap', w: 7, kind: 'text', text: t => `Quickly summarize the steps you just covered for ${t}.` },
      { name: 'CTA', w: 6, kind: 'cta' },
    ],
  },
  listicle: {
    label: 'Listicle / Top N',
    beats: [
      { name: 'Hook', w: 6, kind: 'hook' },
      { name: 'Quick Preview of the List', w: 8, kind: 'text', text: t => `Briefly preview the full list for ${t} so viewers know what's coming and stay to the end.` },
      { name: 'List Items', w: 64, kind: 'items', itemLabel: 'Item', countKey: 'itemCount' },
      { name: 'Honorable Mentions', w: 8, kind: 'text', text: t => `Quickly mention 1–2 near-misses related to ${t} that almost made the list.` },
      { name: 'Recap', w: 8, kind: 'text', text: t => `Recap the list for ${t} in one line each.` },
      { name: 'CTA', w: 6, kind: 'cta' },
    ],
  },
  story: {
    label: 'Story / Vlog',
    beats: [
      { name: 'Cold Open', w: 6, kind: 'text', text: t => `Cold open on a striking moment from ${t} — no intro yet, just the moment.` },
      { name: 'Context', w: 14, kind: 'text', text: t => `Give the background viewers need to understand ${t}: who, where, why now.` },
      { name: 'Rising Events', w: 30, kind: 'text', text: t => `Walk through the events of ${t} in order, building tension toward the key moment.` },
      { name: 'Turning Point', w: 16, kind: 'text', text: t => `Show the turning point of ${t} — the moment things change.` },
      { name: 'Resolution', w: 18, kind: 'text', text: t => `Show how ${t} resolved and what the outcome actually was.` },
      { name: 'Reflection', w: 10, kind: 'text', text: t => `Reflect on what ${t} taught you or what you'd do differently.` },
      { name: 'CTA', w: 6, kind: 'cta' },
    ],
  },
  review: {
    label: 'Review / Reaction',
    beats: [
      { name: 'Hook', w: 6, kind: 'hook' },
      { name: 'What It Is / First Impressions', w: 14, kind: 'text', text: t => `Introduce ${t} and share your unfiltered first impression.` },
      { name: 'Pros', w: 26, kind: 'text', text: t => `Walk through what actually works well about ${t}, with specific examples.` },
      { name: 'Cons', w: 26, kind: 'text', text: t => `Walk through what doesn't work or falls short about ${t}, with specific examples.` },
      { name: 'Verdict', w: 22, kind: 'text', text: t => `Give your bottom-line verdict on ${t} and who it is (and isn't) right for.` },
      { name: 'CTA', w: 6, kind: 'cta' },
    ],
  },
  explainer: {
    label: 'Explainer',
    beats: [
      { name: 'Hook', w: 6, kind: 'hook' },
      { name: 'Why This Matters', w: 12, kind: 'text', text: t => `Explain why ${t} actually matters to the viewer right now.` },
      { name: 'Core Concept', w: 54, kind: 'items', itemLabel: 'Sub-point', countKey: 'subCount' },
      { name: 'Common Misconception', w: 12, kind: 'text', text: t => `Address a common misconception people have about ${t}.` },
      { name: 'Summary', w: 10, kind: 'text', text: t => `Summarize the core idea of ${t} in one or two sentences.` },
      { name: 'CTA', w: 6, kind: 'cta' },
    ],
  },
};

function fmtTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Builds a flat, ordered list of outline beats for a given topic/format/length.
 * `variant` (0,1,2…) rotates which placeholder phrasing is used, so
 * Regenerate can reshuffle wording without changing the structure.
 */
function buildOutline(topic, formatKey, lengthKey, variant) {
  const format = FORMATS[formatKey];
  const len = LENGTHS[lengthKey];
  const totalSeconds = len.seconds;
  const beats = [];
  let cursor = 0;

  format.beats.forEach((b) => {
    if (b.kind === 'items') {
      const count = len[b.countKey];
      const groupSeconds = Math.round(totalSeconds * b.w / 100);
      const perSeconds = Math.max(5, Math.round(groupSeconds / count));
      const phrasings = ITEM_PHRASINGS[b.itemLabel];
      for (let i = 1; i <= count; i++) {
        const start = cursor;
        const end = start + perSeconds;
        beats.push({
          name: `${b.itemLabel} ${i}`,
          start,
          end,
          lines: [phrasings[variant % phrasings.length](topic, i)],
        });
        cursor = end;
      }
    } else {
      const seconds = Math.max(5, Math.round(totalSeconds * b.w / 100));
      const start = cursor;
      const end = start + seconds;
      let line;
      if (b.kind === 'hook') line = HOOK_PHRASINGS[variant % HOOK_PHRASINGS.length](topic);
      else if (b.kind === 'cta') line = CTA_PHRASINGS[variant % CTA_PHRASINGS.length](topic);
      else line = b.text(topic);
      beats.push({ name: b.name, start, end, lines: [line] });
      cursor = end;
    }
  });

  // Snap the final beat's end to the exact target length (rounding drift).
  if (beats.length) beats[beats.length - 1].end = totalSeconds;

  return beats;
}

function buildPlainText(topic, formatLabel, lengthLabel, beats) {
  const lines = [];
  lines.push(`YouTube Script Outline: ${topic}`);
  lines.push(`Format: ${formatLabel} | Target length: ${lengthLabel}`);
  lines.push('');
  beats.forEach((beat, idx) => {
    lines.push(`${idx + 1}. ${beat.name} (${fmtTime(beat.start)}–${fmtTime(beat.end)})`);
    beat.lines.forEach((line) => lines.push(`   - ${line}`));
    lines.push('');
  });
  lines.push('(Structural template only — fill in your own details under each beat.)');
  return lines.join('\n');
}

const els = {
  topicInput: document.getElementById('topicInput'),
  lengthSelect: document.getElementById('lengthSelect'),
  formatSelect: document.getElementById('formatSelect'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyOutlineBtn: document.getElementById('copyOutlineBtn'),
  outlineOutput: document.getElementById('outlineOutput'),
};

const state = {
  topic: '',
  formatKey: 'tutorial',
  lengthKey: '8-10',
  variant: 0,
  beats: null,
  plainText: '',
};

function renderOutline() {
  const format = FORMATS[state.formatKey];
  const len = LENGTHS[state.lengthKey];
  const beats = state.beats;

  const rows = beats.map((beat, idx) => `
    <li class="outline-beat">
      <span class="beat-num">${idx + 1}</span>
      <div class="beat-body">
        <div class="beat-head">
          <span class="beat-name">${escapeHtml(beat.name)}</span>
          <span class="beat-time">${fmtTime(beat.start)}–${fmtTime(beat.end)}</span>
        </div>
        ${beat.lines.map(l => `<p class="beat-line">${escapeHtml(l)}</p>`).join('')}
      </div>
    </li>
  `).join('');

  els.outlineOutput.innerHTML = `
    <div class="outline-meta">
      <strong>${escapeHtml(state.topic)}</strong>
      <span>${escapeHtml(format.label)}</span>
      <span>Target: ${escapeHtml(len.label)}</span>
      <span>${beats.length} beats</span>
    </div>
    <ol class="outline-list">${rows}</ol>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generate() {
  const topic = els.topicInput.value.trim();
  if (!topic) {
    if (typeof showToast === 'function') showToast('Enter a video topic first');
    else window.alert('Enter a video topic first');
    return;
  }
  state.topic = topic;
  state.formatKey = els.formatSelect.value;
  state.lengthKey = els.lengthSelect.value;
  state.variant = 0;
  state.beats = buildOutline(state.topic, state.formatKey, state.lengthKey, state.variant);
  state.plainText = buildPlainText(state.topic, FORMATS[state.formatKey].label, LENGTHS[state.lengthKey].label, state.beats);
  renderOutline();
}

function regenerate() {
  if (!state.beats) {
    generate();
    return;
  }
  state.variant += 1;
  state.beats = buildOutline(state.topic, state.formatKey, state.lengthKey, state.variant);
  state.plainText = buildPlainText(state.topic, FORMATS[state.formatKey].label, LENGTHS[state.lengthKey].label, state.beats);
  renderOutline();
  if (typeof showToast === 'function') showToast('Outline phrasing reshuffled');
}

els.generateBtn.addEventListener('click', generate);
els.regenerateBtn.addEventListener('click', regenerate);
els.copyOutlineBtn.addEventListener('click', () => {
  copyToClipboard(state.plainText, 'Outline copied');
});
els.topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generate();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('youtube');
});
