import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import type { LayerStep } from '../lib/layered';
import {
  GATE_LIBRARIES,
  gateType,
  shortestCircuit,
  SYNTH_MAX_N,
  verifyCircuit,
  type Control,
  type GateLibraryId,
  type GateType,
  type SynthGate,
} from '../lib/synthesis';
import { SvgViewport } from './SvgViewport';
import { useI18n } from '../i18n';
import type { TKey } from '../i18n/locales/zh';

/**
 * "Gate library comparison" card — lets the user switch between the app's
 * Gray-path circuit and the provably shortest circuit for each richer gate
 * library (MCX only / + SWAP / + Fredkin / NCT / NCT + SWAP + Fredkin), to
 * see for themselves how much each gate type actually shortens the circuit.
 *
 * Kept as its own card (not a toggle on the main circuit): with SWAP, CNOT
 * or a bare X one gate moves several basis-state pairs at once, so these
 * circuits no longer line up 1:1 with the wiring diagram's single-swap layers.
 */
export type GateLibraryViewProps = {
  /** target[x] = α(x) */
  target: number[];
  n: number;
  /** The Original (Gray-path) layers, shown as the "current" option. */
  baselineLayers: LayerStep[];
};

type Option = 'baseline' | GateLibraryId;

const OPTION_LABEL_KEY: Record<Option, TKey> = {
  baseline: 'gatelib.opt.baseline',
  mcx: 'gatelib.opt.mcx',
  'mcx-swap': 'gatelib.opt.mcx-swap',
  'mcx-swap-cswap': 'gatelib.opt.mcx-swap-cswap',
  nct: 'gatelib.opt.nct',
  'nct-swap-cswap': 'gatelib.opt.nct-swap-cswap',
};
const OPTION_DESC_KEY: Record<Option, TKey> = {
  baseline: 'gatelib.desc.baseline',
  mcx: 'gatelib.desc.mcx',
  'mcx-swap': 'gatelib.desc.mcx-swap',
  'mcx-swap-cswap': 'gatelib.desc.mcx-swap-cswap',
  nct: 'gatelib.desc.nct',
  'nct-swap-cswap': 'gatelib.desc.nct-swap-cswap',
};
/** Libraries that add swap-type gates, and the library they extend. */
const SWAP_EXTENDS: Partial<Record<GateLibraryId, GateLibraryId>> = {
  'mcx-swap': 'mcx',
  'mcx-swap-cswap': 'mcx',
  'nct-swap-cswap': 'nct',
};
const OPTION_GATES_KEY: Record<Option, TKey> = {
  baseline: 'gatelib.def.gates.baseline',
  mcx: 'gatelib.def.gates.mcx',
  'mcx-swap': 'gatelib.def.gates.mcx-swap',
  'mcx-swap-cswap': 'gatelib.def.gates.mcx-swap-cswap',
  nct: 'gatelib.def.gates.nct',
  'nct-swap-cswap': 'gatelib.def.gates.nct-swap-cswap',
};
/** Options whose every gate is one legal layer (1:1 with the wiring diagram). */
const MATCHES_WIRING: Record<Option, boolean> = {
  baseline: true,
  mcx: true,
  'mcx-swap': false,
  'mcx-swap-cswap': false,
  nct: false,
  'nct-swap-cswap': false,
};
const TYPE_ORDER: GateType[] = ['mcx', 'toffoli', 'cnot', 'x', 'swap', 'cswap'];
const GLOSSARY_KEY: Record<GateType, TKey> = {
  mcx: 'gatelib.glossary.mcx',
  toffoli: 'gatelib.glossary.toffoli',
  cnot: 'gatelib.glossary.cnot',
  x: 'gatelib.glossary.x',
  swap: 'gatelib.glossary.swap',
  cswap: 'gatelib.glossary.cswap',
};
const TYPE_LABEL_KEY: Record<GateType, TKey> = {
  mcx: 'gatelib.type.mcx',
  toffoli: 'gatelib.type.toffoli',
  cnot: 'gatelib.type.cnot',
  x: 'gatelib.type.x',
  swap: 'gatelib.type.swap',
  cswap: 'gatelib.type.cswap',
};

const COLOR_WIRE = '#1f1f1f';
const COLOR_GATE = '#1f1f1f';
/** Swap-type gates get their own colour so the eye can count them. */
const COLOR_SWAP = '#7b1fa2';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function layersToGates(layers: LayerStep[], n: number): SynthGate[] {
  return layers.map(({ swap: [a, b] }) => {
    const diff = a ^ b;
    const t = Math.log2(diff & -diff);
    const controls: Control[] = [];
    for (let q = 0; q < n; q++) {
      if (q !== t) controls.push({ q, value: ((a >> q) & 1) as 0 | 1 });
    }
    return { kind: 'x', target: t, controls };
  });
}

export function GateLibraryView({ target, n, baselineLayers }: GateLibraryViewProps) {
  const { t, tStr } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const [option, setOption] = useState<Option>('baseline');
  const available = n >= 1 && n <= SYNTH_MAX_N;

  const baseline = useMemo(() => layersToGates(baselineLayers, n), [baselineLayers, n]);

  // Exhaustive search per library. The first BFS of a library builds its
  // distance table (~0.1 s at n = 3), so run one library per tick to keep the
  // page responsive; later permutations reuse the cached tables.
  const targetKey = target.join(',');
  const [circuits, setCircuits] = useState<{
    key: string;
    byLib: Partial<Record<GateLibraryId, SynthGate[]>>;
  }>({ key: '', byLib: {} });
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    const byLib: Partial<Record<GateLibraryId, SynthGate[]>> = {};
    setCircuits({ key: targetKey, byLib: {} });
    let i = 0;
    const step = () => {
      if (cancelled || i >= GATE_LIBRARIES.length) return;
      const lib = GATE_LIBRARIES[i++]!;
      const c = shortestCircuit(target, n, lib);
      if (c) byLib[lib] = c;
      setCircuits({ key: targetKey, byLib: { ...byLib } });
      window.setTimeout(step, 0);
    };
    const id = window.setTimeout(step, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // targetKey captures `target` by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, n, available]);

  const byLib = circuits.key === targetKey ? circuits.byLib : {};
  const gatesFor = (o: Option): SynthGate[] | undefined =>
    o === 'baseline' ? baseline : byLib[o];

  if (n <= 0 || baselineLayers.length === 0) return null;

  const effective: Option = available ? option : 'baseline';
  const gates = gatesFor(effective);
  const verified = gates ? verifyCircuit(gates, target, n) : false;

  const tally = new Map<GateType, number>();
  for (const g of gates ?? []) {
    const ty = gateType(g, n);
    tally.set(ty, (tally.get(ty) ?? 0) + 1);
  }

  // Comparison against the same library without swap-type gates.
  const base = effective !== 'baseline' ? SWAP_EXTENDS[effective] : undefined;
  const baseGates = base ? byLib[base] : undefined;

  // ── Layout (same conventions as QuantumCircuitView: q0 at the BOTTOM) ──
  const rowH = 44;
  const padY = 36;
  const slotW = 56;
  const endPadX = 60;
  const startX = endPadX / 2 + 60;
  const count = gates?.length ?? 0;
  const totalH = padY * 2 + n * rowH;
  const totalW = startX + Math.max(1, count) * slotW + endPadX;
  const yForQ = (q: number) => padY + (n - 1 - q) * rowH + rowH / 2;
  const xGate = (k: number) => startX + k * slotW + slotW / 2;
  const wireEndX = totalW - endPadX / 2;

  const renderGate = (g: SynthGate, k: number) => {
    const x = xGate(k);
    const isSwap = g.kind === 'swap';
    const color = isSwap ? COLOR_SWAP : COLOR_GATE;
    const qs = [
      ...g.controls.map((c) => c.q),
      ...(g.kind === 'x' ? [g.target] : g.targets),
    ];
    const ys = qs.map(yForQ);
    const yTop = Math.min(...ys);
    const yBot = Math.max(...ys);
    const bareX = g.kind === 'x' && g.controls.length === 0;
    return (
      <g key={`g-${k}`}>
        <text
          x={x}
          y={padY - 14}
          textAnchor="middle"
          fontSize={11}
          fontFamily={MONO}
          fill="#666"
          fontWeight={500}
        >
          G{k + 1}
        </text>
        {yBot > yTop && (
          <line x1={x} y1={yTop} x2={x} y2={yBot} stroke={color} strokeWidth={1.6} />
        )}
        {g.controls.map((c) =>
          c.value === 1 ? (
            <circle key={`c-${c.q}`} cx={x} cy={yForQ(c.q)} r={6} fill={color} />
          ) : (
            <circle
              key={`c-${c.q}`}
              cx={x}
              cy={yForQ(c.q)}
              r={6}
              fill="#fff"
              stroke={color}
              strokeWidth={1.8}
            />
          ),
        )}
        {g.kind === 'x' && bareX && (
          // Uncontrolled X: boxed [X] (⊕ is reserved for a target on a control line).
          <g>
            <rect
              x={x - 12}
              y={yForQ(g.target) - 12}
              width={24}
              height={24}
              fill="#fff"
              stroke={color}
              strokeWidth={1.6}
              rx={3}
            />
            <text
              x={x}
              y={yForQ(g.target) + 5}
              textAnchor="middle"
              fontSize={14}
              fontFamily={MONO}
              fill={color}
              fontWeight={700}
            >
              X
            </text>
          </g>
        )}
        {g.kind === 'x' && !bareX && (
          <g>
            <circle cx={x} cy={yForQ(g.target)} r={13} fill={color} />
            <line
              x1={x - 7.8}
              y1={yForQ(g.target)}
              x2={x + 7.8}
              y2={yForQ(g.target)}
              stroke="#fff"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <line
              x1={x}
              y1={yForQ(g.target) - 7.8}
              x2={x}
              y2={yForQ(g.target) + 7.8}
              stroke="#fff"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </g>
        )}
        {g.kind === 'swap' &&
          g.targets.map((q) => {
            const y = yForQ(q);
            const r = 8;
            return (
              <g key={`s-${q}`}>
                <line
                  x1={x - r}
                  y1={y - r}
                  x2={x + r}
                  y2={y + r}
                  stroke={color}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
                <line
                  x1={x - r}
                  y1={y + r}
                  x2={x + r}
                  y2={y - r}
                  stroke={color}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
      </g>
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      {/* Row 1 — info */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 1, alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {t('gatelib.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('gatelib.subtitle')}
          </Typography>
        </Box>
        {gates && (
          <Tooltip title={verified ? t('gatelib.verify.ok') : t('gatelib.verify.fail')}>
            <Chip
              size="small"
              icon={verified ? <VerifiedIcon /> : <WarningAmberIcon />}
              label={verified ? 'verified' : 'mismatch'}
              color={verified ? 'success' : 'error'}
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
          </Tooltip>
        )}
      </Stack>

      {/* Row 2 — library switch (mode toggle → text only) */}
      <Stack
        direction="row"
        spacing={1}
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
            available ? '' : t('gatelib.disabled.tooltip', { n, max: SYNTH_MAX_N })
          }
        >
          <ToggleButtonGroup
            value={effective}
            exclusive
            size="small"
            color="primary"
            onChange={(_, v: Option | null) => v && setOption(v)}
            sx={{ flexWrap: 'wrap' }}
          >
            {(['baseline', ...GATE_LIBRARIES] as Option[]).map((o) => {
              const gs = gatesFor(o);
              return (
                <ToggleButton
                  key={o}
                  value={o}
                  disabled={o !== 'baseline' && !available}
                  sx={{ textTransform: 'none', gap: 0.75 }}
                >
                  {t(OPTION_LABEL_KEY[o])}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 700,
                      px: 0.6,
                      borderRadius: 0.75,
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      minWidth: 22,
                      textAlign: 'center',
                    }}
                  >
                    {gs ? gs.length : o !== 'baseline' && !available ? '—' : '…'}
                  </Box>
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Tooltip>
      </Stack>

      {/* Definitions — always visible so ①–⑤ never appear unexplained. */}
      <Box
        sx={{
          mb: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ px: 1.5, pt: 1, pb: 0.5 }}
        >
          {t('gatelib.def.title')}
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ '& td, & th': { fontSize: 13, py: 0.6 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('gatelib.def.head.option')}</TableCell>
                <TableCell>{t('gatelib.def.head.gates')}</TableCell>
                <TableCell>{t('gatelib.def.head.order')}</TableCell>
                <TableCell>{t('gatelib.def.head.wiring')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(['baseline', ...GATE_LIBRARIES] as Option[]).map((o) => {
                const enabled = o === 'baseline' || available;
                return (
                  <TableRow
                    key={o}
                    hover={enabled}
                    selected={o === effective}
                    onClick={enabled ? () => setOption(o) : undefined}
                    sx={{
                      cursor: enabled ? 'pointer' : 'default',
                      opacity: enabled ? 1 : 0.5,
                    }}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {t(OPTION_LABEL_KEY[o])}
                    </TableCell>
                    <TableCell>{t(OPTION_GATES_KEY[o])}</TableCell>
                    <TableCell>
                      {o === 'baseline'
                        ? t('gatelib.def.order.baseline')
                        : t('gatelib.def.order.search')}
                    </TableCell>
                    <TableCell>
                      {MATCHES_WIRING[o]
                        ? t('gatelib.def.wiring.yes')
                        : t('gatelib.def.wiring.no')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ px: 1.5, py: 1, bgcolor: 'action.hover' }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {t('gatelib.glossary.title', { n })}
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              columnGap: 3,
              rowGap: 0.25,
              '& li': { fontSize: 13, color: 'text.secondary' },
            }}
          >
            {TYPE_ORDER.map((ty) => (
              <li key={ty}>
                <Box
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: ty === 'swap' || ty === 'cswap' ? COLOR_SWAP : 'text.primary',
                  }}
                >
                  {t(TYPE_LABEL_KEY[ty])}
                </Box>
                {' — '}
                {t(GLOSSARY_KEY[ty], { n, half: 1 << Math.max(0, n - 1), quarter: 1 << Math.max(0, n - 2) })}
              </li>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {t('gatelib.glossary.symbols')}
          </Typography>
        </Box>
      </Box>

      {!available && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {t('gatelib.disabled.tooltip', { n, max: SYNTH_MAX_N })}
        </Alert>
      )}

      <Typography variant="body2" sx={{ mb: 1 }}>
        {t(OPTION_DESC_KEY[effective])}
      </Typography>

      {/* Gate-type tally + comparison with the swap-free library */}
      {gates && (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.75, alignItems: 'center' }}
        >
          {TYPE_ORDER.filter((ty) => tally.has(ty)).map((ty) => (
            <Chip
              key={ty}
              size="small"
              variant="outlined"
              label={`${t(TYPE_LABEL_KEY[ty])} ×${tally.get(ty)}`}
              sx={
                ty === 'swap' || ty === 'cswap'
                  ? { color: COLOR_SWAP, borderColor: COLOR_SWAP }
                  : undefined
              }
            />
          ))}
          {base && baseGates && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {baseGates.length === gates.length
                ? t('gatelib.cmp.same', { base: tStr(OPTION_LABEL_KEY[base]) })
                : t('gatelib.cmp.less', {
                    base: tStr(OPTION_LABEL_KEY[base]),
                    saved: baseGates.length - gates.length,
                  })}
            </Typography>
          )}
        </Stack>
      )}

      {!gates ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          {t('gatelib.computing')}
        </Typography>
      ) : (
        <SvgViewport svgRef={svgRef} filename={`gate-library-n${n}-${effective}`}>
          <svg
            ref={svgRef}
            width={totalW}
            height={totalH}
            viewBox={`0 0 ${totalW} ${totalH}`}
            style={{ display: 'block', margin: '0 auto' }}
          >
            {Array.from({ length: n }, (_, q) => (
              <g key={`w-${q}`}>
                <text
                  x={startX - 14}
                  y={yForQ(q) + 5}
                  textAnchor="end"
                  fontFamily={MONO}
                  fontSize={14}
                  fill={COLOR_WIRE}
                  fontWeight={600}
                >
                  |x{q}⟩
                </text>
                <line
                  x1={startX - 6}
                  y1={yForQ(q)}
                  x2={wireEndX}
                  y2={yForQ(q)}
                  stroke={COLOR_WIRE}
                  strokeWidth={1.4}
                />
              </g>
            ))}
            {gates.map(renderGate)}
          </svg>
        </SvgViewport>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('gatelib.footer')}
      </Typography>
    </Paper>
  );
}
