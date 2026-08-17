'use strict';

/**
 * Maps A-Z, a-z and (optionally) 0-9 in `text` to a Unicode block that
 * starts at `upperStart` / `lowerStart` / `digitStart`, using the simple
 * arithmetic offset (charCode - baseCharCode). `exceptions` is a plain
 * object keyed by the literal letter (e.g. "h" or "C") whose value is a
 * specific numeric code point to use instead of the arithmetic result —
 * needed because a handful of letters in the Unicode Mathematical
 * Alphanumeric Symbols block were already taken by older symbols and were
 * left out of that block, so their look-alike lives elsewhere.
 * Every character that isn't A-Z/a-z/0-9 passes through unchanged.
 * `digitStart` is optional — pass undefined/null for styles with no digit
 * range, and digits will pass through unchanged too.
 */
function mapUnicode(text, upperStart, lowerStart, digitStart, exceptions) {
  exceptions = exceptions || {};
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 65 && code <= 90) { // A-Z
      if (Object.prototype.hasOwnProperty.call(exceptions, ch)) {
        out += String.fromCodePoint(exceptions[ch]);
      } else {
        out += String.fromCodePoint(upperStart + (code - 65));
      }
    } else if (code >= 97 && code <= 122) { // a-z
      if (Object.prototype.hasOwnProperty.call(exceptions, ch)) {
        out += String.fromCodePoint(exceptions[ch]);
      } else {
        out += String.fromCodePoint(lowerStart + (code - 97));
      }
    } else if (code >= 48 && code <= 57) { // 0-9
      if (typeof digitStart === 'number') {
        out += String.fromCodePoint(digitStart + (code - 48));
      } else {
        out += ch;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

/* Fullwidth also swaps a literal space for the ideographic space
   (U+3000) for the authentic "vaporwave" look. */
function toFullwidth(text) {
  const mapped = mapUnicode(text, 0xFF21, 0xFF41, 0xFF10, {});
  let out = '';
  for (const ch of mapped) {
    out += ch === ' ' ? String.fromCodePoint(0x3000) : ch;
  }
  return out;
}

/* Circled letters follow the normal arithmetic offset, but circled digits
   do not live in one contiguous range next to each other in a way the
   generic digitStart offset can express: 1-9 sit at 0x2460 upward while 0
   is a lone exception at 0x24EA. So digits are handled as their own pass
   after the shared letter mapping. */
function toCircled(text) {
  const mapped = mapUnicode(text, 0x24B6, 0x24D0, undefined, {});
  let out = '';
  for (const ch of mapped) {
    const code = ch.codePointAt(0);
    if (code >= 49 && code <= 57) { // 1-9
      out += String.fromCodePoint(0x2460 + (code - 49));
    } else if (code === 48) { // 0
      out += String.fromCodePoint(0x24EA);
    } else {
      out += ch;
    }
  }
  return out;
}

/* Strikethrough / underline aren't a different alphabet block at all —
   they append a combining character after every character in the input. */
function toStrikethrough(text) {
  let out = '';
  for (const ch of text) out += ch + String.fromCodePoint(0x0336);
  return out;
}
function toUnderline(text) {
  let out = '';
  for (const ch of text) out += ch + String.fromCodePoint(0x0332);
  return out;
}

const STYLES = [
  { name: 'Bold',          fn: t => mapUnicode(t, 0x1D400, 0x1D41A, 0x1D7CE, {}) },
  { name: 'Italic',        fn: t => mapUnicode(t, 0x1D434, 0x1D44E, undefined, { h: 0x210E }) },
  { name: 'Bold Italic',   fn: t => mapUnicode(t, 0x1D468, 0x1D482, undefined, {}) },
  { name: 'Script',        fn: t => mapUnicode(t, 0x1D49C, 0x1D4B6, undefined, {
                              B: 0x212C, E: 0x2130, F: 0x2131, H: 0x210B, I: 0x2110,
                              L: 0x2112, M: 0x2133, R: 0x211B,
                              e: 0x212F, g: 0x210A, o: 0x2134
                            }) },
  { name: 'Bold Script',   fn: t => mapUnicode(t, 0x1D4D0, 0x1D4EA, undefined, {}) },
  { name: 'Fraktur',       fn: t => mapUnicode(t, 0x1D504, 0x1D51E, undefined, {
                              C: 0x212D, H: 0x210C, I: 0x2111, R: 0x211C
                            }) },
  { name: 'Bold Fraktur',  fn: t => mapUnicode(t, 0x1D56C, 0x1D586, undefined, {}) },
  { name: 'Double-Struck', fn: t => mapUnicode(t, 0x1D538, 0x1D552, 0x1D7D8, {
                              C: 0x2102, H: 0x210D, N: 0x2115, P: 0x2119,
                              Q: 0x211A, R: 0x211D, Z: 0x2124
                            }) },
  { name: 'Sans-Serif',    fn: t => mapUnicode(t, 0x1D5A0, 0x1D5BA, 0x1D7E2, {}) },
  { name: 'Sans Bold',     fn: t => mapUnicode(t, 0x1D5D4, 0x1D5EE, 0x1D7EC, {}) },
  { name: 'Sans Italic',   fn: t => mapUnicode(t, 0x1D608, 0x1D622, undefined, {}) },
  { name: 'Monospace',     fn: t => mapUnicode(t, 0x1D670, 0x1D68A, 0x1D7F6, {}) },
  { name: 'Fullwidth',     fn: toFullwidth },
  { name: 'Circled',       fn: toCircled },
  { name: 'Strikethrough', fn: toStrikethrough },
  { name: 'Underline',     fn: toUnderline },
];

const els = {
  input: document.getElementById('textInput'),
  resultsList: document.getElementById('resultsList'),
  clearBtn: document.getElementById('clearBtn'),
};

function buildRows() {
  els.resultsList.innerHTML = STYLES.map((s, i) => `
    <div class="result-row">
      <span class="result-label">${s.name}</span>
      <div class="result-output is-placeholder" id="output-${i}">Type something above to see ${s.name} text</div>
      <button class="result-copy" type="button" data-index="${i}">Copy</button>
    </div>
  `).join('');
}

function update() {
  const value = els.input.value;
  STYLES.forEach((s, i) => {
    const out = document.getElementById(`output-${i}`);
    if (!out) return;
    if (!value) {
      out.textContent = `Type something above to see ${s.name} text`;
      out.classList.add('is-placeholder');
    } else {
      out.textContent = s.fn(value);
      out.classList.remove('is-placeholder');
    }
  });
}

els.input.addEventListener('input', update);

els.clearBtn.addEventListener('click', () => {
  els.input.value = '';
  update();
  els.input.focus();
});

els.resultsList.addEventListener('click', (e) => {
  const btn = e.target.closest('.result-copy');
  if (!btn) return;
  const i = parseInt(btn.dataset.index, 10);
  const style = STYLES[i];
  if (!els.input.value) {
    showToast('Type something first');
    return;
  }
  const out = document.getElementById(`output-${i}`);
  copyToClipboard(out.textContent, `${style.name} text copied`);
});

document.addEventListener('DOMContentLoaded', () => {
  buildRows();
  update();
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('writing');
});
