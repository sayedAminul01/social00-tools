'use strict';

// The genuine, traditional Lorem Ipsum passage (the classic Cicero-derived
// text used industry-wide) — used purely as a source pool of real words,
// never hard-coded output. Sentences and paragraphs below are freshly
// assembled at random from these words on every generation.
const SOURCE_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.`;

// Build the word pool: lowercase, punctuation stripped, natural frequency
// kept (common words like "dolor" or "ut" appear more than once, just as
// in the source passage).
const WORD_POOL = SOURCE_TEXT
  .toLowerCase()
  .split(/[^a-z]+/)
  .filter(Boolean);

const CLASSIC_OPENING = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPoolWord() {
  return WORD_POOL[randInt(0, WORD_POOL.length - 1)];
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Build one sentence (string, capitalized, ends with a period). */
function buildSentence({ forceOpening = false } = {}) {
  if (forceOpening) {
    const extra = randInt(3, 8);
    const words = [...CLASSIC_OPENING];
    for (let i = 0; i < extra; i++) words.push(randomPoolWord());
    return words.join(' ') + '.';
  }
  const length = randInt(4, 12);
  const words = [];
  for (let i = 0; i < length; i++) words.push(randomPoolWord());
  words[0] = capitalize(words[0]);
  return words.join(' ') + '.';
}

/** Build `count` words as a flat array. If startClassic, the first
 * min(count, 5) words are literally "Lorem ipsum dolor sit amet". */
function generateWords(count, startClassic) {
  const out = [];
  if (startClassic) {
    out.push(...CLASSIC_OPENING.slice(0, Math.min(count, CLASSIC_OPENING.length)));
  }
  while (out.length < count) out.push(randomPoolWord());
  if (!startClassic && out.length) out[0] = capitalize(out[0]);
  return out.slice(0, count);
}

/** Build `count` sentences. If startClassic, the first sentence begins
 * with the literal "Lorem ipsum dolor sit amet" opening. */
function generateSentences(count, startClassic) {
  const sentences = [];
  for (let i = 0; i < count; i++) {
    sentences.push(buildSentence({ forceOpening: startClassic && i === 0 }));
  }
  return sentences;
}

/** Build `count` paragraphs (each a string of 3-7 sentences joined by
 * spaces). If startClassic, the very first sentence of the first
 * paragraph begins with the classic opening line. */
function generateParagraphs(count, startClassic) {
  const paragraphs = [];
  for (let p = 0; p < count; p++) {
    const sentenceCount = randInt(3, 7);
    const sentences = [];
    for (let s = 0; s < sentenceCount; s++) {
      sentences.push(buildSentence({ forceOpening: startClassic && p === 0 && s === 0 }));
    }
    paragraphs.push(sentences.join(' '));
  }
  return paragraphs;
}

const els = {
  unitSelect: document.getElementById('unitSelect'),
  countInput: document.getElementById('countInput'),
  startClassic: document.getElementById('startClassic'),
  htmlOutput: document.getElementById('htmlOutput'),
  htmlToggleWrap: document.getElementById('htmlToggleWrap'),
  output: document.getElementById('loremOutput'),
  generateBtn: document.getElementById('generateBtn'),
  copyBtn: document.getElementById('copyBtn'),
};

let currentCopyText = '';

function getCount() {
  let n = parseInt(els.countInput.value, 10);
  if (!Number.isFinite(n)) n = 1;
  n = Math.max(1, Math.min(50, n));
  return n;
}

function render() {
  const unit = els.unitSelect.value;
  const count = getCount();
  const startClassic = els.startClassic.checked;
  const isParagraphs = unit === 'paragraphs';

  // The HTML-output toggle only makes sense in Paragraphs mode.
  els.htmlOutput.disabled = !isParagraphs;
  if (els.htmlToggleWrap) els.htmlToggleWrap.classList.toggle('is-disabled', !isParagraphs);

  let text = '';

  if (unit === 'words') {
    text = generateWords(count, startClassic).join(' ');
  } else if (unit === 'sentences') {
    text = generateSentences(count, startClassic).join(' ');
  } else {
    const paragraphs = generateParagraphs(count, startClassic);
    if (isParagraphs && els.htmlOutput.checked) {
      text = paragraphs.map((p) => `<p>${p}</p>`).join('\n');
    } else {
      text = paragraphs.join('\n\n');
    }
  }

  currentCopyText = text;
  els.output.textContent = text;
}

els.unitSelect.addEventListener('change', render);
els.countInput.addEventListener('input', render);
els.startClassic.addEventListener('change', render);
els.htmlOutput.addEventListener('change', render);
els.generateBtn.addEventListener('click', render);

els.copyBtn.addEventListener('click', () => {
  copyToClipboard(currentCopyText, 'Lorem Ipsum copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  render();
});
