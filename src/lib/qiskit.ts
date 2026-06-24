/**
 * Generate runnable Qiskit (IBM Quantum) Python source for a layered
 * realization's quantum-circuit form.
 *
 * Each legal (Hamming-distance-1) layer is one multi-controlled X gate:
 *   - target qubit  = the bit where the swapped kets differ (⊕)
 *   - every other qubit is a control: value 1 → positive, value 0 → negative
 *
 * Qubit indexing matches the on-screen MSQ circuit: qubit q corresponds to
 * bit position q, so qubit 0 = |x0> = the least-significant bit.
 *
 * Two emission modes mirror the diagram's control-style toggle:
 *   - 'mixed'    → one `XGate().control(m, ctrl_state=...)` per layer; negative
 *                  controls are encoded directly in ctrl_state.
 *   - 'positive' → negative controls are X-conjugated, so every gate reduces to
 *                  `x(neg); mcx(all, target); x(neg)` using positive controls
 *                  only (matches hardware that lacks anti-controls).
 */

import type { Strategy } from './layered';

export type QiskitMode = 'mixed' | 'positive';

/** Structural gate description (same shape produced by QuantumCircuitView). */
export type QiskitGate = {
  target: number;
  /** length n; entry for q === target is 'target'. */
  controls: ('pos' | 'neg' | 'target')[];
  /** The originating legal swap, for human-readable comments. */
  swap: [number, number];
};

const STRATEGY_LABEL: Record<Strategy, string> = {
  above: 'Top-down',
  below: 'Bottom-up',
};

/** `|x_k⟩`-style binary string of `value` over `n` bits, MSB (x_{n-1}) first. */
function ket(value: number, n: number): string {
  let s = '';
  for (let q = n - 1; q >= 0; q--) s += (value >> q) & 1;
  return s;
}

/**
 * The shared circuit-construction source: header comment, imports, the
 * QuantumCircuit, and one statement per layer. No trailing draw/visualize
 * lines — those differ between the .py script and the notebook draw cell.
 */
function buildCircuitSource(
  gates: QiskitGate[],
  n: number,
  mode: QiskitMode,
  strategy: Strategy,
): string {
  const lines: string[] = [];

  lines.push('# Adjacent Bipartite Graph Explorer — Qiskit export');
  lines.push(
    `# n = ${n} qubit(s)  |  strategy = ${STRATEGY_LABEL[strategy]}  |  control = ${mode}`,
  );
  lines.push(
    '# Qubit index = bit position (MSQ): qubit 0 = |x0>, the least-significant bit.',
  );
  lines.push('from qiskit import QuantumCircuit');
  if (mode === 'mixed') {
    lines.push(
      '# XGate().control(m, ctrl_state=...) builds an m-controlled X with',
    );
    lines.push(
      '# per-control polarity baked into ctrl_state (bit i ↔ the i-th control qubit).',
    );
    lines.push('from qiskit.circuit.library import XGate');
  }
  lines.push('');
  lines.push(`qc = QuantumCircuit(${n})`);
  lines.push('');

  gates.forEach((g, k) => {
    const [a, b] = g.swap;
    lines.push(`# L${k + 1}: |${ket(a, n)}> <-> |${ket(b, n)}>`);

    // Controls in ascending qubit order; ctrl_state bit i ↔ allControls[i].
    const allControls: number[] = [];
    const negControls: number[] = [];
    for (let q = 0; q < n; q++) {
      if (g.controls[q] === 'pos') allControls.push(q);
      else if (g.controls[q] === 'neg') {
        allControls.push(q);
        negControls.push(q);
      }
    }

    if (allControls.length === 0) {
      // n === 1: the gate is a bare X on the single qubit.
      lines.push(`qc.x(${g.target})`);
      lines.push('');
      return;
    }

    if (mode === 'mixed') {
      let ctrlState = 0;
      allControls.forEach((q, i) => {
        if (g.controls[q] === 'pos') ctrlState |= 1 << i;
      });
      const bits = ket(ctrlState, allControls.length);
      lines.push(
        `qc.append(XGate().control(${allControls.length}, ctrl_state=0b${bits}), [${[
          ...allControls,
          g.target,
        ].join(', ')}])`,
      );
    } else {
      if (negControls.length > 0)
        lines.push(`qc.x([${negControls.join(', ')}])`);
      lines.push(`qc.mcx([${allControls.join(', ')}], ${g.target})`);
      if (negControls.length > 0)
        lines.push(`qc.x([${negControls.join(', ')}])`);
    }
    lines.push('');
  });

  // Drop the trailing blank line left by the loop.
  while (lines.length && lines[lines.length - 1] === '') lines.pop();

  return lines.join('\n');
}

/** Commented footer (appended to a .py script) showing how to visualize. */
const VISUALIZE_FOOTER = [
  '',
  '',
  '# Visualize:',
  '# print(qc.draw())   # text diagram (qiskit only)',
  "# qc.draw('mpl')     # matplotlib figure (needs matplotlib + pylatexenc)",
].join('\n');

/** One notebook code cell. */
export type NotebookCell = { source: string };

/** `!pip` install command for the "+ visualization" package set. */
const NOTEBOOK_INSTALL = [
  '!pip install qiskit matplotlib pylatexenc',
  '# 若下方 import qiskit 出錯（Colab 常見 numpy 版本衝突），',
  '# 請先 Runtime → Restart session，再從這個 cell 重新執行。',
].join('\n');

/** Final notebook cell: render the circuit inline as a matplotlib figure. */
const DRAW_CELL = [
  '# 在 notebook 中，cell 最後一行為 qc.draw("mpl") 即會 inline 顯示圖形電路。',
  "qc.draw('mpl')",
].join('\n');

/**
 * Standalone Python script (.py tab): the unrolled circuit source plus a
 * commented footer showing how to visualize it.
 */
export function buildQiskitCode(
  gates: QiskitGate[],
  n: number,
  mode: QiskitMode,
  strategy: Strategy,
): string {
  return buildCircuitSource(gates, n, mode, strategy) + VISUALIZE_FOOTER;
}

/**
 * Notebook form (Jupyter / Colab tab): three code cells —
 *   1. `!pip install …` with a restart hint,
 *   2. the circuit construction,
 *   3. an inline `qc.draw("mpl")` figure.
 */
export function buildQiskitNotebook(
  gates: QiskitGate[],
  n: number,
  mode: QiskitMode,
  strategy: Strategy,
): NotebookCell[] {
  return [
    { source: NOTEBOOK_INSTALL },
    { source: buildCircuitSource(gates, n, mode, strategy) },
    { source: DRAW_CELL },
  ];
}

/** Serialize notebook cells into a minimal nbformat-4 `.ipynb` JSON string. */
export function buildIpynb(cells: NotebookCell[]): string {
  // Jupyter stores `source` as a list of lines, each (except the last)
  // terminated by a newline.
  const toSource = (s: string): string[] => {
    const parts = s.split('\n');
    return parts.map((line, i) => (i < parts.length - 1 ? line + '\n' : line));
  };
  const nb = {
    cells: cells.map((c) => ({
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: toSource(c.source),
    })),
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: { name: 'python' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
  return JSON.stringify(nb, null, 1);
}

// ───────────────────────────────────────────────────────────────────────────
// Function form — a self-contained, pip-packageable Python module that takes an
// arbitrary permutation α and builds the circuit itself. This is a faithful
// port of src/lib/layered.ts (realizeLayered + decomposeTransposition +
// grayPath + tryWalkDecomposition) and src/lib/permutation.ts
// (cycleDecomposition), plus simplifyLayers for the Reduced view.
// ───────────────────────────────────────────────────────────────────────────

/** The static algorithm module — identical regardless of the concrete α. */
const FUNCTION_MODULE = String.raw`from qiskit import QuantumCircuit
from qiskit.circuit.library import XGate


def hamming(a, b):
    return bin(a ^ b).count("1")


def bits_ascending(mask):
    """Indices of set bits in mask, ascending (bit 0 first)."""
    out, b = [], 0
    while mask:
        if mask & 1:
            out.append(b)
        mask >>= 1
        b += 1
    return out


def norm_swap(a, b):
    return (a, b) if a <= b else (b, a)


def cycle_decomposition(perm):
    """perm: dict src->dst. Returns nontrivial cycles (length >= 2)."""
    seen, cycles = set(), []
    for start in sorted(perm):
        if start in seen:
            continue
        cur, cyc = start, []
        while cur not in seen and cur in perm:
            seen.add(cur)
            cyc.append(cur)
            cur = perm[cur]
            if cur == start:
                break
        if cyc and perm[cyc[-1]] == start and len(cyc) > 1:
            cycles.append(cyc)
    return cycles


def gray_path(i, j, strategy):
    """Hamming-1 path i -> j. 'above' = AND-bridge, 'below' = OR-bridge."""
    clear_bits = bits_ascending(i & ~j)   # i has 1, j has 0
    set_bits = bits_ascending(j & ~i)     # i has 0, j has 1
    phases = [clear_bits, set_bits] if strategy == "above" else [set_bits, clear_bits]
    path, cur = [i], i
    for phase in phases:
        for b in phase:
            cur ^= (1 << b)
            path.append(cur)
    return path


def decompose_transposition(i, j, strategy):
    """One transposition (i j) -> a sequence of legal (Hamming=1) 2-cycles."""
    d = hamming(i, j)
    if d == 0:
        return []
    if d == 1:
        return [norm_swap(i, j)]
    path = gray_path(i, j, strategy)
    edges = [(path[k], path[k + 1]) for k in range(d)]
    out = []
    if strategy == "above":
        for k in range(0, d):
            out.append(norm_swap(*edges[k]))
        for k in range(d - 2, -1, -1):
            out.append(norm_swap(*edges[k]))
    else:
        for k in range(d - 1, -1, -1):
            out.append(norm_swap(*edges[k]))
        for k in range(1, d):
            out.append(norm_swap(*edges[k]))
    return out


def try_walk_decomposition(cycle):
    """If some rotation of the cycle is a Hamming-1 walk, realize it directly."""
    m = len(cycle)
    if m < 2:
        return None

    def try_order(seq):
        for k in range(m - 1):
            if hamming(seq[k], seq[k + 1]) != 1:
                return None
        return [norm_swap(seq[k], seq[k + 1]) for k in range(m - 2, -1, -1)]

    for r in range(m):
        rotated = cycle if r == 0 else cycle[r:] + cycle[:r]
        layers = try_order(rotated)
        if layers is not None:
            return layers
    return None


def realize_layered(perm, n, strategy="above", walk_aware=False):
    """Decompose permutation 'perm' into an ordered list of legal 2-cycles."""
    layers = []
    for cycle in cycle_decomposition(perm):
        if len(cycle) < 2:
            continue
        if walk_aware:
            wl = try_walk_decomposition(cycle)
            if wl is not None:
                layers.extend(wl)
                continue
        if len(cycle) == 2:
            layers.extend(decompose_transposition(cycle[0], cycle[1], strategy))
            continue
        a0 = cycle[0]
        for k in range(1, len(cycle)):
            layers.extend(decompose_transposition(a0, cycle[k], strategy))
    return layers


def simplify_layers(layers):
    """Peephole: cancel equal swaps that commute through the gap between them."""
    out = [tuple(s) for s in layers]
    changed = True
    while changed:
        changed = False
        done = False
        for i in range(len(out) - 1):
            for j in range(i + 1, len(out)):
                if out[i] != out[j]:
                    continue
                a = out[i]
                commutes = all(
                    a[0] not in out[k] and a[1] not in out[k]
                    for k in range(i + 1, j)
                )
                if commutes:
                    del out[j]
                    del out[i]
                    changed = True
                    done = True
                    break
            if done:
                break
    return out


def legal_swap_to_mcx(qc, a, b, n, positive=False):
    """One legal (Hamming=1) swap |a> <-> |b>  ->  one multi-controlled X.

    target = the differing bit; every other qubit is a control whose required
    value is its (shared) bit in a. positive=True X-conjugates the open (0)
    controls so the gate uses positive controls only.
    """
    diff = a ^ b
    target = diff.bit_length() - 1
    controls = [q for q in range(n) if q != target]
    if not controls:                      # n == 1: bare X
        qc.x(target)
        return
    if positive:
        negs = [q for q in controls if not ((a >> q) & 1)]
        for q in negs:
            qc.x(q)
        qc.mcx(controls, target)
        for q in negs:
            qc.x(q)
    else:
        ctrl_state = sum(((a >> q) & 1) << i for i, q in enumerate(controls))
        qc.append(XGate().control(len(controls), ctrl_state=ctrl_state),
                  controls + [target])


def build_circuit(perm, n, strategy="above", walk_aware=False,
                  reduce=False, positive=False):
    """Arbitrary permutation α (as dict src->dst) -> Qiskit QuantumCircuit."""
    layers = realize_layered(perm, n, strategy, walk_aware)
    if reduce:
        layers = simplify_layers(layers)
    qc = QuantumCircuit(n)
    for a, b in layers:
        legal_swap_to_mcx(qc, a, b, n, positive)
    return qc


def perm_from_cycles(cycles):
    """[[0, 2], [1, 3]]  ->  {0: 2, 2: 0, 1: 3, 3: 1}."""
    perm = {}
    for cyc in cycles:
        for idx, src in enumerate(cyc):
            perm[src] = cyc[(idx + 1) % len(cyc)]
    return perm`;

/** Header comment + the static algorithm definitions ("the function"). */
function buildFunctionModule(): string {
  return [
    '# Adjacent Bipartite Graph Explorer — Qiskit export (function form)',
    '# Self-contained: decompose any permutation α into legal (Hamming=1)',
    '# layers, then map each legal layer to one multi-controlled X.',
    '# Qubit index = bit position (MSQ): qubit 0 = |x0>, least-significant bit.',
    FUNCTION_MODULE,
  ].join('\n');
}

/** The example invocation ("the function call") for the current α + settings. */
function buildFunctionExample(
  cycles: number[][],
  n: number,
  strategy: Strategy,
  walkAware: boolean,
  reduced: boolean,
): string {
  const ketCycles =
    cycles.length === 0
      ? 'identity'
      : cycles
          .map((c) => `(${c.map((i) => `|${ket(i, n)}>`).join(' ')})`)
          .join(' ');
  const cyclesPy = `[${cycles.map((c) => `[${c.join(', ')}]`).join(', ')}]`;
  const py = (b: boolean) => (b ? 'True' : 'False');

  return [
    '# ── Example: α for this export ──',
    `# α = ${ketCycles}`,
    `n = ${n}`,
    `alpha_cycles = ${cyclesPy}`,
    'perm = perm_from_cycles(alpha_cycles)',
    `qc = build_circuit(perm, n, strategy="${strategy}", ` +
      `walk_aware=${py(walkAware)}, reduce=${py(reduced)}, positive=False)`,
  ].join('\n');
}

/**
 * Function-form standalone .py script: a single file, so the definitions, the
 * example call, and the visualize footer stay together top-to-bottom.
 */
export function buildQiskitPackageCode(
  cycles: number[][],
  n: number,
  strategy: Strategy,
  walkAware: boolean,
  reduced: boolean,
): string {
  return (
    buildFunctionModule() +
    '\n\n\n' +
    buildFunctionExample(cycles, n, strategy, walkAware, reduced) +
    VISUALIZE_FOOTER
  );
}

/**
 * Function-form notebook — three cells that keep "the function" and "the
 * function call" apart:
 *   1. `!pip install …` with a restart hint,
 *   2. the function definitions (run once),
 *   3. the example call (define α → build_circuit) + an inline draw.
 */
export function buildQiskitPackageNotebook(
  cycles: number[][],
  n: number,
  strategy: Strategy,
  walkAware: boolean,
  reduced: boolean,
): NotebookCell[] {
  return [
    { source: NOTEBOOK_INSTALL },
    { source: buildFunctionModule() },
    {
      source:
        buildFunctionExample(cycles, n, strategy, walkAware, reduced) +
        '\n\n' +
        DRAW_CELL,
    },
  ];
}
