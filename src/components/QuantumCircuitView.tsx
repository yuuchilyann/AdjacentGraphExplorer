import { useRef } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

import type { LayeredRealization } from '../lib/layered';
import { ExportActions } from './ExportActions';

export type QuantumCircuitViewProps = {
  realization: LayeredRealization;
  n: number;
  /** 0 = before any layer applied; k = after layer k applied. */
  step: number;
};

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

  if (n <= 0 || realization.layers.length === 0) return null;

  const gates: Gate[] = realization.layers.map((l) => buildGate(l.swap, n));

  // Layout — MSQ (least-significant qubit at the BOTTOM).
  const rowH = 44;
  const padX = 80;
  const padY = 36;
  const gateW = 56;
  const startX = padX + 90; // leave room for qubit labels on left
  const endPadX = 60; // tail wire after the last gate

  const totalH = padY * 2 + n * rowH;
  const totalW = startX + gates.length * gateW + endPadX;

  // q is the qubit index; MSQ means q=0 sits at the BOTTOM.
  const yForQ = (q: number) =>
    padY + (n - 1 - q) * rowH + rowH / 2;

  // x position of the vertical bar of gate index k (0-based).
  const xForGate = (k: number) => startX + k * gateW + gateW / 2;

  const wireEndX = totalW - endPadX / 2;

  type Status = 'past' | 'active' | 'future';
  const gateStatus = (k: number): Status => {
    // step is 1-indexed in LayeredView terms; layer index k (0-based) corresponds
    // to transition (k+1). After step S, layers 0..S-1 have been applied.
    if (k + 1 < step) return 'past';
    if (k + 1 === step) return 'active';
    return 'future';
  };

  const gateColor = (s: Status) =>
    s === 'active' ? COLOR_GATE_ACTIVE : s === 'future' ? COLOR_GATE_FUTURE : COLOR_GATE;

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 1.5, alignItems: { xs: 'flex-start', md: 'center' } }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Quantum Circuit — Layer → Multi-controlled X
          </Typography>
          <Typography variant="body2" color="text.secondary">
            每一個 Hamming d = 1 的 layer (a&nbsp;b) 對應一個多控 X gate：
            差異位元 = target（⊕），其餘 n−1 個位元為控制端 —
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                mx: 0.5,
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: COLOR_GATE,
                }}
              />
              =1
            </Box>
            、
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                mx: 0.5,
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#fff',
                  border: `1.5px solid ${COLOR_GATE}`,
                }}
              />
              =0
            </Box>
            。線路採用 MSQ 配置：最下方為 |x₀⟩，最上方為 |x
            {n - 1}⟩；時間軸由左至右。
          </Typography>
        </Box>
        <ExportActions
          svgRef={svgRef}
          filename={`quantum-circuit-n${n}-${realization.strategy}`}
        />
      </Stack>

      <Box
        sx={{
          overflow: 'auto',
          maxWidth: '100%',
          bgcolor: 'background.default',
          borderRadius: 1,
        }}
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
            const x = xForGate(k);

            // Vertical span: from topmost to bottommost involved qubit.
            // Every qubit is involved (target + n-1 controls), so it spans all qubits.
            const yTop = yForQ(n - 1);
            const yBot = yForQ(0);

            return (
              <g key={`gate-${k}`}>
                {/* Active gate highlight band */}
                {status === 'active' && (
                  <rect
                    x={x - gateW / 2 + 4}
                    y={padY - 6}
                    width={gateW - 8}
                    height={totalH - padY * 2 + 12}
                    fill="rgba(237,108,2,0.08)"
                    rx={6}
                  />
                )}

                {/* Layer label at top */}
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

                {/* Vertical control bar */}
                <line
                  x1={x}
                  y1={yTop}
                  x2={x}
                  y2={yBot}
                  stroke={color}
                  strokeWidth={1.6}
                />

                {/* Per-qubit markers */}
                {g.controls.map((kind, q) => {
                  const y = yForQ(q);
                  if (kind === 'target') {
                    // ⊕ symbol
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
                  if (kind === 'pos') {
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
                  // 'neg' — open white control
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
          {step < gates.length &&
            Array.from({ length: n }, (_, q) => q).map((q) => {
              const y = yForQ(q);
              const x1 = step === 0 ? startX - 6 : xForGate(step - 1);
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
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1 }}
      >
        共 {gates.length} 個 gate，與上方 Wiring Diagram 的 layer 一一對應；
        gate Lk 作用 = 翻轉 target qubit 當且僅當每個控制端條件成立
        （實心黑要求 1、空心白要求 0）。
      </Typography>
    </Paper>
  );
}
