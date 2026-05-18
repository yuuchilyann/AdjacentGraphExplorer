// Self-contained correctness check for the layered realization algorithm.
// Mirrors src/lib/layered.ts; run with `node scripts/verify-layered.mjs`.

function hammingDistance(a, b) {
  let v = (a ^ b) >>> 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return (v * 0x01010101) >>> 24;
}

function bitsAscending(mask) {
  const out = [];
  let m = mask >>> 0;
  let b = 0;
  while (m !== 0) {
    if (m & 1) out.push(b);
    m >>>= 1;
    b++;
  }
  return out;
}

function grayPath(i, j, strategy) {
  const clearBits = bitsAscending(i & ~j);
  const setBits = bitsAscending(j & ~i);
  const phases =
    strategy === 'above' ? [clearBits, setBits] : [setBits, clearBits];
  const path = [i];
  let cur = i;
  for (const phase of phases) {
    for (const b of phase) {
      cur = (cur ^ (1 << b)) >>> 0;
      path.push(cur);
    }
  }
  return path;
}

function normSwap(a, b) {
  return a <= b ? [a, b] : [b, a];
}

function decomposeTransposition(i, j, strategy) {
  const d = hammingDistance(i, j);
  if (d === 0) return [];
  if (d === 1) return [normSwap(i, j)];
  const path = grayPath(i, j, strategy);
  const edges = [];
  for (let k = 0; k < d; k++) {
    edges.push(normSwap(path[k], path[k + 1]));
  }
  const out = [];
  if (strategy === 'above') {
    for (let k = 0; k <= d - 1; k++) out.push(edges[k]);
    for (let k = d - 2; k >= 0; k--) out.push(edges[k]);
  } else {
    for (let k = d - 1; k >= 0; k--) out.push(edges[k]);
    for (let k = 1; k <= d - 1; k++) out.push(edges[k]);
  }
  return out;
}

function cycleDecomposition(mapping, n) {
  const total = 1 << n;
  const visited = new Set();
  const cycles = [];
  for (let start = 0; start < total; start++) {
    if (visited.has(start)) continue;
    if (!mapping.has(start)) continue;
    const cycle = [];
    let cur = start;
    while (!visited.has(cur) && mapping.has(cur)) {
      visited.add(cur);
      cycle.push(cur);
      cur = mapping.get(cur);
      if (cur === start) break;
    }
    if (cycle.length > 1 && mapping.get(cycle[cycle.length - 1]) === start) {
      cycles.push(cycle);
    }
  }
  return cycles;
}

function realizeLayered(mapping, n, strategy) {
  const layers = [];
  const cycles = cycleDecomposition(mapping, n);
  for (const cycle of cycles) {
    if (cycle.length === 2) {
      layers.push(...decomposeTransposition(cycle[0], cycle[1], strategy));
    } else {
      const a0 = cycle[0];
      for (let k = 1; k < cycle.length; k++) {
        layers.push(...decomposeTransposition(a0, cycle[k], strategy));
      }
    }
  }
  return layers;
}

function applyLayers(start, layers) {
  let v = start;
  for (const [a, b] of layers) {
    if (v === a) v = b;
    else if (v === b) v = a;
  }
  return v;
}

function checkLegalLayers(layers) {
  for (const [a, b] of layers) {
    if (hammingDistance(a, b) > 1) {
      return { ok: false, illegal: [a, b], d: hammingDistance(a, b) };
    }
  }
  return { ok: true };
}

function verifyMapping(mapping, n, layers) {
  const total = 1 << n;
  for (let r = 0; r < total; r++) {
    const expected = mapping.has(r) ? mapping.get(r) : r;
    const actual = applyLayers(r, layers);
    if (expected !== actual) {
      return { ok: false, source: r, expected, actual };
    }
  }
  return { ok: true };
}

function makeMapping(perm) {
  const m = new Map();
  for (let i = 0; i < perm.length; i++) m.set(i, perm[i]);
  return m;
}

function* permutationsOf(k) {
  const arr = Array.from({ length: k }, (_, i) => i);
  function* go(start) {
    if (start === arr.length) {
      yield arr.slice();
      return;
    }
    for (let i = start; i < arr.length; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      yield* go(start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  }
  yield* go(0);
}

function randomPerm(k, rng) {
  const arr = Array.from({ length: k }, (_, i) => i);
  for (let i = k - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function runOne(mapping, n, strategy, results) {
  const layers = realizeLayered(mapping, n, strategy);
  const legal = checkLegalLayers(layers);
  if (!legal.ok) {
    results.failures++;
    if (results.failures <= 3) {
      results.firstFailures.push({
        kind: 'illegal-layer',
        n,
        strategy,
        illegal: legal.illegal,
        d: legal.d,
      });
    }
    return false;
  }
  const verify = verifyMapping(mapping, n, layers);
  if (!verify.ok) {
    results.failures++;
    if (results.failures <= 3) {
      results.firstFailures.push({ kind: 'wrong-target', n, strategy, ...verify });
    }
    return false;
  }
  results.maxLayerCount = Math.max(results.maxLayerCount, layers.length);
  return true;
}

function exhaustive(n, strategy) {
  const total = 1 << n;
  const results = { count: 0, failures: 0, firstFailures: [], maxLayerCount: 0 };
  for (const perm of permutationsOf(total)) {
    results.count++;
    runOne(makeMapping(perm), n, strategy, results);
  }
  return results;
}

function randomSample(n, strategy, samples, seed) {
  const total = 1 << n;
  const rng = makeRng(seed);
  const results = { count: 0, failures: 0, firstFailures: [], maxLayerCount: 0 };
  for (let i = 0; i < samples; i++) {
    results.count++;
    runOne(makeMapping(randomPerm(total, rng)), n, strategy, results);
  }
  return results;
}

function allTranspositions(n, strategy) {
  const total = 1 << n;
  const results = {
    count: 0,
    failures: 0,
    firstFailures: [],
    maxLayerCount: 0,
    byDistance: {},
  };
  for (let i = 0; i < total; i++) {
    for (let j = i + 1; j < total; j++) {
      const d = hammingDistance(i, j);
      const m = new Map();
      for (let k = 0; k < total; k++) m.set(k, k);
      m.set(i, j);
      m.set(j, i);
      results.count++;
      const layers = realizeLayered(m, n, strategy);
      const legal = checkLegalLayers(layers);
      const verify = verifyMapping(m, n, layers);
      const ok = legal.ok && verify.ok;
      if (!ok) {
        results.failures++;
        if (results.failures <= 3) {
          results.firstFailures.push({
            kind: legal.ok ? 'wrong-target' : 'illegal-layer',
            n,
            strategy,
            i,
            j,
            d,
            ...(legal.ok ? verify : legal),
          });
        }
      } else {
        results.maxLayerCount = Math.max(results.maxLayerCount, layers.length);
        results.byDistance[d] = results.byDistance[d] || { count: 0, layers: 0 };
        results.byDistance[d].count++;
        results.byDistance[d].layers = Math.max(
          results.byDistance[d].layers,
          layers.length,
        );
      }
    }
  }
  return results;
}

function fmt(r) {
  return `${r.count} tested, ${r.failures} failures, max layers=${r.maxLayerCount}`;
}

console.log('═══ Exhaustive: every permutation in S_(2^n) for n = 0..3 ═══');
for (const n of [0, 1, 2, 3]) {
  for (const strategy of ['above', 'below']) {
    const r = exhaustive(n, strategy);
    const tag = r.failures === 0 ? 'OK' : 'FAIL';
    console.log(`  [${tag}] n=${n} ${strategy.padEnd(5)} : ${fmt(r)}`);
    for (const f of r.firstFailures) console.log('         ↳', f);
  }
}

console.log('');
console.log('═══ Random sample: 500 random permutations, n = 4..7 ═══');
for (const n of [4, 5, 6, 7]) {
  for (const strategy of ['above', 'below']) {
    const r = randomSample(n, strategy, 500, 42 + n * 7);
    const tag = r.failures === 0 ? 'OK' : 'FAIL';
    console.log(`  [${tag}] n=${n} ${strategy.padEnd(5)} : ${fmt(r)}`);
    for (const f of r.firstFailures) console.log('         ↳', f);
  }
}

console.log('');
console.log('═══ All 2-element transpositions, n = 2..7 (max d = n) ═══');
for (const n of [2, 3, 4, 5, 6, 7]) {
  for (const strategy of ['above', 'below']) {
    const r = allTranspositions(n, strategy);
    const tag = r.failures === 0 ? 'OK' : 'FAIL';
    const dInfo = Object.entries(r.byDistance)
      .map(([d, v]) => `d=${d}:×${v.count}(≤${v.layers}L)`)
      .join(' ');
    console.log(`  [${tag}] n=${n} ${strategy.padEnd(5)} : ${fmt(r)}  [${dInfo}]`);
    for (const f of r.firstFailures) console.log('         ↳', f);
  }
}

console.log('');
console.log('Done.');
