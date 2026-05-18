/**
 * Permutation building utilities on top of the Adjacent Bipartite Graph.
 *
 * The "mapping" type represents a partial or complete permutation:
 * Map<sourceIndex, targetIndex>. An edge (sourceIndex, targetIndex) is legal
 * iff Hamming(source, target) <= 1 (per the Adjacent Bipartite Graph
 * definition); a complete mapping must additionally be a bijection.
 */

export type Mapping = ReadonlyMap<number, number>;

/** The (n+1) legal targets reachable from source x: {x} ∪ {x ⊕ 2^k}. */
export function legalTargetsFor(x: number, n: number): number[] {
  const out = [x];
  for (let k = 0; k < n; k++) out.push(x ^ (1 << k));
  return out;
}

/** popcount — number of set bits in a (assumed 32-bit) integer */
export function hammingWeight(a: number): number {
  let v = a >>> 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return (v * 0x01010101) >>> 24;
}

export function hammingDistance(a: number, b: number): number {
  return hammingWeight(a ^ b);
}

export function isLegalEdge(x: number, y: number): boolean {
  return hammingDistance(x, y) <= 1;
}

/**
 * Snap policy:
 * - If `intended` is available (not used by another source), commit it as-is.
 *   This includes d ≥ 2 edges — those simply trigger layered realization
 *   downstream rather than being rewritten.
 * - If `intended` is taken, snap to the closest available target, preferring
 *   legal (d ≤ 1) candidates and ties broken by Hamming distance to intended,
 *   then by visual index distance.
 *
 * Returns null only if every target is taken by some other source (no slot
 * for `source` exists — should only happen on a completed bijection).
 */
export function snapTarget(
  source: number,
  intended: number,
  mapping: Mapping,
  n: number,
): number | null {
  const usedBy = new Map<number, number>();
  for (const [src, tgt] of mapping) {
    if (src !== source) usedBy.set(tgt, src);
  }
  if (!usedBy.has(intended)) return intended;

  const total = 1 << n;
  const pool: number[] = [];
  for (let c = 0; c < total; c++) {
    if (!usedBy.has(c)) pool.push(c);
  }
  if (pool.length === 0) return null;

  type Key = [number, number, number];
  const keyOf = (c: number): Key => [
    isLegalEdge(source, c) ? 0 : 1,
    hammingDistance(c, intended),
    Math.abs(c - intended),
  ];
  const less = (a: Key, b: Key) =>
    a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2];

  let best = pool[0]!;
  let bestKey = keyOf(best);
  for (let i = 1; i < pool.length; i++) {
    const c = pool[i]!;
    const k = keyOf(c);
    if (less(k, bestKey)) {
      best = c;
      bestKey = k;
    }
  }
  return best;
}

/** Deprecated alias retained for compatibility. */
export const nearestLegalAvailable = snapTarget;

/**
 * Cycle decomposition of a (possibly partial) mapping.
 * Returns each cycle as an ordered list of indices; fixed points (1-cycles)
 * are dropped unless `includeFixed` is true.
 */
export function cycleDecomposition(
  mapping: Mapping,
  n: number,
  includeFixed = false,
): number[][] {
  const total = 1 << n;
  const visited = new Set<number>();
  const cycles: number[][] = [];
  for (let start = 0; start < total; start++) {
    if (visited.has(start)) continue;
    if (!mapping.has(start)) continue;
    const cycle: number[] = [];
    let cur = start;
    while (!visited.has(cur) && mapping.has(cur)) {
      visited.add(cur);
      cycle.push(cur);
      cur = mapping.get(cur)!;
      if (cur === start) break;
    }
    // Only keep "closed" cycles whose final hop returns to start.
    if (cycle.length > 0 && mapping.get(cycle[cycle.length - 1]!) === start) {
      if (includeFixed || cycle.length > 1) cycles.push(cycle);
    }
  }
  return cycles;
}

export function isComplete(mapping: Mapping, n: number): boolean {
  const total = 1 << n;
  if (mapping.size !== total) return false;
  const seen = new Set<number>();
  for (const t of mapping.values()) {
    if (seen.has(t)) return false;
    seen.add(t);
  }
  return seen.size === total;
}

export function formatKet(index: number, n: number): string {
  if (n === 0) return '|⟩';
  return `|${index.toString(2).padStart(n, '0')}⟩`;
}

export function formatCycles(cycles: number[][], n: number): string {
  if (cycles.length === 0) return 'identity';
  return cycles
    .map((c) => `(${c.map((i) => formatKet(i, n)).join(' ')})`)
    .join(' ');
}
