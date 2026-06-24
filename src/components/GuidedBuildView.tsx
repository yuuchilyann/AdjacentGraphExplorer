import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { PermutationBuilder } from './PermutationBuilder';
import { SvgViewport } from './SvgViewport';
import { useI18n } from '../i18n';
import {
  formatKet,
  hammingDistance,
  isComplete,
  type Mapping,
} from '../lib/permutation';
import {
  formatSwap,
  realizeLayered,
  type LayerStep,
  type Strategy,
} from '../lib/layered';
import {
  composeLayers,
  countMismatches,
  deleteLayer,
  emptyLayer,
  insertLayer,
  isEmptyLayer,
  isLegalLayer,
  moveLayer,
  normalizeLayer,
  remainingPermutation,
  trajectoriesFor,
} from '../lib/guidedBuild';

export type GuidedBuildViewProps = {
  n: number;
};

const COLOR_ACTIVE = '#ed6c02';
const COLOR_TRACK = '#1f1f1f';
const COLOR_TRACK_BG = 'rgba(0, 0, 0, 0.04)';
const COLOR_MATCH = '#2e7d32';
const COLOR_MISMATCH = '#c62828';

function strandColor(startIdx: number, total: number): string {
  if (total <= 1) return 'hsl(210, 70%, 45%)';
  const hue = Math.round((startIdx * 360) / total);
  return `hsl(${hue}, 70%, 45%)`;
}

export function GuidedBuildView({ n }: GuidedBuildViewProps) {
  const { t, tStr } = useI18n();
  const [target, setTarget] = useState<Mapping>(new Map());
  const [editedLayers, setEditedLayers] = useState<LayerStep[]>([]);
  const [strategy, setStrategy] = useState<Strategy>('above');
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [resetBanner, setResetBanner] = useState(false);
  // SVG-node drag: pick up |x⟩ at (row, col), release on |y⟩ in same column
  // → insert layer (x y) at temporal position `col`.
  const [svgDragSrc, setSvgDragSrc] = useState<{ row: number; col: number } | null>(null);
  const [svgDragPointer, setSvgDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [svgDragErr, setSvgDragErr] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Baseline is only loaded once the user has completed a full bijection AND
  // the target actually changed since the last load. Partial mappings — which
  // fire on every drag commit — must not retrigger this effect, otherwise the
  // layout reflow disrupts the user's connect-the-dots drag above.
  const lastBaselineKey = useRef<string>('');
  const mappingKey = (m: Mapping): string =>
    Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => `${k}>${v}`)
      .join(',');
  useEffect(() => {
    if (!isComplete(target, n)) return;
    const key = `${n}|${strategy}|${mappingKey(target)}`;
    if (key === lastBaselineKey.current) return;
    lastBaselineKey.current = key;
    setEditedLayers(realizeLayered(target, n, strategy).layers);
    setResetBanner(true);
    const t = window.setTimeout(() => setResetBanner(false), 2200);
    return () => window.clearTimeout(t);
  }, [target, n, strategy]);
  // Clear everything if the user resets PermutationBuilder back to empty.
  useEffect(() => {
    if (target.size === 0) {
      setEditedLayers([]);
      lastBaselineKey.current = '';
    }
  }, [target]);

  // Reset everything on n change (target setter already resets via internal effect).
  const lastN = useRef(n);
  if (lastN.current !== n) {
    lastN.current = n;
    setTarget(new Map());
    setEditedLayers([]);
    setDragFrom(null);
    setDragOver(null);
    lastBaselineKey.current = '';
  }

  // Stable callback for the embedded PermutationBuilder to avoid effect loops.
  const handleTargetChange = useCallback((m: Map<number, number>) => {
    setTarget(new Map(m));
  }, []);

  const targetReady = useMemo(() => isComplete(target, n), [target, n]);
  const targetProgress = `${target.size}/${1 << n}`;

  const total = 1 << n;
  const composed = useMemo(
    () => composeLayers(editedLayers, n),
    [editedLayers, n],
  );
  const trajectories = useMemo(
    () => trajectoriesFor(editedLayers, n),
    [editedLayers, n],
  );
  const mismatchCount = useMemo(
    () => countMismatches(composed, target, n),
    [composed, target, n],
  );
  const matches = target.size > 0 && mismatchCount === 0;

  const remaining = useMemo(
    () => remainingPermutation(composed, target, n),
    [composed, target, n],
  );
  const autoRemainingLayers = useMemo(() => {
    if (target.size === 0) return [];
    return realizeLayered(remaining, n, strategy).layers;
  }, [remaining, n, strategy, target.size]);

  const insertEmptyAt = (idx: number) => {
    setEditedLayers((prev) => insertLayer(prev, idx, emptyLayer()));
  };

  const formatLayerLabel = (l: LayerStep): string =>
    isEmptyLayer(l) ? '(empty)' : formatSwap(l, n);

  const handleAutoFinish = () => {
    if (autoRemainingLayers.length === 0) return;
    setEditedLayers((prev) => [...prev, ...autoRemainingLayers]);
  };
  const handleResetToBaseline = () => {
    if (!isComplete(target, n)) return;
    setEditedLayers(realizeLayered(target, n, strategy).layers);
  };
  const handleClearLayers = () => {
    setEditedLayers([]);
  };

  // ── Layout (mirrors LayeredView, plus an optional "target" column) ──
  // The target column is a reference: it shows where each row SHOULD end up.
  // When composed == target, that column would be identical to L_N (the same
  // values at the same rows) and the compare-leg between them is horizontal —
  // a useless visual duplicate. So we hide the column entirely in that case;
  // the green endpoint dots already say "all on target ✓". The column comes
  // back the moment composed deviates from target (or before any layer is
  // built but a non-trivial target exists).
  const showTargetCol = target.size > 0 && mismatchCount > 0;
  const totalCols =
    editedLayers.length + 1 + (showTargetCol ? 1 : 0);
  const rowHeight = total <= 8 ? 38 : total <= 32 ? 26 : 16;
  const labelFontSize = total <= 8 ? 15 : total <= 32 ? 12 : 9;
  const labelW = Math.max(56, n * 12 + 28);
  const colGap = total <= 8 ? 130 : 100;
  const padX = 40;
  const padY = 30;
  const colLeftX = (c: number) => padX + c * (labelW + colGap);
  const colRightX = (c: number) => colLeftX(c) + labelW;
  const colCenterX = (c: number) => colLeftX(c) + labelW / 2;
  const yFor = (i: number) => padY + rowHeight / 2 + i * rowHeight;
  const totalW = padX * 2 + totalCols * labelW + (totalCols - 1) * colGap;
  const totalH = padY * 2 + total * rowHeight;
  // -1 sentinel when the target column isn't rendered; the equality checks
  // (col === targetColIdx) then never match, naturally disabling the
  // append-to-target drop branch in the matched state.
  const targetColIdx = showTargetCol ? editedLayers.length + 1 : -1;

  const stepLabel = (c: number): string => {
    if (c === 0) return 'source';
    if (c === targetColIdx) return 'target';
    return `L${c}`;
  };

  // Per-row reference for "what should the row end at" (target column).
  const referenceTarget = (r: number) => target.get(r) ?? r;

  // Visible state at column c, where c ∈ [0..editedLayers.length] uses
  // trajectories; column targetColIdx shows the user-specified target.
  const valueAt = (r: number, c: number): number => {
    if (c === targetColIdx) return referenceTarget(r);
    return trajectories[r]![c]!;
  };

  // Reorder via HTML5 drag (no third-party deps). dataTransfer.setData is
  // required for the drag to actually initiate in Firefox and some Chrome
  // builds — without it, dragover/drop never fire on subsequent targets.
  const handleChipDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragFrom(idx);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', `guided-layer:${idx}`);
    } catch {
      // some browsers throw on setData during synthetic events; ignore.
    }
  };
  const handleSlotDragOver = (idx: number) => (e: React.DragEvent) => {
    if (dragFrom === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== idx) setDragOver(idx);
  };
  const handleSlotDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragFrom === null) return;
    setEditedLayers((prev) => moveLayer(prev, dragFrom, idx));
    setDragFrom(null);
    setDragOver(null);
  };
  const handleChipDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  // ── SVG-node drag: grab |x⟩, drop on |y⟩ in same column → insert layer ──
  const svgClientToLocal = (clientX: number, clientY: number) => {
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
  // Nearest-column snap. The horizontal gap between columns is wider than the
  // columns themselves, so a strict in-rect check leaves a "no-man's-land" in
  // every gap. Snap to whichever column's CENTER is closest to the pointer.
  const colFromX = (x: number): number | null => {
    const stride = labelW + colGap;
    const c = Math.round((x - padX - labelW / 2) / stride);
    if (c < 0 || c >= totalCols) return null;
    return c;
  };
  const rowFromY = (y: number): number | null => {
    const raw = Math.floor((y - padY) / rowHeight);
    if (raw < 0 || raw >= total) return null;
    return raw;
  };
  const isDraggableColumn = (c: number) => c !== targetColIdx;
  const flashSvgErr = (msg: string) => {
    setSvgDragErr(msg);
    window.setTimeout(() => {
      setSvgDragErr((cur) => (cur === msg ? null : cur));
    }, 2400);
  };

  const handleNodeMouseDown = (row: number, col: number) =>
    (e: React.MouseEvent) => {
      if (!isDraggableColumn(col)) return;
      e.preventDefault();
      setSvgDragSrc({ row, col });
      setSvgDragPointer({ x: colCenterX(col), y: yFor(row) });
      setSvgDragErr(null);
    };
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgDragSrc === null) return;
    setSvgDragPointer(svgClientToLocal(e.clientX, e.clientY));
  };
  // Helper: which strand currently sits at (column c, row P)?
  // Each column is a bijection so the strand index is unique. Returns -1 if
  // the trajectory data isn't available yet (defensive).
  const strandAt = (c: number, P: number): number =>
    trajectories.findIndex((t) => t[c] === P);

  const handleSvgMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgDragSrc === null) return;
    const p = svgClientToLocal(e.clientX, e.clientY);
    const col = colFromX(p.x);
    const row = rowFromY(p.y);
    const src = svgDragSrc;
    setSvgDragSrc(null);
    setSvgDragPointer(null);
    if (col === null || row === null) return;
    // Strand identity comes from the GRAB location; the DROP column decides
    // the operation. Cross-column drags are supported — grab a strand at any
    // waypoint and drop where you want it routed.
    const strand = strandAt(src.col, src.row);
    if (strand < 0) return;

    // ── Drop in target column: append a new final layer so strand lands at row ──
    // The target column is logically "the column after L_N"; dropping there
    // creates a new L_{N+1}. V is the strand's current final value (= what
    // composeLayers produced for it). This is what lets the user manually
    // close the loop instead of needing Auto-finish.
    if (col === targetColIdx) {
      const V = composed.get(strand) ?? strand;
      if (row === V) return; // already lands here → no new layer needed
      if (!isLegalLayer(V, row)) {
        const d = hammingDistance(V, row);
        flashSvgErr(
          tStr('guided.err.appendTarget', {
            from: formatKet(V, n),
            to: formatKet(row, n),
            d,
          }),
        );
        return;
      }
      setEditedLayers((prev) => [...prev, normalizeLayer(V, row)]);
      return;
    }

    // ── Drop in source column (c=0): insert a new initial layer ──
    if (col === 0) {
      const A = strand; // strand's source row
      const B = row;
      if (A === B) return; // no-op
      if (!isLegalLayer(A, B)) {
        const d = hammingDistance(A, B);
        flashSvgErr(
          tStr('guided.err.insertFront', {
            a: formatKet(A, n),
            b: formatKet(B, n),
            d,
          }),
        );
        return;
      }
      setEditedLayers((prev) =>
        insertLayer(prev, 0, normalizeLayer(A, B)),
      );
      return;
    }

    // ── Drop in L_c column (c≥1): edit L_c so this strand lands at `row` ──
    const layerIdx = col - 1;
    const V = trajectories[strand]![col - 1]!;
    const currentAtC = trajectories[strand]![col]!;

    if (row === V) {
      // Drop on the strand's incoming position = "don't move me through L_c".
      // Restrict to SAME-column drag so the gesture is unambiguous: the user
      // grabbed the strand somewhere in L_c and dragged it back to its
      // incoming row. A cross-column V-drop (e.g. source's |00⟩ → L1's |00⟩)
      // is too easy to trigger accidentally and would silently nuke layers.
      if (src.col !== col) return;
      if (V === currentAtC) return; // strand isn't moved by L_c anyway → no-op
      setEditedLayers((prev) => deleteLayer(prev, layerIdx));
      return;
    }
    if (!isLegalLayer(V, row)) {
      // Append fallback for the last layer column. The compare-leg between
      // L_N and target uses d(P, Q) as its visual cue (where P is the strand's
      // current value at L_N). If the user follows that cue by dragging L_N
      // P → Q same-column with d(P, Q)=1, the edit-L_N path may still be
      // illegal because it requires d(V, Q)=1 — a different distance. To
      // honour the visual suggestion we append a new layer (P, Q) at the end
      // instead, which is exactly what dropping in the target column would do.
      if (
        src.col === col &&
        col === editedLayers.length &&
        isLegalLayer(src.row, row)
      ) {
        setEditedLayers((prev) => [...prev, normalizeLayer(src.row, row)]);
        return;
      }
      const d = hammingDistance(V, row);
      flashSvgErr(
        tStr('guided.err.editLayer', {
          from: formatKet(V, n),
          to: formatKet(row, n),
          d,
        }),
      );
      return;
    }
    setEditedLayers((prev) => {
      const out = prev.slice();
      out[layerIdx] = normalizeLayer(V, row);
      return out;
    });
  };
  const handleSvgMouseLeave = () => {
    if (svgDragSrc !== null) {
      setSvgDragSrc(null);
      setSvgDragPointer(null);
    }
  };

  // Strand reaches its target → green dot; otherwise red.
  const endpointStatus = (r: number): 'match' | 'miss' =>
    composed.get(r) === referenceTarget(r) ? 'match' : 'miss';

  return (
    <Stack spacing={2}>
      <PermutationBuilder n={n} onMappingChange={handleTargetChange} embedded />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mb: 1.5, alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              {t('guided.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('guided.subtitle')}
            </Typography>
          </Box>
          <Tooltip
            title={
              !targetReady
                ? tStr('guided.status.tooltip.notReady', { progress: targetProgress })
                : matches
                  ? tStr('guided.status.tooltip.matches')
                  : tStr('guided.status.tooltip.off', {
                      mismatch: mismatchCount,
                      auto: autoRemainingLayers.length,
                    })
            }
          >
            <Chip
              size="small"
              icon={matches ? <CheckCircleIcon /> : <WarningAmberIcon />}
              label={
                !targetReady
                  ? `target ${targetProgress}`
                  : matches
                    ? 'realized'
                    : `${mismatchCount} off`
              }
              color={matches ? 'success' : !targetReady ? 'default' : 'warning'}
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
          </Tooltip>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          divider={
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
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
          <Tooltip title={tStr('guided.strategy.tooltip')}>
            <ToggleButtonGroup
              value={strategy}
              exclusive
              size="small"
              onChange={(_, v: Strategy | null) => v && setStrategy(v)}
              color="primary"
            >
              <ToggleButton value="above">Top-down</ToggleButton>
              <ToggleButton value="below">Bottom-up</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
          <Tooltip
            title={
              !targetReady
                ? tStr('guided.autoFinish.tooltip.notReady', { progress: targetProgress })
                : matches
                  ? tStr('guided.autoFinish.tooltip.matches')
                  : tStr('guided.autoFinish.tooltip.do', {
                      strategy: strategy === 'above' ? 'Top-down' : 'Bottom-up',
                      auto: autoRemainingLayers.length,
                    })
            }
          >
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={<AutoFixHighIcon />}
                onClick={handleAutoFinish}
                disabled={!targetReady || matches}
              >
                Auto-finish
                {targetReady && !matches && autoRemainingLayers.length > 0 && ` (+${autoRemainingLayers.length})`}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={tStr('guided.resetBaseline.tooltip')}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleResetToBaseline}
                disabled={!targetReady}
              >
                Reset baseline
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={tStr('guided.clearLayers.tooltip')}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<DeleteSweepIcon />}
                onClick={handleClearLayers}
                disabled={editedLayers.length === 0}
              >
                Clear layers
              </Button>
            </span>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            label={`Layers: ${editedLayers.length}`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`On target: ${total - mismatchCount}/${total}`}
            color={matches ? 'success' : 'default'}
            variant="outlined"
          />
        </Stack>

        {resetBanner && targetReady && (
          <Alert
            severity="info"
            sx={{ mb: 1.5 }}
            onClose={() => setResetBanner(false)}
          >
            {t('guided.resetBanner', {
              strategy: strategy === 'above' ? 'Top-down' : 'Bottom-up',
              layers: editedLayers.length,
            })}
          </Alert>
        )}

        {!targetReady ? (
          <Alert severity="info">
            {t('guided.notReadyAlert', { progress: targetProgress })}
          </Alert>
        ) : (
          <>
            {/* Layer-control row: drag handles + delete buttons + insert slots */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.5,
                mb: 1.5,
                p: 0.75,
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mr: 1 }}
              >
                {t('guided.layerSeqLabel')}
              </Typography>
              <InsertSlot
                idx={0}
                onClick={() => insertEmptyAt(0)}
                hot={dragOver === 0}
                onDragOver={handleSlotDragOver(0)}
                onDrop={handleSlotDrop(0)}
              />
              {editedLayers.map((layer, i) => (
                <Box
                  key={`layer-${i}-${layer.swap[0]}-${layer.swap[1]}`}
                  sx={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <Tooltip title={tStr('guided.moveLeft.tooltip')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setEditedLayers((prev) => moveLayer(prev, i, i - 1))
                        }
                        disabled={i === 0}
                        sx={{ width: 22, height: 22 }}
                      >
                        <ChevronLeftIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {/* draggable wrapper — putting `draggable` directly on
                      MUI Chip is unreliable because the internal ripple/
                      delete handlers can swallow the drag. A plain div
                      wrapper always reports the gestures correctly. */}
                  <Box
                    draggable
                    onDragStart={handleChipDragStart(i)}
                    onDragEnd={handleChipDragEnd}
                    onDragOver={handleSlotDragOver(i)}
                    onDrop={handleSlotDrop(i)}
                    sx={{
                      display: 'inline-flex',
                      cursor: dragFrom === i ? 'grabbing' : 'grab',
                      // visual cue when something is being dragged over a chip
                      // (drop = move-before-this-chip; same idx semantics as
                      // the preceding insert slot).
                      outline:
                        dragOver === i && dragFrom !== null && dragFrom !== i
                          ? `2px solid ${COLOR_ACTIVE}`
                          : 'none',
                      outlineOffset: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Chip
                      size="small"
                      label={
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.25,
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            pointerEvents: 'none',
                            fontStyle: isEmptyLayer(layer) ? 'italic' : 'normal',
                            color: isEmptyLayer(layer) ? 'text.disabled' : 'inherit',
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              color: 'text.secondary',
                              fontSize: 10,
                              mr: 0.25,
                            }}
                          >
                            L{i + 1}
                          </Box>
                          {formatLayerLabel(layer)}
                        </Box>
                      }
                      icon={<DragIndicatorIcon sx={{ pointerEvents: 'none' }} />}
                      onDelete={() =>
                        setEditedLayers((prev) => deleteLayer(prev, i))
                      }
                      deleteIcon={
                        <Tooltip title={tStr('guided.delete.tooltip')}>
                          <CloseIcon />
                        </Tooltip>
                      }
                      variant="outlined"
                      sx={{
                        borderColor:
                          dragFrom === i
                            ? COLOR_ACTIVE
                            : isEmptyLayer(layer)
                              ? 'rgba(0,0,0,0.18)'
                              : undefined,
                        borderStyle: isEmptyLayer(layer) ? 'dashed' : 'solid',
                        opacity: dragFrom === i ? 0.5 : 1,
                      }}
                    />
                  </Box>
                  <Tooltip title={tStr('guided.moveRight.tooltip')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setEditedLayers((prev) => moveLayer(prev, i, i + 2))
                        }
                        disabled={i === editedLayers.length - 1}
                        sx={{ width: 22, height: 22 }}
                      >
                        <ChevronRightIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <InsertSlot
                    idx={i + 1}
                    onClick={() => insertEmptyAt(i + 1)}
                    hot={dragOver === i + 1}
                    onDragOver={handleSlotDragOver(i + 1)}
                    onDrop={handleSlotDrop(i + 1)}
                  />
                </Box>
              ))}
              <Button
                size="small"
                variant="text"
                startIcon={<AddIcon />}
                onClick={() => insertEmptyAt(editedLayers.length)}
                sx={{ ml: 0.5 }}
              >
                Add empty layer
              </Button>
            </Box>

            {svgDragErr && (
              <Alert
                severity="error"
                sx={{ mb: 1 }}
                onClose={() => setSvgDragErr(null)}
              >
                {svgDragErr}
              </Alert>
            )}

            <SvgViewport
              svgRef={svgRef}
              filename={`guided-build-n${n}-${editedLayers.length}L`}
            >
              <svg
                ref={svgRef}
                width={totalW}
                height={totalH}
                viewBox={`0 0 ${totalW} ${totalH}`}
                style={{ display: 'block', margin: '0 auto', touchAction: 'none', userSelect: 'none' }}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseLeave}
              >
                {/* Columns: source + L1..Lk + target */}
                {Array.from({ length: totalCols }, (_, c) => c).map((c) => {
                  const isTarget = c === targetColIdx;
                  const draggable = isDraggableColumn(c);
                  // c=0 source / c=targetColIdx target / else the layer L_c is at editedLayers[c-1]
                  const layerAtCol =
                    c >= 1 && c <= editedLayers.length
                      ? editedLayers[c - 1]!
                      : null;
                  const colIsEmpty = layerAtCol !== null && isEmptyLayer(layerAtCol);
                  return (
                    <g key={`col-${c}`}>
                      <rect
                        x={colLeftX(c)}
                        y={padY}
                        width={labelW}
                        height={total * rowHeight}
                        fill={
                          isTarget
                            ? 'rgba(46,125,50,0.05)'
                            : colIsEmpty
                              ? 'rgba(0,0,0,0.02)'
                              : COLOR_TRACK_BG
                        }
                        stroke={colIsEmpty ? 'rgba(0,0,0,0.15)' : 'none'}
                        strokeDasharray={colIsEmpty ? '4 3' : undefined}
                        rx={6}
                      />
                      <text
                        x={colCenterX(c)}
                        y={padY - 10}
                        textAnchor="middle"
                        fontSize={11}
                        fill={
                          isTarget
                            ? COLOR_MATCH
                            : colIsEmpty
                              ? '#aaa'
                              : '#666'
                        }
                        fontWeight={isTarget ? 700 : 500}
                      >
                        {stepLabel(c)}{colIsEmpty ? ' (empty)' : ''}
                      </text>
                      {Array.from({ length: total }, (_, i) => i).map((i) => {
                        const isSrc =
                          svgDragSrc !== null &&
                          svgDragSrc.col === c &&
                          svgDragSrc.row === i;
                        // Cross-column highlight: strand identity comes from
                        // the grab location (svgDragSrc.col, .row); the drop
                        // column `c` decides the operation. For c=0 we insert
                        // (strand.source_row, i); for c≥1 we edit L_c using
                        // V = strand's value at column c-1.
                        let validKind: 'change' | 'delete' | null = null;
                        if (
                          svgDragSrc !== null &&
                          !(svgDragSrc.col === c && svgDragSrc.row === i)
                        ) {
                          const strand = strandAt(svgDragSrc.col, svgDragSrc.row);
                          if (strand >= 0) {
                            if (c === 0) {
                              const A = strand;
                              if (i !== A && isLegalLayer(A, i)) {
                                validKind = 'change';
                              }
                            } else if (c === targetColIdx) {
                              // Drop in target = append new final layer.
                              const V = composed.get(strand) ?? strand;
                              if (i !== V && isLegalLayer(V, i)) {
                                validKind = 'change';
                              }
                            } else {
                              const V = trajectories[strand]![c - 1]!;
                              const currentAtC = trajectories[strand]![c]!;
                              if (i === V) {
                                // Delete hint only when the gesture is
                                // unambiguous: same-column drag back to V.
                                if (
                                  svgDragSrc.col === c &&
                                  V !== currentAtC
                                ) {
                                  validKind = 'delete';
                                }
                              } else if (isLegalLayer(V, i)) {
                                validKind = 'change';
                              } else if (
                                // L_N same-column append fallback — mirror
                                // the d(P, Q) visual cue of the compare-leg.
                                svgDragSrc.col === c &&
                                c === editedLayers.length &&
                                isLegalLayer(svgDragSrc.row, i)
                              ) {
                                validKind = 'change';
                              }
                            }
                          }
                        }
                        const cellFill = isSrc
                          ? 'rgba(237,108,2,0.20)'
                          : validKind === 'change'
                            ? 'rgba(25,118,210,0.14)'
                            : validKind === 'delete'
                              ? 'rgba(198,40,40,0.10)'
                              : 'transparent';
                        const cellStroke = isSrc
                          ? COLOR_ACTIVE
                          : validKind === 'change'
                            ? '#1976d2'
                            : validKind === 'delete'
                              ? COLOR_MISMATCH
                              : 'transparent';
                        return (
                          <g key={`tl-${c}-${i}`}>
                            {/* hit area + drag-source rect */}
                            <rect
                              x={colLeftX(c) + 2}
                              y={yFor(i) - rowHeight / 2 + 2}
                              width={labelW - 4}
                              height={rowHeight - 4}
                              fill={cellFill}
                              stroke={cellStroke}
                              strokeWidth={validKind !== null || isSrc ? 1 : 0}
                              strokeDasharray={
                                validKind === 'change'
                                  ? '3 2'
                                  : validKind === 'delete'
                                    ? '2 2'
                                    : undefined
                              }
                              rx={4}
                              style={{
                                cursor: draggable ? 'grab' : 'default',
                              }}
                              onMouseDown={
                                draggable ? handleNodeMouseDown(i, c) : undefined
                              }
                            />
                            <text
                              x={colCenterX(c)}
                              y={yFor(i) + labelFontSize / 3}
                              textAnchor="middle"
                              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                              fontSize={labelFontSize}
                              fill={
                                isSrc
                                  ? COLOR_ACTIVE
                                  : validKind === 'change'
                                    ? '#1976d2'
                                    : validKind === 'delete'
                                      ? COLOR_MISMATCH
                                      : COLOR_TRACK
                              }
                              fontWeight={isSrc || validKind !== null ? 700 : 500}
                              opacity={isSrc || validKind !== null ? 1 : 0.7}
                              style={{ pointerEvents: 'none' }}
                            >
                              {formatKet(i, n)}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Strands */}
                {Array.from({ length: total }, (_, r) => r).map((r) => {
                  const color = strandColor(r, total);
                  return (
                    <g key={`strand-${r}`}>
                      {Array.from({ length: totalCols }, (_, c) => c).map((c) => {
                        const y = yFor(valueAt(r, c));
                        const horizSeg = (
                          <line
                            key={`h-${r}-${c}`}
                            x1={colLeftX(c)}
                            y1={y}
                            x2={colRightX(c)}
                            y2={y}
                            stroke={color}
                            strokeOpacity={c === targetColIdx ? 0.55 : 0.9}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeDasharray={c === targetColIdx ? '5 3' : undefined}
                          />
                        );
                        if (c >= totalCols - 1) return horizSeg;

                        const yNext = yFor(valueAt(r, c + 1));
                        const moved = y !== yNext;
                        const dx = colLeftX(c + 1) - colRightX(c);
                        const mx1 = colRightX(c) + dx * 0.3;
                        const mx2 = colRightX(c) + dx * 0.7;
                        const d = moved
                          ? `M ${colRightX(c)} ${y} C ${mx1} ${y}, ${mx2} ${yNext}, ${colLeftX(c + 1)} ${yNext}`
                          : `M ${colRightX(c)} ${y} L ${colLeftX(c + 1)} ${yNext}`;

                        // The gap *into* the target column is the "compare to
                        // target" leg — dashed so it reads as a reference, not
                        // an operation.
                        const intoTarget = c + 1 === targetColIdx;
                        return (
                          <g key={`pair-${r}-${c}`}>
                            {horizSeg}
                            <path
                              d={d}
                              fill="none"
                              stroke={color}
                              strokeOpacity={intoTarget ? 0.45 : 0.85}
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeDasharray={intoTarget ? '4 4' : undefined}
                            />
                          </g>
                        );
                      })}

                      {/* Source dot */}
                      <circle
                        cx={colLeftX(0)}
                        cy={yFor(r)}
                        r={3.5}
                        fill={color}
                      />
                      {/* Composed-output dot at last operational column */}
                      <circle
                        cx={colRightX(editedLayers.length)}
                        cy={yFor(composed.get(r) ?? r)}
                        r={4}
                        fill={
                          endpointStatus(r) === 'match'
                            ? COLOR_MATCH
                            : COLOR_MISMATCH
                        }
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                      {/* Target reference dot at far right */}
                      <circle
                        cx={colRightX(targetColIdx)}
                        cy={yFor(referenceTarget(r))}
                        r={3}
                        fill={color}
                        opacity={0.55}
                      />
                    </g>
                  );
                })}

                {/* Rubber-band line during SVG-node drag */}
                {svgDragSrc !== null && svgDragPointer !== null && (
                  <line
                    x1={colCenterX(svgDragSrc.col)}
                    y1={yFor(svgDragSrc.row)}
                    x2={svgDragPointer.x}
                    y2={svgDragPointer.y}
                    stroke={COLOR_ACTIVE}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </svg>
            </SvgViewport>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1 }}
            >
              {t('guided.decomposition')}
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                }}
              >
                {editedLayers.length === 0
                  ? 'identity'
                  : editedLayers.map((l) => formatLayerLabel(l)).join(' ∘ ')}
              </Box>
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5 }}
            >
              {t('guided.legend')}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5 }}
            >
              {t('guided.dragHelp')}
            </Typography>
          </>
        )}
      </Paper>
    </Stack>
  );
}

function InsertSlot({
  idx,
  onClick,
  hot,
  onDragOver,
  onDrop,
}: {
  idx: number;
  onClick: () => void;
  hot?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const { tStr } = useI18n();
  return (
    <Tooltip title={tStr('guided.insertSlot.tooltip', { idx: idx + 1 })}>
      <IconButton
        size="small"
        onClick={onClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        sx={{
          width: 18,
          height: 28,
          borderRadius: 0.5,
          color: hot ? COLOR_ACTIVE : 'text.disabled',
          bgcolor: hot ? 'rgba(237,108,2,0.12)' : 'transparent',
          '&:hover': {
            color: COLOR_ACTIVE,
            bgcolor: 'rgba(237,108,2,0.08)',
          },
        }}
      >
        <AddIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
  );
}
