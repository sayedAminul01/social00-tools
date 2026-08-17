'use strict';

/* ------------------------------------------------------------------
   Template bank. Every bio is assembled from three line types per
   tone: an "opening" (who you are), a "value" line (what you do /
   believe — generic enough for any role) and an optional "closer"
   (call to action). This is a 100% client-side template generator —
   it is NOT a live connection to any AI language model.
   ------------------------------------------------------------------ */
const TEMPLATES = {
  professional: {
    opening: [
      '{name} — {role} focused on results that matter.',
      '{role} with a track record of delivering real impact.',
      'Experienced {role} helping teams build better outcomes.'
    ],
    value: [
      'I turn strategy into execution.',
      'Sharing insights on growth, leadership and doing the work well.',
      'Focused on solving problems that actually move the needle.'
    ],
    closer: [
      'Open to new opportunities.',
      "Let's connect.",
      'Available for consulting and collaborations.'
    ]
  },
  casual: {
    opening: [
      '{name} here — {role} figuring it out one day at a time.',
      'Just a {role} who loves what they do.',
      '{role} by trade, curious human by nature.'
    ],
    value: [
      'Sharing what I learn along the way.',
      'Turning ideas into things people actually use.',
      'Mostly just having fun and figuring it out.'
    ],
    closer: [
      'DMs open.',
      'Say hi 👋',
      "Let's be friends."
    ]
  },
  witty: {
    opening: [
      '{name}: professional {role}, amateur everything else.',
      "{role} who reads the fine print so you don't have to.",
      'Certified {role}. Uncertified adult.'
    ],
    value: [
      'Turning coffee into ideas, and ideas into deadlines.',
      'Making things nobody asked for, on purpose.',
      'Here for the puns and the punchlines.'
    ],
    closer: [
      'Send memes, not spam.',
      'DMs open (bribes accepted).',
      'Say hi 👋'
    ]
  },
  bold: {
    opening: [
      '{name} — {role} on a mission to change the game.',
      "{role} who doesn't do average.",
      'Built different. {role} to the core.'
    ],
    value: [
      'Turning ideas into things people actually use.',
      'Setting the bar, then raising it.',
      'Here to disrupt, not to blend in.'
    ],
    closer: [
      "Let's build something huge.",
      'DMs open.',
      "Follow if you're not afraid of ambition."
    ]
  }
};

const els = {
  name: document.getElementById('nameInput'),
  role: document.getElementById('roleInput'),
  platform: document.getElementById('platformSelect'),
  tone: document.getElementById('toneSelect'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  results: document.getElementById('bioResults'),
  empty: document.getElementById('bioEmpty'),
};

let generationSeed = 0;

function fillTemplate(tpl, name, role) {
  return tpl.replace(/\{name\}/g, name).replace(/\{role\}/g, role);
}

// Truncates a single line at the last word boundary within `limit`,
// used only when even one composed line is longer than the platform
// limit on its own (e.g. an unusually long name or role).
function truncateAtWord(text, limit) {
  if (text.length <= limit) return text;
  let truncated = text.slice(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) truncated = truncated.slice(0, lastSpace);
  truncated = truncated.replace(/[\s,;:-]+$/, '');
  return truncated + '…';
}

// Builds a bio out of full sentence parts, adding each part only if
// it still fits the character limit. This guarantees the result is
// always cut at a full sentence boundary rather than mid-sentence or
// mid-word — the closer is simply dropped first if it doesn't fit.
function composeWithLimit(parts, limit) {
  let result = '';
  for (const part of parts) {
    if (!part) continue;
    const candidate = result ? result + ' ' + part : part;
    if (candidate.length <= limit) {
      result = candidate;
    } else if (!result) {
      // Even the first sentence alone exceeds the limit.
      result = truncateAtWord(part, limit);
      break;
    } else {
      // This part doesn't fit — stop here, keep what we have.
      break;
    }
  }
  return result;
}

function getPlatformLimit() {
  const opt = els.platform.options[els.platform.selectedIndex];
  return parseInt(opt.getAttribute('data-limit'), 10) || 160;
}

function buildVariants(name, role, tone, limit, count) {
  const bank = TEMPLATES[tone] || TEMPLATES.professional;
  const hasName = !!name;
  const openings = hasName
    ? bank.opening
    : bank.opening.filter(t => !t.includes('{name}'));
  const values = bank.value;
  const closers = bank.closer;

  const seedBase = generationSeed * 7;
  const variants = [];
  const seen = new Set();

  for (let i = 0; i < count; i++) {
    const oIdx = (i + seedBase) % openings.length;
    const vIdx = (i + seedBase + 1) % values.length;
    const cIdx = (i + seedBase + 2) % closers.length;

    const opening = fillTemplate(openings[oIdx], name, role);
    const value = fillTemplate(values[vIdx], name, role);
    const closer = fillTemplate(closers[cIdx], name, role);

    let text = composeWithLimit([opening, value, closer], limit);
    // Avoid emitting an exact duplicate when the template pools are
    // small relative to the requested count — nudge to the next combo.
    let guard = 0;
    while (seen.has(text) && guard < openings.length * values.length) {
      const altIdx = (oIdx + guard + 1) % openings.length;
      text = composeWithLimit([
        fillTemplate(openings[altIdx], name, role),
        value,
        closer
      ], limit);
      guard++;
    }
    seen.add(text);
    variants.push(text);
  }

  return variants;
}

function renderVariants(variants, limit) {
  els.results.innerHTML = '';
  variants.forEach((text, i) => {
    const card = document.createElement('div');
    card.className = 'bio-card';

    const textEl = document.createElement('p');
    textEl.className = 'bio-text';
    textEl.textContent = text;

    const footer = document.createElement('div');
    footer.className = 'bio-footer';

    const count = document.createElement('span');
    count.className = 'char-count ' + (text.length <= limit ? 'ok' : 'over');
    count.textContent = `${text.length} / ${limit}`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-bio';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      copyToClipboard(text, `Bio ${i + 1} copied`);
    });

    footer.appendChild(count);
    footer.appendChild(copyBtn);
    card.appendChild(textEl);
    card.appendChild(footer);
    els.results.appendChild(card);
  });

  els.empty.hidden = variants.length > 0;
  els.regenerateBtn.hidden = variants.length === 0;
}

function generate() {
  const name = els.name.value.trim();
  const role = els.role.value.trim() || 'creator';
  const tone = els.tone.value;
  const limit = getPlatformLimit();

  generationSeed++;
  const variants = buildVariants(name, role, tone, limit, 5);
  renderVariants(variants, limit);
}

els.generateBtn.addEventListener('click', generate);
els.regenerateBtn.addEventListener('click', generate);

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('writing');
});
