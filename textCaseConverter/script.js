'use strict';

/* ── Word splitting helper (for programming case styles) ─────────
   Breaks text on any run of non-alphanumeric characters, so
   punctuation and whitespace both act as word boundaries. */
function splitWords(text) {
  return text.split(/[^a-zA-Z0-9]+/).filter(Boolean);
}

/* ── Title Case ────────────────────────────────────────────────
   Capitalizes every "major" word but lowercases short conjunctions,
   articles and prepositions — unless that word opens or closes the
   whole string, in which case it's always capitalized. */
const TITLE_CASE_MINOR_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'if'
]);

function toTitleCase(text) {
  const tokens = text.split(/(\s+)/); // keeps whitespace runs as their own tokens
  const wordTokenIndexes = [];
  tokens.forEach((tok, i) => {
    if (tok !== '' && !/^\s+$/.test(tok)) wordTokenIndexes.push(i);
  });
  if (!wordTokenIndexes.length) return text;

  const firstIdx = wordTokenIndexes[0];
  const lastIdx = wordTokenIndexes[wordTokenIndexes.length - 1];

  return tokens
    .map((tok, i) => {
      if (tok === '' || /^\s+$/.test(tok)) return tok; // pass whitespace through untouched

      const lower = tok.toLowerCase();
      const stripped = lower.replace(/^[^a-z]+/, '').replace(/[^a-z]+$/, '');
      const isEdgeWord = i === firstIdx || i === lastIdx;
      const forceCapitalize = isEdgeWord || !TITLE_CASE_MINOR_WORDS.has(stripped);

      if (!forceCapitalize) return lower;

      // Capitalize only the first letter found (handles leading punctuation like "(word").
      let capitalized = false;
      return lower.replace(/[a-z]/, (c) => {
        if (capitalized) return c;
        capitalized = true;
        return c.toUpperCase();
      });
    })
    .join('');
}

/* ── Sentence case ────────────────────────────────────────────── */
function toSentenceCase(text) {
  const lower = text.toLowerCase();
  let result = lower.replace(/^(\s*)([a-z])/, (m, ws, c) => ws + c.toUpperCase());
  result = result.replace(/([.!?])(\s+)([a-z])/g, (m, punct, spaces, c) => punct + spaces + c.toUpperCase());
  return result;
}

/* ── camelCase / PascalCase ───────────────────────────────────── */
function toCamelCase(text) {
  const words = splitWords(text).map((w) => w.toLowerCase());
  if (!words.length) return '';
  return words[0] + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toPascalCase(text) {
  const words = splitWords(text).map((w) => w.toLowerCase());
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

/* ── snake_case / CONSTANT_CASE / kebab-case ─────────────────── */
function toSnakeCase(text) {
  return splitWords(text).map((w) => w.toLowerCase()).join('_');
}

function toConstantCase(text) {
  return splitWords(text).map((w) => w.toUpperCase()).join('_');
}

function toKebabCase(text) {
  return splitWords(text).map((w) => w.toLowerCase()).join('-');
}

/* ── aLtErNaTiNg CaSe ──────────────────────────────────────────
   Alternates lower/upper for each alphabetic character, starting
   lowercase; non-letters are passed through without affecting the
   alternation. */
function toAlternatingCase(text) {
  let upperNext = false;
  let out = '';
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch)) {
      out += upperNext ? ch.toUpperCase() : ch.toLowerCase();
      upperNext = !upperNext;
    } else {
      out += ch;
    }
  }
  return out;
}

/* ── InVeRsE CaSe (Sponge Case) ────────────────────────────────
   Flips the case of every individual letter; everything else is
   left unchanged. */
function toInverseCase(text) {
  let out = '';
  for (const ch of text) {
    const upper = ch.toUpperCase();
    const lower = ch.toLowerCase();
    if (ch === upper && ch !== lower) out += lower; // was uppercase letter
    else if (ch === lower && ch !== upper) out += upper; // was lowercase letter
    else out += ch; // not a cased letter
  }
  return out;
}

/* ── Case style registry driving the UI grid ─────────────────── */
const CASE_STYLES = [
  { id: 'upper', title: 'UPPERCASE', hint: 'ALL CAPS', fn: (t) => t.toUpperCase() },
  { id: 'lower', title: 'lowercase', hint: 'all small', fn: (t) => t.toLowerCase() },
  { id: 'title', title: 'Title Case', hint: 'Headline Style', fn: toTitleCase },
  { id: 'sentence', title: 'Sentence case', hint: 'Body text style', fn: toSentenceCase },
  { id: 'camel', title: 'camelCase', hint: 'JS variables', fn: toCamelCase },
  { id: 'pascal', title: 'PascalCase', hint: 'Classes & components', fn: toPascalCase },
  { id: 'snake', title: 'snake_case', hint: 'Python / file names', fn: toSnakeCase },
  { id: 'constant', title: 'CONSTANT_CASE', hint: 'Constants & env vars', fn: toConstantCase },
  { id: 'kebab', title: 'kebab-case', hint: 'URLs / CSS classes', fn: toKebabCase },
  { id: 'alternating', title: 'aLtErNaTiNg CaSe', hint: 'Meme style', fn: toAlternatingCase },
  { id: 'inverse', title: 'InVeRsE CaSe', hint: 'Sponge case', fn: toInverseCase },
];

const els = {
  input: document.getElementById('caseInput'),
  charCount: document.getElementById('charCount'),
  clearBtn: document.getElementById('clearBtn'),
  caseGrid: document.getElementById('caseGrid'),
};

function buildGrid() {
  els.caseGrid.innerHTML = CASE_STYLES.map((style) => `
    <div class="case-card" data-case="${style.id}">
      <div class="case-card-head">
        <span class="case-card-title">${style.title}</span>
        <span class="case-card-hint">${style.hint}</span>
      </div>
      <div class="case-card-preview is-empty" id="preview-${style.id}">Type something above…</div>
      <button class="case-card-copy" data-copy-target="${style.id}">Copy</button>
    </div>
  `).join('');

  els.caseGrid.querySelectorAll('.case-card-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-copy-target');
      const previewEl = document.getElementById(`preview-${id}`);
      copyToClipboard(previewEl.textContent, `${CASE_STYLES.find((s) => s.id === id).title} copied`);
    });
  });
}

let debounceTimer = null;
function update() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const text = els.input.value;
    els.charCount.textContent = `${text.length} character${text.length === 1 ? '' : 's'}`;

    CASE_STYLES.forEach((style) => {
      const previewEl = document.getElementById(`preview-${style.id}`);
      if (!text) {
        previewEl.textContent = 'Type something above…';
        previewEl.classList.add('is-empty');
        return;
      }
      previewEl.classList.remove('is-empty');
      previewEl.textContent = style.fn(text);
    });
  }, 80);
}

els.input.addEventListener('input', update);

els.clearBtn.addEventListener('click', () => {
  els.input.value = '';
  update();
  els.input.focus();
});

document.addEventListener('DOMContentLoaded', () => {
  buildGrid();
  update();
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
});
