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

export type ControlPanelProps = {
  n: number;
  onChange: (n: number) => void;
};

const clamp = (v: number): number =>
  Math.max(N_MIN, Math.min(N_MAX, Math.floor(v)));

export function ControlPanel({ n, onChange }: ControlPanelProps) {
  const stateCount = 1 << n;
  const edgeCount = stateCount * (n + 1);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
      >
        <TextField
          label="n (量子位元數)"
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
          helperText={`允許範圍 ${N_MIN}–${N_MAX}`}
        />

        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary">
            n = {n} ⇒ 2ⁿ = {stateCount} 個基底態、{edgeCount} 條合法邊
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
          n = {n} 會產生 {edgeCount} 條邊，bipartite 視圖會非常擁擠，渲染也可能變慢。
        </Alert>
      )}
    </Paper>
  );
}
