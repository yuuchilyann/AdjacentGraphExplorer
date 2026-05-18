import { useState, type RefObject } from 'react';
import { IconButton, Snackbar, Stack, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';

import { copySvgAsPng, downloadSvgAsPng } from '../lib/svgExport';

export type ExportActionsProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  /** Filename without extension. .png will be appended automatically. */
  filename: string;
  /** Pixel scale for the rendered PNG (default 2 = retina). */
  scale?: number;
};

export function ExportActions({
  svgRef,
  filename,
  scale = 2,
}: ExportActionsProps) {
  const [toast, setToast] = useState<{
    open: boolean;
    msg: string;
  }>({ open: false, msg: '' });

  const flash = (msg: string) => setToast({ open: true, msg });

  const onCopy = async () => {
    const svg = svgRef.current;
    if (!svg) {
      flash('找不到要複製的圖');
      return;
    }
    try {
      await copySvgAsPng(svg, scale);
      flash('已複製 PNG 到剪貼簿');
    } catch (e) {
      flash(`複製失敗：${(e as Error).message}`);
    }
  };

  const onDownload = async () => {
    const svg = svgRef.current;
    if (!svg) {
      flash('找不到要下載的圖');
      return;
    }
    try {
      await downloadSvgAsPng(svg, filename, scale);
      flash(`已下載 ${filename}.png`);
    } catch (e) {
      flash(`下載失敗：${(e as Error).message}`);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Tooltip title="複製為 PNG">
          <IconButton size="small" onClick={onCopy} aria-label="copy as png">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="下載 PNG">
          <IconButton
            size="small"
            onClick={onDownload}
            aria-label="download png"
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.msg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
