'use strict';

/* ============================================================
   A small, honestly-scoped Markdown -> HTML parser.
   This is NOT a CommonMark implementation. It supports:
     - ATX headers (# ... ######)
     - bold (**text** / __text__), italic (*text* / _text_)
     - links [text](url), images ![alt](url)
     - inline code `code`
     - fenced code blocks ```lang ... ```
     - flat unordered lists (-, *, +) and ordered lists (1. 2. ...)
     - blockquotes (> text)
     - horizontal rules (--- or ***)
     - paragraphs
   It does NOT support nested lists, tables, footnotes, or other
   CommonMark edge cases. The two-pass design (block-level split,
   then inline formatting within each block's text) keeps bold vs
   italic and code vs formatting from corrupting one another, and
   every character of user input is HTML-escaped before any
   Markdown tag is generated, so raw HTML/script the user types is
   always rendered as inert text rather than live markup.
   ============================================================ */

/* -- Escaping helpers ------------------------------------------------- */

// Escapes the characters that make text unsafe to insert as HTML.
// Must run BEFORE any Markdown tag is generated from the source text.
function escapeHtml(str) {
  return String(str)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;');
}

// For text that has already passed through escapeHtml(): escapes a
// literal quote so it can't break out of an href="" / alt="" attribute.
function escapeQuoteOnly(str) {
  return String(str).split('"').join('&quot;');
}

function isBlank(line) {
  return line.trim().length === 0;
}

function isHorizontalRule(line) {
  var stripped = line.trim().split(/\s+/).join('');
  if (stripped.length < 3) return false;
  return /^-{3,}$/.test(stripped) || /^\*{3,}$/.test(stripped) || /^_{3,}$/.test(stripped);
}

var RE_FENCE = /^ {0,3}```(.*)$/;
var RE_HEADER = /^ {0,3}(#{1,6})\s+(.*)$/;
var RE_QUOTE = /^ {0,3}>\s?(.*)$/;
var RE_UL = /^ {0,3}[-*+]\s+(.*)$/;
var RE_OL = /^ {0,3}\d+\.\s+(.*)$/;

function isBlockStart(line) {
  return (
    RE_FENCE.test(line) ||
    RE_HEADER.test(line) ||
    isHorizontalRule(line) ||
    RE_QUOTE.test(line) ||
    RE_UL.test(line) ||
    RE_OL.test(line) ||
    isBlank(line)
  );
}

/* -- Inline pass: bold/italic/links/images/inline-code ----------------
   Runs only on the text captured inside a single block (a paragraph
   line, a header's text, a list item, a blockquote line) -- never on
   raw fenced code block content, which is escaped as literal text
   and left completely unformatted. */

// Placeholder markers built from Unicode Private Use Area code points
// via String.fromCharCode (never typed as literal characters in this
// source file) so a plain digit the user typed, like "Chapter 2",
// can never be mistaken for one of these tokens during the restore
// step at the end of parseInline().
var STASH_OPEN = String.fromCharCode(57344);  // U+E000
var STASH_CLOSE = String.fromCharCode(57345); // U+E001

function buildStashRegex() {
  return new RegExp(STASH_OPEN + '(\\d+)' + STASH_CLOSE, 'g');
}

function parseInline(text) {
  var store = [];
  function stash(html) {
    var token = STASH_OPEN + store.length + STASH_CLOSE;
    store.push(html);
    return token;
  }

  // Escape first: everything below only ever adds well-formed tags
  // on top of already-safe text, so a literal "<" or "&" the user
  // typed can never become part of real markup.
  var s = escapeHtml(text);

  // Inline code spans -- protected before anything else touches them,
  // so bold/italic markers inside `code` are left alone.
  s = s.replace(/`([^`]+)`/g, function (m, code) {
    return stash('<code>' + code + '</code>');
  });

  // Images before links (the leading "!" would otherwise let the
  // link pattern partially match an image).
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
    return stash('<img src="' + escapeQuoteOnly(url) + '" alt="' + escapeQuoteOnly(alt) + '">');
  });

  // Links -- stashed as finished HTML so a "_" or "*" inside the URL
  // can never be mistaken for an italic/bold marker in a later step.
  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, label, url) {
    return stash('<a href="' + escapeQuoteOnly(url) + '">' + label + '</a>');
  });

  // Bold BEFORE italic, and ** BEFORE single *: matching the double
  // marker first consumes both asterisks together, so the leftover
  // single asterisks the italic pass sees are only ever genuine
  // italic markers. Doing this in the opposite order is the classic
  // naive-regex bug that turns "**bold**" into a mangled italic match.
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/_(.+?)_/g, '<em>$1</em>');

  // Restore stashed fragments last of all, using the unambiguous
  // marker pair so this can never match user-typed digits.
  s = s.replace(buildStashRegex(), function (m, i) {
    return store[Number(i)];
  });

  return s;
}

/* -- Block pass --------------------------------------------------------- */

function parseMarkdown(input) {
  var lines = String(input).replace(/\r\n?/g, '\n').split('\n');
  var out = [];
  var i = 0;
  var n = lines.length;

  while (i < n) {
    var line = lines[i];

    if (isBlank(line)) { i++; continue; }

    // Fenced code block -- escaped only, never passed through parseInline.
    var fence = line.match(RE_FENCE);
    if (fence) {
      var lang = fence[1].trim();
      var codeLines = [];
      i++;
      while (i < n && !/^ {0,3}```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < n) i++; // consume closing fence
      var cls = lang ? ' class="language-' + escapeQuoteOnly(escapeHtml(lang)) + '"' : '';
      out.push('<pre><code' + cls + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
      continue;
    }

    // ATX header
    var header = line.match(RE_HEADER);
    if (header) {
      var level = header[1].length;
      var text = header[2].replace(/\s+#+\s*$/, ''); // strip optional trailing ###
      out.push('<h' + level + '>' + parseInline(text) + '</h' + level + '>');
      i++;
      continue;
    }

    // Horizontal rule
    if (isHorizontalRule(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Blockquote -- consecutive "> " lines become one blockquote.
    if (RE_QUOTE.test(line)) {
      var quoteLines = [];
      while (i < n && RE_QUOTE.test(lines[i])) {
        quoteLines.push(lines[i].match(RE_QUOTE)[1]);
        i++;
      }
      out.push('<blockquote><p>' + parseInline(quoteLines.join(' ')) + '</p></blockquote>');
      continue;
    }

    // Unordered list (flat -- no nested sub-lists)
    if (RE_UL.test(line)) {
      var ulItems = [];
      while (i < n && RE_UL.test(lines[i])) {
        ulItems.push(lines[i].match(RE_UL)[1]);
        i++;
      }
      out.push('<ul>' + ulItems.map(function (it) { return '<li>' + parseInline(it) + '</li>'; }).join('') + '</ul>');
      continue;
    }

    // Ordered list (flat)
    if (RE_OL.test(line)) {
      var olItems = [];
      while (i < n && RE_OL.test(lines[i])) {
        olItems.push(lines[i].match(RE_OL)[1]);
        i++;
      }
      out.push('<ol>' + olItems.map(function (it) { return '<li>' + parseInline(it) + '</li>'; }).join('') + '</ol>');
      continue;
    }

    // Paragraph -- consecutive lines that don't start any other block.
    var paraLines = [];
    while (i < n && !isBlockStart(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      out.push('<p>' + parseInline(paraLines.join(' ')) + '</p>');
    } else {
      i++; // safety net, should not normally trigger
    }
  }

  return out.join('\n');
}

/* -- UI wiring ------------------------------------------------------- */

var els = {
  input: document.getElementById('mdInput'),
  clearBtn: document.getElementById('clearBtn'),
  sampleBtn: document.getElementById('sampleBtn'),
  tabPreviewBtn: document.getElementById('tabPreviewBtn'),
  tabSourceBtn: document.getElementById('tabSourceBtn'),
  previewPanel: document.getElementById('previewPanel'),
  sourcePanel: document.getElementById('sourcePanel'),
  preview: document.getElementById('mdPreview'),
  source: document.getElementById('mdSource'),
  copyPreviewBtn: document.getElementById('copyPreviewBtn'),
  copySourceBtn: document.getElementById('copySourceBtn'),
};

var SAMPLE = [
  '# Hello world',
  '',
  'This is **bold** and *italic* text with a [link](https://example.com).',
  '',
  '## Features',
  '',
  '- Fast, client-side conversion',
  '- No sign-up required',
  '- Works offline once loaded',
  '',
  '> Markdown keeps plain text readable even before it is converted.',
  '',
  'Here is some code:',
  '',
  '```js',
  'function greet(name) {',
  '  return `Hello, ${name}!`;',
  '}',
  '```',
  '',
  '---',
  '',
  '1. First step',
  '2. Second step',
  '3. Third step',
].join('\n');

var lastHtml = '';

function render() {
  var html = parseMarkdown(els.input.value);
  lastHtml = html;
  els.preview.innerHTML = html;       // renders real elements from our own, escaped-then-formatted HTML
  els.source.textContent = html;      // shown as literal text, so "<h1>...</h1>" is visible, not executed
}

function setActiveTab(which) {
  var previewActive = which === 'preview';
  els.tabPreviewBtn.classList.toggle('is-active', previewActive);
  els.tabSourceBtn.classList.toggle('is-active', !previewActive);
  els.tabPreviewBtn.setAttribute('aria-selected', String(previewActive));
  els.tabSourceBtn.setAttribute('aria-selected', String(!previewActive));
  els.previewPanel.classList.toggle('is-active', previewActive);
  els.sourcePanel.classList.toggle('is-active', !previewActive);
  els.previewPanel.hidden = !previewActive;
  els.sourcePanel.hidden = previewActive;
}

els.input.addEventListener('input', render);

els.clearBtn.addEventListener('click', function () {
  els.input.value = '';
  render();
  els.input.focus();
});

els.sampleBtn.addEventListener('click', function () {
  els.input.value = SAMPLE;
  render();
});

els.tabPreviewBtn.addEventListener('click', function () { setActiveTab('preview'); });
els.tabSourceBtn.addEventListener('click', function () { setActiveTab('source'); });

els.copyPreviewBtn.addEventListener('click', function () {
  copyToClipboard(lastHtml, 'HTML copied');
});
els.copySourceBtn.addEventListener('click', function () {
  copyToClipboard(lastHtml, 'HTML copied');
});

document.addEventListener('DOMContentLoaded', function () {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  els.input.value = SAMPLE;
  render();
});
