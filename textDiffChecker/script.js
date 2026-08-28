'use strict';

const els = {
  original: document.getElementById('originalText'),
  changed: document.getElementById('changedText'),
  caseInsensitive: document.getElementById('caseInsensitive'),
  ignoreWhitespace: document.getElementById('ignoreWhitespace'),
  swapBtn: document.getElementById('swapBtn'),
  clearBtn: document.getElementById('clearBtn'),
  copyDiffBtn: document.getElementById('copyDiffBtn'),
  diffSummary: document.getElementById('diffSummary'),
  diffOutput: document.getElementById('diffOutput'),
};

/**
 * Splits text into lines, normalising CRLF/CR to plain \n boundaries first
 * so line counts are consistent regardless of the source's line endings.
 */
function toLines(text) {
  if (text === '') return [];
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

/** Builds the line-equality predicate used by the LCS algorithm below. */
function makeEqualsFn(caseInsensitive, ignoreWhitespace) {
  return function (a, b) {
    let x = a;
    let y = b;
    if (ignoreWhitespace) {
      x = x.trim();
      y = y.trim();
    }
    if (caseInsensitive) {
      x = x.toLowerCase();
      y = y.toLowerCase();
    }
    return x === y;
  };
}

/**
 * Computes a line-level diff between `originalLines` and `changedLines`
 * using the Longest Common Subsequence (LCS) algorithm.
 *
 * Standard approach: build a DP table where dp[i][j] holds the length of
 * the LCS of originalLines[i..n) and changedLines[j..m), filled bottom-up
 * from the end of both arrays. Then walk forward from (0,0): if the
 * current lines match under `equalsFn`, they're part of the LCS
 * ("unchanged"); otherwise step toward whichever neighbour cell has the
 * larger remaining-LCS length — that's the direction that preserves the
 * optimal subsequence — marking a "removed" (advance original) or
 * "added" (advance changed) line as we go. Any lines left over once one
 * side is exhausted are flushed as removed/added respectively.
 *
 * Returns an array of { type: 'unchanged'|'removed'|'added', text }.
 */
function computeLcsDiff(originalLines, changedLines, equalsFn) {
  const n = originalLines.length;
  const m = changedLines.length;

  // dp[i][j] = length of LCS of originalLines[i..n) and changedLines[j..m)
  const dp = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Array(m + 1).fill(0);

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (equalsFn(originalLines[i], changedLines[j])) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (equalsFn(originalLines[i], changedLines[j])) {
      result.push({ type: 'unchanged', text: originalLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', text: originalLines[i] });
      i++;
    } else {
      result.push({ type: 'added', text: changedLines[j] });
      j++;
    }
  }
  while (i < n) {
    result.push({ type: 'removed', text: originalLines[i] });
    i++;
  }
  while (j < m) {
    result.push({ type: 'added', text: changedLines[j] });
    j++;
  }
  return result;
}

function markerFor(type) {
  if (type === 'removed') return '-';
  if (type === 'added') return '+';
  return ' ';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let lastDiff = [];

function render() {
  const originalRaw = els.original.value;
  const changedRaw = els.changed.value;

  if (originalRaw === '' && changedRaw === '') {
    lastDiff = [];
    els.diffOutput.innerHTML = '';
    els.diffSummary.textContent = 'Enter text in both boxes to see the diff.';
    return;
  }

  const equalsFn = makeEqualsFn(els.caseInsensitive.checked, els.ignoreWhitespace.checked);
  const originalLines = toLines(originalRaw);
  const changedLines = toLines(changedRaw);
  const diff = computeLcsDiff(originalLines, changedLines, equalsFn);
  lastDiff = diff;

  if (!diff.length) {
    els.diffOutput.innerHTML = '<div class="diff-empty-state">Both texts are empty.</div>';
    els.diffSummary.textContent = 'Enter text in both boxes to see the diff.';
    return;
  }

  let added = 0;
  let removed = 0;
  const html = diff.map((line) => {
    if (line.type === 'added') added++;
    if (line.type === 'removed') removed++;
    const cls = 'diff-line diff-line--' + line.type;
    const marker = markerFor(line.type);
    // Preserve blank lines so the diff view keeps its exact line count.
    const text = line.text === '' ? '&nbsp;' : escapeHtml(line.text);
    return '<div class="' + cls + '"><span class="diff-line-marker">' + marker + '</span><span class="diff-line-text">' + text + '</span></div>';
  }).join('');

  els.diffOutput.innerHTML = html;
  els.diffSummary.innerHTML =
    '<span class="added-count">+' + added + ' lines added</span>, ' +
    '<span class="removed-count">-' + removed + ' lines removed</span>';
}

function diffAsText() {
  return lastDiff
    .map((line) => {
      if (line.type === 'added') return '+ ' + line.text;
      if (line.type === 'removed') return '- ' + line.text;
      return '  ' + line.text;
    })
    .join('\n');
}

els.original.addEventListener('input', render);
els.changed.addEventListener('input', render);
els.caseInsensitive.addEventListener('change', render);
els.ignoreWhitespace.addEventListener('change', render);

els.swapBtn.addEventListener('click', () => {
  const tmp = els.original.value;
  els.original.value = els.changed.value;
  els.changed.value = tmp;
  render();
});

els.clearBtn.addEventListener('click', () => {
  els.original.value = '';
  els.changed.value = '';
  render();
  els.original.focus();
});

els.copyDiffBtn.addEventListener('click', () => {
  if (!lastDiff.length) {
    showToast('Nothing to copy yet');
    return;
  }
  copyToClipboard(diffAsText(), 'Diff copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  render();
});
