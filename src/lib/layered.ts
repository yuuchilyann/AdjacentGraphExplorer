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

/**
 * Internal Gray-path strategy values. UI labels rename them as:
 *   'above' → "Top-down"
 *   'below' → "Bottom-up"
 * The internal identifiers are kept for export filenames, log output, and
 * algorithm docstrings that reference the AND/OR-bridge selection logic.
 */
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
  /** Whether walk-aware decomposition was enabled. */
  walkAware: boolean;
  /** Number of cycles successfully decomposed via the walk shortcut. */
  walkDecomposedCycles: number;
  /** Total cycles of length ≥ 2 (denominator for the walk hit-rate display). */
  totalCycles: number;
  /**
   * True iff any transposition was expanded via Gray-path (d ≥ 2). When
   * false, the Top-down/Bottom-up strategy is unobservable — the UI uses this to
   * disable the strategy toggle.
   */
  usedGrayPath: boolean;
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
 * Walk-aware decomposition: if the cycle's listing (or any rotation of it)
 * has its first m−1 consecutive edges all at Hamming distance 1, the cycle
 * is realized directly by those m−1 legal swaps.
 *
 * Why this works algebraically: the m-cycle (v₀ v₁ … v_{m-1}) as a
 * permutation equals (v₀ v₁) ∘ (v₁ v₂) ∘ … ∘ (v_{m-2} v_{m-1}) — composition
 * reads right-to-left, so in our temporal-order layer list the rightmost
 * factor is applied first. Returns null when no rotation qualifies, leaving
 * fallback to the anchor-based [[decomposeTransposition]] path.
 *
 * This is a conditional rewrite (pattern match), not a search — at most m
 * rotations are checked and each check is O(m).
 */
function tryWalkDecomposition(cycle: number[]): LayerStep[] | null {
  const m = cycle.length;
  if (m < 2) return null;

  const tryOrder = (seq: number[]): LayerStep[] | null => {
    for (let k = 0; k < m - 1; k++) {
      if (hammingDistance(seq[k]!, seq[k + 1]!) !== 1) return null;
    }
    // Temporal order: (v_{m-2}, v_{m-1}) applied first, ..., (v₀, v₁) last.
    const layers: LayerStep[] = [];
    for (let k = m - 2; k >= 0; k--) {
      layers.push({ swap: normSwap(seq[k]!, seq[k + 1]!) });
    }
    return layers;
  };

  // Try every rotation. A "broken walk" with one bad cyclic edge still works
  // when we rotate that bad edge to the wrap-around (which is unused).
  for (let r = 0; r < m; r++) {
    const rotated = r === 0 ? cycle : cycle.slice(r).concat(cycle.slice(0, r));
    const layers = tryOrder(rotated);
    if (layers !== null) return layers;
  }
  return null;
}

/**
 * Decompose a target permutation into a temporal sequence of legal 2-cycle
 * layer-permutations.
 *
 * `walkAware` (default `false`): for each cycle, first try the walk-shortcut
 * (`tryWalkDecomposition`) — a *conditional rewrite* that only fires when
 * the cycle's vertices form a Hamming-1 walk. On miss the cycle falls back
 * to the standard anchor expansion. The flag does not change the resulting
 * permutation, only the layer sequence used to realize it.
 */
export function realizeLayered(
  mapping: Mapping,
  n: number,
  strategy: Strategy,
  walkAware: boolean = false,
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

  let walkDecomposedCycles = 0;
  let totalCycles = 0;
  let usedGrayPath = false;
  for (const cycle of cycles) {
    if (cycle.length < 2) continue;
    totalCycles++;

    // Walk-aware shortcut (conditional rewrite, not search).
    if (walkAware) {
      const walkLayers = tryWalkDecomposition(cycle);
      if (walkLayers !== null) {
        layers.push(...walkLayers);
        walkDecomposedCycles++;
        continue;
      }
    }

    if (cycle.length === 2) {
      const d = hammingDistance(cycle[0]!, cycle[1]!);
      if (d >= 2) usedGrayPath = true;
      layers.push(...decomposeTransposition(cycle[0]!, cycle[1]!, strategy));
      continue;
    }

    // (a₀ a₁ ... a_{m-1}) = (a₀ a_{m-1})(a₀ a_{m-2}) ... (a₀ a₁)
    // Temporal order (applied first to last): (a₀ a₁), (a₀ a₂), ..., (a₀ a_{m-1}).
    const a0 = cycle[0]!;
    for (let k = 1; k < cycle.length; k++) {
      const d = hammingDistance(a0, cycle[k]!);
      if (d >= 2) usedGrayPath = true;
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
    walkAware,
    walkDecomposedCycles,
    totalCycles,
    usedGrayPath,
  };
}

/**
 * Two swaps are "the same" if they touch the same unordered pair.
 * Layers are normalized (smaller index first) so a direct tuple compare suffices.
 */
function sameSwap(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Two swaps share at least one endpoint — they do not commute as permutations.
 * Disjoint swaps (no shared endpoint) commute freely, so an identical swap on
 * one side can be slid past them to find a cancellation partner.
 */
function swapsOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1];
}

/**
 * Peephole reduction: every legal 2-cycle is its own inverse, so two equal
 * swaps cancel. If they are not adjacent but every layer between them is
 * disjoint (commutes through), we can still cancel the pair. Iterate to
 * fixpoint.
 *
 * Returns the reduced layer list. The original is not mutated.
 */
export function simplifyLayers(layers: LayerStep[]): LayerStep[] {
  const out: LayerStep[] = layers.map((l) => ({
    swap: [l.swap[0], l.swap[1]] as [number, number],
  }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < out.length - 1; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (!sameSwap(out[i]!.swap, out[j]!.swap)) continue;
        let commutes = true;
        for (let k = i + 1; k < j; k++) {
          if (swapsOverlap(out[i]!.swap, out[k]!.swap)) {
            commutes = false;
            break;
          }
        }
        if (commutes) {
          out.splice(j, 1);
          out.splice(i, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  return out;
}

/**
 * Apply `simplifyLayers` to a realization and rebuild trajectories +
 * verification so all downstream views (wiring diagram, circuit) stay in
 * sync. The original realization's `alreadyLegal`, `maxDirectDistance`,
 * `unsupported`, and `strategy` describe the *problem*, not the layer
 * sequence, so they pass through unchanged.
 */
export function reduceRealization(real: LayeredRealization): LayeredRealization {
  const reducedLayers = simplifyLayers(real.layers);
  const total = real.trajectories.length;

  const trajectories: number[][] = [];
  const movedRows = new Set<number>();
  for (let r = 0; r < total; r++) {
    const traj = [r];
    let v = r;
    for (const layer of reducedLayers) {
      v = applySwap(v, layer);
      traj.push(v);
    }
    trajectories.push(traj);
    if (traj[traj.length - 1] !== r) movedRows.add(r);
  }

  const verification: Verification = { ok: true, mismatches: [], illegalLayers: [] };
  for (let idx = 0; idx < reducedLayers.length; idx++) {
    const layer = reducedLayers[idx]!;
    const d = hammingDistance(layer.swap[0], layer.swap[1]);
    if (d > 1) {
      verification.illegalLayers.push({ index: idx, swap: layer.swap, d });
    }
  }
  // Endpoints must still agree with the canonical realization — cancellation
  // of involution pairs preserves the overall permutation.
  for (let r = 0; r < total; r++) {
    const expected = real.trajectories[r]![real.trajectories[r]!.length - 1]!;
    const actual = trajectories[r]![trajectories[r]!.length - 1]!;
    if (expected !== actual) {
      verification.mismatches.push({ source: r, expected, actual });
    }
  }
  verification.ok =
    verification.mismatches.length === 0 && verification.illegalLayers.length === 0;

  return {
    strategy: real.strategy,
    layers: reducedLayers,
    trajectories,
    movedRows,
    alreadyLegal: real.alreadyLegal,
    maxDirectDistance: real.maxDirectDistance,
    unsupported: real.unsupported,
    verification,
    walkAware: real.walkAware,
    walkDecomposedCycles: real.walkDecomposedCycles,
    totalCycles: real.totalCycles,
    usedGrayPath: real.usedGrayPath,
  };
}

export function formatSwap(layer: LayerStep, n: number): string {
  const [a, b] = layer.swap;
  const fmt = (i: number) =>
    n === 0 ? '|⟩' : `|${i.toString(2).padStart(n, '0')}⟩`;
  return `(${fmt(a)} ${fmt(b)})`;
}
