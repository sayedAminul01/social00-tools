'use strict';

const MODE_NOTES = {
  component: 'URI Component mode uses encodeURIComponent / decodeURIComponent. It escapes everything unsafe inside a single value — including / ? & = # — so use it for a query parameter value or a path segment.',
  full: 'Full URI mode uses encodeURI / decodeURI. It assumes you already have a complete URL and deliberately leaves structural characters like : / ? & = # unescaped, since removing them would break the URL.',
};

const state = {
  mode: 'component', // 'component' | 'full'
  op: 'encode',       // 'encode' | 'decode'
};

const els = {
  modeComponentBtn: document.getElementById('modeComponentBtn'),
  modeFullBtn: document.getElementById('modeFullBtn'),
  modeNote: document.getElementById('modeNote'),
  encodeBtn: document.getElementById('encodeBtn'),
  decodeBtn: document.getElementById('decodeBtn'),
  input: document.getElementById('urlInput'),
  output: document.getElementById('urlOutput'),
  outputMeta: document.getElementById('outputMeta'),
  swapBtn: document.getElementById('swapBtn'),
  clearBtn: document.getElementById('clearBtn'),
  copyBtn: document.getElementById('copyBtn'),
};

function setMode(mode) {
  state.mode = mode;
  els.modeComponentBtn.classList.toggle('active', mode === 'component');
  els.modeComponentBtn.setAttribute('aria-selected', String(mode === 'component'));
  els.modeFullBtn.classList.toggle('active', mode === 'full');
  els.modeFullBtn.setAttribute('aria-selected', String(mode === 'full'));
  els.modeNote.textContent = MODE_NOTES[mode];
  process();
}

function setOp(op) {
  state.op = op;
  els.encodeBtn.classList.toggle('active', op === 'encode');
  els.encodeBtn.setAttribute('aria-selected', String(op === 'encode'));
  els.decodeBtn.classList.toggle('active', op === 'decode');
  els.decodeBtn.setAttribute('aria-selected', String(op === 'decode'));
  process();
}

function process() {
  const input = els.input.value;

  if (!input) {
    els.output.value = '';
    els.outputMeta.textContent = '0 characters';
    return;
  }

  try {
    let result;
    if (state.op === 'encode') {
      result = state.mode === 'component' ? encodeURIComponent(input) : encodeURI(input);
    } else {
      result = state.mode === 'component' ? decodeURIComponent(input) : decodeURI(input);
    }
    els.output.value = result;
    els.outputMeta.textContent = `${result.length} characters`;
  } catch (err) {
    els.output.value = '';
    els.outputMeta.textContent = 'Could not decode — invalid input';
    if (typeof showToast === 'function') {
      showToast('Malformed percent-encoding — could not decode that input');
    }
  }
}

let debounceTimer = null;
function scheduleProcess() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(process, 150);
}

els.modeComponentBtn.addEventListener('click', () => setMode('component'));
els.modeFullBtn.addEventListener('click', () => setMode('full'));
els.encodeBtn.addEventListener('click', () => setOp('encode'));
els.decodeBtn.addEventListener('click', () => setOp('decode'));

els.input.addEventListener('input', scheduleProcess);

els.swapBtn.addEventListener('click', () => {
  const outputValue = els.output.value;
  if (!outputValue) {
    if (typeof showToast === 'function') showToast('Nothing to swap yet');
    return;
  }
  els.input.value = outputValue;
  process();
  els.input.focus();
});

els.clearBtn.addEventListener('click', () => {
  els.input.value = '';
  process();
  els.input.focus();
});

els.copyBtn.addEventListener('click', () => {
  copyToClipboard(els.output.value, 'Output copied');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  setMode('component');
  setOp('encode');
});
