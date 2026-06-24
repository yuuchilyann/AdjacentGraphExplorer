import { useMemo, useState } from 'react';
import { Box, IconButton, Snackbar, Stack, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
// Token colors only — the theme's `.token.*` rules are global, so we keep the
// MUI <pre> styling (background, font) and just let the spans get colored.
import 'prismjs/themes/prism.css';

export type CodePanelProps = {
  code: string;
  /** Filename (no extension) for the download; `.py` is appended. */
  filename: string;
};

/**
 * Read-only code viewer with a flat Copy/Download overlay pinned to the
 * top-right corner — the text-equivalent of SvgViewport, so code and diagram
 * tabs share the same export affordance.
 */
export function CodePanel({ code, filename }: CodePanelProps) {
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const flash = (msg: string) => setToast({ open: true, msg });

  const highlighted = useMemo(
    () => Prism.highlight(code, Prism.languages.python, 'python'),
    [code],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      flash('已複製 Qiskit 程式碼到剪貼簿');
    } catch (e) {
      flash(`複製失敗：${(e as Error).message}`);
    }
  };

  const onDownload = () => {
    try {
      const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.py`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash(`已下載 ${filename}.py`);
    } catch (e) {
      flash(`下載失敗：${(e as Error).message}`);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component="pre"
        sx={{
          m: 0,
          overflow: 'auto',
          maxWidth: '100%',
          bgcolor: 'background.default',
          borderRadius: 1,
          pt: 5,
          px: 2,
          pb: 2,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.55,
          color: 'text.primary',
        }}
      >
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'transparent',
          px: 0.25,
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="複製程式碼">
            <IconButton size="small" onClick={onCopy} aria-label="copy code">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="下載 .py">
            <IconButton
              size="small"
              onClick={onDownload}
              aria-label="download python file"
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
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
