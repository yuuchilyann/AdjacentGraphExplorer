import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';

import type { NotebookCell } from '../lib/qiskit';
import { useI18n } from '../i18n';

export type JupyterPanelProps = {
  cells: NotebookCell[];
  /** Serialized .ipynb JSON. */
  ipynb: string;
  /** Filename (no extension); `.ipynb` is appended on download. */
  filename: string;
};

/**
 * Notebook-style view: each cell rendered with an `In [ ]:` prompt, Python
 * highlighting, and a per-cell copy button. A top action downloads a ready
 * `.ipynb` to upload into Google Colab / Jupyter (File → Upload notebook).
 */
export function JupyterPanel({ cells, ipynb, filename }: JupyterPanelProps) {
  const { t, tStr } = useI18n();
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const flash = (msg: string) => setToast({ open: true, msg });

  const highlighted = useMemo(
    () =>
      cells.map((c) =>
        Prism.highlight(c.source, Prism.languages.python, 'python'),
      ),
    [cells],
  );

  const copyCell = async (source: string) => {
    try {
      await navigator.clipboard.writeText(source);
      flash(tStr('export.toast.cellCopied'));
    } catch (e) {
      flash(tStr('export.toast.copyFailed', { error: (e as Error).message }));
    }
  };

  const downloadIpynb = () => {
    try {
      const blob = new Blob([ipynb], {
        type: 'application/x-ipynb+json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.ipynb`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash(tStr('export.toast.ipynbDownloaded', { filename }));
    } catch (e) {
      flash(tStr('export.toast.downloadFailed', { error: (e as Error).message }));
    }
  };

  return (
    <Box>
      {/* Action row + Colab upload hint */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadIpynb}
        >
          {t('export.download.ipynb.btn')}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t('export.colabHint')}
        </Typography>
      </Stack>

      {cells.map((cell, i) => (
        <Stack
          key={i}
          direction="row"
          spacing={1}
          sx={{ mb: 1.5, alignItems: 'flex-start' }}
        >
          <Typography
            sx={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: 12,
              color: 'text.disabled',
              whiteSpace: 'nowrap',
              pt: '14px',
              minWidth: 44,
              textAlign: 'right',
            }}
          >
            [ ]:
          </Typography>
          <Box sx={{ position: 'relative', flexGrow: 1, minWidth: 0 }}>
            <Box
              component="pre"
              sx={{
                m: 0,
                px: 2,
                py: 1.25,
                pr: 5,
                overflow: 'auto',
                bgcolor: 'background.default',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'text.primary',
              }}
            >
              <code dangerouslySetInnerHTML={{ __html: highlighted[i] }} />
            </Box>
            <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
              <Tooltip title={tStr('export.copyCell.tooltip')}>
                <IconButton
                  size="small"
                  onClick={() => copyCell(cell.source)}
                  aria-label="copy cell"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Stack>
      ))}

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
