import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import RefreshIcon from '@mui/icons-material/Refresh';

import type { LayeredRealization, Strategy } from '../lib/layered';
import {
  cycleDecomposition,
  formatCycles,
  type Mapping,
} from '../lib/permutation';
import {
  buildIpynb,
  buildQiskitPackageCode,
  buildQiskitPackageNotebook,
} from '../lib/qiskit';
import { CodePanel } from './CodePanel';
import { JupyterPanel } from './JupyterPanel';
import { QiskitInstallBlock } from './QiskitInstallBlock';

export type QiskitPackageViewProps = {
  realization: LayeredRealization;
  n: number;
  /** Whether the Reduced (peephole-simplified) layer view is active. */
  reduced?: boolean;
};

/** A frozen capture of α + settings, taken when "產生程式碼" is pressed. */
type Snapshot = {
  cycles: number[][];
  n: number;
  strategy: Strategy;
  walkAware: boolean;
  reduced: boolean;
  /** Identifies the (α, settings) this snapshot was built for. */
  signature: string;
};

/** A compact fingerprint of the current α + decomposition settings. */
function signatureOf(realization: LayeredRealization, reduced: boolean): string {
  const images = realization.trajectories
    .map((t) => t[t.length - 1])
    .join(',');
  return `${realization.strategy}|${realization.walkAware}|${reduced}|${images}`;
}

/**
 * Independent, reusable "function form" view: a self-contained Python function
 * that takes an arbitrary permutation α and builds the circuit by decomposing
 * it internally (full port of the app's algorithm).
 *
 * Collapsed by default, and the (expensive) code is rendered only after the
 * user explicitly presses "產生程式碼" — so the matching game stays fast and the
 * shown code never silently drifts from the current α.
 */
export function QiskitPackageView({
  realization,
  n,
  reduced = false,
}: QiskitPackageViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const { strategy, walkAware } = realization;
  const signature = signatureOf(realization, reduced);
  const stale = snapshot !== null && snapshot.signature !== signature;
  const hasLayers = n > 0 && realization.layers.length > 0;

  // Current α, recovered from the realization (cheap; the costly part is the
  // code highlighting, which stays gated behind the button).
  const currentCycles = useMemo(() => {
    const mapping: Mapping = new Map(
      realization.trajectories.map((traj, r) => [r, traj[traj.length - 1]]),
    );
    return cycleDecomposition(mapping, n, false);
  }, [realization, n]);
  const alphaText = formatCycles(currentCycles, n);

  const generate = () => {
    setSnapshot({
      cycles: currentCycles,
      n,
      strategy,
      walkAware,
      reduced,
      signature,
    });
  };

  if (!hasLayers) return null;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 0 }}>
      <Accordion
        expanded={expanded}
        onChange={(_, e) => setExpanded(e)}
        disableGutters
        elevation={0}
        sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
          <Stack spacing={0.25}>
            <Typography variant="overline" color="text.secondary">
              Qiskit 函式版 — 任意排列 α → 量子電路
            </Typography>
            {!expanded && (
              <Typography variant="caption" color="text.secondary">
                展開以產生「任意排列 α → 電路」的通用 Python 函式（請按下產生程式碼）
              </Typography>
            )}
          </Stack>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 2, pt: 0 }}>
          {expanded && (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                一份自給自足的通用 Python 函式：傳入任意排列 α（以 cycle
                表示），內部自行完成「α → 合法 (Hamming = 1) 層 → 多控 X」的完整
                分解 — 不必逐 gate 手寫。按下按鈕會以目前的 α 與設定（strategy
                <Box component="span" sx={{ mx: 0.5, fontFamily: 'monospace' }}>
                  {strategy}
                </Box>
                、walk_aware={String(walkAware)}、reduce={String(reduced)}）產生範例
                呼叫；改 alpha_cycles 即可重算其他排列。
              </Typography>

              {/* The actual current α, so the user need not scroll up to check. */}
              <Box
                sx={{
                  mb: 2,
                  px: 1.5,
                  py: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  目前 α（cycle 表示）
                </Typography>
                <Box
                  sx={{
                    mt: 0.25,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: 14,
                    color: 'text.primary',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {alphaText}
                </Box>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
              >
                <Button
                  variant="contained"
                  size="small"
                  startIcon={snapshot ? <RefreshIcon /> : <CodeIcon />}
                  onClick={generate}
                >
                  {snapshot ? '重新產生程式碼' : '產生程式碼'}
                </Button>
                {stale && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label="α 已變更，下方內容已過期"
                  />
                )}
              </Stack>

              {snapshot && <PackageBody snapshot={snapshot} />}
            </>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

/** The heavy part — only mounted after the user presses 產生程式碼. */
function PackageBody({ snapshot }: { snapshot: Snapshot }) {
  const [tab, setTab] = useState<'script' | 'jupyter'>('script');
  const { cycles, n, strategy, walkAware, reduced } = snapshot;

  const code = useMemo(
    () => buildQiskitPackageCode(cycles, n, strategy, walkAware, reduced),
    [cycles, n, strategy, walkAware, reduced],
  );
  const cells = useMemo(
    () => buildQiskitPackageNotebook(cycles, n, strategy, walkAware, reduced),
    [cycles, n, strategy, walkAware, reduced],
  );
  const ipynb = useMemo(() => buildIpynb(cells), [cells]);

  const filename = `qiskit-function-n${n}-${strategy}${
    walkAware ? '-walk' : ''
  }${reduced ? '-reduced' : ''}`;

  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, v: 'script' | 'jupyter') => setTab(v)}
        sx={{ mb: 1.5, minHeight: 36 }}
      >
        <Tab value="script" label="Python 模組" sx={{ minHeight: 36, py: 0 }} />
        <Tab
          value="jupyter"
          label="Jupyter / Colab"
          sx={{ minHeight: 36, py: 0 }}
        />
      </Tabs>

      <QiskitInstallBlock />

      {tab === 'script' && <CodePanel code={code} filename={filename} />}
      {tab === 'jupyter' && (
        <JupyterPanel cells={cells} ipynb={ipynb} filename={filename} />
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1 }}
      >
        函式內含 positive 參數：build_circuit(..., positive=True)
        會把空心白控制以 X-共軛展開為 positive-only 控制，方便對應只支援 positive
        control 的硬體。
      </Typography>
    </>
  );
}
