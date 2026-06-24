import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Chip from '@mui/material/Chip';

import type { Mapping } from '../lib/permutation';
import {
  formatSwap,
  realizeLayered,
  reduceRealization,
  type Strategy,
} from '../lib/layered';
import { QuantumCircuitView } from './QuantumCircuitView';
import { QiskitPackageView } from './QiskitPackageView';
import { ElementaryRowMatrixPanel } from './ElementaryRowMatrixPanel';
import { LearningPanel } from './LearningPanel';
import { SvgViewport } from './SvgViewport';
import { useI18n } from '../i18n';

export type LayeredViewProps = {
  mapping: Mapping;
  n: number;
  /**
   * Whether to render the LearningPanel (theorem reference). Default true.
   * Set to false when this LayeredView is one of many siblings (e.g.
   * per-stage views inside PermutationChain) and the panel would just
   * repeat the same content over and over.
   */
  showLearningPanel?: boolean;
};

const COLOR_ACTIVE = '#ed6c02';
const COLOR_TRACK = '#1f1f1f';
const COLOR_TRACK_BG = 'rgba(0, 0, 0, 0.04)';
const PLAY_INTERVAL_MS = 900;

/** Distinct hue per starting state, kept consistent across all columns. */
function strandColor(startIdx: number, total: number): string {
  if (total <= 1) return 'hsl(210, 70%, 45%)';
  const hue = Math.round((startIdx * 360) / total);
  return `hsl(${hue}, 70%, 45%)`;
}

export function LayeredView({
  mapping,
  n,
  showLearningPanel = true,
}: LayeredViewProps) {
  const { t, tStr } = useI18n();
  const [strategy, setStrategy] = useState<Strategy>('above');
  const [reduced, setReduced] = useState(false);
  const [walkAware, setWalkAware] = useState(false);
  const [reversedRows, setReversedRows] = useState(false);
  const canonical = useMemo(
    () => realizeLayered(mapping, n, strategy, walkAware),
    [mapping, n, strategy, walkAware],
  );
  const realization = useMemo(
    () => (reduced ? reduceRealization(canonical) : canonical),
    [canonical, reduced],
  );
  // Anchor-only baseline for the saved-layers indicator (always computed
  // even when walkAware is on, so the chip can show "saved Δ layers").
  const anchorBaseline = useMemo(
    () => (walkAware ? realizeLayered(mapping, n, strategy, false) : canonical),
    [mapping, n, strategy, walkAware, canonical],
  );
  const cancelledPairs = (canonical.layers.length - realization.layers.length) / 2;
  const walkSavedLayers = walkAware
    ? anchorBaseline.layers.length - canonical.layers.length
    : 0;
  const totalCols = realization.layers.length + 1;
  const lastStep = Math.max(0, realization.layers.length);

  // Step controls. Default to the final state so the wiring is fully visible.
  const [stepRaw, setStep] = useState(lastStep);
  // Clamp during render: when `realization` changes (e.g. randomized permutation),
  // the reset effect hasn't fired yet, so a stale step could index past `layers`.
  const step = Math.min(stepRaw, lastStep);
  const [playing, setPlaying] = useState(false);
  const [hoverStrand, setHoverStrand] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setStep(lastStep);
    setPlaying(false);
    setHoverStrand(null);
  }, [realization, lastStep]);

  useEffect(() => {
    if (!playing) {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= lastStep) {
          setPlaying(false);
          return lastStep;
        }
        return s + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [playing, lastStep]);

  if (mapping.size === 0) return null;

  const total = 1 << n;
  const rowHeight = total <= 8 ? 38 : total <= 32 ? 26 : 16;
  const labelFontSize = total <= 8 ? 15 : total <= 32 ? 12 : 9;
  const labelW = Math.max(56, n * 12 + 28);
  const colGap = total <= 8 ? 130 : 100;
  const padX = 40;
  const padY = 30;

  const colLeftX = (c: number) => padX + c * (labelW + colGap);
  const colRightX = (c: number) => colLeftX(c) + labelW;
  const colCenterX = (c: number) => colLeftX(c) + labelW / 2;
  const yFor = (i: number) =>
    padY + rowHeight / 2 + (reversedRows ? total - 1 - i : i) * rowHeight;
  const totalW = padX * 2 + totalCols * labelW + (totalCols - 1) * colGap;
  const totalH = padY * 2 + total * rowHeight;

  const ket = (i: number) =>
    n === 0 ? '|⟩' : `|${i.toString(2).padStart(n, '0')}⟩`;

  /** Status of the layer/transition between cols c and c+1 (1-indexed = c+1). */
  const transitionStatus = (c: number): 'past' | 'active' | 'future' => {
    const k = c + 1;
    if (k < step) return 'past';
    if (k === step) return 'active';
    return 'future';
  };

  const stepLabel = (c: number): string => {
    if (c === 0) return 'source';
    if (c === totalCols - 1) return 'target';
    return `L${c}`;
  };

  // Pre-compute the swap pair at each transition for the crossing-only style.
  const swapAtTransition = (k: number): [number, number] =>
    realization.layers[k - 1]!.swap;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {/* Row 1 — info: title + subtitle, verified chip on the right */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 1, alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {t('layered.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('layered.subtitle', {
              layers: realization.layers.length,
              maxDirectDistance: realization.maxDirectDistance,
              reduced,
              cancelledPairs,
              canonicalLayers: canonical.layers.length,
            })}
          </Typography>
        </Box>
        <Tooltip
          title={
            realization.verification.ok
              ? t('layered.verify.ok')
              : t('layered.verify.fail', {
                  mismatches: realization.verification.mismatches.length,
                  illegal: realization.verification.illegalLayers.length,
                })
          }
        >
          <Chip
            size="small"
            icon={
              realization.verification.ok ? (
                <VerifiedIcon />
              ) : (
                <WarningAmberIcon />
              )
            }
            label={realization.verification.ok ? 'verified' : 'mismatch'}
            color={realization.verification.ok ? 'success' : 'error'}
            variant="outlined"
            sx={{ flexShrink: 0 }}
          />
        </Tooltip>
      </Stack>

      {/* Row 2 — settings toolbar: Strategy | Reduced | Walk-aware + status chips */}
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
        <Tooltip
          title={
            canonical.usedGrayPath
              ? t('layered.strategy.tooltip.gray')
              : walkAware && canonical.walkDecomposedCycles === canonical.totalCycles && canonical.totalCycles > 0
                ? t('layered.strategy.tooltip.walkAll')
                : t('layered.strategy.tooltip.none')
          }
        >
          <span>
            <ToggleButtonGroup
              value={strategy}
              exclusive
              size="small"
              onChange={(_, v: Strategy | null) => v && setStrategy(v)}
              color="primary"
              disabled={!canonical.usedGrayPath}
            >
              <ToggleButton value="above">Top-down</ToggleButton>
              <ToggleButton value="below">Bottom-up</ToggleButton>
            </ToggleButtonGroup>
          </span>
        </Tooltip>
        <Tooltip
          title={
            reduced
              ? t('layered.reduced.tooltip.on')
              : t('layered.reduced.tooltip.off')
          }
        >
          <ToggleButtonGroup
            value={reduced ? 'reduced' : 'original'}
            exclusive
            size="small"
            onChange={(_, v: string | null) => {
              if (v === 'original') setReduced(false);
              else if (v === 'reduced') setReduced(true);
            }}
            color="secondary"
          >
            <ToggleButton value="original">Original</ToggleButton>
            <ToggleButton value="reduced">Reduced</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Tooltip
            title={
              walkAware
                ? t('layered.walk.tooltip.on')
                : t('layered.walk.tooltip.off')
            }
          >
            <ToggleButton
              value="walk"
              size="small"
              selected={walkAware}
              onChange={() => setWalkAware((v) => !v)}
              color="success"
            >
              Walk-aware
            </ToggleButton>
          </Tooltip>
          {walkAware && canonical.walkDecomposedCycles > 0 && (
            <Tooltip
              title={t('layered.walk.chip.detected.tooltip', {
                decomposed: canonical.walkDecomposedCycles,
                total: canonical.totalCycles,
              })}
            >
              <Chip
                size="small"
                label={`walk: ${canonical.walkDecomposedCycles}/${canonical.totalCycles} cycles${walkSavedLayers > 0 ? ` (−${walkSavedLayers}L)` : ''}`}
                color="success"
                variant="outlined"
              />
            </Tooltip>
          )}
          {walkAware && canonical.walkDecomposedCycles === 0 && canonical.totalCycles > 0 && (
            <Tooltip title={t('layered.walk.chip.none.tooltip')}>
              <Chip
                size="small"
                label={`walk: 0/${canonical.totalCycles} cycles`}
                variant="outlined"
              />
            </Tooltip>
          )}
        </Stack>
        <Tooltip title={reversedRows ? t('layered.reverse.tooltip.desc') : t('layered.reverse.tooltip.asc')}>
          <ToggleButton
            value="reverse"
            size="small"
            selected={reversedRows}
            onChange={() => setReversedRows((v) => !v)}
          >
            {reversedRows ? '↕ |11⟩→|00⟩' : '↕ |00⟩→|11⟩'}
          </ToggleButton>
        </Tooltip>
      </Stack>

      {realization.unsupported.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {t('layered.unsupported', {
            count: realization.unsupported.length,
            list: realization.unsupported
              .map(([a, b]) => `(${ket(a!)} ${ket(b!)})`)
              .join(', '),
          })}
        </Alert>
      )}

      {realization.layers.length === 0 ? (
        <Alert severity={realization.alreadyLegal ? 'success' : 'info'}>
          {realization.alreadyLegal
            ? t('layered.empty.alreadyLegal')
            : t('layered.empty.noCycle')}
        </Alert>
      ) : (
        <>
          {/* Playback toolbar — same tinted style as the settings toolbar above */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: 'center',
              mb: 1,
              flexWrap: 'wrap',
              rowGap: 1,
              p: 0.75,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Tooltip title={tStr('layered.play.first')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => setStep(0)}
                  disabled={step === 0}
                >
                  <FirstPageIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={tStr('layered.play.prev')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <SkipPreviousIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={playing ? tStr('layered.play.pause') : tStr('layered.play.play')}>
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => {
                    if (step >= lastStep) setStep(0);
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={tStr('layered.play.next')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => setStep((s) => Math.min(lastStep, s + 1))}
                  disabled={step >= lastStep}
                >
                  <SkipNextIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={tStr('layered.play.last')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => setStep(lastStep)}
                  disabled={step >= lastStep}
                >
                  <LastPageIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="body2" sx={{ ml: 1 }}>
              Step {step} / {lastStep}
              {step > 0 && (
                <>
                  {' '}— layer {step}:{' '}
                  <Box
                    component="span"
                    sx={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      color: COLOR_ACTIVE,
                    }}
                  >
                    {formatSwap(realization.layers[step - 1]!, n)}
                  </Box>
                </>
              )}
            </Typography>
          </Stack>

          <SvgViewport
            svgRef={svgRef}
            filename={`layered-realization-n${n}-${strategy}${walkAware ? '-walk' : ''}${reduced ? '-reduced' : ''}`}
          >
            <svg
              ref={svgRef}
              width={totalW}
              height={totalH}
              viewBox={`0 0 ${totalW} ${totalH}`}
              style={{ display: 'block', margin: '0 auto' }}
              onMouseLeave={() => setHoverStrand(null)}
            >
              {/* Column track backgrounds + |i⟩ labels (fixed reference frame) */}
              {Array.from({ length: totalCols }, (_, c) => c).map((c) => {
                const isCurrent = c === step;
                return (
                  <g key={`col-${c}`}>
                    {/* track background */}
                    <rect
                      x={colLeftX(c)}
                      y={padY}
                      width={labelW}
                      height={total * rowHeight}
                      fill={isCurrent ? 'rgba(237,108,2,0.06)' : COLOR_TRACK_BG}
                      rx={6}
                    />
                    {/* column header */}
                    <text
                      x={colCenterX(c)}
                      y={padY - 10}
                      textAnchor="middle"
                      fontSize={11}
                      fill={isCurrent ? COLOR_ACTIVE : '#666'}
                      fontWeight={isCurrent ? 700 : 500}
                    >
                      {stepLabel(c)}
                    </text>
                    {/* track labels |0⟩..|2ⁿ-1⟩ */}
                    {Array.from({ length: total }, (_, i) => i).map((i) => {
                      const swap = step > 0 && c === step
                        ? swapAtTransition(step)
                        : null;
                      const onSwapRail = swap !== null &&
                        (i === swap[0] || i === swap[1]);
                      return (
                        <text
                          key={`tl-${c}-${i}`}
                          x={colCenterX(c)}
                          y={yFor(i) + labelFontSize / 3}
                          textAnchor="middle"
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                          fontSize={labelFontSize}
                          fill={onSwapRail ? COLOR_ACTIVE : COLOR_TRACK}
                          fontWeight={onSwapRail ? 700 : 500}
                          opacity={0.85}
                          style={{ pointerEvents: 'none' }}
                        >
                          {ket(i)}
                        </text>
                      );
                    })}
                  </g>
                );
              })}

              {/* Strands — draw twice: dim "ghost" layer first, then highlighted on top */}
              {Array.from({ length: total }, (_, r) => r).map((r) => {
                const color = strandColor(r, total);
                const isHovered = hoverStrand === r;
                const isDimmed = hoverStrand !== null && !isHovered;
                return (
                  <g
                    key={`strand-${r}`}
                    onMouseEnter={() => setHoverStrand(r)}
                    style={{ cursor: 'pointer' }}
                  >
                    {Array.from({ length: totalCols }, (_, c) => c).map((c) => {
                      const traj = realization.trajectories[r]!;
                      const y = yFor(traj[c]!);
                      const reached = c <= step;
                      // Horizontal segment within column c
                      const horizSeg = (
                        <line
                          key={`h-${r}-${c}`}
                          x1={colLeftX(c)}
                          y1={y}
                          x2={colRightX(c)}
                          y2={y}
                          stroke={color}
                          strokeOpacity={
                            isDimmed ? 0.12 : reached ? (isHovered ? 1 : 0.85) : 0.22
                          }
                          strokeWidth={isHovered ? 3 : 2}
                          strokeLinecap="round"
                          strokeDasharray={reached ? undefined : '3 3'}
                        />
                      );

                      if (c >= totalCols - 1) return horizSeg;

                      // Diagonal segment between column c and c+1
                      const yNext = yFor(traj[c + 1]!);
                      const status = transitionStatus(c);
                      const k = c + 1;
                      const transReached = k <= step;
                      const isActive = status === 'active';
                      const moved = y !== yNext;

                      // Build a gentle S-curve when crossing to make crossings readable.
                      const dx = colLeftX(c + 1) - colRightX(c);
                      const mx1 = colRightX(c) + dx * 0.3;
                      const mx2 = colRightX(c) + dx * 0.7;
                      const d = moved
                        ? `M ${colRightX(c)} ${y} C ${mx1} ${y}, ${mx2} ${yNext}, ${colLeftX(c + 1)} ${yNext}`
                        : `M ${colRightX(c)} ${y} L ${colLeftX(c + 1)} ${yNext}`;

                      const diagOpacity = isDimmed
                        ? 0.1
                        : transReached
                          ? isActive
                            ? 1
                            : isHovered
                              ? 1
                              : 0.85
                          : 0.18;
                      const diagWidth = isActive && moved
                        ? 3
                        : isHovered
                          ? 3
                          : 2;

                      return (
                        <g key={`pair-${r}-${c}`}>
                          {horizSeg}
                          <path
                            d={d}
                            fill="none"
                            stroke={color}
                            strokeOpacity={diagOpacity}
                            strokeWidth={diagWidth}
                            strokeLinecap="round"
                            strokeDasharray={
                              transReached ? undefined : '4 4'
                            }
                          />
                        </g>
                      );
                    })}

                    {/* Endpoint dots: source (col 0) and target (col last) */}
                    <circle
                      cx={colLeftX(0)}
                      cy={yFor(realization.trajectories[r]![0]!)}
                      r={3.5}
                      fill={color}
                      opacity={isDimmed ? 0.2 : 1}
                    />
                    <circle
                      cx={colRightX(totalCols - 1)}
                      cy={yFor(realization.trajectories[r]![totalCols - 1]!)}
                      r={3.5}
                      fill={color}
                      opacity={isDimmed ? 0.2 : step >= lastStep ? 1 : 0.4}
                    />
                  </g>
                );
              })}
            </svg>
          </SvgViewport>

          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <Typography variant="caption" color="text.secondary">
              {t('layered.legend.label')}
            </Typography>
            {Array.from({ length: total }, (_, r) => r).map((r) => {
              const color = strandColor(r, total);
              const start = realization.trajectories[r]![0]!;
              const end = realization.trajectories[r]![totalCols - 1]!;
              const moved = start !== end;
              return (
                <Box
                  key={`legend-${r}`}
                  onMouseEnter={() => setHoverStrand(r)}
                  onMouseLeave={() => setHoverStrand(null)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    opacity:
                      hoverStrand === null || hoverStrand === r ? 1 : 0.4,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: 12,
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      width: 14,
                      height: 3,
                      bgcolor: color,
                      borderRadius: 1,
                    }}
                  />
                  {ket(start)}
                  {moved ? ` → ${ket(end)}` : ` ${tStr('layered.legend.fixed')}`}
                </Box>
              );
            })}
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            {t('layered.decomposition')}
            <Box
              component="span"
              sx={{
                ml: 0.5,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              }}
            >
              {realization.layers
                .map((l) => formatSwap(l, n))
                .join(' ∘ ')}
            </Box>
          </Typography>

          <QuantumCircuitView
            realization={realization}
            n={n}
            step={step}
          />

          <ElementaryRowMatrixPanel
            realization={realization}
            n={n}
            step={step}
          />

          <QiskitPackageView
            realization={realization}
            n={n}
            reduced={reduced}
          />

          {showLearningPanel && (
            <LearningPanel realization={realization} n={n} />
          )}
        </>
      )}
    </Paper>
  );
}
