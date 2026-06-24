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
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
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
              {t('qiskit.title')}
            </Typography>
            {!expanded && (
              <Typography variant="caption" color="text.secondary">
                {t('qiskit.collapsedHint')}
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
                {t('qiskit.intro', { strategy, walkAware, reduced })}
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
                  {t('qiskit.alphaLabel')}
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
                  {snapshot ? t('qiskit.btn.regenerate') : t('qiskit.btn.generate')}
                </Button>
                {stale && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={t('qiskit.stale')}
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
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'script' | 'jupyter'>('script');
  const { cycles, n, strategy, walkAware, reduced } = snapshot;

  const code = useMemo(
    () => buildQiskitPackageCode(cycles, n, strategy, walkAware, reduced),
    [cycles, n, strategy, walkAware, reduced],
  );
  const cells = useMemo(
    () => buildQiskitPackageNotebook(cycles, n, strategy, walkAware, reduced, lang),
    [cycles, n, strategy, walkAware, reduced, lang],
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
        <Tab value="script" label={t('qiskit.tab.module')} sx={{ minHeight: 36, py: 0 }} />
        <Tab
          value="jupyter"
          label={t('qiskit.tab.jupyter')}
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
        {t('qiskit.footer')}
      </Typography>
    </>
  );
}
