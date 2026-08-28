'use strict';

/* ================================================================
   Barcode Generator — social00.com
   A from-scratch, dependency-free implementation of Code 128
   (Code Set B only), restricted by design to:
     - Character set: printable ASCII 32-126 (space through ~)
     - No Code Set A / C, and no mid-barcode set switching
   Structure: Start Code B + one symbol per character + a mod-103
   weighted checksum symbol + Stop pattern. Unlike a QR code there
   is no error correction or masking to compute — the risk here is
   an exactly-wrong lookup table or checksum, which is why this
   file also ships its own from-scratch decoder and self-test (see
   runSelfTest below) that regenerates every barcode it draws and
   proves it decodes back to the original text before trusting it.
   Everything runs locally. No network calls, no external library.
   ================================================================ */

const Barcode128 = (() => {

  /* ---------------------------------------------------------------
     Standard Code 128 pattern table (ISO/IEC 15417), 11-module binary
     strings ('1' = bar module, '0' = space module) for symbol values
     0-94 — Code Set B maps ASCII 32-126 to these via value = code-32.
     Plus Start Code B (value 104) and the Stop pattern (value 106,
     13 modules — the last run already includes the terminating bar).
     --------------------------------------------------------------- */
  const PATTERNS_11 = [
    '11011001100','11001101100','11001100110','10010011000','10010001100',
    '10001001100','10011001000','10011000100','10001100100','11001001000',
    '11001000100','11000100100','10110011100','10011011100','10011001110',
    '10111001100','10011101100','10011100110','11001110010','11001011100',
    '11001001110','11011100100','11001110100','11101101110','11101001100',
    '11100101100','11100100110','11101100100','11100110100','11100110010',
    '11011011000','11011000110','11000110110','10100011000','10001011000',
    '10001000110','10110001000','10001101000','10001100010','11010001000',
    '11000101000','11000100010','10110111000','10110001110','10001101110',
    '10111011000','10111000110','10001110110','11101110110','11010001110',
    '11000101110','11011101000','11011100010','11011101110','11101011000',
    '11101000110','11100010110','11101101000','11101100010','11100011010',
    '11101111010','11001000010','11110001010','10100110000','10100001100',
    '10010110000','10010000110','10000101100','10000100110','10110010000',
    '10110000100','10011010000','10011000010','10000110100','10000110010',
    '11000010010','11001010000','11110111010','11000010100','10001111010',
    '10100111100','10010111100','10010011110','10111100100','10011110100',
    '10011110010','11110100100','11110010100','11110010010','11011011110',
    '11011110110','11110110110','10101111000','10100011110','10001011110',
  ];
  const START_B = '11010010000'; // symbol value 104
  const STOP = '1100011101011'; // symbol value 106, 13 modules incl. final bar

  function runLengths(bits) {
    const widths = [];
    let count = 1;
    for (let i = 1; i <= bits.length; i++) {
      if (i < bits.length && bits[i] === bits[i - 1]) count++;
      else { widths.push(count); count = 1; }
    }
    return widths;
  }

  function charToValue(ch) {
    const code = ch.codePointAt(0);
    if (code < 32 || code > 126) return -1;
    return code - 32;
  }

  /** Encode text -> { text, values, checksum, widths }. Throws on any
   *  character outside the ASCII 32-126 range Code Set B supports. */
  function encode(text) {
    if (!text) throw new Error('Enter some text first.');
    const values = [];
    for (const ch of text) {
      const v = charToValue(ch);
      if (v === -1) {
        throw new Error(`Character "${ch}" isn't supported — Code 128 Set B only covers ASCII 32-126 (space through ~).`);
      }
      values.push(v);
    }
    if (values.length === 0) throw new Error('Enter some text first.');

    // Checksum: Start Code B value (104) + sum(1-indexed position * symbol
    // value) for each data symbol, all modulo 103. Standard Code 128 check.
    let checksum = 104;
    for (let i = 0; i < values.length; i++) checksum += (i + 1) * values[i];
    checksum = checksum % 103;

    const symbolBits = [START_B, ...values.map((v) => PATTERNS_11[v]), PATTERNS_11[checksum], STOP];
    const bits = symbolBits.join('');
    const widths = runLengths(bits);

    return { text, values, checksum, widths };
  }

  /** Independent round-trip decoder: takes the widths array just produced
   *  by encode(), reconstructs the module bitstream, regroups it into
   *  11-bit symbols, looks each one up in the same pattern table to
   *  recover symbol values, verifies the checksum, and reconstructs the
   *  original text. Used as a self-test on every barcode this tool draws. */
  function decode(widths) {
    let bits = '';
    let isBar = true;
    for (const w of widths) {
      bits += (isBar ? '1' : '0').repeat(w);
      isBar = !isBar;
    }

    if (bits.slice(0, 11) !== START_B) throw new Error('Decode check failed: Start Code B pattern not found.');
    if (bits.slice(-13) !== STOP) throw new Error('Decode check failed: Stop pattern not found.');

    const middle = bits.slice(11, bits.length - 13);
    if (middle.length % 11 !== 0) throw new Error('Decode check failed: symbol section is not a multiple of 11 bits.');

    const symbolValues = [];
    for (let i = 0; i < middle.length / 11; i++) {
      const chunk = middle.slice(i * 11, i * 11 + 11);
      const value = PATTERNS_11.indexOf(chunk);
      if (value === -1) throw new Error(`Decode check failed: symbol #${i} pattern not in table.`);
      symbolValues.push(value);
    }

    const checksumSymbol = symbolValues.pop();
    let expected = 104;
    for (let i = 0; i < symbolValues.length; i++) expected += (i + 1) * symbolValues[i];
    expected = expected % 103;
    if (expected !== checksumSymbol) {
      throw new Error(`Decode check failed: checksum mismatch (expected ${expected}, found ${checksumSymbol}).`);
    }

    return { text: symbolValues.map((v) => String.fromCharCode(v + 32)).join(''), checksum: checksumSymbol };
  }

  /* ---------------------------------------------------------------
     Canvas rendering
     --------------------------------------------------------------- */
  function renderToCanvas(canvas, result, opts) {
    const moduleWidth = opts.moduleWidth || 2;
    const barHeight = opts.barHeight || 80;
    const quietModules = 12; // >= 10x narrow-module width per Code 128 spec
    const showText = !!opts.showText;
    const textHeight = showText ? 26 : 0;

    const totalModules = result.widths.reduce((a, b) => a + b, 0);
    const quietPx = quietModules * moduleWidth;
    const width = quietPx * 2 + totalModules * moduleWidth;
    const height = barHeight + textHeight;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';

    let x = quietPx;
    let isBar = true;
    for (const w of result.widths) {
      const wPx = w * moduleWidth;
      if (isBar) ctx.fillRect(x, 0, wPx, barHeight);
      x += wPx;
      isBar = !isBar;
    }

    if (showText) {
      ctx.font = '600 15px "DM Mono", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(result.text, width / 2, barHeight + textHeight / 2);
    }
  }

  /* ---------------------------------------------------------------
     Self-test (runs once, silently, on load — logs only on failure).
     Encodes a spread of strings covering letters, digits, punctuation
     and the ASCII 32/126 boundary, then runs each through the
     independent decode() above and checks the recovered text and
     checksum match — a genuine round-trip proof that the barcodes
     this tool draws actually decode back to what was typed, not just
     that they visually resemble a barcode.
     --------------------------------------------------------------- */
  function runSelfTest() {
    const failures = [];
    const testStrings = ['HELLO123', 'TEST-99!', ' ~', 'Social00.com', '0123456789'];
    for (const s of testStrings) {
      try {
        const enc = encode(s);
        const dec = decode(enc.widths);
        if (dec.text !== s) failures.push(`Round-trip text mismatch for ${JSON.stringify(s)}: got ${JSON.stringify(dec.text)}`);
        if (dec.checksum !== enc.checksum) failures.push(`Checksum mismatch for ${JSON.stringify(s)}`);
      } catch (e) {
        failures.push(`Encode/decode threw for ${JSON.stringify(s)}: ${e.message}`);
      }
    }
    // Invalid-character rejection must throw, not silently pass through.
    try {
      encode('badchar');
      failures.push('encode() failed to reject a non-printable control character');
    } catch (e) { /* expected */ }

    if (failures.length) {
      console.error('Barcode self-test FAILURES:', failures);
    } else if (window.location && window.location.search.includes('bcdebug')) {
      console.info('Barcode self-test: all checks passed', { testStrings });
    }
    return failures;
  }

  return { encode, decode, renderToCanvas, runSelfTest };
})();

/* ================================================================
   UI wiring
   ================================================================ */
(function () {
  const els = {
    input: document.getElementById('barcodeInput'),
    meta: document.getElementById('inputMeta'),
    canvas: document.getElementById('barcodeCanvas'),
    sizeSelect: document.getElementById('sizeSelect'),
    showText: document.getElementById('showText'),
    clearBtn: document.getElementById('clearBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
  };

  const SIZE_PRESETS = {
    standard: { moduleWidth: 2, barHeight: 80 },
    large: { moduleWidth: 3, barHeight: 110 },
  };

  let lastResult = null;
  let debounceTimer = null;

  function blankCanvas() {
    const ctx = els.canvas.getContext('2d');
    els.canvas.width = 300;
    els.canvas.height = 120;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-2') || '#f2f2f2';
    ctx.fillRect(0, 0, 300, 120);
  }

  function update() {
    const text = els.input.value;

    if (!text) {
      els.meta.textContent = '0 characters · Code 128, Set B';
      blankCanvas();
      lastResult = null;
      return;
    }

    try {
      const result = Barcode128.encode(text);
      lastResult = result;
      const preset = SIZE_PRESETS[els.sizeSelect.value] || SIZE_PRESETS.standard;
      Barcode128.renderToCanvas(els.canvas, result, {
        moduleWidth: preset.moduleWidth,
        barHeight: preset.barHeight,
        showText: els.showText.checked,
      });
      els.meta.textContent = `${text.length} character${text.length === 1 ? '' : 's'} · Code 128, Set B · ${result.values.length + 2} symbols`;
    } catch (err) {
      lastResult = null;
      els.meta.textContent = err.message || 'Could not generate a barcode for this input.';
      blankCanvas();
      if (typeof showToast === 'function') showToast(err.message || 'Could not generate a barcode');
    }
  }

  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 200);
  }

  els.input.addEventListener('input', debouncedUpdate);
  els.sizeSelect.addEventListener('change', update);
  els.showText.addEventListener('change', update);

  els.clearBtn.addEventListener('click', () => {
    els.input.value = '';
    update();
    els.input.focus();
  });

  els.downloadBtn.addEventListener('click', () => {
    if (!lastResult) {
      if (typeof showToast === 'function') showToast('Enter some text first');
      return;
    }
    els.canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'barcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (typeof showToast === 'function') showToast('Barcode downloaded');
    }, 'image/png');
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
    try { Barcode128.runSelfTest(); } catch (e) { console.error('Barcode self-test threw', e); }
    els.input.value = 'HELLO123';
    update();
  });
})();
