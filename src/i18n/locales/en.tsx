import { Box } from '@mui/material';
import { Math } from '../../components/Math';
import { N_MIN, N_MAX } from '../../types';
import type { TParams } from '../types';
import type { Dictionary } from './zh';
import { Swatch } from '../_components';

/**
 * English (en). `satisfies Dictionary` forces this object to carry EXACTLY the
 * same keys as the canonical zh dictionary — a missing key or a typo is a
 * compile error. To add a future language, copy this file and translate.
 */
export const en = {
  // ── metadata ──
  'meta.title': 'Adjacent Graph Explorer',
  'meta.description':
    'Adjacent Graph Explorer — interactive exploration of adjacency-based graph structures.',

  // ── app shell ──
  'app.title': 'Adjacent Graph Explorer',
  'app.experimental': 'experimental',
  'app.view.legal': 'Adjacent Bipartite Graph',
  'app.view.builder': 'Permutation Builder',
  'app.view.chain': 'Permutation Chain',
  'app.view.guided': 'Guided Build',
  'app.footer': (p: TParams) => `© ${p.year} Adjacent Graph Explorer`,

  // ── control panel ──
  'control.n.label': 'n (number of qubits)',
  'control.n.helper': `allowed range ${N_MIN}–${N_MAX}`,
  'control.caption': (p: TParams) =>
    `n = ${p.n} ⇒ 2ⁿ = ${p.stateCount} basis states, ${p.edgeCount} legal edges`,
  'control.warn': (p: TParams) =>
    `n = ${p.n} produces ${p.edgeCount} edges; the bipartite view will be very crowded and may render slowly.`,

  // ── learning panel (theorem prose interleaved with <Math>) ──
  'learning.header': 'Learning notes — Decomposition Theory',

  'learning.acc1.summary': (
    <>
      <strong>1. Cycle decomposition</strong>
      {' '}—{' '}any <Math tex="\alpha \in S_{2^n}" /> factors uniquely into disjoint cycles
    </>
  ),
  'learning.acc1.intro': (
    <>
      An m-cycle needs at least <Math tex="m-1" /> transpositions to realize (this is the
      theoretical lower bound). So the total number of transpositions a permutation needs is:
    </>
  ),
  'learning.acc1.count': (p: TParams) => (
    <>
      The current mapping has <strong>{String(p.totalCycles)}</strong> cycle(s) of length ≥ 2.
    </>
  ),

  'learning.acc2.summary': (
    <>
      <strong>2. Anchor fan-out (default split)</strong>
      {' '}—{' '}fan out around the pivot <Math tex="a_0" />
    </>
  ),
  'learning.acc2.intro': 'An m-cycle can be written as:',
  'learning.acc2.note': (
    <>
      Note that each <Math tex="(a_0\ a_k)" /> here may have Hamming distance <Math tex="d(a_0, a_k)" /> greater than 1,
      in which case a further Gray-path expansion is required (see §3). The “Top-down / Bottom-up” toggle of this
      algorithm chooses how the Gray path is traversed.
    </>
  ),

  'learning.acc3.summary': (
    <>
      <strong>3. Gray-path conjugation expansion (<Math tex="2d-1" /> layers)</strong>
    </>
  ),
  'learning.acc3.intro': (
    <>
      For a transposition <Math tex="(i\ j)" /> at distance <Math tex="d \geq 2" />,
      walk a Hamming-1 path <Math tex="i = p_0 \to p_1 \to \cdots \to p_d = j" /> and
      use the conjugation identity:
    </>
  ),
  'learning.acc3.note': (p: TParams) => (
    <>
      A total of <Math tex="2d-1" /> legal 2-cycles. The symmetric structure means the two outer
      <Math tex="(p_0\ p_1)" /> “shift” the middle swap to the position of <Math tex="i" />.
      {(p.haveD2plus as boolean) && (
        <>
          {' '}— this mapping’s maximum direct distance is <Math tex={`d = ${p.maxDirectDistance}`} />,
          so this formula is actually used.
        </>
      )}
    </>
  ),

  'learning.acc4.summary': (
    <>
      <strong>4. Walk-aware shortcut (conditional rewrite)</strong>
      {' '}—{' '}when the cycle already lies on a Hamming-1 walk
    </>
  ),
  'learning.acc4.intro': 'Observe that an m-cycle can also be written as a composition of adjacent edges:',
  'learning.acc4.note': (
    <>
      If every <Math tex="d(v_k, v_{k+1}) = 1" /> (the cycle is a Hamming-1 walk), then every
      transposition on the right is already a legal 2-cycle — exactly <Math tex="m-1" /> layers, hitting the theoretical lower bound.
    </>
  ),
  'learning.acc4.condVsBrute': (
    <>
      <strong>Conditional vs brute force</strong>: detection is an <Math tex="O(m)" /> predicate check, not a search.
      On a hit it produces the optimal solution in closed form; on a miss it falls back to §2.
    </>
  ),
  'learning.acc4.applied': (p: TParams) => (
    <>
      ✓ This time <strong>{String(p.count)}</strong> cycle(s) hit the walk shortcut.
    </>
  ),
  'learning.acc4.notApplied': 'No cycle is a Hamming walk this time (this is normal — most random permutations aren’t).',

  'learning.acc5.summary': (
    <>
      <strong>5. Involution cancellation (optimization theorem)</strong>
    </>
  ),
  'learning.acc5.intro': 'Every legal 2-cycle is an involution:',
  'learning.acc5.note': (
    <>
      So two identical swaps placed adjacently always cancel. If the layers in between are all disjoint from it
      (no shared endpoints), it can also commute across and then cancel:
    </>
  ),
  'learning.acc5.circuit': (
    <>
      The quantum-circuit counterpart of this rule: two adjacent (n−1)-controlled X gates with the same pattern
      always cancel, regardless of whether the controls are open, filled, or mixed.
    </>
  ),

  'learning.acc6.summary': (
    <>
      <strong>6. Quantum-circuit correspondence</strong>
      {' '}—{' '}each legal layer ⇔ (n−1)-controlled X
    </>
  ),
  'learning.acc6.intro': (p: TParams) => (
    <>
      For a swap <Math tex={`(${p.ket0},\\ ${p.ket1})`} />:
      the target qubit <Math tex="q^* = " /> is the single differing bit (the lone 1-bit of <Math tex="a \oplus b" />);
      every other qubit <Math tex="q \neq q^*" /> is a control, with polarity taken from that bit of <Math tex="a" /> (same as <Math tex="b" />):
    </>
  ),
  'learning.acc6.note': (
    <>
      Open controls can be expanded into all-positive controls via the <Math tex="X" />-conjugation identity
      <Math tex={`C^0_q(U) = X_q \\cdot C^1_q(U) \\cdot X_q`} /> (each costs 2 extra X gates).
    </>
  ),

  // ── quantum circuit view ──
  'circuit.title': 'Quantum Circuit — Layer → Multi-controlled X',
  'circuit.subtitle': (p: TParams) => (
    <>
      Each Hamming d = 1 layer (a&nbsp;b) maps to one multi-controlled X gate:
      the differing bit = target (⊕), the other n−1 bits are controls —
      <Swatch filled color={p.gateColor as string} />=1,
      <Swatch filled={false} color={p.gateColor as string} />=0.
      The circuit uses an MSQ layout: |x₀⟩ at the bottom, |x{(p.n as number) - 1}⟩ at the top; time flows left to right.
    </>
  ),
  'circuit.controlLabel': 'Controls',
  'circuit.mode.tooltip.mixed': 'Keep mixed control: bit=0 is shown as an open (white) control.',
  'circuit.mode.tooltip.positive':
    'Expand every open control via X-conjugation into X · positive control · X, matching hardware that only supports positive controls.',
  'circuit.mode.mixed': 'Mixed control',
  'circuit.mode.positive': 'Positive-only',
  'circuit.playhead.tooltip.off': 'This switch only affects the diagram tab.',
  'circuit.playhead.tooltip.on':
    'Show the orange highlight aligned to the current playback position. Turn it off so “Copy as PNG” yields a standard circuit diagram.',
  'circuit.playhead.label': 'Playback highlight',
  'circuit.tab.diagram': 'Diagram',
  'circuit.tab.qiskit': 'Qiskit code',
  'circuit.tab.jupyter': 'Jupyter / Colab',
  // ── guided build view ──
  'guided.err.appendTarget': (p: TParams) =>
    `Appending (${p.from} ${p.to}) at the end to bring the strand to target ${p.to}, but Hamming distance = ${p.d} (must be d = 1)`,
  'guided.err.insertFront': (p: TParams) =>
    `Inserting (${p.a} ${p.b}) at the front, but Hamming distance = ${p.d} (must be d = 1)`,
  'guided.err.editLayer': (p: TParams) =>
    `Bringing the strand from ${p.from} to ${p.to} needs layer (${p.from} ${p.to}), but Hamming distance = ${p.d} — not a legal 2-cycle`,
  'guided.title': 'Guided Build',
  'guided.subtitle':
    'Once you complete a full bijection (the target permutation α) in the matching game above, the system auto-loads the Top-Down decomposition as a starting point; you can drag to reorder, insert, or delete any legal 2-cycle layer, and press “Auto-finish” when stuck to let the system complete it.',
  'guided.status.tooltip.notReady': (p: TParams) =>
    `The bijection isn’t complete yet (${p.progress}). The editor activates once it is.`,
  'guided.status.tooltip.matches': 'The current layer sequence already realizes the target.',
  'guided.status.tooltip.off': (p: TParams) =>
    `${p.mismatch} strand endpoint(s) still mismatched; Auto-finish can add ${p.auto} layer(s).`,
  'guided.strategy.tooltip':
    'Top-down takes the AND-bridge, Bottom-up the OR-bridge. Affects the preload and Auto-finish expansion choices.',
  'guided.autoFinish.tooltip.notReady': (p: TParams) =>
    `Complete the matching game above first (currently ${p.progress}).`,
  'guided.autoFinish.tooltip.matches': 'The target is realized; no layers need to be added.',
  'guided.autoFinish.tooltip.do': (p: TParams) =>
    `Expand the remaining permutation σ with ${p.strategy} and append it at the end (${p.auto} layer(s)).`,
  'guided.resetBaseline.tooltip':
    'Reload the Top-Down/Bottom-Up default decomposition for the current Strategy.',
  'guided.clearLayers.tooltip': 'Clear all layers and build from scratch.',
  'guided.resetBanner': (p: TParams) =>
    `Reloaded the ${p.strategy} default decomposition (${p.layers} layer(s)); ready to edit.`,
  'guided.notReadyAlert': (p: TParams) =>
    `Once you complete the matching game above (currently ${p.progress}), the default decomposition will auto-load here for you to edit.`,
  'guided.layerSeqLabel': 'Layer sequence (left → right in time):',
  'guided.moveLeft.tooltip': 'Move one slot left',
  'guided.moveRight.tooltip': 'Move one slot right',
  'guided.delete.tooltip': 'Delete this layer',
  'guided.decomposition': 'Decomposition (left → right in time):',
  'guided.legend':
    'Green dot = that row’s endpoint reached the target; red dot = deviated; dashed cell on the right = target reference position.',
  'guided.dragHelp':
    'Drag a node (across columns allowed): grab a |x⟩ in any column to lock that strand; drop in the source column = insert a new layer at the front; drop in an L_c column = edit L_c so the strand goes to |y⟩ (blue = legal new swap); drag back to the strand’s “incoming position” in the same column (red) = delete L_c; drop in the target column = append a layer at the end to bring the strand to the target row (handy when there are no layers, or to wrap up quickly). “+” / “Add empty layer” = insert an empty layer, then define it by dragging.',
  'guided.insertSlot.tooltip': (p: TParams) =>
    `Insert an empty layer at position ${p.idx} / drag a chip here to move it`,

  // ── permutation chain view ──
  'chain.title': 'Permutation Chain — multi-stage matching game',
  'chain.subtitle': (
    <>
      |X<sub>1</sub>⟩ → |X<sub>2</sub>⟩ → ⋯ → |X<sub>L</sub>⟩; each stage α
      <sub>k</sub> is connected independently. The composite α<sub>total</sub> = α<sub>L−1</sub> ∘ ⋯ ∘
      α<sub>1</sub> is shown below.
    </>
  ),
  'chain.progress.all': (p: TParams) => `All complete (${p.stages}/${p.stages})`,
  'chain.progress.partial': (p: TParams) => `Progress ${p.done}/${p.stages}`,
  'chain.stageCount': 'Stages',
  'chain.removeStage.tooltip': 'Remove the last stage (L − 1)',
  'chain.addStage.tooltip': 'Add a stage (L + 1)',
  'chain.random.legal.tooltip': 'Randomly generate a legal (d ≤ 1) permutation for every stage',
  'chain.random.legal': 'Random legal',
  'chain.random.any.tooltip': 'Randomly permute every stage',
  'chain.random.any': 'Random any',
  'chain.reset': 'Clear',
  'chain.fillSelfLoop': 'Fill self-loops',
  'chain.selfLoop.tooltip.fill': (p: TParams) =>
    `Fill all ${p.count} remaining unconnected source(s) across every stage as self-loops (|x⟩→|x⟩, fixed points), leaving connected edges untouched`,
  'chain.selfLoop.tooltip.complete': 'Every stage is complete; no self-loops needed',
  'chain.selfLoop.tooltip.blocked':
    'The remaining unconnected sources already have their own targets taken, so self-loops can’t be auto-filled (resolve manually or clear the conflict)',
  'chain.pathAware.tooltip.disabled':
    'All stages must be complete to sort by path (to avoid duplicate/missing rows within a column)',
  'chain.pathAware.tooltip.on':
    'On: rows in column c ≥ 1 are ordered by “the output of α_{c-1}”, so strands become straight lines; the cost is that ket positions within a column are no longer predictable',
  'chain.pathAware.tooltip.off':
    'Off: every column uses the default 0..2ⁿ-1 order, so ket positions are predictable but strands cross',
  'chain.pathAware': 'Sort by path',
  'chain.stage.status.complete': 'complete',
  'chain.stage.cycleLabel': (p: TParams) => `α${p.k} cycle notation (${p.status})`,
  'chain.stage.identity.tooltip': (p: TParams) =>
    `Pass-through connect α${p.k} (α(x) = x, connect same rows directly)`,
  'chain.stage.randomLegal.tooltip': (p: TParams) =>
    `Reset α${p.k} to a random legal permutation (d ≤ 1, leaving other stages untouched)`,
  'chain.stage.randomAny.tooltip': (p: TParams) =>
    `Randomly permute α${p.k} (any d, leaving other stages untouched)`,
  'chain.stage.clear.tooltip': (p: TParams) => `Clear α${p.k}`,
  'chain.selectedHint': (p: TParams) =>
    `Source = (of α${p.col}) ${p.ket}; blue = legal target (d ≤ 1), orange = far target (d ≥ 2, auto-enters layering), red = already taken (will snap).`,
  'chain.composite.cycleLabel': (p: TParams) => (
    <>
      Composite α<sub>total</sub> = α{String(p.stages)} ∘ ⋯ ∘ α1 (cycle notation)
    </>
  ),
  'chain.composite.result.legal': (p: TParams) =>
    `✓ Composite G_α ⊆ Adjacent Bipartite Graph (max d = ${p.maxD})`,
  'chain.composite.result.illegal': (p: TParams) =>
    `△ Composite contains d ≥ 2 edges (max d = ${p.maxD}); needs layered realization — see Layered Realization below`,
  'chain.perStage.tooltip':
    'When expanded, shows the layered realization of each α₁..α_{L-1} in turn, to compare against the composite’s layer count.',
  'chain.perStage.label': 'Show per-stage decomposition',
  'chain.perStage.title': (p: TParams) => (
    <>
      Layered Realization of α<sub>{String(p.k)}</sub>
    </>
  ),
  'chain.composite.layeredTitle': (
    <>
      Layered Realization of the composite α<sub>total</sub>
    </>
  ),

  // ── permutation builder view ──
  'builder.title': 'Permutation Builder — matching game',
  'builder.subtitle':
    'Click/drag from the left column to the right to connect. An illegal or conflicting release silent-snaps to the nearest legal available target.',
  'builder.progress': (p: TParams) => `Progress ${p.size}/${p.total}`,
  'builder.random.legal.tooltip':
    'Randomly generate a legal permutation with G_α ⊆ Adjacent Bipartite Graph (every edge d ≤ 1)',
  'builder.random.legal': 'Random legal',
  'builder.random.any.tooltip':
    'Randomly generate any full permutation (usually contains d ≥ 2 edges, triggering Layered Realization)',
  'builder.random.any': 'Random any',
  'builder.fillSelfLoop': 'Fill self-loops',
  'builder.reset': 'Clear',
  'builder.selfLoop.tooltip.fill': (p: TParams) =>
    `Fill the remaining ${p.count} unconnected source(s) as self-loops (|x⟩→|x⟩, fixed points)`,
  'builder.selfLoop.tooltip.complete': 'The permutation is complete; no self-loops needed',
  'builder.selfLoop.tooltip.blocked':
    'The remaining unconnected sources already have their own targets taken, so self-loops can’t be auto-filled (resolve manually or clear the conflict)',
  'builder.cycleLabel': 'Cycle notation',
  'builder.twoLineLabel': 'Two-line (Cauchy) notation',
  'builder.twoLineOmitted': (p: TParams) =>
    `n = ${p.n} ⇒ 2ⁿ = ${p.total}: too many columns, full expansion omitted.`,
  'builder.matrixLabel': (
    <>
      Permutation matrix <Math tex="P_{\alpha}" />
    </>
  ),
  'builder.matrix.tooltip.annotated':
    'Annotated mode: the matrix embeds decimal row/column labels (for teaching)',
  'builder.matrix.tooltip.standard': 'Standard mode: the plain permutation matrix',
  'builder.matrix.annotated': 'Annotated',
  'builder.matrix.standard': 'Standard',
  'builder.matrixOmitted': (p: TParams) =>
    `n = ${p.n} ⇒ the ${p.total} × ${p.total} matrix is too large; display omitted (drawn only for n ≤ 4).`,
  'builder.selectedHint': (p: TParams) =>
    `Source = ${p.ket}; blue = legal target (d ≤ 1), orange = far target (d ≥ 2, auto-enters layering), red = already taken (will snap).`,
  'builder.result.legal': (p: TParams) =>
    `✓ G_α ⊆ Adjacent Bipartite Graph (max d = ${p.maxD})`,
  'builder.result.illegal': (p: TParams) =>
    `△ contains d ≥ 2 edges (max d = ${p.maxD}); needs layered realization — see Layered Realization below`,

  // ── elementary row matrix panel ──
  'matrix.detail.tooltip.full':
    'Full mode (scholars): lists every column and the full matrix for term-by-term verification.',
  'matrix.detail.tooltip.simplified':
    'Simplified mode (general users): uses ⋯ to omit the unchanged parts, highlighting only the two swapped rows.',
  'matrix.detail.simplified': 'Simplified',
  'matrix.detail.full': 'Full',
  'matrix.intro': (p: TParams) => (
    <>
      Each legal layer’s transposition{' '}
      <Math tex={`\\alpha = (\\,|i\\rangle\\ \\ |j\\rangle\\,)`} /> corresponds to one{' '}
      <strong>elementary row matrix</strong>{' '}
      <Math tex="R_{(i,\,j)}" /> — i.e. the <Math tex={`${p.N} \\times ${p.N}`} />{' '}
      identity matrix with rows <Math tex="i" /> and <Math tex="j" /> exchanged:
    </>
  ),
  'matrix.legend': (p: TParams) => (
    <>
      For the two swapped basis states, the per-bit colors match the quantum circuit:
      <Box component="span" sx={{ color: p.controlColor as string, fontWeight: 700 }}>
        ■ control bits (shared by |i⟩, |j⟩)
      </Box>
      <Box component="span" sx={{ color: p.targetColor as string, fontWeight: 700 }}>
        ■ target bit (the sole differing bit → flipped by X)
      </Box>
    </>
  ),
  'matrix.alert.tooManyColumns': (p: TParams) =>
    `n = ${p.n} ⇒ 2ⁿ = ${p.N}: too many columns to expand fully (full two-line expansion is only available for n ≤ 6). Showing the landmark form instead.`,
  'matrix.alert.matrixTooBig': (p: TParams) =>
    `n = ${p.n} ⇒ the ${p.N} × ${p.N} matrix is too large to show in full (the full matrix is only drawn for n ≤ 4). The two-line notation is still expanded column by column.`,
  'matrix.footer': (p: TParams) => (
    <>
      {String(p.count)} elementary row matrices, in one-to-one correspondence with the layers of the
      quantum circuit above; the matrix of the whole permutation is the time-ordered product of these{' '}
      <Math tex="R_{(i,\,j)}" />.
    </>
  ),

  // ── layered realization (wiring diagram) view ──
  'layered.title': 'Layered Realization — Wiring Diagram',
  'layered.subtitle': (p: TParams) => (
    <>
      Each column is the fixed |0⟩..|2ⁿ-1⟩ track; each strand starts at some source |x⟩,
      weaves between tracks through the layers, and ends at α(|x⟩). {String(p.layers)}{' '}
      legal 2-cycle layer(s) (max direct d = {String(p.maxDirectDistance)})
      {(p.reduced as boolean) && (p.cancelledPairs as number) > 0 ? (
        <>
          {' '}— cancelled {String(p.cancelledPairs)} involution busy-pair(s) (was {String(p.canonicalLayers)} layers)
        </>
      ) : (p.reduced as boolean) ? (
        <> — no removable busy-work</>
      ) : null}
      .
    </>
  ),
  'layered.verify.ok': 'Verified: every strand ends at its target, and every layer has d ≤ 1.',
  'layered.verify.fail': (p: TParams) =>
    `Verification failed: ${p.mismatches} strand endpoint(s) mismatched, ${p.illegal} illegal layer(s).`,
  'layered.strategy.tooltip.gray':
    'Gray-path traversal: Top-down takes the AND-bridge (low weight); Bottom-up takes the OR-bridge (high weight). Only matters for d ≥ 2 transpositions.',
  'layered.strategy.tooltip.walkAll':
    'Every cycle was absorbed directly by Walk-aware this time, with no Gray-path conjugation expansion, so Top-down/Bottom-up has no effect (disabled).',
  'layered.strategy.tooltip.none':
    'This permutation has no d ≥ 2 transposition, hence no Gray-path conjugation expansion, so Top-down/Bottom-up has no effect (disabled).',
  'layered.reduced.tooltip.on':
    'On: adjacent (or commute-through) identical swap pairs cancel automatically, showing the minimized sequence.',
  'layered.reduced.tooltip.off':
    'Off: shows the algorithm’s raw output (including possible involution busy-work, to reveal the decomposition source).',
  'layered.walk.tooltip.on':
    'On: if a cycle’s members happen to lie along a Hamming-1 walk, walk the adjacent edges directly — exactly m-1 layers. A conditional rewrite, not a search.',
  'layered.walk.tooltip.off':
    'Off: every cycle is always expanded via the anchor (cycle[0] as the fan-out pivot).',
  'layered.walk.chip.detected.tooltip': (p: TParams) =>
    `Detected ${p.decomposed} / ${p.total} cycle(s) that are Hamming walks, decomposed directly via adjacent edges.`,
  'layered.walk.chip.none.tooltip':
    'No cycle in this permutation is a Hamming walk; walk-aware gives no benefit for this case (this is normal).',
  'layered.reverse.tooltip.desc':
    'Currently: |11⟩→|00⟩ (top-to-bottom descending). Click to switch back to ascending.',
  'layered.reverse.tooltip.asc':
    'Currently: |00⟩→|11⟩ (top-to-bottom ascending). Click to switch to descending order.',
  'layered.unsupported': (p: TParams) =>
    `${p.count} transposition(s) with d ≥ 3 are not yet supported for decomposition: ${p.list}`,
  'layered.empty.alreadyLegal':
    'The target is already a subgraph of the Adjacent Bipartite Graph; no layering needed.',
  'layered.empty.noCycle': 'There is currently no non-trivial cycle to decompose.',
  'layered.play.first': 'Back to start',
  'layered.play.prev': 'Previous step',
  'layered.play.pause': 'Pause',
  'layered.play.play': 'Auto-play',
  'layered.play.next': 'Next step',
  'layered.play.last': 'Skip to end',
  'layered.legend.label': 'Strand legend:',
  'layered.legend.fixed': '(fixed)',
  'layered.decomposition': 'Decomposition (left → right in time):',

  // ── legal (adjacent bipartite) graph view ──
  'legal.title': 'Legal Graph — Bipartite view',
  'legal.subtitle':
    'Left column = source |x⟩, right column = target |y⟩; an edge means Hamming(x, y) ≤ 1 (self-loops included).',
  'legal.chip.selfLoop': (p: TParams) => `self-loop × ${p.count}`,
  'legal.chip.bitFlip': (p: TParams) => `bit-flip × ${p.count}`,
  'legal.showSelfLoops': 'Show self-loops',
  'legal.hint':
    'Tip: hover a left-column |x⟩ to highlight its outgoing legal edges (x → y); hover a right-column |y⟩ to highlight its incoming legal edges (x → y).',

  // ── shared export / code / install affordances ──
  'export.copyCode.tooltip': 'Copy code',
  'export.download.py.tooltip': 'Download .py',
  'export.toast.codeCopied': 'Copied Qiskit code to clipboard',
  'export.toast.copyFailed': (p: TParams) => `Copy failed: ${p.error}`,
  'export.toast.downloadFailed': (p: TParams) => `Download failed: ${p.error}`,
  'export.toast.pyDownloaded': (p: TParams) => `Downloaded ${p.filename}.py`,
  'export.download.ipynb.btn': 'Download .ipynb',
  'export.colabHint': 'Upload to Google Colab: File → Upload notebook, then run each cell in order.',
  'export.copyCell.tooltip': 'Copy this cell',
  'export.toast.cellCopied': 'Copied this cell to clipboard',
  'export.toast.ipynbDownloaded': (p: TParams) => `Downloaded ${p.filename}.ipynb`,
  'export.install.label': 'Environment setup',
  'export.install.copy.tooltip': 'Copy install command',
  'export.install.hint': 'Includes matplotlib / pylatexenc for qc.draw("mpl") figure output.',
  'export.toast.installCopied': 'Copied install command to clipboard',
  'export.err.noClipboardImageApi': 'This browser does not support the image clipboard API',
  'export.png.copy.tooltip': 'Copy as PNG',
  'export.png.download.tooltip': 'Download PNG',
  'export.toast.svgNotFoundCopy': 'No figure found to copy',
  'export.toast.svgNotFoundDownload': 'No figure found to download',
  'export.toast.pngCopied': 'Copied PNG to clipboard',
  'export.toast.pngDownloaded': (p: TParams) => `Downloaded ${p.filename}.png`,

  // ── qiskit function-form (package) view ──
  'qiskit.title': 'Qiskit function form — arbitrary permutation α → quantum circuit',
  'qiskit.collapsedHint':
    'Expand to generate a general-purpose Python function for “arbitrary α → circuit” (press Generate code)',
  'qiskit.intro': (p: TParams) => (
    <>
      A self-contained, general-purpose Python function: pass in any permutation α (as cycles),
      and it performs the full “α → legal (Hamming = 1) layers → multi-controlled X” decomposition
      internally — no need to hand-write each gate. Pressing the button generates an example call
      for the current α and settings (strategy
      <Box component="span" sx={{ mx: 0.5, fontFamily: 'monospace' }}>
        {String(p.strategy)}
      </Box>
      , walk_aware={String(p.walkAware)}, reduce={String(p.reduced)}); change alpha_cycles to
      recompute other permutations.
    </>
  ),
  'qiskit.alphaLabel': 'Current α (cycle notation)',
  'qiskit.btn.generate': 'Generate code',
  'qiskit.btn.regenerate': 'Regenerate code',
  'qiskit.stale': 'α changed — the content below is stale',
  'qiskit.tab.module': 'Python module',
  'qiskit.tab.jupyter': 'Jupyter / Colab',
  'qiskit.footer':
    'The function takes a positive parameter: build_circuit(..., positive=True) expands open white controls via X-conjugation into positive-only controls, matching hardware that only supports positive controls.',

  'circuit.footer': (p: TParams) => (
    <>
      {String(p.count)} gate(s) total
      {(p.mode as string) === 'mixed' ? (
        <>
          , in one-to-one correspondence with the layers of the Wiring Diagram above;
          gate Lk flips the target qubit iff every control condition holds
          (solid black requires 1, open white requires 0).
        </>
      ) : (
        <>
          ; using the X-conjugation identity
          <Box
            component="span"
            sx={{
              mx: 0.5,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          >
            C⁰_q(U) = X_q · C¹_q(U) · X_q
          </Box>
          expands all {String(p.negCount)} open white control(s) into “X · positive control · X”. After expansion every control is solid black, mapping directly onto hardware that only supports positive controls.
        </>
      )}
    </>
  ),
} satisfies Dictionary;
