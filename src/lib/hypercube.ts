import type { BasisState, LegalEdge, LegalGraph } from '../types';

export function basisStates(n: number): BasisState[] {
  if (n < 0 || !Number.isInteger(n)) {
    throw new RangeError(`n must be a non-negative integer, got ${n}`);
  }
  const total = 1 << n;
  const states: BasisState[] = new Array(total);
  for (let i = 0; i < total; i++) {
    states[i] = {
      index: i,
      label: n === 0 ? '' : i.toString(2).padStart(n, '0'),
    };
  }
  return states;
}

/**
 * Legal directed edges (x, y) where Hamming(x, y) ≤ 1.
 * For each vertex i emits: one self-loop, then n single-bit-flip neighbours.
 */
export function legalEdges(n: number): LegalEdge[] {
  if (n < 0 || !Number.isInteger(n)) {
    throw new RangeError(`n must be a non-negative integer, got ${n}`);
  }
  const total = 1 << n;
  const edges: LegalEdge[] = [];
  for (let i = 0; i < total; i++) {
    edges.push({ from: i, to: i, hammingDistance: 0, flippedBit: -1 });
    for (let k = 0; k < n; k++) {
      edges.push({
        from: i,
        to: i ^ (1 << k),
        hammingDistance: 1,
        flippedBit: k,
      });
    }
  }
  return edges;
}

export function buildLegalGraph(n: number): LegalGraph {
  return { n, states: basisStates(n), edges: legalEdges(n) };
}
