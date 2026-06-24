import { useState, type RefObject } from 'react';
import { IconButton, Snackbar, Stack, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';

import { copySvgAsPng, downloadSvgAsPng } from '../lib/svgExport';
import { useI18n } from '../i18n';

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
  const { tStr } = useI18n();
  const [toast, setToast] = useState<{
    open: boolean;
    msg: string;
  }>({ open: false, msg: '' });

  const flash = (msg: string) => setToast({ open: true, msg });

  const onCopy = async () => {
    const svg = svgRef.current;
    if (!svg) {
      flash(tStr('export.toast.svgNotFoundCopy'));
      return;
    }
    try {
      await copySvgAsPng(svg, scale);
      flash(tStr('export.toast.pngCopied'));
    } catch (e) {
      const raw = (e as Error).message;
      const error =
        raw === 'NO_CLIPBOARD_IMAGE_API'
          ? tStr('export.err.noClipboardImageApi')
          : raw;
      flash(tStr('export.toast.copyFailed', { error }));
    }
  };

  const onDownload = async () => {
    const svg = svgRef.current;
    if (!svg) {
      flash(tStr('export.toast.svgNotFoundDownload'));
      return;
    }
    try {
      await downloadSvgAsPng(svg, filename, scale);
      flash(tStr('export.toast.pngDownloaded', { filename }));
    } catch (e) {
      flash(tStr('export.toast.downloadFailed', { error: (e as Error).message }));
    }
  };

  return (
    <>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Tooltip title={tStr('export.png.copy.tooltip')}>
          <IconButton size="small" onClick={onCopy} aria-label="copy as png">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={tStr('export.png.download.tooltip')}>
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
