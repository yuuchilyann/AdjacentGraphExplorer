import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';

import { Math } from './Math';
import { useI18n } from '../i18n';
import type { LayeredRealization } from '../lib/layered';

export type LearningPanelProps = {
  realization: LayeredRealization;
  n: number;
};

const ket = (i: number, n: number) =>
  n === 0 ? '|\\rangle' : `|${i.toString(2).padStart(n, '0')}\\rangle`;

export function LearningPanel({ realization, n }: LearningPanelProps) {
  const { t } = useI18n();
  const haveD2plus = realization.maxDirectDistance >= 2;
  const walkApplied = realization.walkAware && realization.walkDecomposedCycles > 0;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 0 }}>
      <Box sx={{ p: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon fontSize="small" color="action" />
        <Typography variant="overline" color="text.secondary">
          {t('learning.header')}
        </Typography>
      </Box>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">{t('learning.acc1.summary')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('learning.acc1.intro')}
          </Typography>
          <Math display tex={`\\#\\text{transpositions}(\\alpha) = \\sum_{C \\in \\text{cycles}(\\alpha)} (|C| - 1) = 2^n - \\#\\text{cycles}(\\alpha)`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('learning.acc1.count', { totalCycles: realization.totalCycles })}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">{t('learning.acc2.summary')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('learning.acc2.intro')}
          </Typography>
          <Math display tex={`(a_0\\ a_1\\ \\cdots\\ a_{m-1}) = (a_1\\ a_0) \\circ (a_2\\ a_0) \\circ \\cdots \\circ (a_{m-1}\\ a_0)`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('learning.acc2.note')}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">{t('learning.acc3.summary')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('learning.acc3.intro')}
          </Typography>
          <Math display tex={`(i\\ j) = (p_0\\ p_1)(p_1\\ p_2)\\cdots(p_{d-1}\\ p_d)\\cdots(p_1\\ p_2)(p_0\\ p_1)`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('learning.acc3.note', {
              haveD2plus,
              maxDirectDistance: realization.maxDirectDistance,
            })}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        defaultExpanded={walkApplied}
        sx={{
          bgcolor: walkApplied ? 'success.50' : undefined,
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">{t('learning.acc4.summary')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('learning.acc4.intro')}
          </Typography>
          <Math display tex={`(v_0\\ v_1\\ \\cdots\\ v_{m-1}) = (v_0\\ v_1) \\circ (v_1\\ v_2) \\circ \\cdots \\circ (v_{m-2}\\ v_{m-1})`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
            {t('learning.acc4.note')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('learning.acc4.condVsBrute')}
          </Typography>
          {walkApplied && (
            <Typography variant="body2" color="success.dark" sx={{ mt: 1 }}>
              {t('learning.acc4.applied', { count: realization.walkDecomposedCycles })}
            </Typography>
          )}
          {realization.walkAware && !walkApplied && realization.totalCycles > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('learning.acc4.notApplied')}
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">{t('learning.acc5.summary')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('learning.acc5.intro')}
          </Typography>
          <Math display tex={`\\sigma^2 = e \\quad \\forall\\ \\sigma = (a\\ b),\\ d(a,b)=1`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('learning.acc5.note')}
          </Typography>
          <Math display tex={`\\sigma_1 \\sigma_2 \\sigma_1 = \\sigma_2 \\sigma_1 \\sigma_1 = \\sigma_2 \\quad \\text{when}\\ \\sigma_1 \\cap \\sigma_2 = \\emptyset`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('learning.acc5.circuit')}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">{t('learning.acc6.summary')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('learning.acc6.intro', { ket0: ket(0, n), ket1: ket(1, n) })}
          </Typography>
          <Math display tex={`\\text{control}(q) = \\begin{cases} \\bullet\\ (\\text{positive}) & \\text{if } a_q = 1 \\\\ \\circ\\ (\\text{negative}) & \\text{if } a_q = 0 \\end{cases}`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('learning.acc6.note')}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ p: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Stat label="layers" value={String(realization.layers.length)} />
          <Stat label="strategy" value={realization.strategy} />
          <Stat label="walk-aware" value={realization.walkAware ? 'on' : 'off'} />
          <Stat
            label="cycles"
            value={`${realization.totalCycles}${realization.walkAware ? ` (${realization.walkDecomposedCycles} via walk)` : ''}`}
          />
          <Stat label="max direct d" value={String(realization.maxDirectDistance)} />
        </Stack>
      </Box>
    </Paper>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column' }}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontWeight: 600,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
