import { useState } from 'react';
import {
  Box,
  IconButton,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { useI18n } from '../i18n';

type EnvKey = 'pip' | 'conda' | 'uv';

/**
 * Install commands for the "+ visualization" package set: qiskit itself plus
 * matplotlib + pylatexenc so that `qc.draw("mpl")` works out of the box. These
 * are shell commands (not Python), so they live in a dedicated block above the
 * code instead of inside the .py file.
 */
const ENVS: { key: EnvKey; label: string; cmd: string }[] = [
  { key: 'pip', label: 'pip', cmd: 'pip install qiskit matplotlib pylatexenc' },
  {
    key: 'conda',
    label: 'conda',
    cmd: 'conda install -c conda-forge qiskit matplotlib pylatexenc',
  },
  {
    key: 'uv',
    label: 'uv',
    cmd: 'uv pip install qiskit matplotlib pylatexenc',
  },
];

export function QiskitInstallBlock() {
  const { t, tStr } = useI18n();
  const [env, setEnv] = useState<EnvKey>('pip');
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });

  const cmd = ENVS.find((e) => e.key === env)!.cmd;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setToast({ open: true, msg: tStr('export.toast.installCopied') });
    } catch (e) {
      setToast({
        open: true,
        msg: tStr('export.toast.copyFailed', { error: (e as Error).message }),
      });
    }
  };

  return (
    <Box
      sx={{
        mb: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {/* Header — label + env toggle + copy */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
          rowGap: 0.5,
          px: 1,
          py: 0.5,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t('export.install.label')}
        </Typography>
        <ToggleButtonGroup
          value={env}
          exclusive
          size="small"
          onChange={(_, v: EnvKey | null) => v && setEnv(v)}
          color="primary"
        >
          {ENVS.map((e) => (
            <ToggleButton key={e.key} value={e.key} sx={{ px: 1, py: 0.25 }}>
              {e.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={tStr('export.install.copy.tooltip')}>
          <IconButton
            size="small"
            onClick={onCopy}
            aria-label="copy install command"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* The command itself */}
      <Box
        component="pre"
        sx={{
          m: 0,
          px: 2,
          py: 1.25,
          overflow: 'auto',
          bgcolor: 'background.default',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'text.primary',
        }}
      >
        <code>{cmd}</code>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', px: 2, pb: 1 }}
      >
        {t('export.install.hint')}
      </Typography>

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.msg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
