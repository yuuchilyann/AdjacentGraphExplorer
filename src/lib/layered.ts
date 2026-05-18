/**
 * Layered realization of an arbitrary target permutation through a sequence
 * of legal layer-permutations (each a subgraph of the Adjacent Bipartite
 * Graph). For d-distance transpositions in n=2, this uses the conjugation
 * identity (i j) = (i k)(k j)(i k); 'above' picks the AND-bridge (lower
 * weight), 'below' picks the OR-bridge (higher weight).
 */

import {
  cycleDecomposition,
  hammingDistance,
  type Mapping,
} from './permutation';

export type Strategy = 'above' | 'below';

/** One layer of the realization: a single legal transposition (d ≤ 1). */
export type LayerStep = {
  swap: [number, number];
};

export type Verification = {
  ok: boolean;
  /** Rows where the realized trajectory's endpoint disagrees with the target. */
  mismatches: Array<{ source: number; expected: number; actual: number }>;
  /** Layers whose swap pair has Hamming distance > 1 (should be empty). */
  illegalLayers: Array<{ index: number; swap: [number, number]; d: number }>;
};

export type LayeredRealization = {
  strategy: Strategy;
  layers: LayerStep[]; // temporal order: applied first to last
  /** trajectories[row][col] — col 0 is source, col = layers.length is image */
  trajectories: number[][];
  /** Set of row indices that are non-trivial (i.e., final ≠ initial). */
  movedRows: Set<number>;
  /** True if the target was already a subgraph of G (no decomposition needed). */
  alreadyLegal: boolean;
  /** Highest single-row Hamming distance in the original target. */
  maxDirectDistance: number;
  /** Unsupported cycles that we did not decompose. */
  unsupported: number[][];
  /** Runtime self-check: every layer legal & every row reaches target. */
  verification: Verification;
};

function applySwap(value: number, layer: LayerStep): number {
  const [a, b] = layer.swap;
  if (value === a) return b;
  if (value === b) return a;
  return value;
}

/** Bit indices set in mask, ascending (bit 0 first). */
function bitsAscending(mask: number): number[] {
  const out: number[] = [];
  let m = mask >>> 0;
  let b = 0;
  while (m !== 0) {
    if (m & 1) out.push(b);
    m >>>= 1;
    b++;
  }
  return out;
}

/**
 * Hamming-1 path from i to j.
 * - Above: walk through the AND-bridge (lowest weight) — clear i's exclusive
 *   1-bits first, then set j's exclusive 1-bits.
 * - Below: walk through the OR-bridge (highest weight) — set j's exclusive
 *   1-bits first, then clear i's exclusive 1-bits.
 *
 * Within each phase, bits are flipped in ascending index order (deterministic).
 */
function grayPath(i: number, j: number, strategy: Strategy): number[] {
  const clearBits = bitsAscending(i & ~j); // i has 1, j has 0
  const setBits = bitsAscending(j & ~i); // i has 0, j has 1
  const phases: number[][] =
    strategy === 'above' ? [clearBits, setBits] : [setBits, clearBits];
  const path: number[] = [i];
  let cur = i;
  for (const phase of phases) {
    for (const b of phase) {
      cur = (cur ^ (1 << b)) >>> 0;
      path.push(cur);
    }
  }
  return path;
}

/** Normalize a swap so smaller index appears first (display consistency). */
function normSwap(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

/**
 * Decompose a single transposition (i j) into legal 2-cycles via Gray-path
 * conjugation. For path i = p₀, p₁, ..., p_d = j, the expansion is:
 *
 *   Above (p₀ leads):  (p₀ p₁)(p₁ p₂)…(p_{d-1} p_d)…(p₁ p₂)(p₀ p₁)
 *   Below (p_d leads): (p_{d-1} p_d)(p_{d-2} p_{d-1})…(p₀ p₁)…(p_{d-2} p_{d-1})(p_{d-1} p_d)
 *
 * Both contain 2d − 1 legal 2-cycles. The two forms produce the same target
 * transposition; they differ in which endpoint "moves first" in the wiring.
 */
function decomposeTransposition(
  i: number,
  j: number,
  strategy: Strategy,
): LayerStep[] {
  const d = hammingDistance(i, j);
  if (d === 0) return [];
  if (d === 1) return [{ swap: normSwap(i, j) }];

  const path = grayPath(i, j, strategy);
  const edges: Array<[number, number]> = [];
  for (let k = 0; k < d; k++) {
    edges.push([path[k]!, path[k + 1]!]);
  }

  const out: LayerStep[] = [];
  if (strategy === 'above') {
    // edges[0], edges[1], ..., edges[d-1], edges[d-2], ..., edges[0]
    for (let k = 0; k <= d - 1; k++) out.push({ swap: normSwap(...edges[k]!) });
    for (let k = d - 2; k >= 0; k--) out.push({ swap: normSwap(...edges[k]!) });
  } else {
    // edges[d-1], edges[d-2], ..., edges[0], edges[1], ..., edges[d-1]
    for (let k = d - 1; k >= 0; k--) out.push({ swap: normSwap(...edges[k]!) });
    for (let k = 1; k <= d - 1; k++) out.push({ swap: normSwap(...edges[k]!) });
  }
  return out;
}

/**
 * Decompose a target permutation into a temporal sequence of legal 2-cycle
 * layer-permutations.
 */
export function realizeLayered(
  mapping: Mapping,
  n: number,
  strategy: Strategy,
): LayeredRealization {
  const total = 1 << n;
  const layers: LayerStep[] = [];
  const unsupported: number[][] = [];
  let maxDirectDistance = 0;
  let alreadyLegal = true;

  mapping.forEach((to, from) => {
    const d = hammingDistance(from, to);
    if (d > maxDirectDistance) maxDirectDistance = d;
    if (d > 1) alreadyLegal = false;
  });

  // Cycle-decompose the (possibly partial) permutation.
  const cycles = cycleDecomposition(mapping, n, false);

  for (const cycle of cycles) {
    if (cycle.length < 2) continue;

    if (cycle.length === 2) {
      layers.push(...decomposeTransposition(cycle[0]!, cycle[1]!, strategy));
      continue;
    }

    // (a₀ a₁ ... a_{m-1}) = (a₀ a_{m-1})(a₀ a_{m-2}) ... (a₀ a₁)
    // Temporal order (applied first to last): (a₀ a₁), (a₀ a₂), ..., (a₀ a_{m-1}).
    const a0 = cycle[0]!;
    for (let k = 1; k < cycle.length; k++) {
      layers.push(...decomposeTransposition(a0, cycle[k]!, strategy));
    }
  }

  // Build trajectories
  const trajectories: number[][] = [];
  const movedRows = new Set<number>();
  for (let r = 0; r < total; r++) {
    const traj = [r];
    let v = r;
    for (const layer of layers) {
      v = applySwap(v, layer);
      traj.push(v);
    }
    trajectories.push(traj);
    if (traj[traj.length - 1] !== r) movedRows.add(r);
  }

  // Runtime self-check.
  const verification: Verification = { ok: true, mismatches: [], illegalLayers: [] };
  for (let idx = 0; idx < layers.length; idx++) {
    const layer = layers[idx]!;
    const d = hammingDistance(layer.swap[0], layer.swap[1]);
    if (d > 1) {
      verification.illegalLayers.push({ index: idx, swap: layer.swap, d });
    }
  }
  for (let r = 0; r < total; r++) {
    const expected = mapping.has(r) ? mapping.get(r)! : r;
    const actual = trajectories[r]![trajectories[r]!.length - 1]!;
    if (expected !== actual) {
      verification.mismatches.push({ source: r, expected, actual });
    }
  }
  verification.ok =
    verification.mismatches.length === 0 && verification.illegalLayers.length === 0;

  return {
    strategy,
    layers,
    trajectories,
    movedRows,
    alreadyLegal,
    maxDirectDistance,
    unsupported,
    verification,
  };
}

export function formatSwap(layer: LayerStep, n: number): string {
  const [a, b] = layer.swap;
  const fmt = (i: number) =>
    n === 0 ? '|⟩' : `|${i.toString(2).padStart(n, '0')}⟩`;
  return `(${fmt(a)} ${fmt(b)})`;
}
