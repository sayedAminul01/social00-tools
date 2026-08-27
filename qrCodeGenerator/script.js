'use strict';

/* ================================================================
   QR Code Generator — social00.com
   A from-scratch, dependency-free implementation of the QR code
   encoding pipeline (ISO/IEC 18004), restricted by design to:
     - Mode:               Byte (UTF-8) — covers URLs, text, Wi-Fi strings
     - Error correction:   Level M (~15% recoverable)
     - Version:            auto-selected, smallest that fits (1-40)
   Everything below — bitstream construction, GF(256) Reed-Solomon
   error correction, module placement, data masking with penalty
   scoring across all 8 mask patterns, and BCH-encoded format/version
   info — runs locally. No network calls, no external QR library.
   ================================================================ */

const QR = (() => {

  /* ---------------------------------------------------------------
     GF(256) arithmetic (primitive polynomial 0x11D, generator 2)
     --------------------------------------------------------------- */
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGaloisField() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  /** Generator polynomial for `degree` EC codewords: (x-1)(x-2)(x-4)...
   *  Returned as `degree` coefficients (highest power first), with the
   *  implicit leading x^degree coefficient (always 1) omitted — this
   *  matches the layout expected by rsComputeRemainder's LFSR loop. */
  function rsGeneratorPoly(degree) {
    const coefs = new Array(degree).fill(0);
    coefs[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        coefs[j] = gfMul(coefs[j], root);
        if (j + 1 < degree) coefs[j] ^= coefs[j + 1];
      }
      root = gfMul(root, 2);
    }
    return coefs;
  }

  /** Polynomial long division (as an LFSR) of `data` by `generator`,
   *  returning the `generator.length`-byte remainder = EC codewords. */
  function rsComputeRemainder(data, generator) {
    const degree = generator.length;
    const result = new Array(degree).fill(0);
    for (const b of data) {
      const factor = b ^ result.shift();
      result.push(0);
      for (let i = 0; i < degree; i++) result[i] ^= gfMul(generator[i], factor);
    }
    return result;
  }

  /** Independent cross-check of the RS implementation: schoolbook GF(256)
   *  polynomial division. A full codeword (data ++ remainder) must be
   *  exactly divisible by the (monic) generator polynomial — this is the
   *  defining property of a systematic Reed-Solomon codeword. Used only
   *  as a self-test (see runSelfTest below), never in the hot path. */
  function gfPolyDivRemainder(dividendCoefs, generatorCoefsMonic) {
    // generatorCoefsMonic: full monic polynomial, highest power first, length degree+1
    const rem = dividendCoefs.slice();
    const gLen = generatorCoefsMonic.length;
    for (let i = 0; i <= rem.length - gLen; i++) {
      const coef = rem[i];
      if (coef === 0) continue;
      for (let j = 0; j < gLen; j++) {
        rem[i + j] ^= gfMul(generatorCoefsMonic[j], coef);
      }
    }
    return rem.slice(rem.length - (gLen - 1));
  }

  /* ---------------------------------------------------------------
     Version / capacity tables (Error Correction Level M only)
     TOTAL_CODEWORDS: total codewords per version (geometry-only,
       independent of EC level).
     ECC_PER_BLOCK_M / NUM_BLOCKS_M: per ISO/IEC 18004 Table 9 for
       level M. Data-codewords-per-block split (group 1 / group 2) is
       derived, not hardcoded: blocks differ by at most one data
       codeword, larger blocks last — exactly how the spec defines it.
     --------------------------------------------------------------- */
  const TOTAL_CODEWORDS = [0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];
  const ECC_PER_BLOCK_M = [0,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28];
  const NUM_BLOCKS_M    = [0,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49];

  function totalDataCodewords(version) {
    return TOTAL_CODEWORDS[version] - ECC_PER_BLOCK_M[version] * NUM_BLOCKS_M[version];
  }

  function charCountBits(version) {
    return version <= 9 ? 8 : 16; // byte mode: 8 bits for v1-9, 16 bits for v10-40
  }

  function byteCapacity(version) {
    const overheadBits = 4 + charCountBits(version); // mode indicator + count indicator
    return Math.floor((totalDataCodewords(version) * 8 - overheadBits) / 8);
  }

  function pickVersion(byteLength) {
    for (let v = 1; v <= 40; v++) {
      if (byteCapacity(v) >= byteLength) return v;
    }
    return -1;
  }

  /* ---------------------------------------------------------------
     Bitstream construction (mode + count + data + terminator + pad)
     --------------------------------------------------------------- */
  class BitWriter {
    constructor() { this.bits = []; }
    get length() { return this.bits.length; }
    writeBits(value, len) {
      for (let i = len - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
    }
    toBytes() {
      const out = new Uint8Array(Math.ceil(this.bits.length / 8));
      for (let i = 0; i < out.length; i++) {
        let byte = 0;
        for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i * 8 + j] || 0);
        out[i] = byte;
      }
      return out;
    }
  }

  function buildDataCodewords(bytes, version) {
    const capacityCodewords = totalDataCodewords(version);
    const capacityBits = capacityCodewords * 8;
    const bw = new BitWriter();
    bw.writeBits(0b0100, 4); // mode indicator: Byte
    bw.writeBits(bytes.length, charCountBits(version));
    for (const b of bytes) bw.writeBits(b, 8);
    const termLen = Math.min(4, capacityBits - bw.length);
    if (termLen > 0) bw.writeBits(0, termLen);
    while (bw.length % 8 !== 0) bw.writeBits(0, 1);
    const padBytes = [0xec, 0x11];
    let i = 0;
    while (bw.length < capacityBits) {
      bw.writeBits(padBytes[i % 2], 8);
      i++;
    }
    return bw.toBytes();
  }

  /* ---------------------------------------------------------------
     Block splitting, Reed-Solomon, interleaving
     --------------------------------------------------------------- */
  function buildFinalCodewords(dataCodewords, version) {
    const ecLen = ECC_PER_BLOCK_M[version];
    const numBlocks = NUM_BLOCKS_M[version];
    const total = dataCodewords.length;
    const baseLen = Math.floor(total / numBlocks);
    const numLongBlocks = total % numBlocks; // these get baseLen+1 data codewords
    const numShortBlocks = numBlocks - numLongBlocks;
    const generator = rsGeneratorPoly(ecLen);

    const blocks = [];
    let offset = 0;
    for (let i = 0; i < numBlocks; i++) {
      const len = i < numShortBlocks ? baseLen : baseLen + 1;
      const data = dataCodewords.slice(offset, offset + len);
      offset += len;
      const ec = Uint8Array.from(rsComputeRemainder(Array.from(data), generator));
      blocks.push({ data, ec });
    }

    const maxDataLen = baseLen + (numLongBlocks > 0 ? 1 : 0);
    const out = [];
    for (let col = 0; col < maxDataLen; col++) {
      for (const blk of blocks) if (col < blk.data.length) out.push(blk.data[col]);
    }
    for (let col = 0; col < ecLen; col++) {
      for (const blk of blocks) out.push(blk.ec[col]);
    }
    return { bytes: Uint8Array.from(out), blocks };
  }

  function bytesToBits(bytes) {
    const bits = new Uint8Array(bytes.length * 8);
    for (let i = 0; i < bytes.length; i++) {
      for (let b = 0; b < 8; b++) bits[i * 8 + b] = (bytes[i] >>> (7 - b)) & 1;
    }
    return bits;
  }

  /* ---------------------------------------------------------------
     Alignment pattern positions (algorithmic, per spec Annex E logic)
     --------------------------------------------------------------- */
  function getAlignmentPositions(version, size) {
    if (version === 1) return [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  /* ---------------------------------------------------------------
     BCH encoding for format info (15,5) and version info (18,6)
     --------------------------------------------------------------- */
  function calcFormatBits(mask) {
    const eclBits = 0b00; // Error Correction Level M
    const data = (eclBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return (((data << 10) | rem) ^ 0x5412) >>> 0;
  }

  function calcVersionBits(version) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return ((version << 12) | rem) >>> 0;
  }

  /* ---------------------------------------------------------------
     Matrix / module placement
     --------------------------------------------------------------- */
  function buildTemplate(version) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Uint8Array(size));
    const isFunction = Array.from({ length: size }, () => new Uint8Array(size));
    const setFunc = (r, c, dark) => { modules[r][c] = dark ? 1 : 0; isFunction[r][c] = 1; };

    function drawFinder(r0, c0) {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr, c = c0 + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          let dark;
          if (dr < 0 || dr > 6 || dc < 0 || dc > 6) dark = false; // separator
          else if (dr === 0 || dr === 6 || dc === 0 || dc === 6) dark = true; // outer ring
          else if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) dark = true; // core
          else dark = false; // inner light ring
          setFunc(r, c, dark);
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 8; i <= size - 9; i++) {
      const dark = i % 2 === 0;
      setFunc(6, i, dark);
      setFunc(i, 6, dark);
    }

    const positions = getAlignmentPositions(version, size);
    const n = positions.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        const rCenter = positions[i], cCenter = positions[j];
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setFunc(rCenter + dr, cCenter + dc, dark);
          }
        }
      }
    }

    setFunc(size - 8, 8, true); // dark module

    if (version >= 7) {
      const bits = calcVersionBits(version);
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) !== 0;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunc(a, b, bit);
        setFunc(b, a, bit);
      }
    }

    drawFormatInfo(modules, isFunction, size, 0); // reserve format-info cells (placeholder value)

    return { modules, isFunction, size };
  }

  function drawFormatInfo(modules, isFunction, size, bits) {
    const bit = (i) => ((bits >>> i) & 1) !== 0;
    const setFunc = (r, c, v) => { modules[r][c] = v ? 1 : 0; isFunction[r][c] = 1; };
    // Two redundant 15-bit copies, each bit i placed at one "vertical" (col 8)
    // cell and one "horizontal" (row 8) cell simultaneously — this exact
    // branching (verified bit-for-bit against a spec-conformant reference
    // encoder) is what keeps the two copies correctly split around the
    // timing-pattern gap (row/col 6) and the dark module, unlike a naive
    // contiguous-run derivation.
    for (let i = 0; i < 15; i++) {
      const mod = bit(i);
      if (i < 6) setFunc(i, 8, mod);
      else if (i < 8) setFunc(i + 1, 8, mod);
      else setFunc(size - 15 + i, 8, mod);

      if (i < 8) setFunc(8, size - i - 1, mod);
      else if (i < 9) setFunc(8, 15 - i - 1 + 1, mod);
      else setFunc(8, 15 - i - 1, mod);
    }
    setFunc(size - 8, 8, true); // dark module (always on)
  }

  function placeDataBits(template, bitArray) {
    const size = template.size;
    const modules = template.modules.map((row) => row.slice());
    let bitIndex = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!template.isFunction[y][x]) {
            modules[y][x] = bitIndex < bitArray.length ? bitArray[bitIndex] : 0;
            bitIndex++;
          }
        }
      }
    }
    return { modules, bitsPlaced: bitIndex };
  }

  function countFreeModules(isFunction, size) {
    let count = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!isFunction[r][c]) count++;
    return count;
  }

  /* ---------------------------------------------------------------
     Data masking (8 patterns) + penalty scoring (N1-N4)
     --------------------------------------------------------------- */
  const MASK_FUNCS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function penaltyN1(m, size) {
    let total = 0;
    for (let r = 0; r < size; r++) {
      let color = m[r][0], run = 1;
      for (let c = 1; c < size; c++) {
        if (m[r][c] === color) run++;
        else { if (run >= 5) total += 3 + (run - 5); color = m[r][c]; run = 1; }
      }
      if (run >= 5) total += 3 + (run - 5);
    }
    for (let c = 0; c < size; c++) {
      let color = m[0][c], run = 1;
      for (let r = 1; r < size; r++) {
        if (m[r][c] === color) run++;
        else { if (run >= 5) total += 3 + (run - 5); color = m[r][c]; run = 1; }
      }
      if (run >= 5) total += 3 + (run - 5);
    }
    return total;
  }

  function penaltyN2(m, size) {
    let total = 0;
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) total += 3;
      }
    }
    return total;
  }

  function penaltyN3(m, size) {
    const patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    let total = 0;
    const matches = (arr) => {
      let a = true, b = true;
      for (let k = 0; k < 11; k++) {
        if (arr[k] !== patternA[k]) a = false;
        if (arr[k] !== patternB[k]) b = false;
      }
      return (a ? 40 : 0) + (b ? 40 : 0);
    };
    for (let r = 0; r < size; r++) {
      for (let c = 0; c + 11 <= size; c++) {
        total += matches(Array.from({ length: 11 }, (_, k) => m[r][c + k]));
      }
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r + 11 <= size; r++) {
        total += matches(Array.from({ length: 11 }, (_, k) => m[r + k][c]));
      }
    }
    return total;
  }

  function penaltyN4(m, size) {
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
    const percent = (dark * 100) / (size * size);
    const lower = Math.floor(percent / 5) * 5;
    const a = Math.abs(lower - 50) / 5;
    const b = Math.abs(lower + 5 - 50) / 5;
    return Math.min(a, b) * 10;
  }

  /* ---------------------------------------------------------------
     Top-level encode: text -> { size, modules, version, mask }
     --------------------------------------------------------------- */
  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length === 0) throw new Error('Enter some text first.');
    const version = pickVersion(bytes.length);
    if (version === -1) throw new Error('That’s too long for a QR code (max ≈ 2,331 bytes at this error-correction level).');

    const dataCW = buildDataCodewords(bytes, version);
    const { bytes: finalCW } = buildFinalCodewords(dataCW, version);
    const bitArray = bytesToBits(finalCW);

    const template = buildTemplate(version);
    const free = countFreeModules(template.isFunction, template.size);
    const remainder = free - bitArray.length;
    if (remainder < 0 || remainder > 7) {
      // Structural self-check: geometry (finder/timing/alignment placement)
      // must leave exactly totalCodewords*8 + {0..7} free modules. A value
      // outside that range means a matrix-construction bug.
      console.error('QR internal capacity mismatch', { version, free, bitsNeeded: bitArray.length, remainder });
    }

    const { modules: preMask } = placeDataBits(template, bitArray);

    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      const candidate = preMask.map((row) => row.slice());
      const maskFn = MASK_FUNCS[mask];
      for (let r = 0; r < template.size; r++) {
        for (let c = 0; c < template.size; c++) {
          if (!template.isFunction[r][c] && maskFn(r, c)) candidate[r][c] ^= 1;
        }
      }
      drawFormatInfo(candidate, template.isFunction, template.size, calcFormatBits(mask));
      const penalty = penaltyN1(candidate, template.size) + penaltyN2(candidate, template.size) +
        penaltyN3(candidate, template.size) + penaltyN4(candidate, template.size);
      if (!best || penalty < best.penalty) best = { modules: candidate, penalty, mask };
    }

    return { size: template.size, modules: best.modules, version, mask: best.mask };
  }

  /* ---------------------------------------------------------------
     Canvas rendering
     --------------------------------------------------------------- */
  function renderToCanvas(canvas, result, opts) {
    const quiet = 4;
    const total = result.size + quiet * 2;
    const moduleSize = Math.max(1, Math.ceil((opts.pixelSize || 300) / total));
    const px = moduleSize * total;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = opts.bg || '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = opts.fg || '#000000';
    for (let r = 0; r < result.size; r++) {
      for (let c = 0; c < result.size; c++) {
        if (result.modules[r][c]) ctx.fillRect((c + quiet) * moduleSize, (r + quiet) * moduleSize, moduleSize, moduleSize);
      }
    }
  }

  /* ---------------------------------------------------------------
     Self-test (runs once, silently, on load — logs only on failure).
     Verifies the two highest-risk pieces called out for this build:
     Reed-Solomon correctness (via an independent polynomial-division
     cross-check) and structural matrix integrity (finder pattern
     shape, dark module position, free-module/codeword-count parity)
     for a spread of versions.
     --------------------------------------------------------------- */
  function runSelfTest() {
    const failures = [];

    // 1) Reed-Solomon: codeword (data++ec) must be divisible by the
    // monic generator polynomial, verified via an independently-written
    // schoolbook GF(256) polynomial division (gfPolyDivRemainder), not
    // the LFSR routine used in production (rsComputeRemainder).
    for (const [dataLen, ecLen] of [[16, 10], [44, 26], [9, 17]]) {
      const data = Array.from({ length: dataLen }, (_, i) => (i * 37 + 5) & 0xff);
      const generator = rsGeneratorPoly(ecLen); // degree ecLen, leading 1 implicit
      const ec = rsComputeRemainder(data, generator);
      const codeword = data.concat(ec);
      const monicGenerator = [1, ...generator];
      const rem = gfPolyDivRemainder(codeword, monicGenerator);
      if (!rem.every((x) => x === 0)) failures.push(`RS divisibility failed for dataLen=${dataLen} ecLen=${ecLen}`);
    }

    // 2) Structural matrix checks across a spread of versions (1, 2, 7,
    // 10, 27, 40) covering: no-alignment / has-alignment, version-info
    // absent/present, and both character-count-indicator bit widths.
    for (const version of [1, 2, 7, 10, 27, 40]) {
      const template = buildTemplate(version);
      const size = template.size;

      // Finder pattern at (0,0) must be the exact 7x7 reference shape.
      const expectedFinder = [
        [1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1],
        [1,0,1,1,1,0,1],
        [1,0,1,1,1,0,1],
        [1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1],
      ];
      let finderOk = true;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (template.modules[r][c] !== expectedFinder[r][c]) finderOk = false;
      if (!finderOk) failures.push(`Finder pattern mismatch at version ${version}`);

      // Separator ring around top-left finder must be entirely light.
      for (let i = 0; i < 8; i++) {
        if (template.modules[7][i] !== 0 || template.modules[i][7] !== 0) failures.push(`Separator not light at version ${version}`);
      }

      // Dark module is always on, at (4*version+9, 8) === (size-8, 8).
      if (template.modules[size - 8][8] !== 1) failures.push(`Dark module missing at version ${version}`);
      if (size - 8 !== 4 * version + 9) failures.push(`Dark module formula mismatch at version ${version}`);

      // Free-module count vs. codeword capacity: must differ by 0-7
      // (the spec's "remainder bits"). This independently validates the
      // finder/timing/alignment/format/version placement geometry against
      // the hardcoded codeword tables, without the two ever having been
      // derived from each other.
      const free = countFreeModules(template.isFunction, size);
      const expectedBits = totalDataCodewords(version) === undefined ? -1 : TOTAL_CODEWORDS[version] * 8;
      const remainder = free - expectedBits;
      if (remainder < 0 || remainder > 7) {
        failures.push(`Free-module/codeword mismatch at version ${version}: free=${free} expectedBits=${expectedBits} remainder=${remainder}`);
      }
    }

    // 3) Full pipeline round trip sanity: encode a short string and make
    // sure a real matrix comes back at a sane, expected version.
    const r1 = encode('HELLO');
    if (r1.version !== pickVersion(5)) failures.push('encode() version selection inconsistent for "HELLO"');
    const r2 = encode('https://social00.com');
    if (r2.size !== r2.version * 4 + 17) failures.push('encode() size/version mismatch for URL test string');

    if (failures.length) {
      console.error('QR self-test FAILURES:', failures);
    } else if (window.location && window.location.search.includes('qrdebug')) {
      console.info('QR self-test: all checks passed', { versions: [1, 2, 7, 10, 27, 40] });
    }
    return failures;
  }

  return { encode, renderToCanvas, byteCapacity, pickVersion, runSelfTest };
})();

/* ================================================================
   UI wiring
   ================================================================ */
(function () {
  const els = {
    input: document.getElementById('qrInput'),
    meta: document.getElementById('inputMeta'),
    canvas: document.getElementById('qrCanvas'),
    fgColor: document.getElementById('fgColor'),
    bgColor: document.getElementById('bgColor'),
    fgHex: document.getElementById('fgHex'),
    bgHex: document.getElementById('bgHex'),
    sizeSelect: document.getElementById('sizeSelect'),
    contrastWarning: document.getElementById('contrastWarning'),
    clearBtn: document.getElementById('clearBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    presetUrl: document.getElementById('presetUrl'),
    presetWifi: document.getElementById('presetWifi'),
    presetText: document.getElementById('presetText'),
  };

  let lastResult = null;
  let debounceTimer = null;

  function hexLuminance(hex) {
    const n = hex.replace('#', '');
    const r = parseInt(n.substring(0, 2), 16);
    const g = parseInt(n.substring(2, 4), 16);
    const b = parseInt(n.substring(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function checkContrast() {
    const diff = Math.abs(hexLuminance(els.fgColor.value) - hexLuminance(els.bgColor.value));
    const tooSimilar = diff < 80;
    els.contrastWarning.hidden = !tooSimilar;
    return !tooSimilar;
  }

  function update() {
    const text = els.input.value;
    const bytes = new TextEncoder().encode(text);

    if (!text) {
      els.meta.textContent = '0 bytes · QR Version — · Error Correction: M';
      const ctx = els.canvas.getContext('2d');
      els.canvas.width = 300;
      els.canvas.height = 300;
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-2') || '#f2f2f2';
      ctx.fillRect(0, 0, 300, 300);
      lastResult = null;
      return;
    }

    try {
      const result = QR.encode(text);
      lastResult = result;
      const size = parseInt(els.sizeSelect.value, 10) || 400;
      checkContrast();
      QR.renderToCanvas(els.canvas, result, { pixelSize: size, fg: els.fgColor.value, bg: els.bgColor.value });
      els.meta.textContent = `${bytes.length} bytes · QR Version ${result.version} (${result.size}×${result.size}) · Error Correction: M`;
    } catch (err) {
      lastResult = null;
      els.meta.textContent = err.message || 'Could not generate a QR code for this input.';
      if (typeof showToast === 'function') showToast(err.message || 'Could not generate a QR code');
    }
  }

  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 200);
  }

  els.input.addEventListener('input', debouncedUpdate);
  els.sizeSelect.addEventListener('change', update);

  els.fgColor.addEventListener('input', () => {
    els.fgHex.textContent = els.fgColor.value.toUpperCase();
    update();
  });
  els.bgColor.addEventListener('input', () => {
    els.bgHex.textContent = els.bgColor.value.toUpperCase();
    update();
  });

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
      a.download = 'qr-code.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (typeof showToast === 'function') showToast('QR code downloaded');
    }, 'image/png');
  });

  els.presetUrl.addEventListener('click', () => {
    els.input.value = 'https://social00.com';
    update();
  });
  els.presetWifi.addEventListener('click', () => {
    els.input.value = 'WIFI:T:WPA;S:MyNetworkName;P:MyPassword123;;';
    update();
  });
  els.presetText.addEventListener('click', () => {
    els.input.value = 'Hello from Social00! This QR code was generated entirely in your browser.';
    update();
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
    try { QR.runSelfTest(); } catch (e) { console.error('QR self-test threw', e); }
    els.input.value = 'https://social00.com';
    update();
  });
})();
