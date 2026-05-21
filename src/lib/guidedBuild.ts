/**
 * Pure helpers for the Guided Build (引導構築) view: compose / inspect / edit
 * a user-curated sequence of legal 2-cycle layers. Layer atomicity is unchanged
 * from the rest of the codebase — each LayerStep is one Hamming-1 transposition.
 *
 * The compositional convention matches `realizeLayered`'s temporal order: a
 * source value walks through `layers[0], layers[1], …, layers[k-1]` left-to-right.
 */

import { hammingDistance, type Mapping } from './permutation';
import type { LayerStep } from './layered';

/** Apply a single layer (legal 2-cycle) to one value. Mirrors `layered.ts:applySwap`. */
function applyLayerToValue(value: number, layer: LayerStep): number {
  const [a, b] = layer.swap;
  if (value === a) return b;
  if (value === b) return a;
  return value;
}

/** For every source 0..2^n-1, walk the layers and return the resulting bijection. */
export function composeLayers(layers: readonly LayerStep[], n: number): Map<number, number> {
  const total = 1 << n;
  const out = new Map<number, number>();
  for (let r = 0; r < total; r++) {
    let v = r;
    for (const layer of layers) v = applyLayerToValue(v, layer);
    out.set(r, v);
  }
  return out;
}

/**
 * Per-row trajectory through the user-edited layers (length = layers.length + 1).
 * trajectories[r][c] = state of source r after applying the first c layers.
 */
export function trajectoriesFor(
  layers: readonly LayerStep[],
  n: number,
): number[][] {
  const total = 1 << n;
  const out: number[][] = [];
  for (let r = 0; r < total; r++) {
    const traj: number[] = [r];
    let v = r;
    for (const layer of layers) {
      v = applyLayerToValue(v, layer);
      traj.push(v);
    }
    out.push(traj);
  }
  return out;
}

/**
 * σ = target ∘ current⁻¹.
 *
 * Each `current` row r currently lands on `current.get(r)`. To reach
 * `target.get(r)` we need a permutation σ that sends `current.get(r) → target.get(r)`.
 * If σ is identity, the edited sequence already realizes target.
 *
 * Rows missing from target are treated as fixed points.
 */
export function remainingPermutation(
  current: ReadonlyMap<number, number>,
  target: Mapping,
  n: number,
): Map<number, number> {
  const total = 1 << n;
  const sigma = new Map<number, number>();
  for (let r = 0; r < total; r++) {
    const c = current.get(r) ?? r;
    const t = target.get(r) ?? r;
    sigma.set(c, t);
  }
  return sigma;
}

/** All unordered legal pairs {a, b} with hamming(a, b) = 1, a < b. */
export function enumerateLegalPairs(n: number): Array<[number, number]> {
  const total = 1 << n;
  const out: Array<[number, number]> = [];
  for (let a = 0; a < total; a++) {
    for (let k = 0; k < n; k++) {
      const b = a ^ (1 << k);
      if (a < b) out.push([a, b]);
    }
  }
  return out;
}

/** True iff pair has Hamming distance 1. */
export function isLegalLayer(a: number, b: number): boolean {
  return hammingDistance(a, b) === 1;
}

/** Normalize so smaller endpoint is first (display + dedupe consistency). */
export function normalizeLayer(a: number, b: number): LayerStep {
  return { swap: a <= b ? [a, b] : [b, a] };
}

/**
 * "Empty layer" sentinel — a placeholder column the user has inserted but not
 * yet defined. Encoded as swap = [-1, -1]; since the real basis-state indices
 * are 0..2^n-1, the existing `applySwap` / `applyLayerToValue` logic treats
 * this as a no-op for free (the value never equals -1).
 */
export function emptyLayer(): LayerStep {
  return { swap: [-1, -1] };
}

export function isEmptyLayer(l: LayerStep): boolean {
  return l.swap[0] === -1;
}

/** Insert `layer` at index `idx` (0..layers.length). Returns a new array. */
export function insertLayer(
  layers: readonly LayerStep[],
  idx: number,
  layer: LayerStep,
): LayerStep[] {
  const out = layers.slice();
  const safe = Math.max(0, Math.min(out.length, idx));
  out.splice(safe, 0, layer);
  return out;
}

/** Delete the layer at index `idx`. Returns a new array (unchanged if out of range). */
export function deleteLayer(
  layers: readonly LayerStep[],
  idx: number,
): LayerStep[] {
  if (idx < 0 || idx >= layers.length) return layers.slice();
  const out = layers.slice();
  out.splice(idx, 1);
  return out;
}

/**
 * Move the layer at index `from` to land at index `to`. `to` is interpreted in
 * the *original* indexing — i.e. drop position between original layers `to-1`
 * and `to`. Returns a new array (unchanged if `from === to` or invalid).
 */
export function moveLayer(
  layers: readonly LayerStep[],
  from: number,
  to: number,
): LayerStep[] {
  if (from < 0 || from >= layers.length) return layers.slice();
  if (to < 0 || to > layers.length) return layers.slice();
  if (from === to || from === to - 1) return layers.slice();
  const out = layers.slice();
  const [item] = out.splice(from, 1);
  const adjustedTo = to > from ? to - 1 : to;
  out.splice(adjustedTo, 0, item!);
  return out;
}

/** Count rows whose composed image disagrees with target. */
export function countMismatches(
  composed: ReadonlyMap<number, number>,
  target: Mapping,
  n: number,
): number {
  const total = 1 << n;
  let bad = 0;
  for (let r = 0; r < total; r++) {
    const c = composed.get(r) ?? r;
    const t = target.get(r) ?? r;
    if (c !== t) bad++;
  }
  return bad;
}
