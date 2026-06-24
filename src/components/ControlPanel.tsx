import {
  Box,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { N_MAX, N_MIN, N_SOFT_WARN } from '../types';
import { useI18n } from '../i18n';

export type ControlPanelProps = {
  n: number;
  onChange: (n: number) => void;
};

const clamp = (v: number): number =>
  Math.max(N_MIN, Math.min(N_MAX, Math.floor(v)));

export function ControlPanel({ n, onChange }: ControlPanelProps) {
  const stateCount = 1 << n;
  const edgeCount = stateCount * (n + 1);
  const { t, tStr } = useI18n();

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
      >
        <TextField
          label={t('control.n.label')}
          type="number"
          size="small"
          value={n}
          slotProps={{
            htmlInput: { min: N_MIN, max: N_MAX, step: 1, inputMode: 'numeric' },
          }}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (Number.isFinite(v)) onChange(clamp(v));
          }}
          sx={{ width: 180 }}
          helperText={tStr('control.n.helper')}
        />

        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary">
            {t('control.caption', { n, stateCount, edgeCount })}
          </Typography>
          <Slider
            value={n}
            onChange={(_, v) =>
              onChange(clamp(Array.isArray(v) ? (v[0] ?? 0) : v))
            }
            min={N_MIN}
            max={N_MAX}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
        </Box>
      </Stack>

      {n > N_SOFT_WARN && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('control.warn', { n, edgeCount })}
        </Alert>
      )}
    </Paper>
  );
}
