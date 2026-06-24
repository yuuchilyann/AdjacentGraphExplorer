import { useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';

import { Math } from './Math';
import type { LayeredRealization } from '../lib/layered';
import { useI18n } from '../i18n';

export type ElementaryRowMatrixPanelProps = {
  realization: LayeredRealization;
  n: number;
  /** 0 = before any layer applied; k = after layer k applied. */
  step: number;
};

/** Verbosity of the math rendering. */
type Detail = 'full' | 'simplified';

const HIGHLIGHT = '#ed6c02';

/**
 * Per-bit colours for the swapped pair, mirroring the red marks in the source
 * document and the circuit view's control/target split: the n−1 bits shared by
 * |i⟩ and |j⟩ are the controls; the single differing bit is the X target.
 */
const COLOR_CONTROL = HIGHLIGHT; // 控制位元（i、j 相同）— 橘
const COLOR_TARGET = '#1565c0'; // 目標位元（唯一相異、被 X 翻轉）— 藍

/** Bit index (from LSB) that differs between i and j, or −1 if not exactly one. */
const targetBit = (i: number, j: number): number => {
  const d = i ^ j;
  if (d === 0 || (d & (d - 1)) !== 0) return -1; // 0 or ≥2 differing bits
  let pos = 0;
  while (((d >> pos) & 1) === 0) pos++;
  return pos;
};

/**
 * |ket⟩ with each bit coloured by its circuit role: the differing bit at
 * `tPos` (from LSB) is the target, every other bit is a control. Falls back to
 * a flat highlight of the whole ket when `tPos < 0`.
 */
const ketBitColored = (l: number, n: number, tPos: number): string => {
  if (n === 0) return '|\\,\\rangle';
  if (tPos < 0) return `\\textcolor{${COLOR_CONTROL}}{${ket(l, n)}}`;
  const bits = l.toString(2).padStart(n, '0'); // MSB-first
  const cells = bits
    .split('')
    .map((b, idx) => {
      const bitPos = n - 1 - idx; // string index → bit index from LSB
      const col = bitPos === tPos ? COLOR_TARGET : COLOR_CONTROL;
      return `\\textcolor{${col}}{${b}}`;
    })
    .join('');
  return `|${cells}\\rangle`;
};

/** Max basis-state count we still render as a full 2^n × 2^n matrix. */
const MAX_DIM = 16; // n ≤ 4

/**
 * Max basis-state count we still expand column-by-column in the two-line
 * notation when "full" detail is selected. Beyond this even scholars get the
 * landmark form, since rendering thousands of KaTeX columns is impractical.
 */
const FULL_TWO_LINE_MAX_DIM = 64; // n ≤ 6

const ket = (r: number, n: number) =>
  n === 0 ? '|\\,\\rangle' : `|${r.toString(2).padStart(n, '0')}\\rangle`;

/**
 * Two-line (Cauchy) notation of the transposition α = (|i⟩ |j⟩).
 *
 * Simplified (general users):
 *   [ |0⟩ ⋯ |i⟩ ⋯ |j⟩ ⋯ |2ⁿ−1⟩ ]
 *   [ |0⟩ ⋯ |j⟩ ⋯ |i⟩ ⋯ |2ⁿ−1⟩ ]
 *   Only the landmark columns 0, i, j and 2ⁿ−1 are shown, with `⋯` standing
 *   in for the untouched runs between them — compact for every n.
 *
 * Full (scholars): every column 0 … 2ⁿ−1 is listed explicitly so the whole
 * permutation can be verified by hand. The top row is the standard basis
 * ordering; the bottom row is the image under α (entries at i and j swapped).
 */
function twoLineNotationTex(
  i: number,
  j: number,
  n: number,
  full: boolean,
): string {
  const N = 1 << n;
  const tPos = targetBit(i, j);
  // Hot (swapped) columns get per-bit control/target colouring; the rest are
  // rendered plain.
  const cell = (l: number, hot: boolean) =>
    hot ? ketBitColored(l, n, tPos) : ket(l, n);
  const imageOf = (l: number) => (l === i ? j : l === j ? i : l);

  // Both rows always run in standard |0…0⟩-ascending order; only the bottom
  // row's entries at columns i and j are swapped (Cauchy two-line notation).
  const cols: { top: string; bottom: string }[] = [];

  if (full) {
    for (let l = 0; l < N; l++) {
      const hot = l === i || l === j;
      cols.push({ top: cell(l, hot), bottom: cell(imageOf(l), hot) });
    }
  } else {
    // Landmarks to anchor the schematic, deduped and ordered.
    const landmarks = Array.from(new Set([0, i, j, N - 1])).sort(
      (a, b) => a - b,
    );
    for (let idx = 0; idx < landmarks.length; idx++) {
      const l = landmarks[idx]!;
      const hot = l === i || l === j;
      cols.push({ top: cell(l, hot), bottom: cell(imageOf(l), hot) });

      // Insert an ellipsis column if the next landmark is not adjacent.
      const next = landmarks[idx + 1];
      if (next !== undefined && next > l + 1) {
        cols.push({ top: '\\cdots', bottom: '\\cdots' });
      }
    }
  }

  const top = cols.map((c) => c.top);
  const bottom = cols.map((c) => c.bottom);
  return `\\begin{pmatrix} ${top.join(' & ')} \\\\ ${bottom.join(' & ')} \\end{pmatrix}`;
}

/**
 * Elementary row matrix R(i, j): the identity matrix with rows i and j
 * exchanged. The labelled basis-state column is rendered to the left so the
 * reader can see which basis vector each row corresponds to.
 *
 *   [ |000⟩ ]   [ 1 0 0 … ]
 *   [ |001⟩ ] × [ 0 0 1 … ]  = R(i, j)
 *   [   ⋮   ]   [   ⋮      ]
 */
function elementaryRowMatrixTex(i: number, j: number, n: number): string {
  const N = 1 << n;
  const tPos = targetBit(i, j);
  const labels: string[] = [];
  const rows: string[] = [];

  for (let r = 0; r < N; r++) {
    // After exchanging rows i and j, position i holds e_j and position j e_i.
    const src = r === i ? j : r === j ? i : r;
    const swapped = r === i || r === j;

    const cells: string[] = [];
    for (let c = 0; c < N; c++) {
      const v = c === src ? '1' : '0';
      cells.push(swapped && v === '1' ? `\\textcolor{${HIGHLIGHT}}{${v}}` : v);
    }
    rows.push(cells.join(' & '));

    // Swapped-row labels reuse the per-bit control/target colouring.
    labels.push(swapped ? ketBitColored(r, n, tPos) : ket(r, n));
  }

  const labelCol = `\\begin{matrix} ${labels.join(' \\\\ ')} \\end{matrix}`;
  const matrix = `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
  const rij = `R_{(${ket(i, n)},\\,${ket(j, n)})}`;

  return `\\begin{array}{cc} ${labelCol} & ${matrix} \\end{array} \\;=\\; ${rij}`;
}

export function ElementaryRowMatrixPanel({
  realization,
  n,
  step,
}: ElementaryRowMatrixPanelProps) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<Detail>('simplified');

  if (n <= 0 || realization.layers.length === 0) return null;

  const N = 1 << n;
  const isFull = detail === 'full';

  // Whether each representation can be rendered explicitly at this n.
  const canFullTwoLine = N <= FULL_TWO_LINE_MAX_DIM;
  const canShowMatrix = N <= MAX_DIM;
  // In full mode we want every column of the two-line notation; fall back to
  // the landmark form (with a note) when that is impractically wide.
  const fullTwoLine = isFull && canFullTwoLine;
  const showMatrix = isFull && canShowMatrix;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, mb: 1 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <GridOnIcon fontSize="small" color="action" />
          <Typography variant="overline" color="text.secondary">
            Elementary Row Matrix
          </Typography>
        </Box>

        <Tooltip
          title={
            isFull
              ? t('matrix.detail.tooltip.full')
              : t('matrix.detail.tooltip.simplified')
          }
        >
          <ToggleButtonGroup
            value={detail}
            exclusive
            size="small"
            color="primary"
            onChange={(_, v: Detail | null) => v && setDetail(v)}
          >
            <ToggleButton value="simplified">
              <PersonIcon sx={{ mr: 0.5, fontSize: 16 }} />
              {t('matrix.detail.simplified')}
            </ToggleButton>
            <ToggleButton value="full">
              <SchoolIcon sx={{ mr: 0.5, fontSize: 16 }} />
              {t('matrix.detail.full')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t('matrix.intro', { N })}
      </Typography>

      <Box sx={{ overflowX: 'auto' }}>
        <Math
          display
          tex={`R_{(i,\\,j)} = I \\text{ with rows } i \\leftrightarrow j \\text{ exchanged}`}
        />
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mt: 0.5 }}
      >
        {t('matrix.legend', { controlColor: COLOR_CONTROL, targetColor: COLOR_TARGET })}
      </Typography>

      {isFull && !canFullTwoLine && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {t('matrix.alert.tooManyColumns', { n, N })}
        </Alert>
      )}
      {isFull && canFullTwoLine && !canShowMatrix && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {t('matrix.alert.matrixTooBig', { n, N })}
        </Alert>
      )}

      <Stack spacing={2} sx={{ mt: 1 }}>
        {realization.layers.map((layer, k) => {
          const [i, j] = layer.swap;
          const active = k + 1 === step;
          return (
            <Box
              key={`erm-${k}`}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: active ? HIGHLIGHT : 'divider',
                bgcolor: active ? 'rgba(237,108,2,0.06)' : 'transparent',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? HIGHLIGHT : 'text.secondary',
                }}
              >
                Layer L{k + 1} — <Math tex={`(${ket(i, n)}\\ \\ ${ket(j, n)})`} />
              </Typography>

              {/* Step 1 — two-line (Cauchy) notation of the transposition. */}
              <Box sx={{ overflowX: 'auto' }}>
                <Math display tex={twoLineNotationTex(i, j, n, fullTwoLine)} />
              </Box>

              {/* Step 2 — expansion into the elementary row matrix R(i, j).
                  Only shown in full mode and when the matrix fits. */}
              {showMatrix && (
                <Box sx={{ overflowX: 'auto', mt: 0.5 }}>
                  <Math display tex={elementaryRowMatrixTex(i, j, n)} />
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1 }}
      >
        {t('matrix.footer', { count: realization.layers.length })}
      </Typography>
    </Paper>
  );
}
