import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

import {
  cycleDecomposition,
  formatCycles,
  hammingDistance,
  isComplete,
  isLegalEdge,
  legalTargetsFor,
  snapTarget,
} from '../lib/permutation';
import { LayeredView } from './LayeredView';
import { SvgViewport } from './SvgViewport';

export type PermutationBuilderProps = {
  n: number;
};

const COLOR_COMMITTED = '#2e7d32';
const COLOR_COMMITTED_FAR = '#ed6c02';
const COLOR_PREVIEW = '#ed6c02';
const COLOR_AVAILABLE = '#1976d2';
const COLOR_FAR_AVAIL = '#ed6c02';
const COLOR_TAKEN = '#c62828';
const COLOR_HOVER_BG = 'rgba(237, 108, 2, 0.12)';

export function PermutationBuilder({ n }: PermutationBuilderProps) {
  const [mapping, setMapping] = useState<Map<number, number>>(new Map());
  const [selected, setSelected] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset whenever n changes.
  const lastN = useRef(n);
  if (lastN.current !== n) {
    lastN.current = n;
    if (mapping.size > 0) setMapping(new Map());
    if (selected !== null) setSelected(null);
    if (dragPos !== null) setDragPos(null);
  }

  const total = 1 << n;
  const usedTargets = useMemo(() => {
    const s = new Set<number>();
    mapping.forEach((v) => s.add(v));
    return s;
  }, [mapping]);

  // Layout (mirrors LegalGraphView)
  const rows = Math.max(1, total);
  const rowHeight = rows <= 8 ? 38 : rows <= 32 ? 26 : rows <= 128 ? 14 : 6;
  const labelFontSize = rows <= 8 ? 16 : rows <= 32 ? 13 : rows <= 128 ? 9 : 6;
  const colGap = Math.max(220, Math.min(420, rows * 14));
  const padX = 90;
  const padY = 24;
  const labelW = Math.max(56, n * 12 + 28);
  const totalH = padY * 2 + rows * rowHeight;
  const totalW = padX * 2 + labelW * 2 + colGap;

  const leftLabelX = padX + labelW;
  const leftConnX = padX + labelW + 6;
  const rightConnX = padX + labelW + colGap - 6;
  const rightLabelX = padX + labelW + colGap;
  const yFor = (i: number) => padY + rowHeight / 2 + i * rowHeight;
  const ketLabel = (i: number) =>
    n === 0 ? '|⟩' : `|${i.toString(2).padStart(n, '0')}⟩`;

  const cycles = useMemo(() => cycleDecomposition(mapping, n), [mapping, n]);
  const complete = useMemo(() => isComplete(mapping, n), [mapping, n]);

  const legalSet = useMemo(() => {
    if (selected === null) return new Set<number>();
    return new Set(legalTargetsFor(selected, n));
  }, [selected, n]);

  const svgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const rowFromY = (y: number): number => {
    const raw = Math.floor((y - padY) / rowHeight);
    return Math.max(0, Math.min(total - 1, raw));
  };

  const commitFromIntended = (source: number, intended: number) => {
    const snapped = snapTarget(source, intended, mapping, n);
    if (snapped === null) return;
    const next = new Map(mapping);
    next.set(source, snapped);
    setMapping(next);
  };

  const handleLeftClick = (idx: number) => {
    // Toggle: clicking already-mapped source unbinds + re-selects.
    if (mapping.has(idx)) {
      const next = new Map(mapping);
      next.delete(idx);
      setMapping(next);
      setSelected(idx);
      return;
    }
    setSelected(selected === idx ? null : idx);
  };

  const handleRightClick = (idx: number) => {
    if (selected === null) return;
    commitFromIntended(selected, idx);
    setSelected(null);
  };

  const handleLeftMouseDown = (idx: number) => {
    if (mapping.has(idx)) {
      const next = new Map(mapping);
      next.delete(idx);
      setMapping(next);
    }
    setSelected(idx);
    setDragPos({ x: leftConnX, y: yFor(idx) });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selected === null || dragPos === null) return;
    const p = svgPoint(e.clientX, e.clientY);
    setDragPos(p);
  };

  const handleSvgMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selected === null) return;
    if (dragPos === null) return; // click-mode, ignore
    const p = svgPoint(e.clientX, e.clientY);
    // Only commit if release happened on the right half.
    if (p.x >= padX + labelW + colGap / 2) {
      const intended = rowFromY(p.y);
      commitFromIntended(selected, intended);
      setSelected(null);
    }
    setDragPos(null);
  };

  const handleSvgMouseLeave = () => {
    setDragPos(null);
  };

  const reset = () => {
    setMapping(new Map());
    setSelected(null);
    setDragPos(null);
  };

  // 隨機完整 bijection（Fisher-Yates）— 通常會含 d ≥ 2 邊，會自動觸發 Layered Realization。
  const randomizeAny = () => {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    const next = new Map<number, number>();
    for (let i = 0; i < arr.length; i++) next.set(i, arr[i]!);
    setMapping(next);
    setSelected(null);
    setDragPos(null);
  };

  // 隨機合法 bijection：在超立方體上做隨機完美匹配（每對沿單一座標翻轉），
  // 保證所有邊 d ≤ 1，即 G_α ⊆ Adjacent Bipartite Graph。
  const randomizeLegal = () => {
    const used = new Array<boolean>(total).fill(false);
    const next = new Map<number, number>();
    const order = Array.from({ length: total }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    for (const x of order) {
      if (used[x]) continue;
      const bitOrder = Array.from({ length: n }, (_, k) => k);
      for (let i = bitOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bitOrder[i], bitOrder[j]] = [bitOrder[j]!, bitOrder[i]!];
      }
      let paired = -1;
      for (const k of bitOrder) {
        const y = x ^ (1 << k);
        if (!used[y]) {
          paired = y;
          break;
        }
      }
      if (paired === -1) {
        next.set(x, x);
        used[x] = true;
      } else {
        next.set(x, paired);
        next.set(paired, x);
        used[x] = true;
        used[paired] = true;
      }
    }
    setMapping(next);
    setSelected(null);
    setDragPos(null);
  };

  // Pre-compute committed edges (rendered as straight lines).
  const committedEdges = useMemo(() => {
    const arr: Array<{ from: number; to: number }> = [];
    mapping.forEach((to, from) => arr.push({ from, to }));
    return arr;
  }, [mapping]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {/* Row 1 — info: title + subtitle, progress chip on the right */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 1, alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            Permutation Builder — 連連看
          </Typography>
          <Typography variant="body2" color="text.secondary">
            左欄點/拖到右欄完成連線。非法或衝突的釋放會 silent-snap 到最近的合法可用目標。
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={complete ? <CheckCircleIcon /> : undefined}
          color={complete ? 'success' : 'default'}
          label={`進度 ${mapping.size}/${total}`}
          sx={{ flexShrink: 0 }}
        />
      </Stack>

      {/* Row 2 — toolbar: random actions + reset */}
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
        <ButtonGroup size="small" variant="outlined">
          <Button
            startIcon={<AutoFixHighIcon />}
            onClick={randomizeLegal}
            title="隨機產生 G_α ⊆ Adjacent Bipartite Graph 的合法排列（所有邊 d ≤ 1）"
          >
            隨機合法
          </Button>
          <Button
            startIcon={<ShuffleIcon />}
            onClick={randomizeAny}
            title="隨機產生任意完整排列（通常含 d ≥ 2 邊，會觸發 Layered Realization）"
          >
            隨機任意
          </Button>
        </ButtonGroup>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={reset}
          disabled={mapping.size === 0 && selected === null}
        >
          清除
        </Button>
      </Stack>

      <SvgViewport
        svgRef={svgRef}
        filename={`permutation-builder-n${n}`}
        disableUserSelect
      >
        <svg
          ref={svgRef}
          width={totalW}
          height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`}
          style={{ display: 'block', margin: '0 auto', touchAction: 'none' }}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseLeave}
        >
          {/* Background hint lines when a source is selected. */}
          {selected !== null &&
            Array.from({ length: total }, (_, t) => t)
              .filter((t) => t !== selected || legalSet.has(t))
              .map((t) => {
                const isLegal = legalSet.has(t);
                const taken =
                  usedTargets.has(t) && mapping.get(selected) !== t;
                const stroke = taken
                  ? COLOR_TAKEN
                  : isLegal
                    ? COLOR_AVAILABLE
                    : COLOR_FAR_AVAIL;
                return (
                  <line
                    key={`hint-${t}`}
                    x1={leftConnX}
                    y1={yFor(selected)}
                    x2={rightConnX}
                    y2={yFor(t)}
                    stroke={stroke}
                    strokeOpacity={isLegal ? 0.22 : 0.1}
                    strokeWidth={1}
                    strokeDasharray={isLegal ? '3 3' : '2 4'}
                  />
                );
              })}

          {/* Committed edges */}
          {committedEdges.map((e) => {
            const far = !isLegalEdge(e.from, e.to);
            return (
              <line
                key={`c-${e.from}`}
                x1={leftConnX}
                y1={yFor(e.from)}
                x2={rightConnX}
                y2={yFor(e.to)}
                stroke={far ? COLOR_COMMITTED_FAR : COLOR_COMMITTED}
                strokeWidth={1.6}
                strokeOpacity={0.9}
                strokeDasharray={far ? '6 3' : undefined}
              />
            );
          })}

          {/* Drag preview (rubber band) */}
          {selected !== null && dragPos && (
            <line
              x1={leftConnX}
              y1={yFor(selected)}
              x2={dragPos.x}
              y2={dragPos.y}
              stroke={COLOR_PREVIEW}
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
          )}

          {/* Left labels (sources) */}
          {Array.from({ length: total }, (_, i) => i).map((i) => {
            const isSelected = selected === i;
            const isDone = mapping.has(i);
            return (
              <g
                key={`L-${i}`}
                style={{ cursor: 'pointer' }}
                onMouseDown={() => handleLeftMouseDown(i)}
                onClick={() => handleLeftClick(i)}
              >
                <rect
                  x={leftLabelX - labelW}
                  y={yFor(i) - rowHeight / 2}
                  width={labelW}
                  height={rowHeight}
                  fill={
                    isSelected
                      ? COLOR_HOVER_BG
                      : isDone
                        ? 'rgba(46, 125, 50, 0.08)'
                        : 'transparent'
                  }
                />
                <text
                  x={leftLabelX - 6}
                  y={yFor(i) + labelFontSize / 3}
                  textAnchor="end"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fontSize={labelFontSize}
                  fill={
                    isSelected
                      ? COLOR_PREVIEW
                      : isDone
                        ? COLOR_COMMITTED
                        : '#222'
                  }
                  fontWeight={isSelected || isDone ? 600 : 400}
                >
                  {ketLabel(i)}
                </text>
              </g>
            );
          })}

          {/* Right labels (targets) */}
          {Array.from({ length: total }, (_, i) => i).map((i) => {
            const isLegal = selected !== null && legalSet.has(i);
            const isTaken = usedTargets.has(i);
            const isTakenByOther =
              isTaken && selected !== null && mapping.get(selected) !== i;

            let fill = 'transparent';
            let stroke: string = 'none';
            let color: string = '#222';
            if (selected === null) {
              fill = isTaken ? 'rgba(46, 125, 50, 0.08)' : 'transparent';
              color = isTaken ? COLOR_COMMITTED : '#222';
            } else if (isTakenByOther) {
              fill = 'rgba(198, 40, 40, 0.12)';
              color = COLOR_TAKEN;
            } else if (isLegal) {
              fill = 'rgba(25, 118, 210, 0.14)';
              stroke = COLOR_AVAILABLE;
              color = COLOR_AVAILABLE;
            } else {
              fill = 'rgba(237, 108, 2, 0.10)';
              stroke = COLOR_FAR_AVAIL;
              color = COLOR_FAR_AVAIL;
            }
            return (
              <g
                key={`R-${i}`}
                style={{ cursor: selected !== null ? 'pointer' : 'default' }}
                onClick={() => handleRightClick(i)}
              >
                <rect
                  x={rightLabelX}
                  y={yFor(i) - rowHeight / 2}
                  width={labelW}
                  height={rowHeight}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={stroke === 'none' ? 0 : 1}
                />
                <text
                  x={rightLabelX + 6}
                  y={yFor(i) + labelFontSize / 3}
                  textAnchor="start"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fontSize={labelFontSize}
                  fill={color}
                  fontWeight={isTaken ? 600 : 400}
                >
                  {ketLabel(i)}
                </text>
              </g>
            );
          })}
        </svg>
      </SvgViewport>

      <Stack spacing={1} sx={{ mt: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Cycle 表示
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
          >
            α = {formatCycles(cycles, n)}
          </Typography>
        </Box>
        {selected !== null && (
          <Typography variant="caption" color="text.secondary">
            來源 = {ketLabel(selected)}；藍色 = 合法目標 (d ≤ 1)、橙色 = 遠端目標 (d ≥
            2，會自動進入分層)、紅色 = 已被佔用 (會 snap)。
          </Typography>
        )}
        {complete && (() => {
          let maxD = 0;
          mapping.forEach((to, from) => {
            const d = hammingDistance(from, to);
            if (d > maxD) maxD = d;
          });
          const legal = maxD <= 1;
          return (
            <Typography
              variant="caption"
              sx={{ color: legal ? COLOR_COMMITTED : COLOR_COMMITTED_FAR }}
            >
              {legal
                ? `✓ G_α ⊆ Adjacent Bipartite Graph（max d = ${maxD}）`
                : `△ 含 d ≥ 2 邊（max d = ${maxD}），需要分層實現 — 詳見下方 Layered Realization`}
            </Typography>
          );
        })()}
      </Stack>

      {mapping.size > 0 && (
        <Box sx={{ mt: 2 }}>
          <LayeredView mapping={mapping} n={n} />
        </Box>
      )}
    </Paper>
  );
}
