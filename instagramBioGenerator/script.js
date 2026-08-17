'use strict';

/* ── Constants ────────────────────────────────────────────────── */

const BIO_LIMIT = 150;
const MAX_TRAITS = 3;
const SEPARATORS = ['✨', '•', '🌿', '|']; // ✨ • 🌿 |

// Line-1 (identity) templates, loosely keyed to common niche keywords.
// {name} and {role} are filled in at render time.
const NICHE_LINE1 = [
  { keys: ['fitness', 'coach', 'trainer', 'gym', 'workout'], templates: [
    '💪 Certified {role} helping you get stronger',
    '{name} | {role} building better habits daily',
    'Turning workouts into wins as your {role}'
  ]},
  { keys: ['travel', 'wanderlust', 'explore', 'nomad'], templates: [
    '✈️ {role} chasing sunsets & hidden gems',
    '{name} | {role} — passport always ready',
    'Showing you the world, one trip at a time'
  ]},
  { keys: ['food', 'chef', 'recipe', 'cook', 'culinary', 'bak'], templates: [
    '🍳 {role} cooking up recipes you’ll love',
    '{name} | {role} — kitchen stories & recipes',
    'Turning simple ingredients into big flavor'
  ]},
  { keys: ['photo', 'camera', 'shoot', 'lens'], templates: [
    '📷 {role} capturing moments that matter',
    '{name} | {role} — one frame at a time',
    'Telling stories through the lens as your {role}'
  ]},
  { keys: ['art', 'draw', 'illustrat', 'paint'], templates: [
    '🎨 {role} turning ideas into visuals',
    '{name} | {role} — creating one piece at a time',
    'Bringing imagination to life as your {role}'
  ]},
  { keys: ['music', 'sing', 'song', 'beat', 'dj', 'produc'], templates: [
    '🎵 {role} making music worth hearing',
    '{name} | {role} — new sounds every week',
    'Turning feelings into melodies as your {role}'
  ]},
  { keys: ['fashion', 'style', 'outfit', 'wardrobe'], templates: [
    '👗 {role} sharing style that speaks',
    '{name} | {role} — outfits & inspiration daily',
    'Making everyday style feel effortless'
  ]},
  { keys: ['beauty', 'makeup', 'skincare', 'glam'], templates: [
    '💄 {role} sharing beauty that works',
    '{name} | {role} — tips, tricks & routines',
    'Helping you feel confident in your own skin'
  ]},
  { keys: ['tech', 'code', 'dev', 'software', 'app', 'program'], templates: [
    '💻 {role} building things worth using',
    '{name} | {role} — breaking down tech simply',
    'Making technology make sense as your {role}'
  ]},
  { keys: ['business', 'entrepreneur', 'market', 'brand', 'founder'], templates: [
    '📈 {role} building brands that grow',
    '{name} | {role} — real talk on business',
    'Helping ambitious people build something real'
  ]},
  { keys: ['game', 'gamer', 'stream', 'twitch', 'esport'], templates: [
    '🎮 {role} leveling up daily',
    '{name} | {role} — clips, streams & chaos',
    'Turning game nights into good content'
  ]},
  { keys: ['teach', 'tutor', 'student', 'study', 'education', 'school'], templates: [
    '📚 {role} making learning click',
    '{name} | {role} — study tips that actually work',
    'Helping you learn smarter, not harder'
  ]},
  { keys: ['write', 'author', 'blog', 'content', 'copy'], templates: [
    '✍️ {role} turning thoughts into words',
    '{name} | {role} — stories worth reading',
    'Writing my way through life as your {role}'
  ]},
  { keys: ['fit', 'yoga', 'wellness', 'health'], templates: [
    '🧘 {role} helping you feel your best',
    '{name} | {role} — wellness made simple',
    'Small habits, big change — that’s the {role} way'
  ]}
];

const GENERIC_LINE1 = [
  '{name} | {role}',
  '{role} sharing what I know',
  'Just a {role} figuring it out loud',
  '{name} — {role} by day, dreamer always',
  'Proud {role}, always learning'
];

const BENEFITS = [
  'grow with confidence',
  'level up every week',
  'find what actually works',
  'stay consistent & inspired',
  'turn ideas into action',
  'make progress you can see',
  'learn something new daily',
  'feel good about the process'
];

const VALUE_PROP_TEMPLATES = [
  'Helping you {benefit} ✨',
  'Here to help you {benefit}',
  'On a mission to help you {benefit}',
  'Sharing what helps me {benefit}',
  'For anyone who wants to {benefit}',
  'Come for the content, stay to {benefit}'
];

/* ── DOM refs ─────────────────────────────────────────────────── */

const els = {
  nameInput: document.getElementById('nameInput'),
  roleInput: document.getElementById('roleInput'),
  traitGrid: document.getElementById('traitGrid'),
  ctaSelect: document.getElementById('ctaSelect'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  emptyState: document.getElementById('emptyState'),
  bioGrid: document.getElementById('bioGrid'),
};

/* ── Helpers ──────────────────────────────────────────────────── */

function pick(arr, index) {
  return arr[((index % arr.length) + arr.length) % arr.length];
}

function randOffset() {
  return Math.floor(Math.random() * 997);
}

function getLine1Candidates(role) {
  const lower = (role || '').toLowerCase();
  const match = NICHE_LINE1.find(entry => entry.keys.some(k => lower.includes(k)));
  return match ? match.templates : GENERIC_LINE1;
}

function fillLine1(tpl, name, role) {
  let s = tpl;
  if (name) {
    s = s.replace(/\{name\}/g, name);
  } else {
    // Strip "{name} | " / "{name} — " style prefixes cleanly when no name given.
    s = s.replace(/\{name\}\s*[|—-]\s*/g, '').replace(/\{name\}/g, '').trim();
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  s = s.replace(/\{role\}/g, role);
  return s;
}

function getCheckedTraits() {
  return Array.from(els.traitGrid.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
}

function enforceTraitLimit() {
  const checkboxes = Array.from(els.traitGrid.querySelectorAll('input[type="checkbox"]'));
  const checkedCount = checkboxes.filter(cb => cb.checked).length;
  checkboxes.forEach(cb => {
    const pill = cb.closest('.trait-pill');
    const shouldDisable = !cb.checked && checkedCount >= MAX_TRAITS;
    cb.disabled = shouldDisable;
    if (pill) pill.classList.toggle('is-disabled', shouldDisable);
  });
}

/* ── Bio generation ──────────────────────────────────────────── */

function buildVariant(data, i) {
  const line1Candidates = data.line1Candidates;
  const line1 = fillLine1(pick(line1Candidates, data.offsetLine1 + i), data.name, data.role);

  const separator = pick(SEPARATORS, data.offsetSep + i);
  const line2 = data.traits.join(` ${separator} `);

  const benefit = pick(BENEFITS, data.offsetBenefit + i);
  const line3 = pick(VALUE_PROP_TEMPLATES, data.offsetVP + i).replace(/\{benefit\}/g, benefit);

  const line4 = data.cta;

  const lines = [line1, line2, line3, line4];
  const text = lines.join('\n');
  return { lines, text, length: text.length };
}

function generateBios() {
  const name = els.nameInput.value.trim();
  const roleRaw = els.roleInput.value.trim();
  const traits = getCheckedTraits();
  const cta = els.ctaSelect.value;

  if (!name && !roleRaw) {
    window.showToast('Add a name or niche to get started');
    return;
  }
  if (!traits.length) {
    window.showToast('Pick at least one trait (up to 3)');
    return;
  }

  const role = roleRaw || 'Creator';

  const data = {
    name,
    role,
    traits,
    cta,
    line1Candidates: getLine1Candidates(role),
    offsetLine1: randOffset(),
    offsetSep: randOffset(),
    offsetVP: randOffset(),
    offsetBenefit: randOffset(),
  };

  const variants = [];
  for (let i = 0; i < 5; i++) {
    variants.push(buildVariant(data, i));
  }

  renderVariants(variants);
  els.regenerateBtn.disabled = false;
}

/* ── Rendering ────────────────────────────────────────────────── */

function renderVariants(variants) {
  els.emptyState.classList.add('is-hidden');
  els.bioGrid.innerHTML = '';

  variants.forEach((variant, idx) => {
    const isOver = variant.length > BIO_LIMIT;
    const card = document.createElement('div');
    card.className = 'bio-card';

    const header = document.createElement('div');
    header.className = 'bio-card-header';
    header.innerHTML = `
      <span class="bio-variant-label">Variant ${idx + 1}</span>
      <span class="bio-char-count ${isOver ? 'is-over' : ''}">${variant.length} / ${BIO_LIMIT}</span>
    `;

    const preview = document.createElement('div');
    preview.className = 'bio-preview';
    preview.innerHTML = variant.lines.map(line => `<span class="bio-line"></span>`).join('');
    // set text via textContent per line to avoid HTML-escaping issues
    variant.lines.forEach((line, li) => {
      preview.children[li].textContent = line;
    });

    card.appendChild(header);
    card.appendChild(preview);

    if (isOver) {
      const warn = document.createElement('p');
      warn.className = 'bio-warning';
      warn.textContent = `${variant.length - BIO_LIMIT} characters over the limit — trim a trait or shorten a line before using this one.`;
      card.appendChild(warn);
    }

    const actions = document.createElement('div');
    actions.className = 'bio-card-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-bio';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy Bio';
    copyBtn.addEventListener('click', () => {
      copyToClipboard(variant.text, `Variant ${idx + 1} copied`);
    });
    actions.appendChild(copyBtn);
    card.appendChild(actions);

    els.bioGrid.appendChild(card);
  });
}

/* ── Events ───────────────────────────────────────────────────── */

els.traitGrid.addEventListener('change', enforceTraitLimit);
els.generateBtn.addEventListener('click', generateBios);
els.regenerateBtn.addEventListener('click', generateBios);

document.addEventListener('DOMContentLoaded', () => {
  enforceTraitLimit();
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('instagram');
});
