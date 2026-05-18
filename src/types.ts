export type BasisState = {
  /** integer index in [0, 2^n) */
  index: number;
  /** binary string of length n; empty for n=0 */
  label: string;
};

export type LegalEdge = {
  from: number;
  to: number;
  /** 0 = self-loop (identity), 1 = single bit-flip */
  hammingDistance: 0 | 1;
  /** which bit flips when hammingDistance === 1; -1 for self-loop */
  flippedBit: number;
};

export type LegalGraph = {
  n: number;
  states: BasisState[];
  edges: LegalEdge[];
};

export const N_MIN = 0;
export const N_MAX = 10;
export const N_SOFT_WARN = 6;
