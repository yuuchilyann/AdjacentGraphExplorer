/**
 * Exact (shortest) circuit synthesis for small n by exhaustive breadth-first
 * search over the whole permutation group S_{2ⁿ}.
 *
 * For n ≤ 3 the group has at most 8! = 40 320 elements, so a BFS from the
 * identity reaches every permutation and yields its true minimum gate count
 * for a given gate library. Every gate in every library here is an
 * involution (g∘g = id), which is what makes back-tracking from the target
 * possible without storing parent pointers.
 *
 * n ≥ 4 is out of reach (16! ≈ 2×10¹³ states) — `shortestCircuit` returns
 * null and the UI disables the corresponding controls.
 *
 * Library 'mcx' is exactly the app's own layer model (one legal Hamming-1
 * transposition = one (n−1)-controlled X), i.e. token swapping on the
 * hypercube Qₙ. Its generator order is mirrored by `optimal_layers` in the
 * Python export (src/lib/qiskit.ts) so both produce the same sequence.
 */

export const SYNTH_MAX_N = 3;

export type Control = { q: number; value: 0 | 1 };

export type SynthGate =
  | { kind: 'x'; target: number; controls: Control[] }
  | { kind: 'swap'; targets: [number, number]; controls: Control[] };

export type GateLibraryId =
  | 'mcx'
  | 'mcx-swap'
  | 'mcx-swap-cswap'
  | 'nct'
  | 'nct-swap-cswap';

export const GATE_LIBRARIES: GateLibraryId[] = [
  'mcx',
  'mcx-swap',
  'mcx-swap-cswap',
  'nct',
  'nct-swap-cswap',
];

/** Image of basis state x under one gate. */
export function applyGate(g: SynthGate, x: number): number {
  for (const c of g.controls) if (((x >> c.q) & 1) !== c.value) return x;
  if (g.kind === 'x') return x ^ (1 << g.target);
  const [i, j] = g.targets;
  return ((x >> i) & 1) !== ((x >> j) & 1) ? x ^ (1 << i) ^ (1 << j) : x;
}

/** Classification used for colouring and the per-type gate tally. */
export type GateType = 'mcx' | 'x' | 'cnot' | 'toffoli' | 'swap' | 'cswap';

export function gateType(g: SynthGate, n: number): GateType {
  if (g.kind === 'swap') return g.controls.length === 0 ? 'swap' : 'cswap';
  if (g.controls.length === n - 1 && n >= 2) return 'mcx';
  if (g.controls.length === 0) return 'x';
  if (g.controls.length === 1) return 'cnot';
  return 'toffoli';
}

/** Every assignment of 0/1 values to `qs`, as Control lists (value-major order). */
function polarities(qs: number[]): Control[][] {
  const out: Control[][] = [];
  for (let m = 0; m < 1 << qs.length; m++) {
    out.push(qs.map((q, i) => ({ q, value: ((m >> i) & 1) as 0 | 1 })));
  }
  return out;
}

/**
 * The app's legal layers as MCX gates, in the canonical order
 * (a ascending, then target bit ascending, over edges a → a | 1<<t with
 * bit t of a clear). The Python `legal_edges` uses the same order.
 */
function mcxGates(n: number): SynthGate[] {
  const out: SynthGate[] = [];
  for (let a = 0; a < 1 << n; a++) {
    for (let t = 0; t < n; t++) {
      if ((a >> t) & 1) continue;
      const controls: Control[] = [];
      for (let q = 0; q < n; q++) {
        if (q !== t) controls.push({ q, value: ((a >> q) & 1) as 0 | 1 });
      }
      out.push({ kind: 'x', target: t, controls });
    }
  }
  return out;
}

/** X / CNOT / Toffoli / … with every control subset and polarity (≤ n−1 controls). */
function nctGates(n: number): SynthGate[] {
  const out: SynthGate[] = [];
  for (let t = 0; t < n; t++) {
    const others = Array.from({ length: n }, (_, q) => q).filter((q) => q !== t);
    for (let mask = 0; mask < 1 << others.length; mask++) {
      const qs = others.filter((_, i) => (mask >> i) & 1);
      for (const controls of polarities(qs)) out.push({ kind: 'x', target: t, controls });
    }
  }
  return out;
}

function swapGates(n: number): SynthGate[] {
  const out: SynthGate[] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) out.push({ kind: 'swap', targets: [i, j], controls: [] });
  return out;
}

/** Fredkin-style swap controlled by all n−2 remaining qubits (n ≥ 3). */
function cswapGates(n: number): SynthGate[] {
  if (n < 3) return [];
  const out: SynthGate[] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const others = Array.from({ length: n }, (_, q) => q).filter((q) => q !== i && q !== j);
      for (const controls of polarities(others))
        out.push({ kind: 'swap', targets: [i, j], controls });
    }
  return out;
}

export function libraryGates(n: number, lib: GateLibraryId): SynthGate[] {
  switch (lib) {
    case 'mcx':
      return mcxGates(n);
    case 'mcx-swap':
      return [...mcxGates(n), ...swapGates(n)];
    case 'mcx-swap-cswap':
      return [...mcxGates(n), ...swapGates(n), ...cswapGates(n)];
    case 'nct':
      return nctGates(n);
    case 'nct-swap-cswap':
      return [...nctGates(n), ...swapGates(n), ...cswapGates(n)];
  }
}

type Table = {
  gates: SynthGate[];
  /** tables[g][x] = image of x under gate g */
  maps: Int8Array[];
  dist: Map<number, number>;
};

const cache = new Map<string, Table>();

/** Pack a permutation of {0..S-1} into one number (base S digits). */
function encode(p: ArrayLike<number>, S: number): number {
  let k = 0;
  let m = 1;
  for (let x = 0; x < S; x++) {
    k += p[x]! * m;
    m *= S;
  }
  return k;
}

function table(n: number, lib: GateLibraryId): Table {
  const id = `${n}|${lib}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const S = 1 << n;
  const gates = libraryGates(n, lib);
  const maps = gates.map((g) => {
    const m = new Int8Array(S);
    for (let x = 0; x < S; x++) m[x] = applyGate(g, x);
    return m;
  });
  const start = Int8Array.from({ length: S }, (_, x) => x);
  const dist = new Map<number, number>([[encode(start, S), 0]]);
  let frontier: Int8Array[] = [start];
  let d = 0;
  while (frontier.length > 0) {
    d++;
    const next: Int8Array[] = [];
    for (const p of frontier) {
      for (const m of maps) {
        const q = new Int8Array(S);
        for (let x = 0; x < S; x++) q[x] = m[p[x]!]!;
        const k = encode(q, S);
        if (!dist.has(k)) {
          dist.set(k, d);
          next.push(q);
        }
      }
    }
    frontier = next;
  }
  const t = { gates, maps, dist };
  cache.set(id, t);
  return t;
}

/**
 * A shortest gate sequence (temporal order) realizing `target`
 * (target[x] = α(x)), or null when n is outside 1..SYNTH_MAX_N.
 * Ties are broken deterministically by library order, scanning from the last
 * gate backwards (mirrored by the Python `optimal_layers`).
 */
export function shortestCircuit(
  target: ArrayLike<number>,
  n: number,
  lib: GateLibraryId,
): SynthGate[] | null {
  if (n < 1 || n > SYNTH_MAX_N) return null;
  const S = 1 << n;
  const { gates, maps, dist } = table(n, lib);
  let cur = Int8Array.from({ length: S }, (_, x) => target[x]!);
  let d = dist.get(encode(cur, S));
  if (d === undefined) return null; // not a permutation
  const reversed: SynthGate[] = [];
  while (d > 0) {
    let advanced = false;
    for (let g = 0; g < maps.length; g++) {
      const m = maps[g]!;
      const prev = new Int8Array(S);
      for (let x = 0; x < S; x++) prev[x] = m[cur[x]!]!;
      if (dist.get(encode(prev, S)) === d - 1) {
        reversed.push(gates[g]!);
        cur = prev;
        d--;
        advanced = true;
        break;
      }
    }
    if (!advanced) return null; // unreachable for involutive libraries
  }
  return reversed.reverse();
}

/** Push every basis state through `gates`; true iff the result equals `target`. */
export function verifyCircuit(gates: SynthGate[], target: ArrayLike<number>, n: number): boolean {
  for (let x = 0; x < 1 << n; x++) {
    let v = x;
    for (const g of gates) v = applyGate(g, v);
    if (v !== target[x]) return false;
  }
  return true;
}

/**
 * Lower bound on the number of legal (Hamming-1) layers for any n — the
 * larger of
 *   • cycle bound    2ⁿ − (#cycles, fixed points included): a transposition
 *                    changes the cycle count by exactly ±1;
 *   • distance bound ⌈Σₓ d_H(x, α(x)) / 2⌉: one legal swap moves two states
 *                    one Hamming step each.
 * When a realization reaches this bound it is provably optimal.
 */
export function legalLayerLowerBound(
  target: ArrayLike<number>,
  n: number,
): { cycle: number; distance: number; bound: number } {
  const S = 1 << n;
  const seen = new Uint8Array(S);
  let cycles = 0;
  let dsum = 0;
  for (let x = 0; x < S; x++) {
    let v = (target[x]! ^ x) >>> 0;
    while (v) {
      dsum += v & 1;
      v >>>= 1;
    }
    if (seen[x]) continue;
    cycles++;
    let y = x;
    while (!seen[y]) {
      seen[y] = 1;
      y = target[y]!;
    }
  }
  const cycle = S - cycles;
  const distance = Math.ceil(dsum / 2);
  return { cycle, distance, bound: Math.max(cycle, distance) };
}

/** One MCX gate of library 'mcx' → the legal swap pair it performs. */
export function mcxGateToSwap(g: SynthGate): [number, number] {
  if (g.kind !== 'x') throw new Error('not an MCX gate');
  let a = 0;
  for (const c of g.controls) if (c.value) a |= 1 << c.q;
  return [a, a | (1 << g.target)];
}
