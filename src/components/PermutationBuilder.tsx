import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LoopIcon from '@mui/icons-material/Loop';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';

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
import { Math as MathTex } from './Math';
import { SvgViewport } from './SvgViewport';
import { useI18n } from '../i18n';

export type PermutationBuilderProps = {
  n: number;
  /**
   * Fires after every mapping mutation. Used by hosts (e.g. Guided Build) that
   * embed this builder purely to elicit a target permutation.
   */
  onMappingChange?: (mapping: Map<number, number>) => void;
  /**
   * When true, suppresses the inner LayeredView and the trailing cycle/legend
   * footer — the host owns downstream rendering. The bipartite picker, random
   * actions, and progress chip remain visible.
   */
  embedded?: boolean;
};

/** Max basis-state count for which we render the full two-line notation (n ≤ 5). */
const TWO_LINE_MAX_DIM = 32;

/** Max basis-state count for which we render the full N×N matrix (n ≤ 4). */
const MATRIX_MAX_DIM = 16;

/** Highlight colour for non-fixed-point entries, matching ElementaryRowMatrixPanel. */
const MATRIX_HIGHLIGHT = '#ed6c02';

/** LaTeX ket string, e.g. |01⟩ */
const ketTex = (i: number, n: number): string =>
  n === 0 ? '|\\,\\rangle' : `|${i.toString(2).padStart(n, '0')}\\rangle`;

/**
 * Cauchy two-line (standard) notation for an arbitrary (partial) permutation.
 * Unmapped sources are rendered as `\cdot`.
 */
function fullPermTwoLineTex(mapping: Map<number, number>, n: number): string {
  const N = 1 << n;
  const topRow = Array.from({ length: N }, (_, i) => ketTex(i, n)).join(' & ');
  const botRow = Array.from({ length: N }, (_, i) => {
    const t = mapping.get(i);
    return t !== undefined ? ketTex(t, n) : '\\cdot';
  }).join(' & ');
  return `\\begin{pmatrix} ${topRow} \\\\ ${botRow} \\end{pmatrix}`;
}

const COLOR_COMMITTED = '#2e7d32';
const COLOR_COMMITTED_FAR = '#ed6c02';

/**
 * Full permutation matrix P_α.
 *
 * Standard mode: left ket-label column + bmatrix + "= P_α"
 *   (same style as ElementaryRowMatrixPanel).
 *
 * Annotated mode: a single \left(\begin{array}{c|...}\right) that embeds
 *   decimal-index labels for both rows and columns, separated by | and \hline.
 *   Perfect column alignment is guaranteed because everything is one array.
 *
 * Row r has 1 at column α(r); non-fixed-point entries are highlighted orange.
 * Unmapped rows show \cdot for every cell.
 */
function fullPermMatrixTex(
  mapping: Map<number, number>,
  n: number,
  annotated: boolean,
): string {
  const N = 1 << n;
  const gray = '#9e9e9e';
  const decKet = (i: number) => `\\scriptstyle\\textcolor{${gray}}{|${i}\\rangle}`;

  const entryFor = (r: number, c: number): string => {
    const target = mapping.get(r);
    if (target === undefined) return '\\cdot';
    const isOne = c === target;
    const isNonFixed = target !== r;
    return isOne && isNonFixed ? `\\textcolor{${MATRIX_HIGHLIGHT}}{1}` : isOne ? '1' : '0';
  };

  if (!annotated) {
    const labels: string[] = [];
    const rows: string[] = [];
    for (let r = 0; r < N; r++) {
      rows.push(Array.from({ length: N }, (_, c) => entryFor(r, c)).join(' & '));
      labels.push(ketTex(r, n));
    }
    const labelCol = `\\begin{matrix} ${labels.join(' \\\\ ')} \\end{matrix}`;
    const matrix = `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
    return `\\begin{array}{cc} ${labelCol} & ${matrix} \\end{array} \\;=\\; P_{\\alpha}`;
  }

  // Annotated: single array — first col = row labels, first row = col labels
  const colSpec = `c|${'c'.repeat(N)}`;
  const colHeaderRow =
    `& ${Array.from({ length: N }, (_, i) => decKet(i)).join(' & ')} \\\\[2pt]`;
  const dataRows = Array.from({ length: N }, (_, r) =>
    `${decKet(r)} & ${Array.from({ length: N }, (_, c) => entryFor(r, c)).join(' & ')}`,
  ).join(' \\\\ ');

  return (
    `\\left[\\begin{array}{${colSpec}} ` +
    `${colHeaderRow} \\hline \\\\[-6pt] ` +
    `${dataRows} ` +
    `\\end{array}\\right] \\;=\\; P_{\\alpha}`
  );
}
const COLOR_PREVIEW = '#ed6c02';
const COLOR_AVAILABLE = '#1976d2';
const COLOR_FAR_AVAIL = '#ed6c02';
const COLOR_TAKEN = '#c62828';
const COLOR_HOVER_BG = 'rgba(237, 108, 2, 0.12)';

export function PermutationBuilder({
  n,
  onMappingChange,
  embedded = false,
}: PermutationBuilderProps) {
  const { t, tStr } = useI18n();
  const [mapping, setMapping] = useState<Map<number, number>>(new Map());
  const [matrixAnnotated, setMatrixAnnotated] = useState(true);

  useEffect(() => {
    onMappingChange?.(mapping);
  }, [mapping, onMappingChange]);
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

  // Sources still missing an edge whose own target |x⟩ is also free — these are
  // exactly the ones we can complete as fixed points (|x⟩→|x⟩, always d = 0).
  // A leftover whose self-target is already taken can't self-loop and is left
  // for the user to resolve manually.
  const selfLoopCandidates = useMemo(() => {
    const arr: number[] = [];
    for (let x = 0; x < total; x++) {
      if (!mapping.has(x) && !usedTargets.has(x)) arr.push(x);
    }
    return arr;
  }, [mapping, usedTargets, total]);

  // 把所有可補的剩餘來源一次連成 self-loop。
  const fillSelfLoops = () => {
    if (selfLoopCandidates.length === 0) return;
    const next = new Map(mapping);
    for (const x of selfLoopCandidates) next.set(x, x);
    setMapping(next);
    setSelected(null);
    setDragPos(null);
  };

  const selfLoopTooltip =
    selfLoopCandidates.length > 0
      ? tStr('builder.selfLoop.tooltip.fill', { count: selfLoopCandidates.length })
      : complete
        ? tStr('builder.selfLoop.tooltip.complete')
        : tStr('builder.selfLoop.tooltip.blocked');

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
            {t('builder.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('builder.subtitle')}
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={complete ? <CheckCircleIcon /> : undefined}
          color={complete ? 'success' : 'default'}
          label={t('builder.progress', { size: mapping.size, total })}
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
            title={tStr('builder.random.legal.tooltip')}
          >
            {t('builder.random.legal')}
          </Button>
          <Button
            startIcon={<ShuffleIcon />}
            onClick={randomizeAny}
            title={tStr('builder.random.any.tooltip')}
          >
            {t('builder.random.any')}
          </Button>
        </ButtonGroup>
        <Tooltip title={selfLoopTooltip}>
          {/* span keeps the tooltip working while the button is disabled */}
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LoopIcon />}
              onClick={fillSelfLoops}
              disabled={selfLoopCandidates.length === 0}
            >
              {t('builder.fillSelfLoop')}
            </Button>
          </span>
        </Tooltip>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={reset}
          disabled={mapping.size === 0 && selected === null}
        >
          {t('builder.reset')}
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
            {t('builder.cycleLabel')}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
          >
            α = {formatCycles(cycles, n)}
          </Typography>
        </Box>
        {mapping.size > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('builder.twoLineLabel')}
            </Typography>
            {total <= TWO_LINE_MAX_DIM ? (
              <Box sx={{ overflowX: 'auto' }}>
                <MathTex display tex={fullPermTwoLineTex(mapping, n)} />
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {t('builder.twoLineOmitted', { n, total })}
              </Typography>
            )}
          </Box>
        )}
        {mapping.size > 0 && (
          <Box>
            <Stack direction="row" sx={{ alignItems: 'center', mb: 0.5 }} spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                {t('builder.matrixLabel')}
              </Typography>
              <Tooltip
                title={
                  matrixAnnotated
                    ? tStr('builder.matrix.tooltip.annotated')
                    : tStr('builder.matrix.tooltip.standard')
                }
              >
                <ToggleButtonGroup
                  value={matrixAnnotated ? 'annotated' : 'standard'}
                  exclusive
                  size="small"
                  onChange={(_, v) => v && setMatrixAnnotated(v === 'annotated')}
                >
                  <ToggleButton value="annotated">
                    <PersonIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {t('builder.matrix.annotated')}
                  </ToggleButton>
                  <ToggleButton value="standard">
                    <SchoolIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {t('builder.matrix.standard')}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Tooltip>
            </Stack>
            {total <= MATRIX_MAX_DIM ? (
              <Box sx={{ overflowX: 'auto' }}>
                <MathTex display tex={fullPermMatrixTex(mapping, n, matrixAnnotated)} />
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {t('builder.matrixOmitted', { n, total })}
              </Typography>
            )}
          </Box>
        )}
        {selected !== null && (
          <Typography variant="caption" color="text.secondary">
            {t('builder.selectedHint', { ket: ketLabel(selected) })}
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
                ? t('builder.result.legal', { maxD })
                : t('builder.result.illegal', { maxD })}
            </Typography>
          );
        })()}
      </Stack>

      {!embedded && mapping.size > 0 && (
        <Box sx={{ mt: 2 }}>
          <LayeredView mapping={mapping} n={n} />
        </Box>
      )}
    </Paper>
  );
}
