import { useRef, useState } from 'react';
import {
  Box,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';

import type { LayeredRealization } from '../lib/layered';
import {
  buildIpynb,
  buildQiskitCode,
  buildQiskitNotebook,
  type QiskitGate,
} from '../lib/qiskit';
import { CodePanel } from './CodePanel';
import { JupyterPanel } from './JupyterPanel';
import { QiskitInstallBlock } from './QiskitInstallBlock';
import { SvgViewport } from './SvgViewport';
import { useI18n } from '../i18n';

export type QuantumCircuitViewProps = {
  realization: LayeredRealization;
  n: number;
  /** 0 = before any layer applied; k = after layer k applied. */
  step: number;
};

type Mode = 'mixed' | 'positive';

const COLOR_ACTIVE = '#ed6c02';
const COLOR_WIRE = '#1f1f1f';
const COLOR_WIRE_FUTURE = '#bdbdbd';
const COLOR_GATE = '#1f1f1f';
const COLOR_GATE_ACTIVE = '#ed6c02';
const COLOR_GATE_FUTURE = '#9e9e9e';

/**
 * One quantum gate, derived from a legal (Hamming-distance-1) layer swap (a, b).
 *
 * - target qubit = the unique bit position where a and b differ
 * - every other qubit q is a control:
 *     bit value in a (==value in b) = 1 → positive control (solid black)
 *     bit value in a (==value in b) = 0 → negative control (open white)
 */
type Gate = {
  target: number;
  /** length n, entries for q===target are ignored */
  controls: ('pos' | 'neg' | 'target')[];
};

function buildGate(swap: [number, number], n: number): Gate {
  const [a, b] = swap;
  const diff = (a ^ b) >>> 0;
  let target = -1;
  for (let q = 0; q < n; q++) {
    if (((diff >> q) & 1) === 1) {
      target = q;
      break;
    }
  }
  const controls: Gate['controls'] = [];
  for (let q = 0; q < n; q++) {
    if (q === target) {
      controls.push('target');
    } else {
      const bit = (a >> q) & 1;
      controls.push(bit === 1 ? 'pos' : 'neg');
    }
  }
  return { target, controls };
}

export function QuantumCircuitView({
  realization,
  n,
  step,
}: QuantumCircuitViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<Mode>('mixed');
  // The orange band marks the active layer (current playback position). It is
  // useful on-screen but gets baked into the "Copy as PNG" export, so let the
  // user hide it to capture a clean, standard circuit diagram.
  const [showPlayhead, setShowPlayhead] = useState(true);
  const [tab, setTab] = useState<'diagram' | 'qiskit' | 'jupyter'>('diagram');

  if (n <= 0 || realization.layers.length === 0) return null;

  const gates: Gate[] = realization.layers.map((l) => buildGate(l.swap, n));
  // Same gates, annotated with their originating swap, for the code exporters.
  const qiskitGates: QiskitGate[] = gates.map((g, k) => ({
    ...g,
    swap: realization.layers[k].swap,
  }));

  // Layout — MSQ (least-significant qubit at the BOTTOM).
  const rowH = 44;
  const padY = 36;
  const slotW = 56;
  const slotsPerGate = mode === 'positive' ? 3 : 1;
  const endPadX = 60; // tail wire after the last gate
  // Left padding is sized to match the right side (endPadX / 2 = 30 px), plus
  // a labelGutter just wide enough for the qubit label `|x_k⟩`. This keeps
  // exported PNGs visually centered instead of leaving a large empty band on
  // the left.
  const padX = endPadX / 2; // 30 px — symmetric with the right trailing space
  const labelGutter = 60; // room for `|x_k⟩` (textAnchor="end")
  const startX = padX + labelGutter;

  const totalH = padY * 2 + n * rowH;
  const totalW = startX + gates.length * slotsPerGate * slotW + endPadX;

  // q is the qubit index; MSQ means q=0 sits at the BOTTOM.
  const yForQ = (q: number) => padY + (n - 1 - q) * rowH + rowH / 2;

  // x position of a specific slot within a layer.
  //  - mixed mode: slot is always 0 (the gate)
  //  - positive mode: slot ∈ {0, 1, 2} = pre-X, gate, post-X
  const xForSlot = (k: number, slot: number) =>
    startX + (k * slotsPerGate + slot) * slotW + slotW / 2;

  // The "gate column" of layer k.
  const xGate = (k: number) => xForSlot(k, mode === 'positive' ? 1 : 0);
  // Left/right edge x of layer k's full footprint (all its slots).
  const xLayerLeft = (k: number) => startX + k * slotsPerGate * slotW;
  const xLayerRight = (k: number) =>
    startX + (k + 1) * slotsPerGate * slotW;

  const wireEndX = totalW - endPadX / 2;

  type Status = 'past' | 'active' | 'future';
  const gateStatus = (k: number): Status => {
    // With the playhead hidden, render every gate as a plain (black, solid)
    // gate so "Copy as PNG" yields a standard circuit with no playback cues.
    if (!showPlayhead) return 'past';
    if (k + 1 < step) return 'past';
    if (k + 1 === step) return 'active';
    return 'future';
  };

  const gateColor = (s: Status) =>
    s === 'active' ? COLOR_GATE_ACTIVE : s === 'future' ? COLOR_GATE_FUTURE : COLOR_GATE;

  // Total negative-control count across all gates (informational only).
  const negCount = gates.reduce(
    (sum, g) => sum + g.controls.filter((c) => c === 'neg').length,
    0,
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      {/* Row 1 — info: title + subtitle (with inline color legend) */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 1, alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {t('circuit.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('circuit.subtitle', { n, gateColor: COLOR_GATE })}
          </Typography>
        </Box>
      </Stack>

      {/* Row 2 — toolbar: control style toggle */}
      <Stack
        direction="row"
        spacing={1}
        divider={
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, my: 0.5 }}
          />
        }
        sx={{
          mb: 1.5,
          flexWrap: 'wrap',
          rowGap: 1,
          p: 0.75,
          bgcolor: 'action.hover',
          borderRadius: 1,
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            {t('circuit.controlLabel')}
          </Typography>
          <Tooltip
            title={
              mode === 'mixed'
                ? t('circuit.mode.tooltip.mixed')
                : t('circuit.mode.tooltip.positive')
            }
          >
            <ToggleButtonGroup
              value={mode}
              exclusive
              size="small"
              onChange={(_, v: Mode | null) => v && setMode(v)}
              color="primary"
            >
              <ToggleButton value="mixed">{t('circuit.mode.mixed')}</ToggleButton>
              <ToggleButton value="positive">{t('circuit.mode.positive')}</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Stack>

        <Tooltip
          title={
            tab !== 'diagram'
              ? t('circuit.playhead.tooltip.off')
              : t('circuit.playhead.tooltip.on')
          }
        >
          <FormControlLabel
            sx={{ ml: 0, mr: 0 }}
            control={
              <Switch
                size="small"
                checked={showPlayhead}
                disabled={tab !== 'diagram'}
                onChange={(_, v) => setShowPlayhead(v)}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                {t('circuit.playhead.label')}
              </Typography>
            }
          />
        </Tooltip>
      </Stack>

      {/* Tabs — diagram vs Qiskit source (two views of the same gate list) */}
      <Tabs
        value={tab}
        onChange={(_, v: 'diagram' | 'qiskit' | 'jupyter') => setTab(v)}
        sx={{ mb: 1.5, minHeight: 36 }}
      >
        <Tab value="diagram" label={t('circuit.tab.diagram')} sx={{ minHeight: 36, py: 0 }} />
        <Tab
          value="qiskit"
          label={t('circuit.tab.qiskit')}
          sx={{ minHeight: 36, py: 0 }}
        />
        <Tab
          value="jupyter"
          label={t('circuit.tab.jupyter')}
          sx={{ minHeight: 36, py: 0 }}
        />
      </Tabs>

      {tab === 'qiskit' && <QiskitInstallBlock />}

      {tab === 'qiskit' && (
        <CodePanel
          code={buildQiskitCode(qiskitGates, n, mode, realization.strategy)}
          filename={`qiskit-circuit-n${n}-${realization.strategy}-${mode}`}
        />
      )}

      {tab === 'jupyter' && (
        <JupyterPanel
          cells={buildQiskitNotebook(
            qiskitGates,
            n,
            mode,
            realization.strategy,
            lang,
          )}
          ipynb={buildIpynb(
            buildQiskitNotebook(qiskitGates, n, mode, realization.strategy, lang),
          )}
          filename={`qiskit-circuit-n${n}-${realization.strategy}-${mode}`}
        />
      )}

      {tab === 'diagram' && (
      <SvgViewport
        svgRef={svgRef}
        filename={`quantum-circuit-n${n}-${realization.strategy}-${mode}`}
      >
        <svg
          ref={svgRef}
          width={totalW}
          height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`}
          style={{ display: 'block', margin: '0 auto' }}
        >
          {/* Qubit wires + labels */}
          {Array.from({ length: n }, (_, q) => q).map((q) => {
            const y = yForQ(q);
            return (
              <g key={`wire-${q}`}>
                <text
                  x={startX - 14}
                  y={y + 5}
                  textAnchor="end"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fontSize={14}
                  fill={COLOR_WIRE}
                  fontWeight={600}
                >
                  |x{q}⟩
                </text>
                <line
                  x1={startX - 6}
                  y1={y}
                  x2={wireEndX}
                  y2={y}
                  stroke={COLOR_WIRE}
                  strokeWidth={1.4}
                />
              </g>
            );
          })}

          {/* Gates */}
          {gates.map((g, k) => {
            const status = gateStatus(k);
            const color = gateColor(status);
            const x = xGate(k);

            // Vertical span: every qubit is involved (target + n-1 controls).
            const yTop = yForQ(n - 1);
            const yBot = yForQ(0);

            // X-gate flanking columns (only in positive-only mode).
            const xPre = mode === 'positive' ? xForSlot(k, 0) : null;
            const xPost = mode === 'positive' ? xForSlot(k, 2) : null;

            return (
              <g key={`gate-${k}`}>
                {/* Active gate highlight band — spans the entire layer footprint */}
                {showPlayhead && status === 'active' && (
                  <rect
                    x={xLayerLeft(k) + 4}
                    y={padY - 6}
                    width={xLayerRight(k) - xLayerLeft(k) - 8}
                    height={totalH - padY * 2 + 12}
                    fill="rgba(237,108,2,0.08)"
                    rx={6}
                  />
                )}

                {/* Layer label at top — over the gate column */}
                <text
                  x={x}
                  y={padY - 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fill={status === 'active' ? COLOR_ACTIVE : '#666'}
                  fontWeight={status === 'active' ? 700 : 500}
                >
                  L{k + 1}
                </text>

                {/* Pre/post X gates on negative-control qubits */}
                {mode === 'positive' &&
                  g.controls.map((kind, q) => {
                    if (kind !== 'neg') return null;
                    const y = yForQ(q);
                    const boxW = 22;
                    const boxH = 22;
                    return (
                      <g key={`xc-${k}-${q}`}>
                        {[xPre!, xPost!].map((cx, i) => (
                          <g key={`xb-${k}-${q}-${i}`}>
                            <rect
                              x={cx - boxW / 2}
                              y={y - boxH / 2}
                              width={boxW}
                              height={boxH}
                              fill="#fff"
                              stroke={color}
                              strokeWidth={1.6}
                              rx={3}
                            />
                            <text
                              x={cx}
                              y={y + 5}
                              textAnchor="middle"
                              fontSize={14}
                              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                              fill={color}
                              fontWeight={700}
                            >
                              X
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })}

                {/* Vertical control bar (gate column) */}
                <line
                  x1={x}
                  y1={yTop}
                  x2={x}
                  y2={yBot}
                  stroke={color}
                  strokeWidth={1.6}
                />

                {/* Per-qubit markers on the gate column */}
                {g.controls.map((kind, q) => {
                  const y = yForQ(q);
                  if (kind === 'target') {
                    const r = 12;
                    return (
                      <g key={`gm-${k}-${q}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r={r}
                          fill="#fff"
                          stroke={color}
                          strokeWidth={1.8}
                        />
                        <line
                          x1={x - r}
                          y1={y}
                          x2={x + r}
                          y2={y}
                          stroke={color}
                          strokeWidth={1.8}
                        />
                        <line
                          x1={x}
                          y1={y - r}
                          x2={x}
                          y2={y + r}
                          stroke={color}
                          strokeWidth={1.8}
                        />
                      </g>
                    );
                  }
                  // In positive-only mode, negative controls are flanked by
                  // X gates and rendered as positive (solid black) here.
                  const effective: 'pos' | 'neg' =
                    mode === 'positive' && kind === 'neg' ? 'pos' : kind;
                  if (effective === 'pos') {
                    return (
                      <circle
                        key={`gm-${k}-${q}`}
                        cx={x}
                        cy={y}
                        r={6}
                        fill={color}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`gm-${k}-${q}`}
                      cx={x}
                      cy={y}
                      r={6}
                      fill="#fff"
                      stroke={color}
                      strokeWidth={1.8}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Future-wire dim overlay: redraw the tail dim if step < total */}
          {showPlayhead &&
            step < gates.length &&
            Array.from({ length: n }, (_, q) => q).map((q) => {
              const y = yForQ(q);
              const x1 = step === 0 ? startX - 6 : xLayerRight(step - 1);
              return (
                <line
                  key={`wf-${q}`}
                  x1={x1}
                  y1={y}
                  x2={wireEndX}
                  y2={y}
                  stroke={COLOR_WIRE_FUTURE}
                  strokeWidth={1.4}
                  strokeDasharray="4 4"
                  opacity={0.6}
                />
              );
            })}
        </svg>
      </SvgViewport>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1 }}
      >
        {t('circuit.footer', { count: gates.length, mode, negCount })}
      </Typography>
    </Paper>
  );
}
