import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  ToggleButton,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import MultipleStopIcon from '@mui/icons-material/MultipleStop';
import LoopIcon from '@mui/icons-material/Loop';

import {
  cycleDecomposition,
  formatCycles,
  hammingDistance,
  isComplete,
  isLegalEdge,
  legalTargetsFor,
  snapTarget,
  type Mapping,
} from '../lib/permutation';
import { LayeredView } from './LayeredView';
import { SvgViewport } from './SvgViewport';

export type PermutationChainProps = {
  n: number;
};

const COLOR_COMMITTED = '#2e7d32';
const COLOR_COMMITTED_FAR = '#ed6c02';
const COLOR_PREVIEW = '#ed6c02';
const COLOR_AVAILABLE = '#1976d2';
const COLOR_FAR_AVAIL = '#ed6c02';
const COLOR_TAKEN = '#c62828';
const COLOR_HOVER_BG = 'rgba(237, 108, 2, 0.12)';

const MIN_STAGES = 1; // 1 transition = 2 columns (degenerates to single PermutationBuilder)
const MAX_STAGES = 9; // 9 transitions = 10 columns (purely a UX safeguard, not an algorithmic limit)

type Selected = { col: number; idx: number } | null;

/** Compose mappings left-to-right: result(i) = α_{L-1}( ... α_1( α_0(i) ) ... ). */
function composeMappings(mappings: Mapping[], n: number): Mapping | null {
  const total = 1 << n;
  const out = new Map<number, number>();
  for (let i = 0; i < total; i++) {
    let cur: number = i;
    for (const m of mappings) {
      if (!m.has(cur)) return null;
      cur = m.get(cur)!;
    }
    out.set(i, cur);
  }
  return out;
}

export function PermutationChain({ n }: PermutationChainProps) {
  const [stages, setStages] = useState(2); // number of α_k transitions
  const [mappings, setMappings] = useState<Map<number, number>[]>(() => [
    new Map(),
    new Map(),
  ]);
  const [selected, setSelected] = useState<Selected>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [showPerStageLayered, setShowPerStageLayered] = useState(false);
  const [pathAware, setPathAware] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset whenever n changes.
  const lastN = useRef(n);
  if (lastN.current !== n) {
    lastN.current = n;
    setMappings(Array.from({ length: stages }, () => new Map<number, number>()));
    setSelected(null);
    setDragPos(null);
  }

  const total = 1 << n;
  const cols = stages + 1; // number of |X_k⟩ columns rendered

  // ---- Layout (mirrors PermutationBuilder, generalized to many columns) ----
  const rows = Math.max(1, total);
  const rowHeight = rows <= 8 ? 38 : rows <= 32 ? 26 : rows <= 128 ? 14 : 6;
  const labelFontSize = rows <= 8 ? 16 : rows <= 32 ? 13 : rows <= 128 ? 9 : 6;
  const colGap = Math.max(180, Math.min(360, rows * 12));
  const padX = 70;
  const padY = 28;
  const headerH = 22;
  const labelW = Math.max(56, n * 12 + 28);
  const totalH = padY * 2 + headerH + rows * rowHeight;
  const totalW = padX * 2 + labelW * cols + colGap * (cols - 1);

  // For column c: x of label box and connection points.
  // Each column has a "left connector" (where stage c-1 incoming lines end)
  // and a "right connector" (where stage c outgoing lines start).
  const colCenterX = (c: number) => padX + labelW * (c + 0.5) + colGap * c;
  const colRightConnX = (c: number) => colCenterX(c) + labelW / 2 + 6;
  const colLeftConnX = (c: number) => colCenterX(c) - labelW / 2 - 6;

  const yFor = (i: number) => padY + headerH + rowHeight / 2 + i * rowHeight;
  const ketLabel = (i: number) =>
    n === 0 ? '|⟩' : `|${i.toString(2).padStart(n, '0')}⟩`;

  // Per-stage derived data
  const usedTargetsPerStage = useMemo(() => {
    return mappings.map((m) => {
      const s = new Set<number>();
      m.forEach((v) => s.add(v));
      return s;
    });
  }, [mappings]);

  const cyclesPerStage = useMemo(
    () => mappings.map((m) => cycleDecomposition(m, n)),
    [mappings, n],
  );
  const completePerStage = useMemo(
    () => mappings.map((m) => isComplete(m, n)),
    [mappings, n],
  );
  const composite = useMemo(
    () => composeMappings(mappings, n),
    [mappings, n],
  );

  const legalSet = useMemo(() => {
    if (selected === null) return new Set<number>();
    return new Set(legalTargetsFor(selected.idx, n));
  }, [selected, n]);

  // ----- Path-aware column ordering (Feature 3) -----
  // When all stages are complete (composite !== null) and the user toggles
  // pathAware on, re-sort each non-source column so row r in column c shows
  // the index that resulted from following the path from row r in column 0.
  // This makes every strand visually horizontal/straight at the cost of
  // making "which row holds |x⟩ in column c?" no longer predictable.
  const effectivePathAware = pathAware && composite !== null;
  const pathOrdering = useMemo<number[][]>(() => {
    if (!effectivePathAware) {
      // Identity: row r ↔ index r in every column.
      return Array.from({ length: cols }, () =>
        Array.from({ length: total }, (_, r) => r),
      );
    }
    const out: number[][] = [Array.from({ length: total }, (_, r) => r)];
    for (let c = 1; c < cols; c++) {
      const prev = out[c - 1]!;
      const m = mappings[c - 1]!;
      out.push(prev.map((idx) => m.get(idx) ?? idx));
    }
    return out;
  }, [effectivePathAware, mappings, cols, total]);
  const rowOfIndexPerCol = useMemo<Map<number, number>[]>(() => {
    return pathOrdering.map((arr) => {
      const m = new Map<number, number>();
      arr.forEach((idx, r) => m.set(idx, r));
      return m;
    });
  }, [pathOrdering]);
  /** y-coordinate of index `idx` as it appears in column `c`. */
  const yForCol = (c: number, idx: number): number => {
    const row = rowOfIndexPerCol[c]?.get(idx);
    return yFor(row ?? idx);
  };
  /** Translate a drop point's row (in column `c`) back to the underlying index. */
  const indexAtRowInCol = (c: number, row: number): number =>
    pathOrdering[c]?.[row] ?? row;

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
    const raw = Math.floor((y - padY - headerH) / rowHeight);
    return Math.max(0, Math.min(total - 1, raw));
  };

  // x → column index whose label box contains x; -1 otherwise
  const colFromX = (x: number): number => {
    for (let c = 0; c < cols; c++) {
      const cx = colCenterX(c);
      const left = cx - labelW / 2 - colGap / 2;
      const right = cx + labelW / 2 + colGap / 2;
      if (x >= left && x < right) return c;
    }
    return -1;
  };

  const setStageMapping = (stage: number, next: Map<number, number>) => {
    setMappings((prev) => prev.map((m, i) => (i === stage ? next : m)));
  };

  const commitFromIntended = (
    stage: number,
    source: number,
    intended: number,
  ) => {
    const m = mappings[stage]!;
    const snapped = snapTarget(source, intended, m, n);
    if (snapped === null) return;
    const next = new Map(m);
    next.set(source, snapped);
    setStageMapping(stage, next);
  };

  // ----- Interaction -----
  // A node (col c, row i). If selected is null:
  //   - If c < stages → set selected = {c, i} (will be the SOURCE of stage c).
  //   - If c == stages (rightmost) → no source slot exists.
  //   - If mapping[c] already has i, unbind it and re-select.
  // If selected = {sc, si}:
  //   - If c == sc + 1 → commit stage sc: source=si target=i.
  //   - Else → switch selection to the new node (if c < stages).
  const handleNodeClick = (c: number, i: number) => {
    // Special: clicking a mapped source on its own column unbinds + re-selects.
    if (selected === null) {
      if (c < stages && mappings[c]!.has(i)) {
        const next = new Map(mappings[c]!);
        next.delete(i);
        setStageMapping(c, next);
        setSelected({ col: c, idx: i });
        return;
      }
      if (c < stages) {
        setSelected({ col: c, idx: i });
      }
      return;
    }
    // Have a selection.
    if (c === selected.col + 1) {
      commitFromIntended(selected.col, selected.idx, i);
      setSelected(null);
      return;
    }
    // Toggle off if clicking same node.
    if (c === selected.col && i === selected.idx) {
      setSelected(null);
      return;
    }
    // Otherwise switch selection (if eligible).
    if (c < stages) {
      if (mappings[c]!.has(i)) {
        const next = new Map(mappings[c]!);
        next.delete(i);
        setStageMapping(c, next);
      }
      setSelected({ col: c, idx: i });
    } else {
      setSelected(null);
    }
  };

  const handleNodeMouseDown = (c: number, i: number) => {
    if (c >= stages) return; // rightmost column cannot be a source
    if (mappings[c]!.has(i)) {
      const next = new Map(mappings[c]!);
      next.delete(i);
      setStageMapping(c, next);
    }
    setSelected({ col: c, idx: i });
    setDragPos({ x: colRightConnX(c), y: yForCol(c, i) });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selected === null || dragPos === null) return;
    const p = svgPoint(e.clientX, e.clientY);
    setDragPos(p);
  };

  const handleSvgMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selected === null) return;
    if (dragPos === null) return;
    const p = svgPoint(e.clientX, e.clientY);
    // Commit only if released in the next column.
    const targetCol = colFromX(p.x);
    if (targetCol === selected.col + 1) {
      // Translate row at the drop point back to the underlying index. In
      // path-aware mode the column's row order is permuted from default.
      const intended = indexAtRowInCol(targetCol, rowFromY(p.y));
      commitFromIntended(selected.col, selected.idx, intended);
      setSelected(null);
    }
    setDragPos(null);
  };

  const handleSvgMouseLeave = () => {
    setDragPos(null);
  };

  // ----- Stage management -----
  const addStage = () => {
    if (stages >= MAX_STAGES) return;
    setStages(stages + 1);
    setMappings((prev) => [...prev, new Map<number, number>()]);
    setSelected(null);
    setDragPos(null);
  };
  const removeStage = () => {
    if (stages <= MIN_STAGES) return;
    setStages(stages - 1);
    setMappings((prev) => prev.slice(0, -1));
    setSelected(null);
    setDragPos(null);
  };

  const resetAll = () => {
    setMappings(Array.from({ length: stages }, () => new Map<number, number>()));
    setSelected(null);
    setDragPos(null);
  };

  // Random utilities (same policies as PermutationBuilder, applied per stage).
  const randomAnyOne = (): Map<number, number> => {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    const m = new Map<number, number>();
    for (let i = 0; i < arr.length; i++) m.set(i, arr[i]!);
    return m;
  };
  const randomLegalOne = (): Map<number, number> => {
    const used = new Array<boolean>(total).fill(false);
    const m = new Map<number, number>();
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
        m.set(x, x);
        used[x] = true;
      } else {
        m.set(x, paired);
        m.set(paired, x);
        used[x] = true;
        used[paired] = true;
      }
    }
    return m;
  };
  const randomizeAllLegal = () => {
    setMappings(Array.from({ length: stages }, () => randomLegalOne()));
    setSelected(null);
    setDragPos(null);
  };
  const randomizeAllAny = () => {
    setMappings(Array.from({ length: stages }, () => randomAnyOne()));
    setSelected(null);
    setDragPos(null);
  };
  // Per-stage helpers (Feature 2). Random uses the legal policy because
  // ad-hoc per-stage retries are usually exploratory — if the user wants a
  // d ≥ 2 stage they can still snap it manually or use the global random-any.
  const randomizeStage = (stage: number) => {
    setStageMapping(stage, randomLegalOne());
    setSelected(null);
    setDragPos(null);
  };
  const randomizeStageAny = (stage: number) => {
    setStageMapping(stage, randomAnyOne());
    setSelected(null);
    setDragPos(null);
  };
  const identityStage = (stage: number) => {
    const m = new Map<number, number>();
    for (let i = 0; i < total; i++) m.set(i, i);
    setStageMapping(stage, m);
    setSelected(null);
    setDragPos(null);
  };
  const clearStage = (stage: number) => {
    setStageMapping(stage, new Map<number, number>());
    setSelected(null);
    setDragPos(null);
  };

  // Per stage, the sources still missing an edge whose own target |x⟩ is also
  // free — exactly those completable as fixed points (|x⟩→|x⟩, always d = 0).
  // Mirrors PermutationBuilder, applied to every stage at once.
  const selfLoopCandidatesPerStage = useMemo(() => {
    return mappings.map((m, s) => {
      const used = usedTargetsPerStage[s]!;
      const arr: number[] = [];
      for (let x = 0; x < total; x++) {
        if (!m.has(x) && !used.has(x)) arr.push(x);
      }
      return arr;
    });
  }, [mappings, usedTargetsPerStage, total]);
  const totalSelfLoopCandidates = useMemo(
    () => selfLoopCandidatesPerStage.reduce((sum, a) => sum + a.length, 0),
    [selfLoopCandidatesPerStage],
  );

  // 把每一段可補的剩餘來源一次連成 self-loop（不動已連的邊）。
  const fillSelfLoopsAll = () => {
    if (totalSelfLoopCandidates === 0) return;
    setMappings((prev) =>
      prev.map((m, s) => {
        const cands = selfLoopCandidatesPerStage[s]!;
        if (cands.length === 0) return m;
        const next = new Map(m);
        for (const x of cands) next.set(x, x);
        return next;
      }),
    );
    setSelected(null);
    setDragPos(null);
  };

  const selfLoopTooltip =
    totalSelfLoopCandidates > 0
      ? `把所有段剩餘共 ${totalSelfLoopCandidates} 個未連的來源補成 self-loop（|x⟩→|x⟩，固定點），不動已連的邊`
      : composite !== null
        ? '所有段皆完整，無需補 self-loop'
        : '剩餘未連來源的自身目標已被佔用，無法自動補 self-loop（請手動處理或清除衝突）';

  // Pre-compute committed edges per stage.
  const committedPerStage = useMemo(() => {
    return mappings.map((m) => {
      const arr: Array<{ from: number; to: number }> = [];
      m.forEach((to, from) => arr.push({ from, to }));
      return arr;
    });
  }, [mappings]);

  const allComplete = composite !== null;
  const compositeMaxD = useMemo(() => {
    if (!composite) return 0;
    let maxD = 0;
    composite.forEach((to, from) => {
      const d = hammingDistance(from, to);
      if (d > maxD) maxD = d;
    });
    return maxD;
  }, [composite]);

  const compositeCycles = useMemo(
    () => (composite ? cycleDecomposition(composite, n) : []),
    [composite, n],
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {/* Row 1 — info: title + subtitle, with progress chip on the right */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 1, alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            Permutation Chain — 多段連連看
          </Typography>
          <Typography variant="body2" color="text.secondary">
            |X<sub>1</sub>⟩ → |X<sub>2</sub>⟩ → ⋯ → |X<sub>L</sub>⟩，每段 α
            <sub>k</sub> 獨立連線；合成 α<sub>total</sub> = α<sub>L−1</sub> ∘ ⋯ ∘
            α<sub>1</sub> 顯示於下方。
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={allComplete ? <CheckCircleIcon /> : undefined}
          color={allComplete ? 'success' : 'default'}
          label={
            allComplete
              ? `全部完成 (${stages}/${stages})`
              : `進度 ${completePerStage.filter(Boolean).length}/${stages}`
          }
          sx={{ flexShrink: 0 }}
        />
      </Stack>

      {/* Row 2 — toolbar: stage stepper | random actions | reset … export on far right */}
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
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mr: 0.5 }}
          >
            層數
          </Typography>
          <Tooltip title="移除最後一層（L − 1）">
            <span>
              <IconButton
                size="small"
                onClick={removeStage}
                disabled={stages <= MIN_STAGES}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography
            variant="body2"
            sx={{
              minWidth: 56,
              textAlign: 'center',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontWeight: 600,
            }}
          >
            L = {cols}
          </Typography>
          <Tooltip title="新增一層（L + 1）">
            <span>
              <IconButton
                size="small"
                onClick={addStage}
                disabled={stages >= MAX_STAGES}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <ButtonGroup size="small" variant="outlined">
            <Button
              startIcon={<AutoFixHighIcon />}
              onClick={randomizeAllLegal}
              title="每段都隨機產生合法 (d ≤ 1) 排列"
            >
              隨機合法
            </Button>
            <Button
              startIcon={<ShuffleIcon />}
              onClick={randomizeAllAny}
              title="每段都隨機任意排列"
            >
              隨機任意
            </Button>
          </ButtonGroup>
          <Button
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={resetAll}
            disabled={mappings.every((m) => m.size === 0) && selected === null}
          >
            清除
          </Button>
          <Tooltip title={selfLoopTooltip}>
            {/* span keeps the tooltip working while the button is disabled */}
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<LoopIcon />}
                onClick={fillSelfLoopsAll}
                disabled={totalSelfLoopCandidates === 0}
              >
                補滿 self-loop
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <Tooltip
          title={
            composite === null
              ? '需所有段完成才能依路徑排序（避免欄內列重複/缺漏）'
              : pathAware
                ? '已開啟：第 c ≥ 1 欄的列順序依「α_{c-1} 的輸出」排，strand 變直線；代價是欄內 ket 不再可預測位置'
                : '關閉：每欄都用 0..2ⁿ-1 預設順序，欄內 ket 位置可預測，但 strand 會交叉'
          }
        >
          <span>
            <ToggleButton
              value="path-aware"
              size="small"
              selected={effectivePathAware}
              onChange={() => setPathAware((v) => !v)}
              disabled={composite === null}
              color="success"
            >
              依路徑排序
            </ToggleButton>
          </span>
        </Tooltip>
      </Stack>

      <SvgViewport
        svgRef={svgRef}
        filename={`permutation-chain-n${n}-L${cols}`}
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
          {/* Column headers */}
          {Array.from({ length: cols }, (_, c) => (
            <text
              key={`H-${c}`}
              x={colCenterX(c)}
              y={padY + 14}
              textAnchor="middle"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              fontSize={13}
              fill="#555"
              fontWeight={600}
            >
              |X{c + 1}⟩
            </text>
          ))}
          {/* Stage labels (α_k) above the gap between columns */}
          {Array.from({ length: stages }, (_, k) => (
            <text
              key={`A-${k}`}
              x={(colRightConnX(k) + colLeftConnX(k + 1)) / 2}
              y={padY + 14}
              textAnchor="middle"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              fontSize={12}
              fill={completePerStage[k] ? COLOR_COMMITTED : '#888'}
              fontStyle="italic"
            >
              α{k + 1}
            </text>
          ))}

          {/* Hint lines when a source is selected (only in selected.col → selected.col+1 gap). */}
          {selected !== null &&
            selected.col < stages &&
            (() => {
              const sc = selected.col;
              const m = mappings[sc]!;
              const used = usedTargetsPerStage[sc]!;
              return Array.from({ length: total }, (_, t) => t).map((t) => {
                const isLegal = legalSet.has(t);
                const taken = used.has(t) && m.get(selected.idx) !== t;
                const stroke = taken
                  ? COLOR_TAKEN
                  : isLegal
                    ? COLOR_AVAILABLE
                    : COLOR_FAR_AVAIL;
                return (
                  <line
                    key={`hint-${sc}-${t}`}
                    x1={colRightConnX(sc)}
                    y1={yForCol(sc, selected.idx)}
                    x2={colLeftConnX(sc + 1)}
                    y2={yForCol(sc + 1, t)}
                    stroke={stroke}
                    strokeOpacity={isLegal ? 0.22 : 0.1}
                    strokeWidth={1}
                    strokeDasharray={isLegal ? '3 3' : '2 4'}
                  />
                );
              });
            })()}

          {/* Committed edges per stage */}
          {committedPerStage.map((edges, stage) =>
            edges.map((e) => {
              const far = !isLegalEdge(e.from, e.to);
              return (
                <line
                  key={`c-${stage}-${e.from}`}
                  x1={colRightConnX(stage)}
                  y1={yForCol(stage, e.from)}
                  x2={colLeftConnX(stage + 1)}
                  y2={yForCol(stage + 1, e.to)}
                  stroke={far ? COLOR_COMMITTED_FAR : COLOR_COMMITTED}
                  strokeWidth={1.6}
                  strokeOpacity={0.9}
                  strokeDasharray={far ? '6 3' : undefined}
                />
              );
            }),
          )}

          {/* Drag preview */}
          {selected !== null && dragPos && (
            <line
              x1={colRightConnX(selected.col)}
              y1={yForCol(selected.col, selected.idx)}
              x2={dragPos.x}
              y2={dragPos.y}
              stroke={COLOR_PREVIEW}
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
          )}

          {/* Column labels (interactive). Iterate rows (not indices) so that
              path-aware mode renders nodes at the permuted row positions. */}
          {Array.from({ length: cols }, (_, c) => {
            const isLeftmost = c === 0;
            const isRightmost = c === stages;
            const stageOut = c; // mapping index for outgoing edges
            const stageIn = c - 1; // mapping index for incoming edges
            return Array.from({ length: total }, (_, row) => {
              const i = indexAtRowInCol(c, row);
              // For each node, decide colors based on outgoing role (source for stage c).
              const isSelected =
                selected !== null && selected.col === c && selected.idx === i;
              const isDoneSource =
                !isRightmost && mappings[stageOut]!.has(i);
              const isUsedTarget =
                !isLeftmost && usedTargetsPerStage[stageIn]!.has(i);

              // Hint / taken color when there's a selection in c-1.
              const isLegalTarget =
                selected !== null &&
                selected.col + 1 === c &&
                legalSet.has(i);
              const isTakenByOther =
                selected !== null &&
                selected.col + 1 === c &&
                usedTargetsPerStage[stageIn]!.has(i) &&
                mappings[stageIn]!.get(selected.idx) !== i;

              let fill = 'transparent';
              let stroke: string = 'none';
              let color: string = '#222';
              let weight = 400;

              if (isSelected) {
                fill = COLOR_HOVER_BG;
                color = COLOR_PREVIEW;
                weight = 600;
              } else if (selected !== null && selected.col + 1 === c) {
                // Target-column visualization.
                if (isTakenByOther) {
                  fill = 'rgba(198, 40, 40, 0.12)';
                  color = COLOR_TAKEN;
                  weight = 600;
                } else if (isLegalTarget) {
                  fill = 'rgba(25, 118, 210, 0.14)';
                  stroke = COLOR_AVAILABLE;
                  color = COLOR_AVAILABLE;
                } else {
                  fill = 'rgba(237, 108, 2, 0.10)';
                  stroke = COLOR_FAR_AVAIL;
                  color = COLOR_FAR_AVAIL;
                }
              } else {
                // No selection or unrelated column → show committed source/target state.
                const isDone =
                  isDoneSource || (isRightmost && isUsedTarget) || isUsedTarget;
                fill = isDone ? 'rgba(46, 125, 50, 0.08)' : 'transparent';
                color = isDone ? COLOR_COMMITTED : '#222';
                weight = isDone ? 600 : 400;
              }

              return (
                <g
                  key={`N-${c}-${row}`}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={() =>
                    !isRightmost && handleNodeMouseDown(c, i)
                  }
                  onClick={() => handleNodeClick(c, i)}
                >
                  <rect
                    x={colCenterX(c) - labelW / 2}
                    y={yForCol(c, i) - rowHeight / 2}
                    width={labelW}
                    height={rowHeight}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={stroke === 'none' ? 0 : 1}
                  />
                  <text
                    x={colCenterX(c)}
                    y={yForCol(c, i) + labelFontSize / 3}
                    textAnchor="middle"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                    fontSize={labelFontSize}
                    fill={color}
                    fontWeight={weight}
                  >
                    {ketLabel(i)}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </SvgViewport>

      {/* Per-stage cycle decomposition (with per-stage random / clear actions) */}
      <Stack spacing={1} sx={{ mt: 1.5 }}>
        {cyclesPerStage.map((cyc, k) => (
          <Box key={`cyc-${k}`}>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexGrow: 1 }}
              >
                α{k + 1} cycle 表示（{completePerStage[k] ? '完整' : `${mappings[k]!.size}/${total}`}）
              </Typography>
              <Tooltip
                title={`直通連接 α${k + 1}（α(x) = x，將同列直接連起來）`}
              >
                <span>
                  <IconButton
                    size="small"
                    onClick={() => identityStage(k)}
                    disabled={
                      mappings[k]!.size === total &&
                      Array.from(mappings[k]!.entries()).every(
                        ([src, dst]) => src === dst,
                      )
                    }
                    aria-label={`identity alpha-${k + 1}`}
                  >
                    <MultipleStopIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={`隨機合法重設 α${k + 1}（d ≤ 1，不動其他段）`}>
                <IconButton
                  size="small"
                  onClick={() => randomizeStage(k)}
                  aria-label={`randomize legal alpha-${k + 1}`}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={`隨機任意排列 α${k + 1}（不限 d，不動其他段）`}>
                <IconButton
                  size="small"
                  onClick={() => randomizeStageAny(k)}
                  aria-label={`randomize any alpha-${k + 1}`}
                >
                  <ShuffleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={`清除 α${k + 1}`}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => clearStage(k)}
                    disabled={mappings[k]!.size === 0}
                    aria-label={`clear alpha-${k + 1}`}
                  >
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              }}
            >
              α{k + 1} = {formatCycles(cyc, n)}
            </Typography>
          </Box>
        ))}

        {selected !== null && (
          <Typography variant="caption" color="text.secondary">
            來源 = (α{selected.col + 1} 的) {ketLabel(selected.idx)}；藍色 = 合法目標 (d ≤
            1)、橙色 = 遠端目標 (d ≥ 2，會自動進入分層)、紅色 = 已被佔用 (會 snap)。
          </Typography>
        )}

        {/* Composite */}
        {composite && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              合成 α<sub>total</sub> = α{stages} ∘ ⋯ ∘ α1（cycle 表示）
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              }}
            >
              α<sub>total</sub> = {formatCycles(compositeCycles, n)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color:
                  compositeMaxD <= 1 ? COLOR_COMMITTED : COLOR_COMMITTED_FAR,
              }}
            >
              {compositeMaxD <= 1
                ? `✓ 合成 G_α ⊆ Adjacent Bipartite Graph（max d = ${compositeMaxD}）`
                : `△ 合成含 d ≥ 2 邊（max d = ${compositeMaxD}），需要分層實現 — 詳見下方 Layered Realization`}
            </Typography>
          </Box>
        )}
      </Stack>

      {composite && (
        <Box sx={{ mt: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', mb: 1 }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ flexGrow: 1 }}
            >
              Layered Realization
            </Typography>
            <Tooltip title="展開時，依序顯示 α₁..α_{L-1} 各自的分層實現，方便對照合成版的層數差異。">
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={showPerStageLayered}
                    onChange={(_, c) => setShowPerStageLayered(c)}
                  />
                }
                label={
                  <Typography variant="caption">顯示各段分解</Typography>
                }
              />
            </Tooltip>
          </Stack>

          {showPerStageLayered && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              {mappings.map((m, k) => (
                <Box key={`per-stage-${k}`}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    α<sub>{k + 1}</sub> 的 Layered Realization
                  </Typography>
                  {/* showLearningPanel={false} — 教學面板只在合成版顯示一次，
                      避免每段重複同一份定理參考。 */}
                  <LayeredView mapping={m} n={n} showLearningPanel={false} />
                </Box>
              ))}
            </Stack>
          )}

          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            合成 α<sub>total</sub> 的 Layered Realization
          </Typography>
          <LayeredView mapping={composite} n={n} />
        </Box>
      )}
    </Paper>
  );
}
