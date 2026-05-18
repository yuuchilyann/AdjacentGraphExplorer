import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import type { LegalEdge, LegalGraph } from '../types';

export type LegalGraphViewProps = {
  graph: LegalGraph;
};

const COLOR_SELF = '#9c27b0';
const COLOR_FLIP = '#1976d2';
const COLOR_HIGHLIGHT = '#ed6c02';

export function LegalGraphView({ graph }: LegalGraphViewProps) {
  const { n, states, edges } = graph;
  const [showSelfLoops, setShowSelfLoops] = useState(true);
  const [hover, setHover] = useState<{ side: 'left' | 'right'; index: number } | null>(null);

  const isLit = (e: LegalEdge): boolean => {
    if (hover === null) return true;
    return hover.side === 'left' ? e.from === hover.index : e.to === hover.index;
  };

  const visibleEdges = useMemo(
    () => (showSelfLoops ? edges : edges.filter((e) => e.hammingDistance === 1)),
    [edges, showSelfLoops],
  );

  // Layout
  const rows = Math.max(1, states.length);
  const rowHeight = rows <= 8 ? 38 : rows <= 32 ? 26 : rows <= 128 ? 14 : 6;
  const labelFontSize = rows <= 8 ? 16 : rows <= 32 ? 13 : rows <= 128 ? 9 : 6;
  const colGap = Math.max(220, Math.min(420, rows * 14));
  const padX = 90;
  const padY = 24;
  const bracketW = 14;
  const labelW = Math.max(56, n * 12 + 28);
  const totalH = padY * 2 + rows * rowHeight;
  const totalW = padX * 2 + labelW * 2 + colGap;

  const leftLabelX = padX + labelW;
  const leftConnX = padX + labelW + 6;
  const rightConnX = padX + labelW + colGap - 6;
  const rightLabelX = padX + labelW + colGap;
  const yFor = (i: number) => padY + rowHeight / 2 + i * rowHeight;

  const ketLabel = (s: string) => (n === 0 ? '|⟩' : `|${s}⟩`);

  const splitEdges = useMemo(() => {
    const dim: LegalEdge[] = [];
    const lit: LegalEdge[] = [];
    for (const e of visibleEdges) {
      if (isLit(e)) lit.push(e);
      else dim.push(e);
    }
    return { dim, lit };
  }, [visibleEdges, hover]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          mb: 1.5,
          alignItems: { xs: 'flex-start', md: 'center' },
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="overline" color="text.secondary">
            合法圖 (Legal Graph) — Bipartite view
          </Typography>
          <Typography variant="body2" color="text.secondary">
            左欄為來源 |x⟩，右欄為目標 |y⟩，連線代表 Hamming(x, y) ≤ 1（含 self-loop）。
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip
            size="small"
            sx={{ bgcolor: COLOR_SELF, color: 'white' }}
            label={`self-loop × ${edges.filter((e) => e.hammingDistance === 0).length}`}
          />
          <Chip
            size="small"
            sx={{ bgcolor: COLOR_FLIP, color: 'white' }}
            label={`bit-flip × ${edges.filter((e) => e.hammingDistance === 1).length}`}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showSelfLoops}
                onChange={(_, c) => setShowSelfLoops(c)}
              />
            }
            label="顯示 self-loop"
          />
        </Stack>
      </Stack>

      <Box sx={{ overflow: 'auto', maxWidth: '100%', bgcolor: 'background.default', borderRadius: 1 }}>
        <svg
          width={totalW}
          height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`}
          style={{ display: 'block', margin: '0 auto' }}
        >
          {/* Brackets */}
          <Bracket
            x={padX + labelW - labelW - 4}
            y0={padY}
            y1={padY + rows * rowHeight}
            side="left"
            width={bracketW}
          />
          <Bracket
            x={padX + labelW + colGap + labelW + 4}
            y0={padY}
            y1={padY + rows * rowHeight}
            side="right"
            width={bracketW}
          />
          <Bracket
            x={padX + labelW + 0}
            y0={padY}
            y1={padY + rows * rowHeight}
            side="right"
            width={bracketW * 0.6}
            opacity={0.25}
          />
          <Bracket
            x={padX + labelW + colGap}
            y0={padY}
            y1={padY + rows * rowHeight}
            side="left"
            width={bracketW * 0.6}
            opacity={0.25}
          />

          {/* Edges — dim first, lit on top */}
          <g>
            {splitEdges.dim.map((e, idx) => (
              <line
                key={`d${idx}`}
                x1={leftConnX}
                y1={yFor(e.from)}
                x2={rightConnX}
                y2={yFor(e.to)}
                stroke={e.hammingDistance === 0 ? COLOR_SELF : COLOR_FLIP}
                strokeOpacity={hover === null ? 0.45 : 0.08}
                strokeWidth={1}
              />
            ))}
          </g>
          <g>
            {splitEdges.lit.map((e, idx) => (
              <line
                key={`l${idx}`}
                x1={leftConnX}
                y1={yFor(e.from)}
                x2={rightConnX}
                y2={yFor(e.to)}
                stroke={hover === null
                  ? (e.hammingDistance === 0 ? COLOR_SELF : COLOR_FLIP)
                  : COLOR_HIGHLIGHT}
                strokeOpacity={0.9}
                strokeWidth={hover === null ? 1 : 1.6}
              />
            ))}
          </g>

          {/* Labels: left column (hover = outgoing |x⟩ → |y⟩) */}
          {states.map((s) => {
            const active = hover?.side === 'left' && hover.index === s.index;
            return (
              <g
                key={`L-${s.index}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover({ side: 'left', index: s.index })}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  x={leftLabelX - labelW}
                  y={yFor(s.index) - rowHeight / 2}
                  width={labelW}
                  height={rowHeight}
                  fill={active ? 'rgba(237, 108, 2, 0.12)' : 'transparent'}
                />
                <text
                  x={leftLabelX - 6}
                  y={yFor(s.index) + labelFontSize / 3}
                  textAnchor="end"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fontSize={labelFontSize}
                  fill={active ? COLOR_HIGHLIGHT : '#222'}
                >
                  {ketLabel(s.label)}
                </text>
              </g>
            );
          })}

          {/* Labels: right column (hover = incoming |x⟩ → |y⟩) */}
          {states.map((s) => {
            const active = hover?.side === 'right' && hover.index === s.index;
            return (
              <g
                key={`R-${s.index}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover({ side: 'right', index: s.index })}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  x={rightLabelX}
                  y={yFor(s.index) - rowHeight / 2}
                  width={labelW}
                  height={rowHeight}
                  fill={active ? 'rgba(237, 108, 2, 0.12)' : 'transparent'}
                />
                <text
                  x={rightLabelX + 6}
                  y={yFor(s.index) + labelFontSize / 3}
                  textAnchor="start"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fontSize={labelFontSize}
                  fill={active ? COLOR_HIGHLIGHT : '#222'}
                >
                  {ketLabel(s.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        提示：滑鼠移到左欄 |x⟩ 高亮其 outgoing 合法邊 (x → y)；移到右欄 |y⟩ 高亮其 incoming 合法邊 (x → y)。
      </Typography>
    </Paper>
  );
}

type BracketProps = {
  x: number;
  y0: number;
  y1: number;
  side: 'left' | 'right';
  width: number;
  opacity?: number;
};

function Bracket({ x, y0, y1, side, width, opacity = 1 }: BracketProps) {
  const dir = side === 'left' ? -1 : 1;
  const r = Math.min(14, (y1 - y0) / 6);
  const d = `
    M ${x + dir * width} ${y0}
    Q ${x} ${y0}, ${x} ${y0 + r}
    L ${x} ${y1 - r}
    Q ${x} ${y1}, ${x + dir * width} ${y1}
  `;
  return (
    <path
      d={d}
      stroke="#555"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}
